// Intentionally uses a separate, explicit local configuration, never backend/.env.
const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const { PASSWORD_OPTIONS } = require('../auth');
async function main() {
    if (process.env.CRM_LOCAL !== '1' || process.argv[2] !== '--local' || !process.stdin.isTTY) {
        throw new Error('Use CRM_LOCAL=1 npm --prefix backend run admin:create -- --local from the project root in an interactive terminal.');
    }
    const env = require('../local-config').loadLocalConfig();
    let muted = false;
    const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    let email, password;
    try {
        console.log(`Local target: ${env.DB_HOST}:${env.DB_PORT || 3306}/${env.DB_NAME}`);
        if (await rl.question('Type CREATE FIRST ADMIN to continue: ') !== 'CREATE FIRST ADMIN') throw new Error('Cancelled.');
        email = (await rl.question('Admin email: ')).trim().toLowerCase();
        process.stdout.write('Password (hidden, minimum 12 characters): ');
        muted = true;
        password = await rl.question('');
        process.stdout.write('\nConfirm password: ');
        const confirmation = await rl.question('');
        process.stdout.write('\n');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Invalid email.');
        if (password.length < 12 || Buffer.byteLength(password) > 1024 || password !== confirmation) throw new Error('Password length or confirmation invalid.');
    } finally { muted = false; rl.close(); }
    const hash = await argon2.hash(password, PASSWORD_OPTIONS);
    const db = await mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT || 3306, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD });
    try {
        const [[lock]] = await db.query("SELECT GET_LOCK('crm_first_admin', 10) AS acquired");
        if (lock.acquired !== 1) throw new Error('Could not acquire administrator creation lock.');
        const [[row]] = await db.query('SELECT COUNT(*) AS count FROM crm_users');
        if (Number(row.count)) throw new Error('A CRM user already exists. This script only creates the first administrator.');
        await db.execute("INSERT INTO crm_users (email, password_hash, role, is_active) VALUES (?, ?, 'admin', 1)", [email, hash]);
        console.log('First administrator created.');
    } finally { await db.end(); }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });

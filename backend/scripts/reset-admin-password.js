'use strict';

const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const { loadLocalConfig } = require('../local-config');

class SafeError extends Error {}

async function readPassword() {
    const output = new Writable({ write(chunk, encoding, callback) { callback(); } });
    const controller = new AbortController();
    const rl = readline.createInterface({
        input: process.stdin, output, terminal: true, historySize: 0
    });
    const cancel = () => controller.abort();
    rl.on('SIGINT', cancel);
    rl.on('close', cancel);
    let password, confirmation;
    try {
        process.stdout.write('New password (hidden, minimum 12 characters): ');
        password = await rl.question('', { signal: controller.signal });
        process.stdout.write('\nConfirm new password (hidden): ');
        confirmation = await rl.question('', { signal: controller.signal });
        if ([...password].length < 12 || Buffer.byteLength(password, 'utf8') > 1024) {
            throw new SafeError('Password must contain at least 12 characters and at most 1024 UTF-8 bytes.');
        }
        if (password !== confirmation) throw new SafeError('Passwords do not match.');
        return password;
    } finally {
        password = confirmation = undefined;
        rl.close();
        output.destroy();
        process.stdout.write('\n');
    }
}

async function main() {
    if (process.env.CRM_LOCAL !== '1' || process.argv.length !== 2 ||
        !process.stdin.isTTY || !process.stdout.isTTY) {
        throw new SafeError('Run CRM_LOCAL=1 npm --prefix backend run admin:reset-password in an interactive terminal, without arguments.');
    }
    // This loader reads only .env.local and validates the dedicated local credentials.
    const env = loadLocalConfig();
    if (env.DB_HOST !== '127.0.0.1' || env.DB_PORT !== '3306' ||
        env.DB_NAME !== 'cadbimoz_backend_dev' || env.NODE_ENV !== 'development') {
        throw new SafeError('Refusing a non-local development configuration.');
    }

    let password, hash;
    try {
        password = await readPassword();
        hash = await argon2.hash(password, {
            type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1
        });
    } finally {
        password = undefined;
    }

    const db = await mysql.createConnection({
        host: env.DB_HOST, port: Number(env.DB_PORT), database: env.DB_NAME,
        user: env.DB_USER, password: env.DB_PASSWORD, multipleStatements: false
    });
    try {
        await db.beginTransaction();
        const [admins] = await db.query("SELECT id FROM crm_users WHERE role = 'admin' FOR UPDATE");
        if (admins.length !== 1) throw new SafeError('Expected exactly one existing administrator; nothing changed.');
        const [updated] = await db.execute(
            "UPDATE crm_users SET password_hash = ? WHERE id = ? AND role = 'admin'",
            [hash, admins[0].id]
        );
        if (updated.affectedRows !== 1) throw new SafeError('Administrator update failed; transaction cancelled.');
        await db.execute('DELETE FROM crm_sessions WHERE user_id = ?', [admins[0].id]);
        await db.commit();
    } catch (error) {
        await db.rollback();
        throw error;
    } finally {
        hash = undefined;
        await db.end();
    }
    console.log('Local administrator password reset; existing sessions revoked.');
}

main().catch(error => {
    console.error(error instanceof SafeError ? error.message :
        error.name === 'AbortError' ? 'Cancelled; nothing changed.' :
            'Local password reset failed. No credentials have been logged.');
    process.exitCode = 1;
});

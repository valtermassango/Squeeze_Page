const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function loadLocalConfig() {
    let env;
    try {
        env = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env.local')));
    } catch {
        throw new Error('Explicit local configuration required: backend/.env.local is missing or unreadable.');
    }
    if (env.DB_HOST !== '127.0.0.1' || env.DB_PORT !== '3306' ||
        env.DB_NAME !== 'cadbimoz_backend_dev' || env.DB_USER !== 'cadbimoz_backend_dev' ||
        !/^[0-9a-f]{64}$/.test(env.DB_PASSWORD || '')) {
        throw new Error('Invalid local configuration: use setup-local-db.py to prepare the dedicated backend database credentials.');
    }
    return env;
}

module.exports = { loadLocalConfig };

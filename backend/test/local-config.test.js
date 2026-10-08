const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadLocalConfig } = require('../local-config');

test('local configuration fails closed and never inherits database credentials', t => {
    const valid = {
        DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_NAME: 'cadbimoz_backend_dev',
        DB_USER: 'cadbimoz_backend_dev', DB_PASSWORD: 'a'.repeat(64)
    };
    let config = valid;
    t.mock.method(fs, 'readFileSync', filename => {
        assert.ok(filename.endsWith('/backend/.env.local'));
        if (!config) throw new Error('ENOENT');
        return Buffer.from(Object.entries(config).map(([key, value]) => `${key}=${value}`).join('\n'));
    });
    assert.deepEqual(loadLocalConfig(), valid);
    for (const [key, value] of Object.entries({
        DB_HOST: 'remote.invalid', DB_PORT: '3307', DB_NAME: 'cadbimoz_dev',
        DB_USER: 'another_user', DB_PASSWORD: ''
    })) {
        config = { ...valid, [key]: value };
        assert.throws(loadLocalConfig, /Invalid local configuration/);
    }
    config = null;
    assert.throws(loadLocalConfig, /missing or unreadable/);
});

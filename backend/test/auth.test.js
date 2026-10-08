const { test } = require('node:test');
const assert = require('node:assert/strict');
const argon2 = require('argon2');
const { createApp } = require('../server');
const { authConfig } = require('../auth/config');
const { PASSWORD_OPTIONS } = require('../auth');

test('authentication, permissions, public routes, CORS, rotation and logout with fake database', async t => {
    const hash = await argon2.hash('test-only-long-password', PASSWORD_OPTIONS);
    const user = { id: 1, email: 'admin@example.test', password_hash: hash, role: 'admin', is_active: 1 };
    const sessions = new Map();
    const calls = [];
    const pool = { async query(sql, args = []) {
        calls.push(sql);
        if (sql.startsWith('SELECT id, email')) return [[args[0] === user.email ? user : undefined].filter(Boolean)];
        if (sql.startsWith('INSERT INTO crm_sessions')) { sessions.set(args[0], true); return [{}]; }
        if (sql.startsWith('DELETE FROM crm_sessions')) { sessions.delete(args[0]); return [{}]; }
        if (sql.includes('JOIN crm_users')) return [[sessions.get(args[0]) && user.is_active ? user : undefined].filter(Boolean)];
        if (sql.includes('AS total_downloads')) return [[{ total_downloads: 0, downloads_today: 0, downloads_month: 0 }]];
        if (sql.includes('INSERT INTO leads')) return [{ insertId: 9 }];
        if (sql.includes('WHERE id = ?')) return [[{ id: 9, email: 'lead@example.test' }]];
        if (sql.includes('INSERT INTO ebook_tokens')) return [{}];
        return [[]];
    } };
    const server = createApp(pool, authConfig({})).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, options) => fetch(base + path, options);
    const login = (password = 'test-only-long-password', email = user.email, extra = {}) => request('/auth/login', {
        method: 'POST', headers: { Origin: 'http://localhost:3002', 'Content-Type': 'application/json', ...extra }, body: JSON.stringify({ email, password }) });
    for (const route of ['/leads', '/ebook/stats', '/ebook/stats/source', '/auth/me']) {
        const r = await request(route); assert.equal(r.status, 401); assert.equal(r.headers.get('cache-control'), 'no-store');
    }
    assert.equal(calls.length, 0);
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/download/ebook')).status, 400);
    const publicLead = await request('/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Example', email: 'lead@example.test', whatsapp: '12345' }) });
    assert.equal(publicLead.status, 201); assert.match((await publicLead.json()).downloadUrl, /^\/download\/ebook\?token=/);
    const bad = await login('bad'); const unknown = await login('bad', 'unknown@example.test');
    assert.equal(bad.status, 401); assert.deepEqual(await bad.json(), await unknown.json());
    assert.equal((await login(undefined, undefined, { Origin: 'https://evil.test' })).status, 403);
    assert.equal((await request('/auth/logout', { method: 'POST' })).status, 403);
    const good = await login(); assert.equal(good.status, 200);
    assert.equal(good.headers.get('access-control-allow-origin'), 'http://localhost:3002');
    assert.equal(good.headers.get('access-control-allow-credentials'), 'true');
    const cookie = good.headers.get('set-cookie').split(';')[0];
    assert.match(good.headers.get('set-cookie'), /HttpOnly/); assert.match(good.headers.get('set-cookie'), /SameSite=Lax/);
    assert.ok(!sessions.has(cookie.split('=')[1]));
    for (const route of ['/leads', '/ebook/stats', '/ebook/stats/source', '/auth/me']) assert.equal((await request(route, { headers: { Cookie: cookie } })).status, 200);
    user.role = 'unknown'; assert.equal((await request('/leads', { headers: { Cookie: cookie } })).status, 403); user.role = 'admin';
    user.is_active = 0; assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).status, 401); user.is_active = 1;
    const storedHash = [...sessions.keys()][0];
    sessions.set(storedHash, false); // Simulate the database excluding an expired session.
    assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).status, 401);
    sessions.set(storedHash, true);
    const rotated = await login(undefined, undefined, { Cookie: cookie });
    assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).status, 401);
    const newCookie = rotated.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/auth/logout', { method: 'POST', headers: { Origin: 'http://localhost:3002', Cookie: newCookie } })).status, 200);
    assert.equal((await request('/auth/me', { headers: { Cookie: newCookie } })).status, 401);
    const preflight = await request('/leads', { method: 'OPTIONS', headers: { Origin: 'https://evil.test', 'Access-Control-Request-Method': 'GET' } });
    assert.equal(preflight.headers.get('access-control-allow-origin'), null);
    let limited; for (let i = 0; i < 11; i++) limited = await login('bad');
    assert.equal(limited.status, 429); assert.equal(limited.headers.get('cache-control'), 'no-store');
});
test('production origins fail closed and cookie configuration is secure', () => {
    assert.throws(() => authConfig({ NODE_ENV: 'production' }));
    assert.throws(() => authConfig({ CORS_ALLOWED_ORIGINS: '*' }));
    assert.throws(() => authConfig({ CORS_ALLOWED_ORIGINS: 'https://example.test/path' }));
    const config = authConfig({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: 'https://crm.example.test' });
    assert.equal(config.secure, true); assert.equal(config.cookieName, '__Host-crm_session');
});

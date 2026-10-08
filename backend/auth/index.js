const crypto = require('node:crypto');
const argon2 = require('argon2');
const { rateLimit } = require('express-rate-limit');
const PASSWORD_OPTIONS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };
const PERMISSIONS = Object.freeze({ admin: ['leads:read', 'stats:read'] });
const digest = token => crypto.createHash('sha256').update(token).digest('hex');
const noStore = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
function createAuth(pool, config) {
    const cookieOptions = { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/' };
    // A random dummy hash makes unknown-user attempts perform the same password work.
    const dummyHash = argon2.hash(crypto.randomBytes(32), PASSWORD_OPTIONS);
    const tokenFrom = req => {
        const cookies = (req.headers.cookie || '').split(';').map(item => item.trim());
        const value = cookies.find(item => item.startsWith(`${config.cookieName}=`))?.slice(config.cookieName.length + 1);
        return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
    };
    const userView = user => ({ id: user.id, email: user.email, role: user.role, permissions: PERMISSIONS[user.role] || [] });
    const requireAuth = async (req, res, next) => {
        noStore(req, res, () => {});
        const token = tokenFrom(req);
        if (!token) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
        const [rows] = await pool.query(`SELECT u.id, u.email, u.role FROM crm_sessions s
            JOIN crm_users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3) AND u.is_active = 1`, [digest(token)]);
        if (!rows.length) {
            res.clearCookie(config.cookieName, cookieOptions);
            return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
        }
        req.user = userView(rows[0]);
        next();
    };
    const requirePermission = permission => (req, res, next) => {
        noStore(req, res, () => {});
        if (!req.user) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
        if (!req.user.permissions.includes(permission)) return res.status(403).json({ success: false, message: 'Acesso negado.' });
        next();
    };
    const trustedOrigin = (req, res, next) => {
        if (!config.origins.includes(req.get('Origin'))) return res.status(403).json({ success: false, message: 'Origem não permitida.' });
        next();
    };
    const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
        message: { success: false, message: 'Demasiadas tentativas. Tente novamente mais tarde.' } });
    const login = async (req, res) => {
        const { email, password } = req.body || {};
        const valid = typeof email === 'string' && email.trim().length <= 254 && typeof password === 'string' && password.length > 0 && Buffer.byteLength(password) <= 1024;
        const [rows] = valid ? await pool.query('SELECT id, email, role, password_hash, is_active FROM crm_users WHERE email = ?', [email.trim().toLowerCase()]) : [[]];
        const user = rows[0];
        const verified = await argon2.verify(user?.password_hash || await dummyHash, valid ? password : 'invalid');
        if (!valid || !verified || !user || !user.is_active) return res.status(401).json({ success: false, message: 'E-mail ou palavra-passe inválidos.' });
        const oldToken = tokenFrom(req);
        if (oldToken) await pool.query('DELETE FROM crm_sessions WHERE token_hash = ?', [digest(oldToken)]);
        const token = crypto.randomBytes(32).toString('hex');
        await pool.query('INSERT INTO crm_sessions (token_hash, user_id, expires_at) VALUES (?, ?, TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP(3)))', [digest(token), user.id, config.ttlMs / 1000]);
        res.cookie(config.cookieName, token, { ...cookieOptions, maxAge: config.ttlMs });
        res.json({ success: true, user: userView(user) });
    };
    const logout = async (req, res) => {
        const token = tokenFrom(req);
        if (token) await pool.query('DELETE FROM crm_sessions WHERE token_hash = ?', [digest(token)]);
        res.clearCookie(config.cookieName, cookieOptions);
        res.json({ success: true });
    };
    return { requireAuth, requirePermission, trustedOrigin, loginLimiter, login, logout };
}
module.exports = { createAuth, noStore, PASSWORD_OPTIONS };

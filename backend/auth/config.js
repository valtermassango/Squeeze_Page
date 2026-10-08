const LOCAL_ORIGINS = ['http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:5500', 'http://127.0.0.1:5500'];
function authConfig(env = process.env) {
    const production = env.NODE_ENV === 'production';
    const origins = (env.CORS_ALLOWED_ORIGINS || (production ? '' : LOCAL_ORIGINS.join(',')))
        .split(',').map(value => value.trim()).filter(Boolean);
    if (!origins.length) throw new Error('CORS_ALLOWED_ORIGINS is required in production');
    for (const origin of origins) {
        const url = new URL(origin);
        if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
            throw new Error('Configure exact HTTP(S) origins without paths or trailing slashes');
        }
    }
    return { origins, secure: production, cookieName: production ? '__Host-crm_session' : 'crm_session', ttlMs: 8 * 60 * 60 * 1000 };
}
module.exports = { authConfig };

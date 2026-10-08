# CRM authentication — validated local milestone

The isolated MariaDB database `cadbimoz_backend_dev`, administrator login, protected
API requests, server-side sessions and logout invalidation have been validated locally
under Node 22. No production deployment has been performed.

No migration runs on application startup. Fresh database setup is an explicit operation
described in LOCAL-SETUP.md. Existing backend/.env is not changed.

## Implementation files

- migrations/001_crm_auth.sql: auth-only migration; no seed password.
- migrations/local_schema.sql: four-table schema for a fresh isolated local database.
  These are alternative paths; do not apply both to the same database.
- auth/config.js, auth/index.js: origins, sessions, hashing and middleware.
- server.js: authentication routes, protected reads, local CRM static serving.
- db.js, .env.example: explicit separate local database configuration.
- scripts/setup-local-db.py, scripts/apply-local-schema.py: explicit local database
  and schema setup with target validation.
- scripts/create-admin.js: interactive first-admin bootstrap, loopback only.
- scripts/reset-admin-password.js: interactive local reset and session revocation.
- dashboard/crm/index.html, js/crm.js, css/crm.css: login/logout and safe rendering.
- package.json: local start, admin and test commands; existing dependencies retained.
- test/auth.test.js, test/local-config.test.js, test/render.test.js: isolated tests
  without a real database.

package-lock.json records the dependencies declared in package.json.

## Local use

Use Node 22. The existing validated database does not need to be recreated or migrated.
For a fresh environment, follow LOCAL-SETUP.md before creating the first administrator.
Run these commands from the repository root:

```sh
npm --prefix backend run dev:local
```

Open http://127.0.0.1:3002/crm/. For first-admin creation on a fresh database only:

```sh
CRM_LOCAL=1 npm --prefix backend run admin:create -- --local
```

This requires an interactive terminal and typed confirmation, hides password input,
hashes with Argon2id and refuses if any CRM user exists. It does not create tables.
To reset the single existing local administrator's password and revoke their sessions:

```sh
CRM_LOCAL=1 npm --prefix backend run admin:reset-password
```

Run the isolated tests with `npm --prefix backend test` under Node 22. They use a fake
database or mocked configuration reads; they do not connect to MySQL or run migrations.

## Behaviour

POST /auth/login requires JSON email/password and an allowed Origin header.
GET /auth/me returns the signed-in user's id, email, role and permissions.
POST /auth/logout requires an allowed Origin and revokes the current session;
repeat logout is safe. Login rotates a supplied previous session.

Only admin exists, with leads:read and stats:read. Public GET /, POST /leads and
GET /download/ebook retain their handlers. Ebook tokens never authenticate CRM users.
There is no registration endpoint.

Sessions have 256-bit random tokens, store only SHA-256 token hashes, and expire
after eight hours (absolute lifetime). Expiry uses database UTC time. Disabled users
lose access immediately. Cookies are host-only, HttpOnly, SameSite=Lax, and become
Secure with a __Host- name in production. Auth routes and protected reads use no-store.
Expired session records can be periodically removed with an explicitly approved
maintenance job; they are already rejected during authentication.

Login permits ten attempts per IP per 15 minutes, including successful attempts.
The limiter is in-process and resets on restart. Before a multi-process deployment,
configure a shared limiter store and a narrowly trusted proxy appropriate to the
actual hosting topology. Do not blindly enable trust proxy.

## Configuration for later production review (no deployment performed)

Set NODE_ENV=production and CORS_ALLOWED_ORIGINS to a comma-separated list of exact
HTTPS origins for the CRM and public lead form, without paths, trailing slashes or
wildcards. Production fails startup without this allowlist. Login/logout additionally
reject absent or untrusted Origin headers, preventing cross-origin session mutations.
CORS itself is not authorization; public lead submission remains public.

Serve the CRM through /crm/ on the API origin. The frontend uses relative API URLs
and includes session credentials. It does not implement a window.CRM_API_BASE override
or a separate-origin API configuration. Use http://127.0.0.1:3002/crm/ locally and a
same-origin HTTPS arrangement for any future production deployment.
The server currently binds to loopback only. Production routing, TLS, proxy trust,
shared limiting and database migration remain separate deployment work.

No WordPress, DNS, Hostinger or production database changes are included.

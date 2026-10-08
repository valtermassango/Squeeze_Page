# Local backend setup — isolated MariaDB development

The local authentication milestone has been validated with Node 22 and the isolated
`cadbimoz_backend_dev` database. No production deployment has been performed.
For the existing setup, skip database/schema creation and use the run command below.
The setup scripts refuse to overwrite existing credentials or recreate existing resources.

## Fresh local database

The following commands are for a fresh environment after its local target is approved.
Run from the repository root. Prepare credentials without contacting MariaDB:

```sh
python3 backend/scripts/setup-local-db.py
```

This exclusively creates ignored `backend/.env.local` with mode 600, a random
64-character hexadecimal password, host `127.0.0.1`, port `3306`, and database
and user `cadbimoz_backend_dev`. It refuses to overwrite an existing file.
The existing `.gitignore` rule `.env.*` covers this file; do not force-add secrets.

Only after explicit database approval:

```sh
python3 backend/scripts/setup-local-db.py --apply
```

This validates the local file, runs `sudo -v`, then invokes
`sudo -n mariadb --no-defaults --protocol=socket --batch --skip-column-names`
with SQL on stdin. Preflight queries are:

```sql
SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='cadbimoz_backend_dev';
SELECT User, Host FROM mysql.user WHERE User='cadbimoz_backend_dev';
```

If either resource exists, it stops without changing it. Otherwise it executes:

```sql
CREATE DATABASE cadbimoz_backend_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cadbimoz_backend_dev'@'127.0.0.1' IDENTIFIED BY '<generated local password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON cadbimoz_backend_dev.* TO 'cadbimoz_backend_dev'@'127.0.0.1';
```

It then runs `mariadb --defaults-file=<temporary mode-600 client.cnf> --batch
--skip-column-names --execute='SELECT DATABASE(), CURRENT_USER(); SELECT COUNT(*)
FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE();'` to verify the
local TCP account and zero tables. Passwords are not placed in command arguments
or printed. Partial failures retain the local credentials for manual recovery;
do not rerun blindly because MariaDB DDL is not transactional.

The database setup script creates no tables. The runtime user has no schema-changing
privileges.

## Fresh local schema

After approving the target and schema, validate the local connection without applying DDL:

```sh
CRM_LOCAL=1 python3 backend/scripts/apply-local-schema.py
```

Apply the schema only to the empty isolated database:

```sh
CRM_LOCAL=1 python3 backend/scripts/apply-local-schema.py --apply
```

The script validates `.env.local`, checks the pinned schema digest, verifies that local
TCP and root Unix-socket connections identify the same server/database, and requires
an empty database. It uses sudo for the schema operation. It creates and verifies
`leads`, `ebook_tokens`, `crm_users`, and `crm_sessions`, including their foreign keys
and zero initial records. Temporary client credentials have mode 600 and are cleaned up.
DDL can partially succeed; investigate a failure before retrying.

`migrations/local_schema.sql` already includes the authentication tables. Do not also
apply `migrations/001_crm_auth.sql`; that is the alternative auth-only migration for an
approved local database that already has the application tables but lacks auth tables.

## Administrator and application

For a fresh database, create the first administrator in an interactive terminal:

```sh
CRM_LOCAL=1 npm --prefix backend run admin:create -- --local
```

The command validates the local target, requires typed confirmation, hides password
input, hashes with Argon2id, and refuses if any CRM user exists.
To reset the single existing local administrator's password:

```sh
CRM_LOCAL=1 npm --prefix backend run admin:reset-password
```

The reset requires an interactive terminal and local development configuration. It
updates the password hash and revokes that administrator's sessions in one transaction.

Start the application with Node 22:

```sh
npm --prefix backend run dev:local
```

Open http://127.0.0.1:3002/crm/. The frontend uses the same origin for API requests.

This start command explicitly sets `CRM_LOCAL=1`. Missing or invalid local configuration aborts
before pool creation; credentials cannot fall back to inherited environment values.
The first-admin script uses the same validation. The ordinary start command still
uses the existing remote configuration and must not be used for local development.
Never use a production tunnel. Neither setup mode reads `backend/.env` or accesses
the WordPress database `cadbimoz_dev`.

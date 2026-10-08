#!/usr/bin/env python3
"""Create the approved empty local development database; never run migrations."""
import argparse
import os
import re
from pathlib import Path
import secrets
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / '.env.local'
ADMIN = ['sudo', '-n', 'mariadb', '--no-defaults', '--protocol=socket',
         '--batch', '--skip-column-names']


def admin(sql):
    result = subprocess.run(ADMIN, input=sql, text=True, capture_output=True)
    if result.returncode:
        # Do not print SQL/errors that might contain the generated password.
        raise RuntimeError('Local MariaDB administrative command failed; details withheld to protect credentials.')
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser(description='Prepare local credentials without DB access; --apply requires prior approval.')
    parser.add_argument('--apply', action='store_true', help='After approval: create the empty local database and account')
    args = parser.parse_args()
    if args.apply:
        apply()
        return
    if ENV.exists():
        raise RuntimeError('backend/.env.local already exists; refusing to overwrite it.')
    password = secrets.token_hex(32)
    config = (
        'CRM_LOCAL=1\nNODE_ENV=development\nDB_HOST=127.0.0.1\nDB_PORT=3306\n'
        'DB_NAME=cadbimoz_backend_dev\nDB_USER=cadbimoz_backend_dev\n'
        f'DB_PASSWORD={password}\nPORT=3002\n'
        'CORS_ALLOWED_ORIGINS=http://localhost:3002,http://127.0.0.1:3002,'
        'http://localhost:5500,http://127.0.0.1:5500\n'
    )
    # Preserve the credential before DDL, which is not transactional. Exclusive creation
    # avoids replacing any existing local configuration, including concurrent setup.
    fd = os.open(ENV, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(config)
    print('Prepared backend/.env.local with mode 600. No database connection or changes.')
    print('After approval only: python3 backend/scripts/setup-local-db.py --apply')


def apply():
    # Read only the separately prepared local configuration. Never read backend/.env.
    config = dict(line.split('=', 1) for line in ENV.read_text().splitlines()
                  if line and not line.startswith('#'))
    expected = {'DB_HOST': '127.0.0.1', 'DB_PORT': '3306',
                'DB_NAME': 'cadbimoz_backend_dev', 'DB_USER': 'cadbimoz_backend_dev'}
    if any(config.get(key) != value for key, value in expected.items()):
        raise RuntimeError('Unexpected local database configuration; refusing database access.')
    password = config.get('DB_PASSWORD', '')
    if not re.fullmatch(r'[0-9a-f]{64}', password):
        raise RuntimeError('Expected the separately generated local password.')
    subprocess.run(['sudo', '-v'], check=True)
    existing = admin("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='cadbimoz_backend_dev';\n"
                     "SELECT User, Host FROM mysql.user WHERE User='cadbimoz_backend_dev';\n")
    if existing:
        raise RuntimeError('The database or user already exists; refusing to change existing resources.')
    try:
        admin(
            'CREATE DATABASE cadbimoz_backend_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n'
            "CREATE USER 'cadbimoz_backend_dev'@'127.0.0.1' IDENTIFIED BY '" + password + "';\n"
            "GRANT SELECT, INSERT, UPDATE, DELETE ON cadbimoz_backend_dev.* TO 'cadbimoz_backend_dev'@'127.0.0.1';\n"
        )
        # Credentials stay out of process arguments and terminal output.
        with tempfile.TemporaryDirectory(prefix='cadbimoz-local-') as directory:
            client = Path(directory) / 'client.cnf'
            fd = os.open(client, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as handle:
                handle.write('[client]\nprotocol=tcp\nhost=127.0.0.1\nport=3306\n'
                             'user=cadbimoz_backend_dev\ndatabase=cadbimoz_backend_dev\n'
                             f'password={password}\n')
            result = subprocess.run(
                ['mariadb', f'--defaults-file={client}', '--batch', '--skip-column-names',
                 '--execute=SELECT DATABASE(), CURRENT_USER(); SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE();'],
                text=True, capture_output=True)
            if result.returncode:
                raise RuntimeError('Local TCP verification failed.')
            lines = result.stdout.strip().splitlines()
            if lines != ['cadbimoz_backend_dev\tcadbimoz_backend_dev@127.0.0.1', '0']:
                raise RuntimeError('Unexpected database, account or table count during verification.')
        print('Verified: cadbimoz_backend_dev at 127.0.0.1:3306, user cadbimoz_backend_dev@127.0.0.1, zero tables.')
        print('Existing backend/.env.local retained. No migration was executed.')
    except Exception:
        print('Setup incomplete. Retained backend/.env.local for recovery; do not delete it or rerun blindly.')
        raise


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f'Setup stopped: {error}')
        raise SystemExit(1)

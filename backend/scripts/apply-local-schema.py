#!/usr/bin/env python3
"""Apply the approved schema using existing sudo/socket root access; no seeds."""
import argparse
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DATABASE = 'cadbimoz_backend_dev'
TABLES = ['crm_sessions', 'crm_users', 'ebook_tokens', 'leads']
SCHEMA_SHA256 = 'e92758644d0db8e956270e7ccd1ff68e8749c30334fbfadb1c227018f085d920'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if os.environ.get('CRM_LOCAL') != '1':
        raise RuntimeError('CRM_LOCAL=1 is required.')
    # Never load backend/.env or inherited DB settings.
    config = dict(line.split('=', 1) for line in (ROOT / '.env.local').read_text().splitlines()
                  if line and not line.startswith('#'))
    expected = {'CRM_LOCAL': '1', 'DB_HOST': '127.0.0.1', 'DB_PORT': '3306',
                'DB_NAME': DATABASE, 'DB_USER': DATABASE}
    if any(config.get(key) != value for key, value in expected.items()):
        raise RuntimeError('Local configuration does not match the approved target.')
    password = config.get('DB_PASSWORD', '')
    if not re.fullmatch('[0-9a-f]{64}', password):
        raise RuntimeError('Invalid local password format.')
    with tempfile.TemporaryDirectory(prefix='cadbimoz-schema-') as directory:
        client = Path(directory) / 'client.cnf'
        fd = os.open(client, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as handle:
            handle.write('[client]\nprotocol=tcp\nhost=127.0.0.1\nport=3306\n'
                         f'database={DATABASE}\nuser={DATABASE}\npassword={password}\n')

        def query(sql):
            result = subprocess.run(['mariadb', f'--defaults-file={client}',
                                     '--batch', '--skip-column-names'],
                                    input=sql, text=True, capture_output=True)
            if result.returncode:
                raise RuntimeError('Local read-only verification failed; credentials withheld.')
            return result.stdout.strip()

        if query('SELECT DATABASE();') != DATABASE:
            raise RuntimeError('Unexpected connected database.')
        tables = query('SHOW TABLES;').splitlines()
        if not args.apply:
            print(f'Validated local connection: 127.0.0.1:3306/{DATABASE}')
            print(f'SHOW TABLES: {tables}; no schema executed.')
            return
        if tables:
            raise RuntimeError('Database is not empty; refusing to modify existing tables.')
        schema = (ROOT / 'migrations/local_schema.sql').read_bytes()
        if hashlib.sha256(schema).hexdigest() != SCHEMA_SHA256:
            raise RuntimeError('SQL differs from the approved four-table schema; refusing execution.')
        sql = schema.decode('utf-8')
        # Discover the socket from the already-validated loopback TCP server.
        socket = query('SELECT @@socket;')
        if not Path(socket).is_absolute() or not Path(socket).is_socket():
            raise RuntimeError('Expected an existing absolute local Unix socket path.')
        identity_sql = 'SELECT DATABASE(), @@port, @@datadir, @@socket;'
        tcp_identity = query(identity_sql)
        if subprocess.run(['sudo', '-v']).returncode:
            raise RuntimeError('Local sudo authentication failed; no DDL executed.')
        admin = ['sudo', '-n', 'mariadb', '--no-defaults', '--protocol=SOCKET',
                 f'--socket={socket}', '--user=root', f'--database={DATABASE}',
                 '--batch', '--skip-column-names']
        # Root must see the same server/database and an empty schema before DDL.
        preflight = subprocess.run(admin, input=identity_sql + '\nSHOW TABLES;',
                                   text=True, capture_output=True)
        if preflight.returncode or preflight.stdout.strip() != tcp_identity:
            raise RuntimeError('Socket target differs, is not empty, or root access failed; no DDL executed.')
        print(f'Creating only the four approved tables in {DATABASE} via local Unix socket.', flush=True)
        result = subprocess.run(admin, input=sql, text=True)
        if result.returncode:
            raise RuntimeError('Schema application stopped. DDL may be partial; do not rerun blindly.')
        tables = query('SHOW TABLES;').splitlines()
        print('SHOW TABLES:\n' + '\n'.join(tables))
        if sorted(tables) != TABLES:
            raise RuntimeError('Expected exactly the four approved tables.')
        for table in TABLES:
            print(query(f'SHOW CREATE TABLE `{table}`;'))
            count = query(f'SELECT COUNT(*) FROM `{table}`;')
            print(f'{table}: {count} records')
            if count != '0':
                raise RuntimeError('Expected zero records in every table.')
        relationships = query('''
SELECT k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME,
       k.REFERENCED_COLUMN_NAME, r.DELETE_RULE, r.UPDATE_RULE
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.REFERENTIAL_CONSTRAINTS r
  ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
 AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY k.TABLE_NAME;
''').splitlines()
        if relationships != [
            'crm_sessions\tuser_id\tcrm_users\tid\tCASCADE\tRESTRICT',
            'ebook_tokens\tlead_id\tleads\tid\tCASCADE\tCASCADE',
        ]:
            raise RuntimeError('Foreign-key relationships differ from the approved schema.')
        print('Verified foreign keys:\n' + '\n'.join(relationships))
        print('Verified exactly four empty tables. No administrator or test data created.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        print(f'Stopped: {error}')
        raise SystemExit(1)

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

type Migration = {
  version: string;
  filename: string;
  sql: string;
  checksum: string;
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(currentDirectory, '../../../database/migrations');
const migrationFilename = /^(\d+)_([a-z0-9_]+)\.sql$/;
const migrationLockId = '4815162342';

async function loadMigrations(): Promise<Migration[]> {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => migrationFilename.test(filename))
    .sort((left, right) => left.localeCompare(right));

  const migrations = await Promise.all(
    filenames.map(async (filename) => {
      const match = migrationFilename.exec(filename);

      if (!match) {
        throw new Error(`Nome de migration inválido: ${filename}`);
      }

      const sql = await readFile(resolve(migrationsDirectory, filename), 'utf8');

      if (!sql.trim()) {
        throw new Error(`A migration ${filename} está vazia.`);
      }

      return {
        version: match[1],
        filename,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    })
  );

  const versions = new Set<string>();

  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`Versão de migration duplicada: ${migration.version}`);
    }

    versions.add(migration.version);
  }

  return migrations;
}

async function migrate() {
  const migrations = await loadMigrations();
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query<{
      version: string;
      filename: string;
      checksum: string;
    }>('SELECT version, filename, checksum FROM schema_migrations');
    const appliedMigrations = new Map(
      appliedResult.rows.map((migration) => [migration.version, migration])
    );

    for (const migration of migrations) {
      const applied = appliedMigrations.get(migration.version);

      if (applied) {
        if (applied.filename !== migration.filename || applied.checksum !== migration.checksum) {
          throw new Error(
            `A migration aplicada ${migration.version} foi alterada (${migration.filename}). ` +
              'Crie uma nova migration em vez de modificar o histórico.'
          );
        }

        continue;
      }

      await client.query('BEGIN');

      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations (version, filename, checksum)
           VALUES ($1, $2, $3)`,
          [migration.version, migration.filename, migration.checksum]
        );
        await client.query('COMMIT');
        console.log(`Migration aplicada: ${migration.filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId]).catch(() => undefined);
    client.release();
  }
}

migrate()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

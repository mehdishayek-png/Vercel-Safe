#!/usr/bin/env node
/**
 * Minimal forward-only SQL migration runner.
 *
 * Applies every .sql file in db/migrations/ (lexical order) that has not yet been
 * recorded in the _migrations table. Idempotent: re-running is a no-op.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate.mjs
 *
 * Local runs must use the Railway public proxy URL. The deployed app uses the
 * internal DATABASE_URL reference variable.
 */

import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
}

const isPublicProxy = /proxy\.rlwy\.net|\.railway\.app/.test(connectionString);

const client = new pg.Client({
    connectionString,
    ssl: isPublicProxy ? { rejectUnauthorized: false } : undefined,
});

async function main() {
    await client.connect();

    await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            name        TEXT PRIMARY KEY,
            applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    const applied = new Set(
        (await client.query('SELECT name FROM _migrations')).rows.map((r) => r.name)
    );

    const files = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    let ran = 0;
    for (const file of files) {
        if (applied.has(file)) {
            console.log(`• skip   ${file} (already applied)`);
            continue;
        }
        const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
        console.log(`▶ apply  ${file}`);
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            ran++;
            console.log(`✓ done   ${file}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`✗ FAILED ${file}: ${err.message}`);
            throw err;
        }
    }

    console.log(`\nMigrations complete: ${ran} applied, ${files.length - ran} skipped.`);
}

main()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(() => client.end());

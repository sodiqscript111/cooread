import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

export interface Queryable {
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
    /** Runs one or more statements without parameters. */
    exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
    transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
    close(): Promise<void>;
}

export function createPgDb(connectionString: string, ssl: boolean): Db {
    const pool = new pg.Pool({
        connectionString,
        // Managed Postgres (Supabase, Neon, ...) uses certificates that aren't in Node's store.
        ssl: ssl ? { rejectUnauthorized: false } : false,
        max: 10,
    });

    return {
        async query<T>(sql: string, params?: unknown[]) {
            const result = await pool.query(sql, params);
            return { rows: result.rows as T[] };
        },
        async exec(sql) {
            await pool.query(sql);
        },
        async transaction(fn) {
            const client = await pool.connect();
            const tx: Queryable = {
                async query<T>(sql: string, params?: unknown[]) {
                    const result = await client.query(sql, params);
                    return { rows: result.rows as T[] };
                },
                async exec(sql) {
                    await client.query(sql);
                },
            };
            try {
                await client.query('BEGIN');
                const result = await fn(tx);
                await client.query('COMMIT');
                return result;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        },
        close: () => pool.end(),
    };
}

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../migrations');

/** Applies every migrations/*.sql file that hasn't run yet, each in its own transaction. */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    const { rows } = await db.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort();
    const ran: string[] = [];

    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await readFile(path.join(dir, file), 'utf8');
        await db.transaction(async (tx) => {
            await tx.exec(sql);
            await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        });
        ran.push(file);
    }

    return ran;
}

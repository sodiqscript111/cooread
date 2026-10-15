import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS_DIR } from '../src/db';
import { createPgliteDb } from './helpers';

describe('migrations', () => {
    it('upgrade a database created by the original server.js', async () => {
        const db = createPgliteDb();
        // Recreate the production state: legacy tables with data, no schema_migrations table.
        await db.exec(await readFile(path.join(MIGRATIONS_DIR, '001_baseline.sql'), 'utf8'));
        await db.exec(`
            INSERT INTO users (email, monthly_usage, last_reset_month) VALUES ('old@example.com', 5, 6);
            INSERT INTO articles (id, url, title, summary, category)
                VALUES ('a1', 'https://example.com/old', 'Old', 'Old summary', NULL);
            INSERT INTO user_saved_articles (user_email, article_id) VALUES ('old@example.com', 'a1');
            INSERT INTO waitlist (email) VALUES ('wait@example.com');
        `);

        const applied = await migrate(db);
        expect(applied).toEqual(['001_baseline.sql', '002_accounts_and_progress.sql']);

        const { rows } = await db.query<{ summary_status: string; category: string }>(
            'SELECT summary_status, category FROM articles WHERE id = $1', ['a1']);
        expect(rows[0]).toEqual({ summary_status: 'done', category: 'Uncategorized' });

        const legacy = await db.query('SELECT * FROM legacy_user_saved_articles');
        expect(legacy.rows).toHaveLength(1);
        const waitlist = await db.query('SELECT * FROM waitlist');
        expect(waitlist.rows).toHaveLength(1);

        // Running again is a no-op.
        expect(await migrate(db)).toEqual([]);
        await db.close();
    });
});

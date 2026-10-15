import { randomBytes } from 'node:crypto';
import type {
    LibraryArticle,
    LibraryResponse,
    ShareResponse,
    SharedLibraryResponse,
    SummaryStatus,
} from '@coreeder/shared';
import { Router } from 'express';
import type { Db } from '../db';
import { HttpError, parseBody } from '../errors';
import { ShareSchema } from '../schemas';

interface LibraryRow {
    id: string;
    url: string;
    title: string;
    summary: string | null;
    summary_status: SummaryStatus;
    category: string;
    saved_at: Date;
    last_read_index: number;
    total_paragraphs: number;
    anchor_text: string | null;
}

const LIBRARY_COLUMNS = `
    a.id, a.url, a.title, a.summary, a.summary_status, a.category,
    s.saved_at, s.last_read_index, s.total_paragraphs, s.anchor_text`;

/** Routes for the signed-in user's own library. */
export function libraryRouter({ db }: { db: Db }): Router {
    const router = Router();

    /** GET /api/library — saved articles grouped by category, newest first. */
    router.get('/', async (req, res) => {
        const { rows } = await db.query<LibraryRow>(
            `SELECT ${LIBRARY_COLUMNS}
             FROM saved_articles s JOIN articles a ON a.id = s.article_id
             WHERE s.user_id = $1
             ORDER BY s.saved_at DESC`,
            [req.user!.id],
        );

        const library: LibraryResponse['library'] = {};
        for (const row of rows) {
            const article = toLibraryArticle(row);
            (library[article.category] ??= []).push(article);
        }
        res.json({ library } satisfies LibraryResponse);
    });

    /** DELETE /api/library/:articleId — remove an article from the library. */
    router.delete('/:articleId', async (req, res) => {
        await db.query('DELETE FROM saved_articles WHERE user_id = $1 AND article_id = $2', [req.user!.id, req.params.articleId]);
        res.status(204).end();
    });

    /** POST /api/library/share — get (or create) the public link for one category. */
    router.post('/share', async (req, res) => {
        const { category } = parseBody(ShareSchema, req.body);
        const { rows } = await db.query<{ token: string }>(
            `INSERT INTO shares (token, user_id, category) VALUES ($1, $2, $3)
             ON CONFLICT (user_id, category) DO UPDATE SET category = EXCLUDED.category
             RETURNING token`,
            [randomBytes(12).toString('base64url'), req.user!.id, category],
        );
        res.json({ token: rows[0]!.token } satisfies ShareResponse);
    });

    return router;
}

/** GET /api/shared/:token — a public, read-only view of one shared category. */
export function sharedRouter({ db }: { db: Db }): Router {
    const router = Router();

    router.get('/:token', async (req, res) => {
        const share = await db.query<{ user_id: string; category: string }>(
            'SELECT user_id, category FROM shares WHERE token = $1',
            [req.params.token],
        );
        const found = share.rows[0];
        if (!found) throw new HttpError(404, 'not_found', 'This shared library could not be found.');

        const { rows } = await db.query<LibraryRow>(
            `SELECT ${LIBRARY_COLUMNS}
             FROM saved_articles s JOIN articles a ON a.id = s.article_id
             WHERE s.user_id = $1 AND a.category = $2
             ORDER BY s.saved_at DESC`,
            [found.user_id, found.category],
        );

        // Deliberately excludes the owner's email and reading progress.
        res.json({
            category: found.category,
            articles: rows.map((row) => ({
                id: row.id,
                url: row.url,
                title: row.title,
                summary: row.summary,
                category: row.category,
                savedAt: new Date(row.saved_at).toISOString(),
            })),
        } satisfies SharedLibraryResponse);
    });

    return router;
}

function toLibraryArticle(row: LibraryRow): LibraryArticle {
    return {
        id: row.id,
        url: row.url,
        title: row.title,
        summary: row.summary,
        summaryStatus: row.summary_status,
        category: row.category,
        savedAt: new Date(row.saved_at).toISOString(),
        lastReadIndex: row.last_read_index,
        totalParagraphs: row.total_paragraphs,
        anchorText: row.anchor_text,
    };
}

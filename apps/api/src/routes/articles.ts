import { randomUUID } from 'node:crypto';
import { LIMITS, normalizeUrl, type SaveArticleResponse } from '@coreeder/shared';
import { Router } from 'express';
import type { Db } from '../db';
import { HttpError, parseBody } from '../errors';
import { ProgressSchema, SaveArticleSchema } from '../schemas';
import type { Summarizer } from '../summarizer';

interface Deps {
    db: Db;
    summarizer: Summarizer;
}

const ANCHOR_CHARS = 200;

// Progress only moves forward: re-opening an article and reading the intro
// again shouldn't lose your place.
const MERGE_PROGRESS = `
    last_read_index = GREATEST(saved_articles.last_read_index, EXCLUDED.last_read_index),
    total_paragraphs = EXCLUDED.total_paragraphs,
    anchor_text = CASE WHEN EXCLUDED.last_read_index >= saved_articles.last_read_index
                       THEN EXCLUDED.anchor_text ELSE saved_articles.anchor_text END,
    progress_updated_at = now()`;

export function articlesRouter({ db, summarizer }: Deps): Router {
    const router = Router();

    /** POST /api/articles — save the current article to the user's library. */
    router.post('/', async (req, res) => {
        const userId = req.user!.id;
        const body = parseBody(SaveArticleSchema, req.body);
        const url = requireUrl(body.url);
        const content = body.paragraphs.join('\n\n').slice(0, LIMITS.maxArticleChars);
        const lastReadIndex = Math.min(body.lastReadIndex, body.paragraphs.length - 1);
        const anchorText = body.paragraphs[lastReadIndex]?.slice(0, ANCHOR_CHARS) ?? null;

        const result = await db.transaction(async (tx) => {
            const article = await tx.query<{ id: string; summary_status: string }>(
                `INSERT INTO articles (id, url, title, content) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (url) DO UPDATE SET content = COALESCE(articles.content, EXCLUDED.content)
                 RETURNING id, summary_status`,
                [randomUUID(), url, body.title, content],
            );
            const { id, summary_status } = article.rows[0]!;

            const saved = await tx.query<{ inserted: boolean }>(
                `INSERT INTO saved_articles (user_id, article_id, last_read_index, total_paragraphs, anchor_text)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, article_id) DO UPDATE SET ${MERGE_PROGRESS}
                 RETURNING (xmax = 0) AS inserted`,
                [userId, id, lastReadIndex, body.paragraphs.length, anchorText],
            );

            return { id, summaryStatus: summary_status, inserted: saved.rows[0]!.inserted };
        });

        if (result.summaryStatus === 'pending' || result.summaryStatus === 'failed') {
            summarizer.enqueue(result.id);
        }

        const response: SaveArticleResponse = { articleId: result.id, alreadySaved: !result.inserted };
        res.status(result.inserted ? 201 : 200).json(response);
    });

    /** POST /api/articles/progress — record how far the user has read a saved article. */
    router.post('/progress', async (req, res) => {
        const userId = req.user!.id;
        const body = parseBody(ProgressSchema, req.body);
        const url = requireUrl(body.url);

        const { rows } = await db.query(
            `INSERT INTO saved_articles (user_id, article_id, last_read_index, total_paragraphs, anchor_text)
             SELECT $1, a.id, $3, $4, $5 FROM articles a
             JOIN saved_articles s ON s.article_id = a.id AND s.user_id = $1
             WHERE a.url = $2
             ON CONFLICT (user_id, article_id) DO UPDATE SET ${MERGE_PROGRESS}
             RETURNING article_id`,
            [userId, url, body.lastReadIndex, body.totalParagraphs, body.anchorText.slice(0, ANCHOR_CHARS) || null],
        );
        if (rows.length === 0) throw new HttpError(404, 'not_found', 'This article is not in your library.');

        res.status(204).end();
    });

    return router;
}

function requireUrl(raw: string): string {
    const url = normalizeUrl(raw);
    if (!url) throw new HttpError(400, 'invalid_request', 'Only http(s) pages can be saved.');
    return url;
}

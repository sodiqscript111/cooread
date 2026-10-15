import type { AiProvider } from './ai';
import type { Db } from './db';

/** Characters of article text sent to the model for summaries. */
const SUMMARY_INPUT_CHARS = 6_000;

export interface Summarizer {
    /** Summarizes the article in the background if it still needs it. */
    enqueue(articleId: string): void;
    /** Re-queues work interrupted by a restart. */
    resumePending(): Promise<void>;
    /** Resolves once all queued work has finished (used by tests and shutdown). */
    idle(): Promise<void>;
}

export function createSummarizer(db: Db, ai: AiProvider): Summarizer {
    const inFlight = new Set<Promise<void>>();

    async function run(articleId: string): Promise<void> {
        // Claim the article so concurrent saves don't summarize it twice.
        const { rows } = await db.query<{ title: string; content: string | null }>(
            `UPDATE articles SET summary_status = 'processing'
             WHERE id = $1 AND summary_status IN ('pending', 'failed')
             RETURNING title, content`,
            [articleId],
        );
        const article = rows[0];
        if (!article) return;

        try {
            const result = await ai.summarize(article.title, (article.content ?? '').slice(0, SUMMARY_INPUT_CHARS));
            await db.query(
                `UPDATE articles SET summary = $2, category = $3, summary_status = 'done' WHERE id = $1`,
                [articleId, result.summary, result.category],
            );
        } catch (err) {
            console.error(`[summarizer] Failed to summarize ${articleId}:`, err);
            await db.query(`UPDATE articles SET summary_status = 'failed' WHERE id = $1`, [articleId]);
        }
    }

    function enqueue(articleId: string): void {
        const job = run(articleId)
            .catch((err) => console.error('[summarizer] Job crashed:', err))
            .finally(() => inFlight.delete(job));
        inFlight.add(job);
    }

    return {
        enqueue,
        async resumePending() {
            await db.query(`UPDATE articles SET summary_status = 'pending' WHERE summary_status = 'processing'`);
            const { rows } = await db.query<{ id: string }>(
                `SELECT id FROM articles WHERE summary_status = 'pending' ORDER BY created_at LIMIT 100`,
            );
            rows.forEach((row) => enqueue(row.id));
        },
        async idle() {
            while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
        },
    };
}

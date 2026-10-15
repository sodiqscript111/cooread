import type { ExplainEvent } from '@coreeder/shared';
import { Router, type Response } from 'express';
import type { AiProvider } from '../ai';
import type { Db } from '../db';
import { HttpError, parseBody } from '../errors';
import { buildExplainMessages, explanationCacheKey } from '../prompt';
import { ExplainSchema } from '../schemas';
import { consumeExplanation, refundExplanation } from '../usage';

interface Deps {
    db: Db;
    ai: AiProvider;
    monthlyLimit: number;
}

/**
 * POST /api/explain — streams an explanation as server-sent events.
 * Errors before the stream starts (auth, validation, limits) are plain JSON
 * responses; errors after it starts arrive as an `error` event.
 */
export function explainRouter({ db, ai, monthlyLimit }: Deps): Router {
    const router = Router();

    router.post('/', async (req, res) => {
        const userId = req.user!.id;
        const body = parseBody(ExplainSchema, req.body);
        const messages = buildExplainMessages(body);
        const cacheKey = explanationCacheKey(ai.model, messages);

        const cached = await db.query<{ text: string }>('SELECT text FROM explanation_cache WHERE key = $1', [cacheKey]);
        if (cached.rows[0]) {
            startStream(res);
            send(res, { type: 'delta', text: cached.rows[0].text });
            send(res, { type: 'done', cached: true, remaining: null });
            res.end();
            return;
        }

        const remaining = await consumeExplanation(db, userId, monthlyLimit);
        if (remaining === null) {
            throw new HttpError(429, 'limit_reached',
                `You've used all ${monthlyLimit} explanations for this month. They reset on the 1st.`);
        }

        const controller = new AbortController();
        res.on('close', () => {
            if (!res.writableFinished) controller.abort();
        });

        startStream(res);
        let text = '';
        try {
            for await (const delta of ai.streamChat(messages, controller.signal)) {
                text += delta;
                send(res, { type: 'delta', text: delta });
            }
            if (!text) throw new Error('The model returned an empty response.');

            await db.query(
                'INSERT INTO explanation_cache (key, text) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                [cacheKey, text],
            );
            send(res, { type: 'done', cached: false, remaining });
        } catch (err) {
            if (!text) await refundExplanation(db, userId);
            if (!controller.signal.aborted) {
                console.error('[explain] Model call failed:', err);
                send(res, { type: 'error', message: 'Could not generate an explanation. Please try again.' });
            }
        }
        res.end();
    });

    return router;
}

function startStream(res: Response): void {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Stop reverse proxies (nginx and friends) from buffering the stream.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
}

function send(res: Response, event: ExplainEvent): void {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

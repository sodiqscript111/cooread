import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AiProvider } from './ai';
import { requireAuth, type TokenVerifier } from './auth';
import type { Db } from './db';
import { errorHandler, HttpError, parseBody } from './errors';
import { articlesRouter } from './routes/articles';
import { explainRouter } from './routes/explain';
import { libraryRouter, sharedRouter } from './routes/library';
import { WaitlistSchema } from './schemas';
import type { Summarizer } from './summarizer';

export interface AppDeps {
    db: Db;
    ai: AiProvider;
    verifyToken: TokenVerifier;
    summarizer: Summarizer;
    corsOrigins: string[];
    monthlyLimit: number;
    trustProxy?: number;
    /** Set to false in tests so suites don't trip the per-IP limits. */
    rateLimits?: boolean;
}

export function createApp(deps: AppDeps): express.Express {
    const { db, corsOrigins } = deps;
    const app = express();
    const limit = (options: Parameters<typeof rateLimit>[0]) =>
        deps.rateLimits === false ? passThrough : rateLimit({ standardHeaders: 'draft-8', legacyHeaders: false, ...options });

    app.disable('x-powered-by');
    app.set('trust proxy', deps.trustProxy ?? 1);

    const allowedOrigins = new Set(corsOrigins);
    app.use(cors({
        origin: (origin, callback) => {
            // No Origin: server-to-server or the extension's service worker.
            callback(null, !origin || allowedOrigins.has(origin) || origin.startsWith('chrome-extension://'));
        },
    }));
    app.use(express.json({ limit: '2mb' }));

    app.get('/', (_req, res) => {
        res.json({ status: 'ok', service: 'coreeder-api' });
    });

    app.use('/api', limit({ windowMs: 60_000, limit: 300 }));

    app.post('/api/waitlist', limit({ windowMs: 15 * 60_000, limit: 10 }), async (req, res) => {
        const { email } = parseBody(WaitlistSchema, req.body);
        const { rows } = await db.query(
            'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING email',
            [email],
        );
        res.json({ success: true, message: rows.length ? 'Joined waitlist successfully' : 'Already on the waitlist!' });
    });

    app.use('/api/shared', sharedRouter({ db }));

    const auth = requireAuth(deps.verifyToken, db);
    const perUser = (windowMs: number, max: number) => limit({
        windowMs,
        limit: max,
        keyGenerator: (req) => req.user!.id,
        message: { error: 'Slow down a little and try again in a minute.', code: 'rate_limited' },
    });

    app.use('/api/explain', auth, perUser(60_000, 20), explainRouter({ db, ai: deps.ai, monthlyLimit: deps.monthlyLimit }));
    app.use('/api/articles', auth, perUser(60_000, 60), articlesRouter({ db, summarizer: deps.summarizer }));
    app.use('/api/library', auth, perUser(60_000, 60), libraryRouter({ db }));

    app.use((_req, _res, next) => next(new HttpError(404, 'not_found', 'Not found')));
    app.use(errorHandler);

    return app;
}

const passThrough: express.RequestHandler = (_req, _res, next) => next();

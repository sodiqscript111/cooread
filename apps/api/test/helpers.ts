import { PGlite } from '@electric-sql/pglite';
import { SignJWT } from 'jose';
import type { AiProvider, ArticleSummary, ChatMessage } from '../src/ai';
import { createApp } from '../src/app';
import { createSupabaseVerifier } from '../src/auth';
import { migrate, type Db, type Queryable } from '../src/db';
import { createSummarizer } from '../src/summarizer';

const SUPABASE_URL = 'https://test.supabase.co';
const JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';

export function createPgliteDb(): Db {
    const pg = new PGlite();
    const wrap = (target: Pick<PGlite, 'query' | 'exec'>): Queryable => ({
        async query<T>(sql: string, params?: unknown[]) {
            const result = await target.query<T>(sql, params as unknown[]);
            return { rows: result.rows };
        },
        async exec(sql: string) {
            await target.exec(sql);
        },
    });
    return {
        ...wrap(pg),
        transaction: (fn) => pg.transaction((tx) => fn(wrap(tx))),
        close: () => pg.close(),
    };
}

export class FakeAi implements AiProvider {
    readonly model = 'fake-model';
    calls: ChatMessage[][] = [];
    reply = 'This passage means something.';
    failWith: Error | null = null;
    summary: ArticleSummary = { summary: 'A short summary.', category: 'Technology' };

    async *streamChat(messages: ChatMessage[]) {
        this.calls.push(messages);
        if (this.failWith) throw this.failWith;
        for (const word of this.reply.split(/(?<= )/)) yield word;
    }

    async summarize() {
        return this.summary;
    }
}

export async function signToken(userId: string, email = `${userId}@example.com`, expiresIn = '1h') {
    return new SignJWT({ email, role: 'authenticated' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuer(`${SUPABASE_URL}/auth/v1`)
        .setAudience('authenticated')
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(new TextEncoder().encode(JWT_SECRET));
}

/** A migrated in-memory database. Boot once per test file; call resetDb between tests. */
export async function createMigratedDb(): Promise<Db> {
    const db = createPgliteDb();
    await migrate(db);
    return db;
}

export async function resetDb(db: Db): Promise<void> {
    await db.exec('TRUNCATE users, usage, articles, saved_articles, shares, explanation_cache, waitlist CASCADE');
}

export function createTestApp(db: Db, { monthlyLimit = 50 } = {}) {
    const ai = new FakeAi();
    const summarizer = createSummarizer(db, ai);
    const app = createApp({
        db,
        ai,
        summarizer,
        verifyToken: createSupabaseVerifier(SUPABASE_URL, JWT_SECRET),
        corsOrigins: ['http://localhost:5173'],
        monthlyLimit,
        rateLimits: false,
    });
    return { app, db, ai, summarizer };
}

/** Parses a text/event-stream body into its JSON events. */
export function parseSse(body: string): unknown[] {
    return body
        .split('\n\n')
        .map((block) => block.trim())
        .filter((block) => block.startsWith('data: '))
        .map((block) => JSON.parse(block.slice('data: '.length)));
}

export const USER_A = '00000000-0000-4000-8000-00000000000a';
export const USER_B = '00000000-0000-4000-8000-00000000000b';

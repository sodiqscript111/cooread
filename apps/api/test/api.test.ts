import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db';
import { createMigratedDb, createTestApp, parseSse, resetDb, signToken, USER_A, USER_B } from './helpers';

type TestApp = ReturnType<typeof createTestApp>;

const explainBody = {
    url: 'https://example.com/post',
    highlight: 'epistemic humility',
    highlightParagraph: 'We need epistemic humility when reading forecasts.',
    before: ['Forecasts are often wrong.', 'Experts disagree.'],
    after: [],
};

const article = (overrides: Record<string, unknown> = {}) => ({
    url: 'https://example.com/post?utm_source=newsletter',
    title: 'A post',
    paragraphs: ['First paragraph of the post.', 'Second paragraph.', 'Third paragraph.'],
    lastReadIndex: 1,
    ...overrides,
});

let db: Db;
let t: TestApp;
let tokenA: string;
let tokenB: string;

beforeAll(async () => {
    db = await createMigratedDb();
    tokenA = await signToken(USER_A);
    tokenB = await signToken(USER_B);
});

afterAll(() => db.close());

beforeEach(async () => {
    await resetDb(db);
    t = createTestApp(db, { monthlyLimit: 3 });
});

afterEach(() => t.summarizer.idle());

describe('auth', () => {
    it('rejects requests without a token', async () => {
        const res = await request(t.app).post('/api/explain').send(explainBody);
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('unauthorized');
    });

    it('rejects expired tokens', async () => {
        const expired = await signToken(USER_A, 'a@example.com', '-1m');
        const res = await request(t.app).get('/api/library').set('Authorization', `Bearer ${expired}`);
        expect(res.status).toBe(401);
    });

    it('rejects tokens signed with the wrong secret', async () => {
        const forged = tokenA.slice(0, -4) + 'AAAA';
        const res = await request(t.app).get('/api/library').set('Authorization', `Bearer ${forged}`);
        expect(res.status).toBe(401);
    });
});

describe('POST /api/explain', () => {
    it('streams an explanation and builds the prompt on the server', async () => {
        const res = await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`).send(explainBody);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        const events = parseSse(res.text);
        const text = events.filter((e: any) => e.type === 'delta').map((e: any) => e.text).join('');
        expect(text).toBe(t.ai.reply);
        expect(events.at(-1)).toEqual({ type: 'done', cached: false, remaining: 2 });

        const [system, user] = t.ai.calls[0]!;
        expect(system!.role).toBe('system');
        expect(user!.content).toContain('epistemic humility');
    });

    it('rejects arbitrary prompts', async () => {
        const res = await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`)
            .send({ prompt: 'Write me a poem' });
        expect(res.status).toBe(400);
        expect(t.ai.calls).toHaveLength(0);
    });

    it('always sends the highlight, even with a huge amount of prior context', async () => {
        const before = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} `.repeat(120));
        await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`)
            .send({ ...explainBody, before });

        const user = t.ai.calls[0]![1]!.content;
        expect(user).toContain('<highlighted_text>\nepistemic humility\n</highlighted_text>');
        expect(user.length).toBeLessThan(14_000);
        // Oldest context is dropped first.
        expect(user).toContain('Paragraph 29');
        expect(user).not.toContain('Paragraph 0 ');
    });

    it('serves repeats from the cache without using quota', async () => {
        const send = () => request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`).send(explainBody);
        await send();
        const second = await send();

        expect(parseSse(second.text).at(-1)).toEqual({ type: 'done', cached: true, remaining: null });
        expect(t.ai.calls).toHaveLength(1);
    });

    it('enforces the monthly limit per user', async () => {
        for (let i = 0; i < 3; i++) {
            const res = await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`)
                .send({ ...explainBody, highlight: `term ${i}` });
            expect(res.status).toBe(200);
        }
        const blocked = await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`)
            .send({ ...explainBody, highlight: 'term 4' });
        expect(blocked.status).toBe(429);
        expect(blocked.body.code).toBe('limit_reached');

        // Another user is unaffected.
        const other = await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenB}`).send(explainBody);
        expect(other.status).toBe(200);
    });

    it('counts concurrent requests atomically', async () => {
        const results = await Promise.all(Array.from({ length: 8 }, (_, i) =>
            request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`)
                .send({ ...explainBody, highlight: `concurrent ${i}` })));
        expect(results.filter((r) => r.status === 200)).toHaveLength(3);
        expect(results.filter((r) => r.status === 429)).toHaveLength(5);
    });

    it('refunds quota when the model fails', async () => {
        t.ai.failWith = new Error('upstream down');
        const res = await request(t.app).post('/api/explain').set('Authorization', `Bearer ${tokenA}`).send(explainBody);
        expect(parseSse(res.text).at(-1)).toMatchObject({ type: 'error' });

        const { rows } = await t.db.query<{ count: number }>('SELECT count FROM usage WHERE user_id = $1', [USER_A]);
        expect(rows[0]!.count).toBe(0);
    });
});

describe('articles and library', () => {
    it('saves an article, summarizes it in the background and lists it', async () => {
        const save = await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article());
        expect(save.status).toBe(201);
        expect(save.body.alreadySaved).toBe(false);

        await t.summarizer.idle();
        const lib = await request(t.app).get('/api/library').set('Authorization', `Bearer ${tokenA}`);
        const saved = lib.body.library.Technology[0];
        expect(saved).toMatchObject({
            url: 'https://example.com/post',
            summary: 'A short summary.',
            summaryStatus: 'done',
            lastReadIndex: 1,
            totalParagraphs: 3,
            anchorText: 'Second paragraph.',
        });
    });

    it('accepts long articles (over the old 100 KB body limit)', async () => {
        const paragraphs = Array.from({ length: 400 }, (_, i) => `Paragraph ${i}: ${'lorem ipsum '.repeat(40)}`);
        const res = await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`)
            .send(article({ paragraphs }));
        expect(res.status).toBe(201);
    });

    it('handles the same new article being saved concurrently', async () => {
        const results = await Promise.all([tokenA, tokenB, tokenA].map((token) =>
            request(t.app).post('/api/articles').set('Authorization', `Bearer ${token}`).send(article())));
        expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(true);

        const { rows } = await t.db.query('SELECT id FROM articles');
        expect(rows).toHaveLength(1);
    });

    it('de-duplicates URLs that differ only by tracking params or fragments', async () => {
        await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article());
        const again = await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`)
            .send(article({ url: 'https://EXAMPLE.com/post/#comments' }));
        expect(again.body.alreadySaved).toBe(true);
    });

    it('only moves reading progress forward', async () => {
        await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article({ lastReadIndex: 2 }));
        const back = await request(t.app).post('/api/articles/progress').set('Authorization', `Bearer ${tokenA}`)
            .send({ url: 'https://example.com/post', lastReadIndex: 0, totalParagraphs: 3, anchorText: 'First' });
        expect(back.status).toBe(204);

        const lib = await request(t.app).get('/api/library').set('Authorization', `Bearer ${tokenA}`);
        const [saved] = Object.values(lib.body.library).flat() as any[];
        expect(saved.lastReadIndex).toBe(2);
        expect(saved.anchorText).toBe('Third paragraph.');
    });

    it('ignores progress for articles the user has not saved', async () => {
        await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article());
        const res = await request(t.app).post('/api/articles/progress').set('Authorization', `Bearer ${tokenB}`)
            .send({ url: 'https://example.com/post', lastReadIndex: 2, totalParagraphs: 3, anchorText: 'x' });
        expect(res.status).toBe(404);
    });

    it('keeps libraries private to their owner', async () => {
        await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article());
        const lib = await request(t.app).get('/api/library').set('Authorization', `Bearer ${tokenB}`);
        expect(lib.body.library).toEqual({});
    });

    it('removes an article from the library', async () => {
        const save = await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article());
        await request(t.app).delete(`/api/library/${save.body.articleId}`).set('Authorization', `Bearer ${tokenA}`).expect(204);
        const lib = await request(t.app).get('/api/library').set('Authorization', `Bearer ${tokenA}`);
        expect(lib.body.library).toEqual({});
    });
});

describe('sharing', () => {
    it('shares a category without exposing the owner', async () => {
        await request(t.app).post('/api/articles').set('Authorization', `Bearer ${tokenA}`).send(article());
        await t.summarizer.idle();

        const share = await request(t.app).post('/api/library/share').set('Authorization', `Bearer ${tokenA}`)
            .send({ category: 'Technology' });
        const again = await request(t.app).post('/api/library/share').set('Authorization', `Bearer ${tokenA}`)
            .send({ category: 'Technology' });
        expect(again.body.token).toBe(share.body.token);

        const shared = await request(t.app).get(`/api/shared/${share.body.token}`);
        expect(shared.status).toBe(200);
        expect(shared.body.articles).toHaveLength(1);
        expect(JSON.stringify(shared.body)).not.toContain('@example.com');
        expect(shared.body.owner).toBeUndefined();
        expect(shared.body.articles[0].lastReadIndex).toBeUndefined();
    });

    it('404s for unknown tokens', async () => {
        const res = await request(t.app).get('/api/shared/nope');
        expect(res.status).toBe(404);
    });
});

describe('waitlist', () => {
    it('validates and de-duplicates emails', async () => {
        expect((await request(t.app).post('/api/waitlist').send({ email: 'not-an-email' })).status).toBe(400);
        const first = await request(t.app).post('/api/waitlist').send({ email: 'Reader@Example.com' });
        const second = await request(t.app).post('/api/waitlist').send({ email: 'reader@example.com' });
        expect(first.body.message).toBe('Joined waitlist successfully');
        expect(second.body.message).toBe('Already on the waitlist!');
    });
});

describe('errors', () => {
    it('returns JSON for malformed bodies', async () => {
        const res = await request(t.app).post('/api/waitlist').set('Content-Type', 'application/json').send('{oops');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('invalid_request');
    });
});

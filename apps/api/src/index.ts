import { createOpenAiProvider } from './ai';
import { createApp } from './app';
import { createSupabaseVerifier } from './auth';
import { loadConfig } from './config';
import { createPgDb, migrate } from './db';
import { createSummarizer } from './summarizer';

const config = loadConfig();
const db = createPgDb(config.DATABASE_URL, config.DATABASE_SSL);

const applied = await migrate(db);
if (applied.length) console.log(`[api] Applied migrations: ${applied.join(', ')}`);

const ai = createOpenAiProvider(config.OPENAI_API_KEY, config.OPENAI_MODEL);
const summarizer = createSummarizer(db, ai);
await summarizer.resumePending();

const app = createApp({
    db,
    ai,
    summarizer,
    verifyToken: createSupabaseVerifier(config.SUPABASE_URL, config.SUPABASE_JWT_SECRET),
    corsOrigins: config.CORS_ORIGINS,
    monthlyLimit: config.MONTHLY_EXPLANATION_LIMIT,
    trustProxy: config.TRUST_PROXY,
});

const server = app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`[api] Listening on port ${config.PORT}`);
});

async function shutdown(signal: string) {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    await summarizer.idle();
    await db.close();
    process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

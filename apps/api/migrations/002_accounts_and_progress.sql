-- Real accounts (Supabase user ids instead of self-reported emails),
-- stored article content, reading progress, and an explanation cache.
--
-- The old email-keyed tables only ever held data for a hardcoded test
-- account, so they are kept under a legacy_ prefix rather than migrated.

ALTER TABLE users RENAME TO legacy_users;
ALTER TABLE user_saved_articles RENAME TO legacy_user_saved_articles;
ALTER TABLE shared_libraries RENAME TO legacy_shared_libraries;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per user per calendar month (UTC), e.g. period = '2026-10'.
CREATE TABLE usage (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period)
);

UPDATE articles SET title = url WHERE title IS NULL;
UPDATE articles SET category = 'Uncategorized' WHERE category IS NULL;
DELETE FROM articles WHERE url IS NULL;

ALTER TABLE articles
    ADD COLUMN content TEXT,
    ADD COLUMN summary_status TEXT NOT NULL DEFAULT 'done',
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ALTER COLUMN url SET NOT NULL,
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN category SET NOT NULL,
    ALTER COLUMN category SET DEFAULT 'Uncategorized';

-- Existing rows already have summaries; new rows start pending.
ALTER TABLE articles ALTER COLUMN summary_status SET DEFAULT 'pending';
ALTER TABLE articles ADD CONSTRAINT articles_summary_status_check
    CHECK (summary_status IN ('pending', 'processing', 'done', 'failed'));

CREATE TABLE saved_articles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_index INTEGER NOT NULL DEFAULT -1,
    total_paragraphs INTEGER NOT NULL DEFAULT 0,
    anchor_text TEXT,
    progress_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, article_id)
);
CREATE INDEX saved_articles_user_saved_at ON saved_articles (user_id, saved_at DESC);

CREATE TABLE shares (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, category)
);

CREATE TABLE explanation_cache (
    key TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

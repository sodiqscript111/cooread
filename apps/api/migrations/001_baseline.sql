-- Schema created by the original server.js on boot. On the existing
-- production database this is a no-op; on a fresh database it gives
-- 002 the same starting point.
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    monthly_usage INTEGER DEFAULT 0,
    last_reset_month INTEGER
);

CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    url TEXT UNIQUE,
    title TEXT,
    summary TEXT,
    category TEXT
);

CREATE TABLE IF NOT EXISTS user_saved_articles (
    user_email TEXT,
    article_id TEXT,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_email, article_id)
);

CREATE TABLE IF NOT EXISTS shared_libraries (
    share_token TEXT PRIMARY KEY,
    user_email TEXT,
    category TEXT
);

CREATE TABLE IF NOT EXISTS waitlist (
    email TEXT PRIMARY KEY,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

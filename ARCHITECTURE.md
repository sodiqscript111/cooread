# Architecture

## The core idea

Explanations only use what the reader has already read. The extension knows this because it runs on the page: it extracts the article's paragraphs and tracks the furthest one the reader has reached. Nothing is crawled server-side.

## Explaining a highlight

```
content script                 background worker              API                         OpenAI
──────────────                 ─────────────────              ───                         ──────
extract paragraphs
track reading position
user selects text → "Explain"
build ExplainRequest ──port──▶ add Supabase token ──POST /api/explain──▶ verify token
  (≤30 paragraphs before,                                     validate body (zod)
   ≤1 past the reading line)                                  build prompt (server-side)
                                                              cache hit? → stream it, no quota
                                                              use 1 of 50 monthly (atomic)
                                                              stream ───────────────────▶ chat.completions
render tokens as they arrive ◀──port── forward SSE events ◀── SSE: delta… done ◀────────── stream
```

- **The prompt is built only on the server** ([apps/api/src/prompt.ts](apps/api/src/prompt.ts)). Clients send structured fields, so the API can't be used as a general-purpose GPT proxy. Earlier context is dropped oldest-first to fit a 12k-character budget; the highlight is always kept.
- **Responses stream** as server-sent events. The background worker reads the stream and forwards it over a runtime port. Closing the tooltip disconnects the port, which aborts the upstream request.
- **Quota** is one row per user per month in `usage`, incremented with a single conditional upsert, so concurrent requests can't go over the limit. Failed model calls are refunded.
- **Cache**: identical prompts (same model, prompt version and text) are answered from `explanation_cache` and don't count toward the limit.

## Saving and reading progress

- The floating button saves the article (`POST /api/articles`): the normalized URL, title and all paragraphs. Summary and category are generated in the background, so saving returns immediately.
- URLs are normalized (lowercase host, no fragment or `utm_*`/`fbclid` parameters, no trailing slash), so the same article saved from different links is stored once.
- When the tab is hidden or closed, or the single-page app navigates, the content script reports progress: the furthest paragraph reached plus its opening words. The background worker forwards this only for URLs it knows are saved, so ordinary browsing never sends anything.
- Progress only moves forward. The library shows a progress bar and a "Continue reading" link with a [text fragment](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments) (`#:~:text=…`) that scrolls straight back to that paragraph.

## Reading position

[apps/extension/lib/readingTracker.ts](apps/extension/lib/readingTracker.ts) counts a paragraph as reached when it crosses a reading line 45% down the viewport. Unlike a "50% visible" rule, this works for blocks taller than the screen. Paragraphs on the last screen are counted once the reader reaches the bottom of the page.

## Extension structure

```
entrypoints/background.ts       context menu, messages, auth, API calls (holds the token)
entrypoints/content/index.ts    on-page UI in a Shadow DOM, extraction, tracking
entrypoints/popup/              sign in/out, open library
lib/extractor.ts                paragraph extraction (reads the live DOM, never copies or mutates it)
lib/context.ts                  selection → paragraph, ExplainRequest builder
lib/auth.ts                     Supabase Google sign-in via chrome.identity.launchWebAuthFlow
lib/api.ts, lib/sse.ts          API client and streaming parser
lib/ui/                         launcher, selection pill, tooltip
```

The UI lives in a shadow root, so page CSS can't break it and its CSS can't leak into the page. Content scripts never see auth tokens; all API calls go through the background worker.

## Auth

Supabase Auth with Google. The extension and the web app each hold their own Supabase session and send the access token as a bearer token. The API verifies it with `jose` against the project's JWKS (or the legacy HS256 secret) and upserts the user by their Supabase user id.

## Data model

| Table | Purpose |
| --- | --- |
| `users` | Supabase user id → email |
| `usage` | Explanations used per user per month |
| `articles` | One row per normalized URL: title, content, summary, category, summary status |
| `saved_articles` | A user's library, with reading progress |
| `shares` | Public share tokens, one per user + category |
| `explanation_cache` | Cached explanations keyed by a prompt hash |
| `waitlist` | Landing-page signups |
| `legacy_*` | Tables from the email-based v1 schema, kept for reference |

Migrations are plain SQL files in [apps/api/migrations](apps/api/migrations), applied in order on startup and recorded in `schema_migrations`.

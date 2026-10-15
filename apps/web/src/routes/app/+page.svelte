<script>
    import Header from '$lib/components/Header.svelte';
    import ArticleCard from '$lib/components/ArticleCard.svelte';
    import { fetchLibrary, removeArticle, shareCategory, RequestError } from '$lib/api';
    import { auth, authConfigured } from '$lib/auth.svelte';
    import { onMount } from 'svelte';

    /** @typedef {import('@coreeder/shared').LibraryArticle} LibraryArticle */

    /** Shown to signed-out visitors as a preview of what the library looks like. */
    /** @type {Record<string, LibraryArticle[]>} */
    const DEMO_LIBRARY = {
        'AI Strategy': [
            demo('demo-1', 'https://www.anthropic.com/research', 'How AI Assistants Are Changing Research Workflows',
                'A practical look at how readers use AI systems to understand dense papers, compare sources, and keep track of the ideas they have already seen.',
                '2026-06-24T08:30:00Z', 'AI Strategy', 6, 10),
            demo('demo-2', 'https://openai.com/research', 'Context Windows and Better Reading Memory',
                'This article explains why context matters when asking an assistant to clarify a passage without spoiling later parts of a document.',
                '2026-06-23T16:10:00Z', 'AI Strategy', 9, 10),
        ],
        'Product Design': [
            demo('demo-3', 'https://www.nngroup.com/articles/', 'Designing Interfaces That Stay Out of the Way',
                'A compact guide to reducing interface friction while keeping important actions visible when readers need them.',
                '2026-06-22T12:45:00Z', 'Product Design', 2, 10),
            demo('demo-4', 'https://linear.app/method', 'Quiet Software for Repeated Daily Work',
                'An essay about dense layouts, restrained color, fast feedback, and why operational tools should be built for scanning.',
                '2026-06-20T09:05:00Z', 'Product Design', -1, 0),
        ],
        'Long Reads': [
            demo('demo-5', 'https://longreads.com/', 'The Art of Remembering What You Read',
                'A narrative piece on annotation, memory, and the small rituals that help readers keep track of complicated stories.',
                '2026-06-18T18:25:00Z', 'Long Reads', 3, 12),
        ],
    };

    /**
     * @param {string} id @param {string} url @param {string} title @param {string} summary
     * @param {string} savedAt @param {string} category @param {number} lastReadIndex @param {number} totalParagraphs
     * @returns {LibraryArticle}
     */
    function demo(id, url, title, summary, savedAt, category, lastReadIndex, totalParagraphs) {
        return { id, url, title, summary, savedAt, category, lastReadIndex, totalParagraphs, summaryStatus: 'done', anchorText: null };
    }

    /** @type {Record<string, LibraryArticle[]>} */
    let library = $state({});
    let loading = $state(true);
    let error = $state('');
    let shareNotification = $state('');
    let theme = $state('light');

    const signedIn = $derived(Boolean(auth.session));
    const shown = $derived(signedIn ? library : DEMO_LIBRARY);
    const isEmpty = $derived(signedIn && !loading && Object.keys(library).length === 0);
    const hasPending = $derived(Object.values(library).flat().some((a) => a.summaryStatus === 'pending' || a.summaryStatus === 'processing'));

    onMount(() => {
        void auth.init();
    });

    // (Re)load whenever the signed-in user changes.
    $effect(() => {
        const token = auth.token;
        if (!auth.ready) return;
        if (!token) {
            loading = false;
            return;
        }
        void load(token);
    });

    // New saves are summarized in the background; check back until they're done.
    $effect(() => {
        if (!hasPending || !auth.token) return;
        const token = auth.token;
        const timer = setTimeout(() => void load(token, { quiet: true }), 4000);
        return () => clearTimeout(timer);
    });

    /** @param {string} token @param {{ quiet?: boolean }} [options] */
    async function load(token, { quiet = false } = {}) {
        if (!quiet) loading = true;
        try {
            library = await fetchLibrary(token);
            error = '';
        } catch (e) {
            if (e instanceof RequestError && e.status === 401) {
                await auth.signOut();
                error = 'Your session expired. Please sign in again.';
            } else {
                error = 'Could not load your library. Please try again in a moment.';
            }
        } finally {
            loading = false;
        }
    }

    /** @param {string} category */
    async function handleShare(category) {
        if (!auth.token) return;
        try {
            const shareUrl = await shareCategory(auth.token, category);
            await navigator.clipboard.writeText(window.location.origin + shareUrl);
            notify(`Link copied for ${category}`);
        } catch {
            notify('Could not generate share link.');
        }
    }

    /** @param {LibraryArticle} article */
    async function handleRemove(article) {
        if (!auth.token) return;
        const previous = library;
        // Optimistic update; restore on failure.
        const remaining = (library[article.category] ?? []).filter((a) => a.id !== article.id);
        const { [article.category]: _, ...rest } = library;
        library = remaining.length ? { ...rest, [article.category]: remaining } : rest;
        try {
            await removeArticle(auth.token, article.id);
        } catch {
            library = previous;
            notify('Could not remove that article.');
        }
    }

    /** @param {string} message */
    function notify(message) {
        shareNotification = message;
        setTimeout(() => { shareNotification = ''; }, 3000);
    }
</script>

<svelte:head>
    <title>CoReeder - My Library</title>
    <meta name="description" content="Your personal AI-curated reading library." />
</svelte:head>

<div class="app" data-theme={theme}>
    <Header
        email={auth.email ?? ''}
        {theme}
        onThemeChange={(nextTheme) => { theme = nextTheme; }}
        onSignOut={signedIn ? () => auth.signOut() : undefined}
    />

    <main class="main">
        <section class="overview">
            <div>
                <h1 class="page-title">Your library</h1>
            </div>
        </section>

        {#if !auth.ready || (signedIn && loading)}
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>Syncing library...</span>
            </div>
        {:else}
            {#if error}
                <div class="notice">{error}</div>
            {/if}

            {#if !signedIn}
                <div class="signin-card stagger-enter">
                    <p>
                        {#if authConfigured}
                            Sign in to see the articles you've saved with the CoReeder extension. Below is a preview.
                        {:else}
                            Sign-in isn't configured yet (set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY). Showing a preview library.
                        {/if}
                    </p>
                    {#if authConfigured}
                        <button class="signin-btn" onclick={() => auth.signIn()}>Sign in with Google</button>
                    {/if}
                </div>
            {:else if isEmpty}
                <div class="notice">
                    Nothing saved yet. Open an article and press the CoReeder button in the bottom-right corner to save it here.
                </div>
            {/if}

            {#each Object.entries(shown) as [category, articles], catIndex (category)}
                <section class="category-section stagger-enter" style="animation-delay: {catIndex * 60}ms">
                    <div class="category-header">
                        <div class="category-title-row">
                            <h2 class="category-title">{category}</h2>
                            {#if signedIn}
                                <button class="share-btn" onclick={() => handleShare(category)} aria-label="Share {category}" title="Share">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="18" cy="5" r="3"/>
                                        <circle cx="6" cy="12" r="3"/>
                                        <circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                    <span>Share</span>
                                </button>
                            {/if}
                        </div>
                        <p class="category-meta tabular-nums">{articles.length} {articles.length === 1 ? 'article' : 'articles'}</p>
                    </div>
                    <div class="cards-grid">
                        {#each articles as article, i (article.id)}
                            <ArticleCard
                                title={article.title}
                                summary={article.summary}
                                summaryStatus={article.summaryStatus}
                                url={article.url}
                                savedAt={article.savedAt}
                                category={category}
                                lastReadIndex={article.lastReadIndex}
                                totalParagraphs={article.totalParagraphs}
                                anchorText={article.anchorText}
                                index={i}
                                onRemove={signedIn ? () => handleRemove(article) : undefined}
                            />
                        {/each}
                    </div>
                </section>
            {/each}
        {/if}
    </main>

    {#if shareNotification}
        <div class="toast">
            {shareNotification}
        </div>
    {/if}
</div>

<style>
    .app {
        min-height: 100vh;
        color: var(--color-text);
        background: var(--color-bg);
        transition-property: background, color;
        transition-duration: 180ms;
        transition-timing-function: var(--transition-ease);
    }

    .main {
        max-width: 1180px;
        padding: 40px 40px 80px;
    }

    .overview {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 32px;
        margin-bottom: 44px;
    }

    .page-title {
        max-width: 680px;
        color: var(--color-heading);
        font-family: var(--font-serif);
        font-size: clamp(28px, 4vw, 42px);
        font-weight: 400;
        font-style: italic;
        line-height: 1.1;
        letter-spacing: -0.01em;
    }

    .notice {
        margin-bottom: 28px;
        max-width: 520px;
        padding: 12px 14px;
        border-radius: var(--radius-button);
        color: var(--color-muted);
        background: var(--color-surface);
        box-shadow: var(--shadow-card);
        font-size: 14px;
    }

    .category-section {
        margin-bottom: 48px;
    }

    .category-header {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 22px;
    }

    .category-title-row {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .category-title {
        font-family: var(--font-serif);
        font-size: 32px;
        font-weight: 400;
        font-style: italic;
        color: var(--color-heading);
        line-height: 1.1;
    }

    .category-meta {
        margin-top: 5px;
        color: var(--color-muted);
        font-size: 13px;
    }

    .share-btn {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        color: var(--color-text);
        background: var(--color-surface);
        border-radius: 999px;
        box-shadow: var(--shadow-button);
        font-size: 13px;
        transition-property: transform, background, color, box-shadow;
        transition-duration: 160ms;
        transition-timing-function: var(--transition-ease);
    }

    .share-btn:hover {
        background: var(--color-heading);
        color: var(--color-bg);
    }

    .share-btn:active {
        transform: scale(0.96);
    }

    .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 18px;
    }

    .loading-state {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 56px 0;
        color: var(--color-muted);
        font-size: 15px;
    }

    .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--color-hairline);
        border-top-color: var(--color-heading);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .toast {
        position: fixed;
        bottom: 32px;
        left: 40px;
        padding: 12px 16px;
        border-radius: var(--radius-button);
        color: var(--color-bg);
        background: var(--color-heading);
        font-size: 14px;
        box-shadow: var(--shadow-card-hover);
        z-index: 1000;
    }

    .signin-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 40px;
        max-width: 720px;
        padding: 18px 20px;
        border-radius: var(--radius-card);
        color: var(--color-text);
        background: var(--color-surface);
        box-shadow: var(--shadow-card);
        font-size: 14px;
    }

    .signin-card p {
        flex: 1 1 280px;
        color: var(--color-muted);
    }

    .signin-btn {
        min-height: 38px;
        padding: 0 16px;
        border-radius: 999px;
        color: var(--color-bg);
        background: var(--color-heading);
        box-shadow: var(--shadow-button);
        font-size: 14px;
        transition-property: transform, opacity;
        transition-duration: 160ms;
        transition-timing-function: var(--transition-ease);
    }

    .signin-btn:hover {
        opacity: 0.9;
    }

    .signin-btn:active {
        transform: scale(0.96);
    }

    @media (max-width: 760px) {
        .main {
            padding: 28px 18px 64px;
        }

        .overview {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 32px;
        }

        .category-title-row {
            flex-wrap: wrap;
        }

        .cards-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

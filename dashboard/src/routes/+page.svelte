<script>
    import Header from '$lib/components/Header.svelte';
    import ArticleCard from '$lib/components/ArticleCard.svelte';
    import { fetchLibrary, shareCategory } from '$lib/api.js';
    import { onMount } from 'svelte';

    const USER_EMAIL = 'simidusodiqt@gmail.com';

    const DEMO_LIBRARY = {
        'AI Strategy': [
            {
                id: 'demo-1',
                url: 'https://www.anthropic.com/research',
                title: 'How AI Assistants Are Changing Research Workflows',
                summary: 'A practical look at how readers use AI systems to understand dense papers, compare sources, and keep track of the ideas they have already seen.',
                saved_at: '2026-06-24T08:30:00Z',
            },
            {
                id: 'demo-2',
                url: 'https://openai.com/research',
                title: 'Context Windows and Better Reading Memory',
                summary: 'This article explains why context matters when asking an assistant to clarify a passage without spoiling later parts of a document.',
                saved_at: '2026-06-23T16:10:00Z',
            },
        ],
        'Product Design': [
            {
                id: 'demo-3',
                url: 'https://www.nngroup.com/articles/',
                title: 'Designing Interfaces That Stay Out of the Way',
                summary: 'A compact guide to reducing interface friction while keeping important actions visible when readers need them.',
                saved_at: '2026-06-22T12:45:00Z',
            },
            {
                id: 'demo-4',
                url: 'https://linear.app/method',
                title: 'Quiet Software for Repeated Daily Work',
                summary: 'An essay about dense layouts, restrained color, fast feedback, and why operational tools should be built for scanning.',
                saved_at: '2026-06-20T09:05:00Z',
            },
        ],
        'Long Reads': [
            {
                id: 'demo-5',
                url: 'https://longreads.com/',
                title: 'The Art of Remembering What You Read',
                summary: 'A narrative piece on annotation, memory, and the small rituals that help readers keep track of complicated stories.',
                saved_at: '2026-06-18T18:25:00Z',
            },
        ],
    };

    /** @type {Record<string, Array<any>>} */
    let library = $state(DEMO_LIBRARY);
    let loading = $state(true);
    let error = $state('');
    let shareNotification = $state('');
    let theme = $state('light');

    onMount(async () => {
        try {
            const remoteLibrary = await fetchLibrary(USER_EMAIL);
            library = mergeLibrary(DEMO_LIBRARY, remoteLibrary);
        } catch (e) {
            error = 'Showing demo library because the backend is not reachable.';
            library = DEMO_LIBRARY;
        } finally {
            loading = false;
        }
    });

    /**
     * @param {Record<string, Array<any>>} demoLibrary
     * @param {Record<string, Array<any>> | undefined | null} remoteLibrary
     */
    function mergeLibrary(demoLibrary, remoteLibrary) {
        if (!remoteLibrary || Object.keys(remoteLibrary).length === 0) return demoLibrary;
        return { ...demoLibrary, ...remoteLibrary };
    }

    /** @param {string} category */
    async function handleShare(category) {
        try {
            const shareUrl = await shareCategory(USER_EMAIL, category);
            await navigator.clipboard.writeText(window.location.origin + shareUrl);
            shareNotification = `Link copied for ${category}`;
            setTimeout(() => { shareNotification = ''; }, 3000);
        } catch (e) {
            shareNotification = 'Could not generate share link.';
            setTimeout(() => { shareNotification = ''; }, 3000);
        }
    }
</script>

<svelte:head>
    <title>CoReeder - My Library</title>
    <meta name="description" content="Your personal AI-curated reading library." />
</svelte:head>

<div class="app" data-theme={theme}>
    <Header email={USER_EMAIL} {theme} onThemeChange={(nextTheme) => { theme = nextTheme; }} />

    <main class="main">
        <section class="overview">
            <div>
                <h1 class="page-title">Your library</h1>
            </div>
        </section>

        {#if loading}
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>Syncing library...</span>
            </div>
        {:else}
            {#if error}
                <div class="notice">{error}</div>
            {/if}

            {#each Object.entries(library) as [category, articles], catIndex}
                <section class="category-section stagger-enter" style="animation-delay: {catIndex * 60}ms">
                    <div class="category-header">
                        <div class="category-title-row">
                            <h2 class="category-title">{category}</h2>
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
                        </div>
                        <p class="category-meta tabular-nums">{articles.length} {articles.length === 1 ? 'article' : 'articles'}</p>
                    </div>
                    <div class="cards-grid">
                        {#each articles as article, i}
                            <ArticleCard
                                title={article.title}
                                summary={article.summary}
                                url={article.url}
                                saved_at={article.saved_at}
                                category={category}
                                index={i}
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

    .eyebrow {
        margin-bottom: 10px;
        color: var(--color-muted);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
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

    .stat-label {
        display: block;
        margin-top: 6px;
        color: var(--color-muted);
        font-size: 13px;
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

    @media (max-width: 760px) {
        .main {
            padding: 28px 18px 64px;
        }

        .overview {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 32px;
        }

        .overview {
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

<script>
    import ArticleCard from '$lib/components/ArticleCard.svelte';
    import { fetchSharedLibrary } from '$lib/api.js';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';

    /** @type {{ category: string, owner?: string, articles: Array<any> } | null} */
    let sharedData = $state(null);
    let loading = $state(true);
    let error = $state('');

    onMount(async () => {
        const token = $page.params.token || '';
        try {
            sharedData = await fetchSharedLibrary(token);
        } catch (e) {
            error = 'This shared library could not be found.';
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head>
    <title>{sharedData ? `${sharedData.category} — Shared Library` : 'Shared Library'} | CoReeder</title>
    <meta name="description" content="A curated collection of articles shared via CoReeder." />
</svelte:head>

<div class="shared-page">
    <header class="shared-header">
        <a href="/" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
            </svg>
            CoReeder
        </a>
    </header>

    <main class="shared-main">
        {#if loading}
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>Loading shared library…</span>
            </div>
        {:else if error}
            <div class="error-state stagger-enter">
                <h2>Not Found</h2>
                <p>{error}</p>
            </div>
        {:else if sharedData}
            <div class="shared-hero stagger-enter">
                <img
                    src="/images/card-default.jpeg"
                    alt="{sharedData.category} cover"
                    class="shared-hero-image"
                />
                <div class="shared-hero-overlay"></div>
                <div class="shared-hero-content">
                    <h1 class="shared-hero-title">{sharedData.category}</h1>
                    <p class="shared-hero-meta">
                        <span class="tabular-nums">{sharedData.articles.length}</span> articles
                    </p>
                </div>
            </div>

            <div class="shared-articles">
                {#each sharedData.articles as article, i}
                    <ArticleCard
                        title={article.title}
                        summary={article.summary}
                        url={article.url}
                        saved_at={article.saved_at}
                        index={i}
                    />
                {/each}
            </div>
        {/if}
    </main>
</div>

<style>
    .shared-page {
        min-height: 100vh;
    }

    .shared-header {
        padding: 24px 48px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .back-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-body);
        font-weight: 700;
        font-size: 20px;
        color: var(--color-heading);
        text-decoration: none;
        transition-property: opacity;
        transition-duration: 0.2s;
        transition-timing-function: var(--transition-ease);
    }

    .back-link:hover {
        opacity: 0.7;
    }

    .shared-main {
        max-width: 720px;
        margin: 0 auto;
        padding: 40px 32px 80px;
    }

    .shared-hero {
        position: relative;
        width: 100%;
        aspect-ratio: 2.5 / 1;
        border-radius: var(--radius-card);
        overflow: hidden;
        margin-bottom: 32px;
        box-shadow: var(--shadow-card);
        outline: 1px solid rgba(0, 0, 0, 0.1);
    }

    .shared-hero-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .shared-hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.3) 50%,
            transparent 100%
        );
    }

    .shared-hero-content {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 28px 32px;
        z-index: 1;
    }

    .shared-hero-title {
        font-family: var(--font-serif);
        font-weight: 400;
        font-style: italic;
        font-size: 34px;
        color: #FFFFFF;
        line-height: 1.1;
        margin-bottom: 4px;
    }

    .shared-hero-meta {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 300;
    }

    .shared-articles {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 80px 0;
        color: var(--color-muted);
        font-weight: 300;
    }

    .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(0, 0, 0, 0.08);
        border-top-color: var(--color-heading);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .error-state {
        text-align: center;
        padding: 80px 0;
        color: var(--color-muted);
    }

    .error-state h2 {
        font-size: 24px;
        margin-bottom: 8px;
    }
</style>

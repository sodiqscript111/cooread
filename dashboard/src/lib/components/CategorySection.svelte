<script>
    import ArticleCard from './ArticleCard.svelte';

    /**
     * @type {{
     *   category: string,
     *   articles: Array<{id: string, url: string, title: string, summary: string, saved_at: string}>,
     *   index?: number,
     *   onShare?: (category: string) => void
     * }}
     */
    let { category, articles, index = 0, onShare } = $props();

    let expanded = $state(false);

    function toggle() {
        expanded = !expanded;
    }

    /** @param {MouseEvent} e */
    function handleShare(e) {
        e.stopPropagation();
        onShare?.(category);
    }
</script>

<section
    class="category-section stagger-enter"
    style="animation-delay: {index * 100}ms"
>
    <!-- Category Hero Card -->
    <div class="category-hero" onclick={toggle} onkeydown={(e) => e.key === 'Enter' && toggle()} role="button" tabindex="0" aria-expanded={expanded}>
        <img
            src="/images/card-default.jpeg"
            alt="{category} cover"
            class="hero-image"
        />
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-text">
                <h2 class="hero-title">{category}</h2>
                <span class="hero-count tabular-nums">{articles.length} {articles.length === 1 ? 'article' : 'articles'}</span>
            </div>
            <div class="hero-actions">
                <button class="share-btn" onclick={handleShare} aria-label="Share {category}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
                <span class="expand-icon" class:rotated={expanded}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </span>
            </div>
        </div>
    </div>

    <!-- Expanded Articles List -->
    {#if expanded}
        <div class="articles-list">
            {#each articles as article, i}
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
</section>

<style>
    .category-section {
        margin-bottom: 32px;
    }

    .category-hero {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: var(--radius-card);
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: flex-end;
        text-align: left;
        padding: 0;
        box-shadow: var(--shadow-card);
        transition-property: transform, box-shadow;
        transition-duration: 0.3s;
        transition-timing-function: var(--transition-ease);
        outline: 1px solid rgba(0, 0, 0, 0.1);
    }

    .category-hero:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-card-hover);
    }

    .category-hero:active {
        transform: scale(0.96);
    }

    .hero-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        outline: 1px solid rgba(0, 0, 0, 0.1);
    }

    .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.4) 40%,
            transparent 100%
        );
    }

    .hero-content {
        position: relative;
        z-index: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding: 24px 28px;
    }

    .hero-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .hero-title {
        font-family: var(--font-serif);
        font-style: italic;
        font-size: 26px;
        color: #FFFFFF;
        letter-spacing: -0.01em;
        line-height: 1.2;
    }

    .hero-count {
        font-family: var(--font-body);
        font-size: 13px;
        font-weight: 300;
        color: rgba(255, 255, 255, 0.65);
    }

    .hero-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .share-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        transition-property: background, color, transform;
        transition-duration: 0.2s;
        transition-timing-function: var(--transition-ease);
    }

    .share-btn:hover {
        background: var(--color-accent);
        color: #FFFFFF;
    }

    .share-btn:active {
        transform: scale(0.96);
    }

    .expand-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.6);
        transition-property: transform;
        transition-duration: 0.3s;
        transition-timing-function: var(--transition-ease);
    }

    .expand-icon.rotated {
        transform: rotate(180deg);
    }

    .articles-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 0 0;
    }
</style>

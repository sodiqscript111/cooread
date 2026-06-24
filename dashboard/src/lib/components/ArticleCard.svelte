<script>
    /**
     * @type {{
     *   title: string,
     *   summary: string,
     *   url: string,
     *   saved_at: string,
     *   category?: string,
     *   index?: number
     * }}
     */
    let { title, summary, url, saved_at, category = '', index = 0 } = $props();

    const host = (() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return 'Saved article';
        }
    })();

    const savedDate = (() => {
        const date = new Date(saved_at);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    })();

    const coverImage = `/images/cover-${(index % 7) + 1}.jpg`;
</script>

<a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    class="article-card stagger-enter"
    style="animation-delay: {index * 45}ms"
>
    <div class="article-cover">
        <img src={coverImage} alt="" loading="lazy" />
    </div>
    <div class="article-content">
        <div class="article-meta">
            <span>{category}</span>
            {#if savedDate}
                <span class="tabular-nums">{savedDate}</span>
            {/if}
        </div>
        <h3 class="article-title">{title}</h3>
        <p class="article-summary">{summary}</p>
        <div class="article-footer">
            <span>{host}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M7 17L17 7"/>
                <path d="M8 7h9v9"/>
            </svg>
        </div>
    </div>
</a>

<style>
    .article-card {
        min-height: 238px;
        display: flex;
        flex-direction: column;
        border-radius: var(--radius-card);
        color: var(--color-text);
        background: var(--color-surface);
        box-shadow: var(--shadow-card);
        overflow: hidden;
        transition-property: transform, box-shadow, background;
        transition-duration: 180ms;
        transition-timing-function: var(--transition-ease);
    }

    .article-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-card-hover);
    }

    .article-card:active {
        transform: scale(0.96);
    }

    .article-cover {
        width: 100%;
        height: 140px;
        overflow: hidden;
        background: #f0ebe1;
    }

    .article-cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.85; /* makes the image feel "lighter" */
        transition: opacity 0.2s var(--transition-ease);
    }

    .article-card:hover .article-cover img {
        opacity: 1;
    }

    .article-content {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        flex: 1;
    }

    .article-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--color-muted);
        font-size: 12px;
        line-height: 1.2;
    }

    .article-title {
        color: var(--color-heading);
        font-family: var(--font-body);
        font-size: 19px;
        font-weight: 700;
        line-height: 1.18;
        text-wrap: balance;
    }

    .article-summary {
        color: var(--color-muted);
        font-size: 14px;
        line-height: 1.55;
        text-wrap: pretty;
    }

    .article-footer {
        margin-top: auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--color-text);
        font-size: 13px;
    }

    .article-footer span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .article-footer svg {
        flex: 0 0 auto;
        color: var(--color-muted);
        transition-property: transform, color;
        transition-duration: 160ms;
        transition-timing-function: var(--transition-ease);
    }

    .article-card:hover .article-footer svg {
        color: var(--color-heading);
        transform: translate(2px, -2px);
    }
</style>

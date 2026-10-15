<script>
    import { continueReadingUrl, progressPercent } from '@coreeder/shared';

    /**
     * @type {{
     *   title: string,
     *   summary: string | null,
     *   url: string,
     *   savedAt: string,
     *   category?: string,
     *   index?: number,
     *   summaryStatus?: 'pending' | 'processing' | 'done' | 'failed',
     *   lastReadIndex?: number,
     *   totalParagraphs?: number,
     *   anchorText?: string | null,
     *   onRemove?: () => void
     * }}
     */
    let {
        title,
        summary,
        url,
        savedAt,
        category = '',
        index = 0,
        summaryStatus = 'done',
        lastReadIndex = -1,
        totalParagraphs = 0,
        anchorText = null,
        onRemove
    } = $props();

    const host = $derived.by(() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return 'Saved article';
        }
    });

    const savedDate = $derived.by(() => {
        const date = new Date(savedAt);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    });

    const progress = $derived(progressPercent(lastReadIndex, totalParagraphs));
    const inProgress = $derived(progress > 0 && progress < 100);
    // Mid-article, jump straight back to where the reader stopped.
    const href = $derived(inProgress ? continueReadingUrl(url, anchorText) : url);
    const summarizing = $derived(summaryStatus === 'pending' || summaryStatus === 'processing');
    const coverImage = $derived(`/images/cover-${(index % 7) + 1}.jpg`);
</script>

<div class="card-wrap stagger-enter" style="animation-delay: {index * 45}ms">
    <a {href} target="_blank" rel="noopener noreferrer" class="article-card">
        <div class="article-cover">
            <img src={coverImage} alt="" loading="lazy" />
            {#if progress > 0}
                <div
                    class="progress"
                    role="progressbar"
                    aria-label="Reading progress"
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div class="progress-fill" style="width: {progress}%"></div>
                </div>
            {/if}
        </div>
        <div class="article-content">
            <div class="article-meta">
                <span>{category}</span>
                {#if savedDate}
                    <span class="tabular-nums">{savedDate}</span>
                {/if}
            </div>
            <h3 class="article-title">{title}</h3>
            {#if summarizing}
                <p class="article-summary pending">Summarizing…</p>
            {:else}
                <p class="article-summary">{summary ?? 'No summary available.'}</p>
            {/if}
            <div class="article-footer">
                <span>
                    {#if inProgress}
                        Continue reading · <span class="tabular-nums">{progress}%</span>
                    {:else if progress === 100}
                        Finished · {host}
                    {:else}
                        {host}
                    {/if}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M7 17L17 7"/>
                    <path d="M8 7h9v9"/>
                </svg>
            </div>
        </div>
    </a>
    {#if onRemove}
        <button class="remove-btn" type="button" onclick={onRemove} aria-label="Remove {title} from library" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    {/if}
</div>

<style>
    .card-wrap {
        position: relative;
        display: flex;
    }

    .article-card {
        flex: 1;
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
        position: relative;
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

    .progress {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(0, 0, 0, 0.18);
    }

    .progress-fill {
        height: 100%;
        background: var(--color-heading);
        transition: width 300ms var(--transition-ease);
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

    .article-summary.pending {
        font-style: italic;
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

    .article-footer > span {
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

    .remove-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        color: #ffffff;
        background: rgba(0, 0, 0, 0.55);
        opacity: 0;
        transition-property: opacity, transform, background;
        transition-duration: 160ms;
        transition-timing-function: var(--transition-ease);
    }

    .card-wrap:hover .remove-btn,
    .remove-btn:focus-visible {
        opacity: 1;
    }

    .remove-btn:hover {
        background: rgba(0, 0, 0, 0.8);
    }

    .remove-btn:active {
        transform: scale(0.92);
    }

    @media (hover: none) {
        .remove-btn {
            opacity: 1;
        }
    }
</style>

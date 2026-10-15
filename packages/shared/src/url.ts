// URL helpers used to de-duplicate saved articles and to link back to the
// exact spot a reader stopped at.

const TRACKING_PARAMS = new Set([
    'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid',
    'ref', 'ref_src', 'source', 'sk', '_hsenc', '_hsmi',
]);

/**
 * Canonical form of an article URL: lowercase host, no fragment, no tracking
 * parameters, no default port and no trailing slash. Returns null for
 * anything that isn't an http(s) URL.
 */
export function normalizeUrl(raw: string): string | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    url.hash = '';
    url.username = '';
    url.password = '';
    url.hostname = url.hostname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
        if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
            url.searchParams.delete(key);
        }
    }

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
}

/**
 * Builds a Chrome/Edge/Safari text-fragment link (`#:~:text=`) that scrolls
 * to the given text. Uses the first few words so minor formatting differences
 * in the rest of the paragraph don't break the match.
 */
export function continueReadingUrl(url: string, anchorText: string | null | undefined, words = 6): string {
    const snippet = (anchorText ?? '').replace(/\s+/g, ' ').trim().split(' ').slice(0, words).join(' ');
    if (!snippet) return url;

    // `-`, `,` and `&` have special meaning inside a text directive.
    const encoded = encodeURIComponent(snippet).replace(/-/g, '%2D').replace(/,/g, '%2C');
    const base = url.split('#')[0];
    return `${base}#:~:text=${encoded}`;
}

/** Share of the article read, 0–100. */
export function progressPercent(lastReadIndex: number, totalParagraphs: number): number {
    if (totalParagraphs <= 0 || lastReadIndex < 0) return 0;
    return Math.min(100, Math.round(((lastReadIndex + 1) / totalParagraphs) * 100));
}

// Pulls the readable paragraphs out of the page, skipping navigation, ads,
// comments and other noise. Reads the live DOM without copying or modifying it.

const NOISE_SELECTOR = [
    'nav', 'header', 'footer', 'aside', 'dialog',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]', '[role="contentinfo"]', '[role="dialog"]',
    '[hidden]',
    '.sidebar', '.side-bar', '.advertisement', '.ad', '.ads',
    '.social-share', '.share-buttons', '.comments', '.comment-section',
    '#comments', '#sidebar', '#footer', '#header', '.footer', '.site-footer',
    '.nav', '.navbar', '.menu', '.breadcrumb',
    '.cookie-banner', '.popup', '.modal',
    'script', 'style', 'noscript', 'iframe', 'template', 'svg',
    'coreeder-ui',
].join(',');

const CONTENT_TAGS = new Set([
    'P', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'TD', 'TH', 'PRE', 'FIGCAPTION', 'DT', 'DD',
]);

const MAIN_CONTENT_SELECTOR =
    'article, [role="main"], main, .post-content, .article-body, .entry-content, #content';

/** A main-content candidate must contain at least this much text to be trusted. */
const MIN_ROOT_TEXT = 400;
const MIN_PARAGRAPH_CHARS = 10;

export interface ExtractedContent {
    paragraphs: string[];
    elements: Element[];
    /** Maps each paragraph element back to its index, without touching the DOM. */
    indexOf: WeakMap<Element, number>;
}

export function extractContent(doc: Document = document): ExtractedContent {
    const root = findContentRoot(doc);
    const paragraphs: string[] = [];
    const elements: Element[] = [];
    const indexOf = new WeakMap<Element, number>();

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode(node) {
            const el = node as Element;
            if (el.matches(NOISE_SELECTOR)) return NodeFilter.FILTER_REJECT;
            return CONTENT_TAGS.has(el.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
    });

    let lastAccepted: Element | null = null;
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const el = node as Element;
        // A <p> inside an <li> (or a <td>, <blockquote>...) is already part of
        // its ancestor's text; taking both would duplicate it.
        if (lastAccepted?.contains(el)) continue;

        const text = normalizeWhitespace(el.textContent ?? '');
        if (text.length <= MIN_PARAGRAPH_CHARS) continue;

        indexOf.set(el, paragraphs.length);
        paragraphs.push(text);
        elements.push(el);
        lastAccepted = el;
    }

    return { paragraphs, elements, indexOf };
}

function findContentRoot(doc: Document): Element {
    for (const candidate of doc.querySelectorAll(MAIN_CONTENT_SELECTOR)) {
        if ((candidate.textContent ?? '').trim().length >= MIN_ROOT_TEXT) return candidate;
    }
    return doc.body;
}

export function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

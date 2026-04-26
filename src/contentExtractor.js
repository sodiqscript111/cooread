// ─── Content Extraction Module ───
// Extracts readable content from the DOM, removing noise (nav, ads, footer, sidebar).
// Returns an ordered list of paragraph strings and their corresponding DOM elements.

const CoReederExtractor = (() => {
    // Selectors for elements to remove before extraction
    const NOISE_SELECTORS = [
        'nav', 'header', 'footer', 'aside',
        '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
        '[role="contentinfo"]',
        '.sidebar', '.side-bar', '.advertisement', '.ad', '.ads',
        '.social-share', '.share-buttons', '.comments', '.comment-section',
        '#comments', '#sidebar', '#footer', '#header',
        '.nav', '.navbar', '.menu', '.breadcrumb',
        '.cookie-banner', '.popup', '.modal',
        'script', 'style', 'noscript', 'iframe',
    ];

    // Tags whose text content counts as a "paragraph"
    const CONTENT_TAGS = new Set([
        'P', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'TD', 'TH', 'PRE', 'FIGCAPTION', 'DT', 'DD',
    ]);

    /**
     * Extract readable paragraphs from the current page.
     * @returns {{ paragraphs: string[], paragraphElements: Element[] }}
     */
    function extractContent() {
        // Clone the body so we can mutate freely
        const clone = document.body.cloneNode(true);

        // Remove noise elements from the clone
        NOISE_SELECTORS.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Try to find a main content container first
        const mainContent = document.querySelector(
            'article, [role="main"], main, .post-content, .article-body, .entry-content, #content'
        );

        const root = mainContent || document.body;
        const paragraphs = [];
        const paragraphElements = [];

        // Walk the actual DOM (not the clone) for element references
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                // Skip noise containers
                if (isNoiseElement(node)) return NodeFilter.FILTER_REJECT;
                if (CONTENT_TAGS.has(node.tagName)) return NodeFilter.FILTER_ACCEPT;
                return NodeFilter.FILTER_SKIP;
            },
        });

        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent.trim();
            if (text.length > 10) {  // skip trivially short fragments
                paragraphs.push(text);
                paragraphElements.push(node);
                node.setAttribute('data-coreeder-idx', paragraphs.length - 1);
            }
        }

        return { paragraphs, paragraphElements };
    }

    /**
     * Check if an element matches any noise selector.
     */
    function isNoiseElement(el) {
        return NOISE_SELECTORS.some(sel => {
            try { return el.matches(sel); } catch { return false; }
        });
    }

    return { extractContent };
})();

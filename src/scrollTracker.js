// ─── Scroll Tracking Module ───
// Uses IntersectionObserver to approximate reading progress.
// Tracks the highest-index paragraph the user has scrolled past.

const CoReederScrollTracker = (() => {
    let lastReadParagraphIndex = -1;
    let observer = null;

    /**
     * Initialize the scroll tracker.
     * @param {Element[]} paragraphElements - Array of paragraph DOM elements.
     */
    function initScrollTracker(paragraphElements) {
        if (observer) observer.disconnect();

        lastReadParagraphIndex = -1;

        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const idx = parseInt(entry.target.getAttribute('data-coreeder-idx'), 10);
                        if (!isNaN(idx) && idx > lastReadParagraphIndex) {
                            lastReadParagraphIndex = idx;
                        }
                    }
                });
            },
            {
                root: null,       // viewport
                threshold: 0.5,   // at least 50% visible
            }
        );

        paragraphElements.forEach((el) => {
            observer.observe(el);
        });
    }

    /**
     * Get the index of the last paragraph the user has read.
     * @returns {number}
     */
    function getLastReadIndex() {
        return lastReadParagraphIndex;
    }

    return { initScrollTracker, getLastReadIndex };
})();

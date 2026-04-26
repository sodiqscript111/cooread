// ─── Highlight-to-Paragraph Mapper ───
// Maps a text selection to the paragraph index it belongs to.

const CoReederHighlightMapper = (() => {
    /**
     * Find the paragraph index that contains the current selection.
     * @param {Selection} selection - The window selection object.
     * @param {Element[]} paragraphElements - Extracted paragraph elements.
     * @returns {{ text: string, paragraphIndex: number } | null}
     */
    function mapHighlightToParagraph(selection, paragraphElements) {
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
            return null;
        }

        const text = selection.toString().trim();
        if (!text) return null;

        const anchorNode = selection.anchorNode;
        const element = anchorNode.nodeType === Node.TEXT_NODE
            ? anchorNode.parentElement
            : anchorNode;

        // Walk up the DOM tree to find an element with data-coreeder-idx
        let current = element;
        while (current && current !== document.body) {
            const idx = current.getAttribute('data-coreeder-idx');
            if (idx !== null) {
                return { text, paragraphIndex: parseInt(idx, 10) };
            }
            current = current.parentElement;
        }

        // Fallback: find the closest paragraph element by containment
        for (let i = 0; i < paragraphElements.length; i++) {
            if (paragraphElements[i].contains(element)) {
                return { text, paragraphIndex: i };
            }
        }

        // Last resort: find by text match
        for (let i = 0; i < paragraphElements.length; i++) {
            if (paragraphElements[i].textContent.includes(text.substring(0, 60))) {
                return { text, paragraphIndex: i };
            }
        }

        return null;
    }

    return { mapHighlightToParagraph };
})();

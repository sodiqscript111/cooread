// ─── CoReeder Content Script (Orchestrator) ───
// Runs on every page. Extracts content, tracks scroll, and handles explain requests.

(() => {
    let paragraphs = [];
    let paragraphElements = [];
    let initialized = false;

    /**
     * Initialize CoReeder on the current page.
     */
    function initialize() {
        if (initialized) return;

        const result = CoReederExtractor.extractContent();
        paragraphs = result.paragraphs;
        paragraphElements = result.paragraphElements;

        if (paragraphs.length === 0) {
            console.log('[CoReeder] No readable content found on this page.');
            return;
        }

        CoReederScrollTracker.initScrollTracker(paragraphElements);
        initialized = true;

        // Expose for debugging (can remove in production)
        window.__coreederParagraphs = paragraphs;
        Object.defineProperty(window, '__coreederLastReadIndex', {
            get: () => CoReederScrollTracker.getLastReadIndex(),
        });

        console.log(`[CoReeder] Initialized — ${paragraphs.length} paragraphs extracted.`);
    }

    /**
     * Handle the "Explain with CoReeder" context menu action.
     */
    async function handleExplainRequest() {
        if (!initialized) {
            initialize();
            if (!initialized) {
                CoReederTooltip.showLoading('');
                CoReederTooltip.showError('Could not extract readable content from this page.');
                return;
            }
        }

        const selection = window.getSelection();
        const mapping = CoReederHighlightMapper.mapHighlightToParagraph(selection, paragraphElements);

        if (!mapping) {
            CoReederTooltip.showLoading('(no selection)');
            CoReederTooltip.showError('Could not identify the highlighted text in the document. Try selecting text within the article body.');
            return;
        }

        const { text: highlightedText, paragraphIndex: highlightIndex } = mapping;

        // Show loading state
        CoReederTooltip.showLoading(highlightedText);

        try {
            // Build the prompt
            const lastReadIndex = CoReederScrollTracker.getLastReadIndex();
            const prompt = CoReederPromptBuilder.buildPrompt({
                paragraphs,
                highlightIndex,
                highlightedText,
                lastReadIndex,
            });

            // Call the AI
            const explanation = await CoReederAI.explainHighlight(prompt);
            CoReederTooltip.showExplanation(explanation);
        } catch (err) {
            console.error('[CoReeder] AI error:', err);
            CoReederTooltip.showError(`Failed to generate explanation: ${err.message}`);
        }
    }

    // ── Listen for messages from the background script ──
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXPLAIN_SELECTION') {
            handleExplainRequest();
        }
    });

    // ── Initialize when the DOM is ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // document_idle means DOM is already parsed
        initialize();
    }
})();

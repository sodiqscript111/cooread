// ─── Prompt Builder ───
// Assembles the LLM prompt from prior context, highlighted text, and forward context.
// Respects lastReadIndex to ensure only previously read content is used.

const CoReederPromptBuilder = (() => {
    const MAX_PRIOR_PARAGRAPHS = 30;
    const FORWARD_CONTEXT_COUNT = 2;

    /**
     * Build a structured prompt for the AI.
     * @param {Object} params
     * @param {string[]} params.paragraphs - All extracted paragraphs.
     * @param {number} params.highlightIndex - Index of the highlighted paragraph.
     * @param {string} params.highlightedText - The actual highlighted text.
     * @param {number} [params.lastReadIndex=-1] - Last paragraph index user has read (from scroll tracking).
     * @param {number} [params.maxPriorParagraphs=30] - Max prior paragraphs to include.
     * @returns {string} The assembled prompt.
     */
    function buildPrompt({
        paragraphs,
        highlightIndex,
        highlightedText,
        lastReadIndex = -1,
        maxPriorParagraphs = MAX_PRIOR_PARAGRAPHS,
    }) {
        // Ensure highlight is within read content
        // If lastReadIndex is -1 (nothing scrolled yet), allow explaining paragraph 0
        if (lastReadIndex >= 0 && highlightIndex > lastReadIndex) {
            console.warn(
                `[CoReeder] Highlight index (${highlightIndex}) is beyond lastReadIndex (${lastReadIndex}). ` +
                `User may be selecting future content.`
            );
        }

        const startIdx = Math.max(0, highlightIndex - maxPriorParagraphs);
        const priorContext = paragraphs.slice(startIdx, highlightIndex);
        const highlightedParagraph = paragraphs[highlightIndex] || '';
        
        // Forward context should only go up to lastReadIndex + 1 to avoid including future content
        let forwardEnd = Math.min(
            paragraphs.length,
            highlightIndex + 1 + FORWARD_CONTEXT_COUNT
        );
        
        // Restrict forward context to not exceed lastReadIndex
        if (lastReadIndex >= 0) {
            forwardEnd = Math.min(forwardEnd, lastReadIndex + 2);
        }
        
        const forwardContext = paragraphs.slice(highlightIndex + 1, forwardEnd);

        const parts = [];

        parts.push(
            `You are CoReeder, a reading assistant. The user is reading a document and has highlighted a passage they would like explained.`,
            ``,
            `Your task:`,
            `- Explain ONLY what the highlighted text means.`,
            `- Base your explanation ONLY on what was written in the "Previously Read Context" below.`,
            `- Do NOT introduce external knowledge or information from after the highlight.`,
            `- If the prior context is insufficient to fully explain the highlight, acknowledge the limitation.`,
            `- Be concise, clear, and helpful. Write 2–4 sentences.`,
        );

        if (priorContext.length > 0) {
            parts.push(
                ``,
                `── Previously Read Context (what the user has already read) ──`,
                ...priorContext.map((p, i) => `[${startIdx + i + 1}] ${p}`),
            );
        } else {
            parts.push(
                ``,
                `── Note ──`,
                `There is limited prior context available. The explanation will be based primarily on the highlighted text.`,
            );
        }

        parts.push(
            ``,
            `── Highlighted Paragraph ──`,
            highlightedParagraph,
            ``,
            `── Highlighted Text ──`,
            `"${highlightedText}"`,
        );

        if (forwardContext.length > 0) {
            parts.push(
                ``,
                `── Forward Context (next paragraphs, for reference only) ──`,
                ...forwardContext.map((p, i) => `[${highlightIndex + 2 + i}] ${p}`),
            );
        }

        parts.push(
            ``,
            `── Your Explanation ──`,
        );

        return parts.join('\n');
    }

    return { buildPrompt };
})();

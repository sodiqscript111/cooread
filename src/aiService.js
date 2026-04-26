// AI service bridge.
// Sends explanation requests from the content script to the background service worker.

const CoReederAI = (() => {
    /**
     * Send a prompt to the background worker and return the explanation text.
     * @param {string} prompt - The fully assembled prompt.
     * @returns {Promise<string>} The model's explanation.
     */
    async function explainHighlight(prompt) {
        const response = await chrome.runtime.sendMessage({
            type: 'COREEDER_EXPLAIN',
            prompt,
        });

        if (!response) {
            throw new Error('No response from the extension service worker.');
        }

        if (!response.ok) {
            throw new Error(response.error || 'Explanation request failed.');
        }

        return response.text.trim();
    }

    return { explainHighlight };
})();

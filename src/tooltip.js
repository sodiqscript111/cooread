// ─── Tooltip UI ───
// Creates, shows, updates, and dismisses the CoReeder explanation tooltip.

const CoReederTooltip = (() => {
    let tooltipEl = null;

    /**
     * Build the tooltip DOM if it doesn't exist.
     */
    function ensureTooltip() {
        if (tooltipEl) return;

        tooltipEl = document.createElement('div');
        tooltipEl.id = 'coreeder-tooltip';
        tooltipEl.innerHTML = `
      <div id="coreeder-tooltip-header">
        <img id="coreeder-tooltip-logo" src="${chrome.runtime.getURL('icons/riftlogo.png')}" alt="" />
        <span id="coreeder-tooltip-title">CoReeder</span>
        <button id="coreeder-tooltip-close" aria-label="Close">×</button>
      </div>
      <div id="coreeder-tooltip-body">
        <div id="coreeder-tooltip-highlight"></div>
        <div id="coreeder-tooltip-explanation"></div>
      </div>
    `;
        document.body.appendChild(tooltipEl);

        // Close button
        tooltipEl.querySelector('#coreeder-tooltip-close').addEventListener('click', hideTooltip);

        // Click outside to dismiss
        document.addEventListener('mousedown', (e) => {
            if (tooltipEl && !tooltipEl.contains(e.target) && tooltipEl.classList.contains('coreeder-visible')) {
                hideTooltip();
            }
        });

        // Escape to dismiss
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideTooltip();
        });

        // Prevent scrolling the background page when scrolling inside the tooltip
        tooltipEl.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }

    /**
     * Position the tooltip fixed at the bottom right.
     */
    function positionTooltip() {
        tooltipEl.style.left = 'auto';
        tooltipEl.style.top = 'auto';
        tooltipEl.style.right = '24px';
        tooltipEl.style.bottom = '96px';
    }

    /**
     * Show the tooltip with a loading state.
     * @param {string} highlightedText - The text the user highlighted.
     */
    function showLoading(highlightedText) {
        ensureTooltip();

        const highlightEl = tooltipEl.querySelector('#coreeder-tooltip-highlight');
        const explanationEl = tooltipEl.querySelector('#coreeder-tooltip-explanation');

        // Truncate long highlights
        const previewText = highlightedText.length > 120
            ? highlightedText.substring(0, 120) + '…'
            : highlightedText;

        highlightEl.textContent = `"${previewText}"`;
        explanationEl.innerHTML = `
      <div class="coreeder-loading">
        <img class="coreeder-loading-gif" src="${chrome.runtime.getURL('icons/loading.gif')}" alt="" />
        <span>Reading context and generating explanation...</span>
      </div>
    `;

        positionTooltip();

        // Small delay for DOM paint before animation
        requestAnimationFrame(() => {
            tooltipEl.classList.add('coreeder-visible');
        });
    }

    /**
     * Update the tooltip with the explanation text.
     * @param {string} explanation
     */
    function showExplanation(explanation) {
        if (!tooltipEl) return;
        const explanationEl = tooltipEl.querySelector('#coreeder-tooltip-explanation');
        explanationEl.textContent = explanation;

    }

    /**
     * Show an error message in the tooltip.
     * @param {string} message
     */
    function showError(message) {
        if (!tooltipEl) return;
        const explanationEl = tooltipEl.querySelector('#coreeder-tooltip-explanation');
        explanationEl.innerHTML = '';
        const errorEl = document.createElement('div');
        errorEl.className = 'coreeder-error';
        errorEl.textContent = message;
        explanationEl.appendChild(errorEl);
    }

    /**
     * Hide and reset the tooltip.
     */
    function hideTooltip() {
        if (!tooltipEl) return;
        tooltipEl.classList.remove('coreeder-visible');
    }

    return { showLoading, showExplanation, showError, hideTooltip };
})();

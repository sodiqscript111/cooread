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
        <div id="coreeder-tooltip-logo"></div>
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
    }

    /**
     * Position the tooltip near the current selection.
     */
    function positionTooltip() {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        const tooltipW = tooltipEl.offsetWidth || 380;
        const tooltipH = tooltipEl.offsetHeight || 200;

        let left = rect.left + rect.width / 2 - tooltipW / 2;
        let top = rect.bottom + 12;

        // Flip above if near bottom
        if (top + tooltipH > viewH - 20) {
            top = rect.top - tooltipH - 12;
        }

        // Keep within horizontal bounds
        left = Math.max(12, Math.min(left, viewW - tooltipW - 12));
        top = Math.max(12, top);

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
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
        <div class="coreeder-spinner"></div>
        <span>Reading context and generating explanation…</span>
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
        explanationEl.innerHTML = `<div class="coreeder-error">⚠ ${message}</div>`;
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

// CoReeder Content Script (Orchestrator)
// Preloads passive UI, then extracts/saves/explains only after a user action.

(() => {
    if (window.__coreederReady) return;
    window.__coreederReady = true;

    let paragraphs = [];
    let paragraphElements = [];
    let contentReady = false;
    let explanationRequestId = 0;

    let hasSavedArticle = false;
    let isSavingArticle = false;
    let launcherEl = null;
    let launcherStatusTimer = null;
    let selectionTooltipEl = null;
    let selectionTooltipTimer = null;
    let lastSelectedText = '';

    function initialize() {
        ensureFloatingLauncher();
        ensureSelectionTooltip();
    }

    function ensureContentReady() {
        if (contentReady) return true;

        const result = CoReederExtractor.extractContent();
        paragraphs = result.paragraphs;
        paragraphElements = result.paragraphElements;

        if (paragraphs.length === 0) {
            console.log('[CoReeder] No readable content found on this page.');
            return false;
        }

        CoReederScrollTracker.initScrollTracker(paragraphElements);
        contentReady = true;

        window.__coreederParagraphs = paragraphs;
        Object.defineProperty(window, '__coreederLastReadIndex', {
            configurable: true,
            get: () => CoReederScrollTracker.getLastReadIndex(),
        });

        console.log(`[CoReeder] Initialized - ${paragraphs.length} paragraphs extracted.`);
        return true;
    }

    function ensureFloatingLauncher() {
        if (launcherEl) return;

        launcherEl = document.createElement('button');
        launcherEl.id = 'coreeder-launcher';
        launcherEl.type = 'button';
        launcherEl.setAttribute('aria-label', 'Save article to CoReeder');
        launcherEl.title = 'Save article to CoReeder';
        launcherEl.innerHTML = `
            <img src="${chrome.runtime.getURL('icons/riftlogo.png')}" alt="" />
            <span id="coreeder-launcher-status" role="status" aria-live="polite"></span>
        `;
        launcherEl.addEventListener('click', handleManualSave);
        document.body.appendChild(launcherEl);
    }

    async function handleManualSave() {
        if (!ensureContentReady()) {
            setLauncherStatus('No article found', 'error');
            return;
        }

        await saveCurrentArticle();
    }

    function setLauncherStatus(message, state = 'idle') {
        if (!launcherEl) return;

        const statusEl = launcherEl.querySelector('#coreeder-launcher-status');
        launcherEl.dataset.state = state;
        statusEl.textContent = message;

        if (launcherStatusTimer) clearTimeout(launcherStatusTimer);
        if (message && state !== 'saving') {
            launcherStatusTimer = setTimeout(() => {
                statusEl.textContent = '';
                launcherEl.dataset.state = hasSavedArticle ? 'saved' : 'idle';
            }, 2600);
        }
    }

    function ensureSelectionTooltip() {
        if (selectionTooltipEl) return;

        selectionTooltipEl = document.createElement('button');
        selectionTooltipEl.id = 'coreeder-selection-tooltip';
        selectionTooltipEl.type = 'button';
        selectionTooltipEl.setAttribute('aria-label', 'Explain with CoReeder');
        selectionTooltipEl.title = 'Explain with CoReeder';
        selectionTooltipEl.innerHTML = `
            <img src="${chrome.runtime.getURL('icons/loading.gif')}" alt="" />
            <span>Explain</span>
        `;
        selectionTooltipEl.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
        selectionTooltipEl.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            hideSelectionTooltip();
            await handleExplainRequest(lastSelectedText);
        });
        document.body.appendChild(selectionTooltipEl);

        document.addEventListener('mouseup', scheduleSelectionTooltip);
        document.addEventListener('keyup', scheduleSelectionTooltip);
        document.addEventListener('selectionchange', scheduleSelectionTooltip);
        document.addEventListener('scroll', hideSelectionTooltip, { passive: true });
        window.addEventListener('resize', hideSelectionTooltip);
    }

    function scheduleSelectionTooltip() {
        if (selectionTooltipTimer) clearTimeout(selectionTooltipTimer);
        selectionTooltipTimer = setTimeout(updateSelectionTooltip, 80);
    }

    function updateSelectionTooltip() {
        if (!selectionTooltipEl) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
            hideSelectionTooltip();
            return;
        }

        const text = selection.toString().trim();
        if (!text || text.length < 2 || isSelectionInsideCoreeder(selection)) {
            hideSelectionTooltip();
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = getSelectionRect(range);
        if (!rect) {
            hideSelectionTooltip();
            return;
        }

        lastSelectedText = text;
        positionSelectionTooltip(rect);
        selectionTooltipEl.classList.add('coreeder-selection-visible');
    }

    function getSelectionRect(range) {
        const rects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
        if (rects.length > 0) return rects[0];

        const rect = range.getBoundingClientRect();
        return rect.width || rect.height ? rect : null;
    }

    function positionSelectionTooltip(rect) {
        const tooltipWidth = 116;
        const tooltipHeight = 42;
        const margin = 12;
        const centeredLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        const left = Math.max(margin, Math.min(centeredLeft, window.innerWidth - tooltipWidth - margin));
        let top = rect.top - tooltipHeight - 10;

        if (top < margin) {
            top = rect.bottom + 10;
        }

        selectionTooltipEl.style.left = `${left}px`;
        selectionTooltipEl.style.top = `${Math.max(margin, top)}px`;
    }

    function hideSelectionTooltip() {
        if (!selectionTooltipEl) return;
        selectionTooltipEl.classList.remove('coreeder-selection-visible');
    }

    function isSelectionInsideCoreeder(selection) {
        const node = selection.anchorNode;
        const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        return Boolean(element?.closest?.('#coreeder-tooltip, #coreeder-launcher, #coreeder-selection-tooltip'));
    }

    function saveCurrentArticle() {
        if (isSavingArticle) return Promise.resolve(false);

        if (hasSavedArticle) {
            setLauncherStatus('Already saved', 'saved');
            return Promise.resolve(true);
        }

        const title = document.title || 'Untitled Article';
        const url = window.location.href.split('#')[0];
        const text = paragraphs.join('\n\n');

        isSavingArticle = true;
        setLauncherStatus('Saving...', 'saving');

        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'COREEDER_SAVE_ARTICLE',
                payload: { title, url, text },
            }, (response) => {
                isSavingArticle = false;

                if (response && response.ok) {
                    hasSavedArticle = true;
                    setLauncherStatus('Saved', 'saved');
                    console.log('[CoReeder] Article saved to your library.');
                    resolve(true);
                    return;
                }

                const error = response?.error || chrome.runtime.lastError?.message || 'Save failed';
                setLauncherStatus('Save failed', 'error');
                console.error('[CoReeder] Failed to save article:', error);
                resolve(false);
            });
        });
    }

    async function handleExplainRequest(selectionText = '') {
        if (!ensureContentReady()) {
            CoReederTooltip.showLoading('');
            CoReederTooltip.showError('Could not extract readable content from this page.');
            return;
        }

        const requestId = ++explanationRequestId;
        const selection = window.getSelection();
        const mapping =
            CoReederHighlightMapper.mapHighlightToParagraph(selection, paragraphElements) ||
            mapSelectionTextToParagraph(selectionText);

        if (!mapping) {
            CoReederTooltip.showLoading('(no selection)');
            CoReederTooltip.showError('Could not identify the highlighted text in the document. Try selecting text within the article body.');
            return;
        }

        const { text: highlightedText, paragraphIndex: highlightIndex } = mapping;
        CoReederTooltip.showLoading(highlightedText);

        try {
            const lastReadIndex = CoReederScrollTracker.getLastReadIndex();
            const prompt = CoReederPromptBuilder.buildPrompt({
                paragraphs,
                highlightIndex,
                highlightedText,
                lastReadIndex,
            });

            const explanation = await CoReederAI.explainHighlight(prompt);
            if (requestId !== explanationRequestId) return;
            CoReederTooltip.showExplanation(explanation);
        } catch (err) {
            if (requestId !== explanationRequestId) return;
            console.error('[CoReeder] AI error:', err);
            CoReederTooltip.showError(`Failed to generate explanation: ${err.message}`);
        }
    }

    function mapSelectionTextToParagraph(selectionText) {
        const text = selectionText.trim();
        if (!text) return null;

        const normalizedNeedle = normalizeText(text.substring(0, 80));
        const paragraphIndex = paragraphs.findIndex((paragraph) => (
            normalizeText(paragraph).includes(normalizedNeedle)
        ));
        if (paragraphIndex < 0) return null;

        return { text, paragraphIndex };
    }

    function normalizeText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'EXPLAIN_SELECTION') {
            handleExplainRequest(message.selectionText || '');
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();

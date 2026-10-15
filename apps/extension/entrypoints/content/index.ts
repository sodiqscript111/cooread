import './style.css';
import type { Browser } from 'wxt/browser';
import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { buildExplainRequest, findParagraphIndex } from '../../lib/context';
import { extractContent, type ExtractedContent } from '../../lib/extractor';
import {
    EXPLAIN_PORT,
    sendToBackground,
    type ContentRequest,
    type ErrorCode,
    type ExplainPortEvent,
} from '../../lib/messages';
import { createReadingTracker, type ReadingTracker } from '../../lib/readingTracker';
import { createLauncher } from '../../lib/ui/launcher';
import { createSelectionButton } from '../../lib/ui/selectionButton';
import { createTooltip } from '../../lib/ui/tooltip';

const UI_TAG = 'coreeder-ui';

export default defineContentScript({
    matches: ['<all_urls>'],
    cssInjectionMode: 'ui',

    async main(ctx) {
        // Guard against double injection (manifest + scripting.executeScript after install).
        if (document.querySelector(UI_TAG)) return;

        const logoUrl = browser.runtime.getURL('/icons/riftlogo.png');
        const loadingUrl = browser.runtime.getURL('/icons/loading.gif');

        const ui = await createShadowRootUi(ctx, {
            name: UI_TAG,
            position: 'inline',
            anchor: 'body',
            onMount: (container, _shadow, host) => ({ container, host }),
        });
        ui.mount();
        const { container, host } = ui.mounted!;

        // ─── Page state (reset on single-page-app navigation) ───

        let content: ExtractedContent | null = null;
        let tracker: ReadingTracker | null = null;
        let savedThisPage = false;
        let selectedText = '';
        let explainPort: Browser.runtime.Port | null = null;

        const pageUrl = () => location.href.split('#')[0]!;

        /** Extracts paragraphs on first use, or again if the page swapped its content. */
        function ensureContent(): ExtractedContent | null {
            if (content && content.elements[0]?.isConnected) return content;
            tracker?.disconnect();
            content = extractContent();
            if (content.paragraphs.length === 0) {
                content = null;
                return null;
            }
            tracker = createReadingTracker(content.elements);
            return content;
        }

        function resetPage() {
            reportProgress();
            tracker?.disconnect();
            tracker = null;
            content = null;
            savedThisPage = false;
            launcher.setStatus('', 'idle');
            tooltip.hide();
            selection.hide();
        }

        // ─── Save + reading progress ───

        const launcher = createLauncher(container, logoUrl, () => void saveArticle());

        async function saveArticle() {
            if (launcher.state === 'saving') return;
            if (savedThisPage) {
                launcher.setStatus('Already saved', 'saved');
                return;
            }
            const extracted = ensureContent();
            if (!extracted) {
                launcher.setStatus('No article found', 'error');
                return;
            }

            launcher.setStatus('Saving...', 'saving');
            const payload = {
                url: pageUrl(),
                title: document.title || 'Untitled article',
                paragraphs: extracted.paragraphs,
                lastReadIndex: tracker?.lastReadIndex ?? -1,
            };

            let result = await sendToBackground({ type: 'save', payload });
            if (!result.ok && result.code === 'unauthorized') {
                launcher.setStatus('Signing in...', 'saving');
                const signIn = await sendToBackground({ type: 'auth:signIn' });
                if (signIn.ok) result = await sendToBackground({ type: 'save', payload });
                else result = signIn;
            }

            if (result.ok) {
                savedThisPage = true;
                launcher.setStatus(result.alreadySaved ? 'Already saved' : 'Saved', 'saved');
            } else {
                launcher.setStatus(result.code === 'unauthorized' ? 'Sign in to save' : 'Save failed', 'error');
                console.warn('[CoReeder] Save failed:', result.error);
            }
        }

        /** Tells the background how far we got. It only forwards this for saved articles. */
        function reportProgress() {
            if (!content || !tracker || tracker.lastReadIndex < 0) return;
            const index = tracker.lastReadIndex;
            void sendToBackground({
                type: 'progress',
                payload: {
                    url: pageUrl(),
                    lastReadIndex: index,
                    totalParagraphs: content.paragraphs.length,
                    anchorText: content.paragraphs[index]!.slice(0, 200),
                },
            }).catch(() => undefined);
        }

        ctx.addEventListener(document, 'visibilitychange', () => {
            if (document.visibilityState === 'hidden') reportProgress();
        });
        ctx.addEventListener(window, 'pagehide', reportProgress);
        ctx.addEventListener(window, 'wxt:locationchange', resetPage);

        // ─── Explanations ───

        const tooltip = createTooltip(container, { logo: logoUrl, loading: loadingUrl }, () => {
            explainPort?.disconnect();
            explainPort = null;
        });

        const selection = createSelectionButton(container, loadingUrl, () => {
            selection.hide();
            void explain(selectedText);
        });

        async function explain(selectionText: string) {
            const extracted = ensureContent();
            if (!extracted) {
                tooltip.showLoading('');
                tooltip.showError('Could not find readable article text on this page.');
                return;
            }

            const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
            const text = (selectionText || window.getSelection()?.toString() || '').trim();
            const highlightIndex = findParagraphIndex(
                { startNode: range?.startContainer ?? null, text },
                extracted.paragraphs,
                extracted.indexOf,
            );
            if (!text || highlightIndex < 0) {
                tooltip.showLoading(text);
                tooltip.showError('Could not find the highlighted text in the article. Try selecting text within the article body.');
                return;
            }

            const request = buildExplainRequest({
                url: pageUrl(),
                paragraphs: extracted.paragraphs,
                highlightIndex,
                highlight: text,
                lastReadIndex: tracker?.lastReadIndex ?? -1,
            });

            explainPort?.disconnect();
            tooltip.showLoading(text);

            const port = browser.runtime.connect({ name: EXPLAIN_PORT });
            explainPort = port;
            port.onMessage.addListener((event: ExplainPortEvent) => {
                if (port !== explainPort) return;
                if (event.type === 'delta') tooltip.appendText(event.text);
                else if (event.type === 'done') tooltip.finish(event.remaining);
                else showExplainError(event.message, event.code, () => void explain(text));
            });
            port.postMessage(request);
        }

        function showExplainError(message: string, code: ErrorCode, retry: () => void) {
            if (code === 'unauthorized') {
                tooltip.showError(message, {
                    label: 'Sign in with Google',
                    onClick: async () => {
                        const result = await sendToBackground({ type: 'auth:signIn' });
                        if (result.ok) retry();
                        else tooltip.showError(result.error);
                    },
                });
            } else if (code === 'network' || code === 'unknown') {
                tooltip.showError(message, { label: 'Try again', onClick: retry });
            } else {
                tooltip.showError(message);
            }
        }

        // ─── Selection pill ───

        const isInsideUi = (node: Node | null) => Boolean(node && (node === host || host.contains(node)));
        let selectionTimer: ReturnType<typeof setTimeout> | undefined;

        function updateSelectionButton() {
            const current = window.getSelection();
            if (!current || current.isCollapsed || !current.rangeCount || isInsideUi(current.anchorNode)) {
                selection.hide();
                return;
            }
            const text = current.toString().trim();
            if (text.length < 2) {
                selection.hide();
                return;
            }
            const range = current.getRangeAt(0);
            const rect = [...range.getClientRects()].find((r) => r.width && r.height) ?? range.getBoundingClientRect();
            if (!rect.width && !rect.height) {
                selection.hide();
                return;
            }
            selectedText = text;
            selection.showAt(rect);
        }

        const scheduleSelectionUpdate = () => {
            clearTimeout(selectionTimer);
            selectionTimer = setTimeout(updateSelectionButton, 80);
        };
        ctx.addEventListener(document, 'selectionchange', scheduleSelectionUpdate);
        ctx.addEventListener(document, 'mouseup', scheduleSelectionUpdate);
        ctx.addEventListener(document, 'keyup', scheduleSelectionUpdate);
        ctx.addEventListener(document, 'scroll', () => selection.hide(), { passive: true, capture: true });
        ctx.addEventListener(window, 'resize', () => selection.hide());

        // ─── Context menu ("Explain with CoReeder") ───

        browser.runtime.onMessage.addListener((message: ContentRequest) => {
            if (message.type === 'explain-selection') void explain(message.selectionText);
        });
    },
});

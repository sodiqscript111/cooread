import { h } from './dom';

const HIGHLIGHT_PREVIEW_CHARS = 120;
/** Only mention the monthly allowance once it's getting low. */
const LOW_REMAINING = 10;

export interface Tooltip {
    showLoading(highlight: string): void;
    appendText(text: string): void;
    finish(remaining: number | null): void;
    showError(message: string, action?: { label: string; onClick: () => void }): void;
    hide(): void;
    readonly visible: boolean;
}

/** The explanation panel pinned to the bottom-right corner. */
export function createTooltip(container: HTMLElement, urls: { logo: string; loading: string }, onHide: () => void): Tooltip {
    const close = h('button', { class: 'tooltip-close', type: 'button', 'aria-label': 'Close' }, ['×']);
    const highlightEl = h('div', { class: 'tooltip-highlight' });
    const explanationEl = h('div', { class: 'tooltip-explanation', 'aria-live': 'polite' });
    const footerEl = h('div', { class: 'tooltip-footer' });
    const root = h('div', { class: 'tooltip', role: 'dialog', 'aria-label': 'CoReeder explanation' }, [
        h('div', { class: 'tooltip-header' }, [
            h('img', { class: 'tooltip-logo', src: urls.logo, alt: '' }),
            h('span', { class: 'tooltip-title' }, ['CoReeder']),
            close,
        ]),
        h('div', { class: 'tooltip-body' }, [highlightEl, explanationEl, footerEl]),
    ]);
    container.append(root);

    let streaming = false;

    const hide = () => {
        if (!root.classList.contains('visible')) return;
        root.classList.remove('visible');
        onHide();
    };

    close.addEventListener('click', hide);
    document.addEventListener('mousedown', (event) => {
        if (root.classList.contains('visible') && !event.composedPath().includes(root)) hide();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hide();
    });

    return {
        get visible() {
            return root.classList.contains('visible');
        },
        showLoading(highlight) {
            const preview = highlight.length > HIGHLIGHT_PREVIEW_CHARS
                ? `${highlight.slice(0, HIGHLIGHT_PREVIEW_CHARS)}…`
                : highlight;
            highlightEl.textContent = `"${preview}"`;
            highlightEl.hidden = !highlight;
            footerEl.textContent = '';
            explanationEl.replaceChildren(h('div', { class: 'loading' }, [
                h('img', { class: 'loading-gif', src: urls.loading, alt: '' }),
                h('span', {}, ['Reading context and generating explanation...']),
            ]));
            streaming = false;
            requestAnimationFrame(() => root.classList.add('visible'));
        },
        appendText(text) {
            if (!streaming) {
                explanationEl.replaceChildren();
                streaming = true;
            }
            explanationEl.append(text);
        },
        finish(remaining) {
            explanationEl.normalize();
            if (remaining !== null && remaining <= LOW_REMAINING) {
                footerEl.textContent = `${remaining} explanation${remaining === 1 ? '' : 's'} left this month.`;
            }
        },
        showError(message, action) {
            const children: Node[] = [h('div', { class: 'error' }, [message])];
            if (action) {
                const button = h('button', { class: 'action', type: 'button' }, [action.label]);
                button.addEventListener('click', action.onClick);
                children.push(button);
            }
            explanationEl.replaceChildren(...children);
            requestAnimationFrame(() => root.classList.add('visible'));
        },
        hide,
    };
}

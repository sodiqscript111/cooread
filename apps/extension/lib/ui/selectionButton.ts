import { h } from './dom';

const WIDTH = 116;
const HEIGHT = 42;
const MARGIN = 12;

export interface SelectionButton {
    showAt(rect: DOMRect): void;
    hide(): void;
}

/** The "Explain" pill that appears above highlighted text. */
export function createSelectionButton(container: HTMLElement, iconUrl: string, onClick: () => void): SelectionButton {
    const button = h('button', {
        class: 'selection-button',
        type: 'button',
        'aria-label': 'Explain with CoReeder',
        title: 'Explain with CoReeder',
    }, [h('img', { src: iconUrl, alt: '' }), h('span', {}, ['Explain'])]);

    // Keep the page selection alive when the button is pressed.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
    });
    container.append(button);

    return {
        showAt(rect) {
            const centered = rect.left + rect.width / 2 - WIDTH / 2;
            const left = Math.max(MARGIN, Math.min(centered, window.innerWidth - WIDTH - MARGIN));
            let top = rect.top - HEIGHT - 10;
            if (top < MARGIN) top = rect.bottom + 10;

            button.style.left = `${left}px`;
            button.style.top = `${Math.max(MARGIN, top)}px`;
            button.classList.add('visible');
        },
        hide() {
            button.classList.remove('visible');
        },
    };
}

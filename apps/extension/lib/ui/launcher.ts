import { h } from './dom';

export type LauncherState = 'idle' | 'saving' | 'saved' | 'error';

export interface Launcher {
    setStatus(message: string, state?: LauncherState): void;
    readonly state: LauncherState;
}

/** The floating round button that saves the current article. */
export function createLauncher(container: HTMLElement, logoUrl: string, onClick: () => void): Launcher {
    const status = h('span', { class: 'launcher-status', role: 'status', 'aria-live': 'polite' });
    const button = h('button', {
        class: 'launcher',
        type: 'button',
        'aria-label': 'Save article to CoReeder',
        title: 'Save article to CoReeder',
        'data-state': 'idle',
    }, [h('img', { src: logoUrl, alt: '' }), status]);
    button.addEventListener('click', onClick);
    container.append(button);

    let state: LauncherState = 'idle';
    let resting: LauncherState = 'idle';
    let timer: ReturnType<typeof setTimeout> | undefined;

    return {
        get state() {
            return state;
        },
        setStatus(message, next = 'idle') {
            state = next;
            if (next === 'saved') resting = 'saved';
            if (next === 'idle') resting = 'idle';
            button.dataset.state = next;
            status.textContent = message;

            clearTimeout(timer);
            if (message && next !== 'saving') {
                timer = setTimeout(() => {
                    status.textContent = '';
                    state = resting;
                    button.dataset.state = resting;
                }, 2600);
            }
        },
    };
}

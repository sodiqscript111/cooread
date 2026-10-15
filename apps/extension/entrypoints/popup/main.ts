import './style.css';
import { browser } from 'wxt/browser';
import { config } from '../../lib/config';
import { sendToBackground } from '../../lib/messages';
import { h } from '../../lib/ui/dom';

const account = document.getElementById('account')!;

async function render() {
    const status = await sendToBackground({ type: 'auth:status' });

    if (!status.configured) {
        account.replaceChildren(
            h('p', { class: 'muted' }, ['Sign-in is not configured for this build. Set WXT_SUPABASE_URL and WXT_SUPABASE_ANON_KEY.']),
        );
        return;
    }

    if (!status.signedIn) {
        const signIn = button('Sign in with Google', 'primary', async () => {
            signIn.disabled = true;
            signIn.textContent = 'Signing in…';
            const result = await sendToBackground({ type: 'auth:signIn' });
            if (!result.ok) account.append(h('p', { class: 'error' }, [result.error]));
            await render();
        });
        account.replaceChildren(
            h('p', {}, ['Highlight text on any article to get an explanation based on what you have already read.']),
            signIn,
        );
        return;
    }

    account.replaceChildren(
        h('p', { class: 'muted' }, ['Signed in as']),
        h('p', { class: 'email' }, [status.email ?? 'your Google account']),
        button('Open my library', 'primary', () => {
            void browser.tabs.create({ url: `${config.webUrl}/app` });
            window.close();
        }),
        button('Sign out', 'secondary', async () => {
            await sendToBackground({ type: 'auth:signOut' });
            await render();
        }),
    );
}

function button(label: string, variant: 'primary' | 'secondary', onClick: () => void) {
    const el = h('button', { class: `button ${variant}`, type: 'button' }, [label]);
    el.addEventListener('click', onClick);
    return el;
}

void render();

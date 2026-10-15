import { normalizeUrl } from '@coreeder/shared';
import { browser, type Browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { storage } from 'wxt/utils/storage';
import { ApiError, saveArticle, sendProgress, streamExplanation } from '../lib/api';
import { getSession, signIn, signOut } from '../lib/auth';
import { authConfigured } from '../lib/config';
import {
    EXPLAIN_PORT,
    type BackgroundRequest,
    type BackgroundResponses,
    type ContentRequest,
    type ErrorCode,
    type ExplainPortEvent,
    type ExplainPortRequest,
} from '../lib/messages';

const CONTEXT_MENU_ID = 'coreeder-explain';
const CONTENT_SCRIPT = '/content-scripts/content.js';
const MAX_SAVED_URLS = 1_000;

/**
 * URLs of saved articles, so reading progress is only sent for articles that
 * are actually in the library (no network call on every page you visit).
 */
const savedUrls = storage.defineItem<string[]>('local:savedUrls', { fallback: [] });

export default defineBackground(() => {
    browser.runtime.onInstalled.addListener(async () => {
        browser.contextMenus.removeAll(() => {
            browser.contextMenus.create({
                id: CONTEXT_MENU_ID,
                title: 'Explain with CoReeder',
                contexts: ['selection'],
            });
        });

        // Tabs opened before install don't have the content script yet.
        const tabs = await browser.tabs.query({ url: ['http://*/*', 'https://*/*'] });
        await Promise.allSettled(tabs.map((tab) => tab.id && injectContentScript(tab.id)));
    });

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) return;
        const message: ContentRequest = { type: 'explain-selection', selectionText: info.selectionText ?? '' };
        try {
            await browser.tabs.sendMessage(tab.id, message);
        } catch {
            await injectContentScript(tab.id);
            await browser.tabs.sendMessage(tab.id, message).catch((err) => {
                console.warn('[CoReeder] Could not reach the page:', err);
            });
        }
    });

    browser.runtime.onMessage.addListener((message: BackgroundRequest, _sender, sendResponse) => {
        handleMessage(message).then(sendResponse);
        return true; // keep the channel open for the async response
    });

    browser.runtime.onConnect.addListener((port) => {
        if (port.name === EXPLAIN_PORT) handleExplainPort(port);
    });
});

async function handleMessage(message: BackgroundRequest): Promise<BackgroundResponses[BackgroundRequest['type']]> {
    switch (message.type) {
        case 'save':
            return attempt(async () => {
                const result = await saveArticle(message.payload);
                await rememberSaved(message.payload.url);
                return { alreadySaved: result.alreadySaved };
            });

        case 'progress':
            return attempt(async () => {
                const url = normalizeUrl(message.payload.url);
                if (url && (await savedUrls.getValue()).includes(url)) {
                    await sendProgress(message.payload);
                }
                return {};
            });

        case 'auth:status': {
            const session = await getSession();
            return { signedIn: Boolean(session), email: session?.email ?? null, configured: authConfigured };
        }

        case 'auth:signIn':
            return attempt(async () => ({ email: (await signIn()).email }));

        case 'auth:signOut':
            return attempt(async () => {
                await signOut();
                await savedUrls.setValue([]);
                return {};
            });
    }
}

function handleExplainPort(port: Browser.runtime.Port) {
    const controller = new AbortController();
    port.onDisconnect.addListener(() => controller.abort());

    const post = (event: ExplainPortEvent) => {
        if (!controller.signal.aborted) port.postMessage(event);
    };

    port.onMessage.addListener(async (request: ExplainPortRequest) => {
        try {
            await streamExplanation(request, controller.signal, (event) => {
                if (event.type === 'delta') post({ type: 'delta', text: event.text });
                else if (event.type === 'done') post({ type: 'done', remaining: event.remaining });
                else post({ type: 'error', message: event.message, code: 'unknown' });
            });
        } catch (err) {
            if (controller.signal.aborted) return;
            const { error, code } = toFailure(err);
            post({ type: 'error', message: error, code });
        }
    });
}

async function attempt<T extends object>(fn: () => Promise<T>) {
    try {
        return { ok: true as const, ...(await fn()) };
    } catch (err) {
        return { ok: false as const, ...toFailure(err) };
    }
}

function toFailure(err: unknown): { error: string; code: ErrorCode } {
    if (err instanceof ApiError) return { error: err.message, code: err.code };
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CoReeder]', err);
    return { error: message || 'Something went wrong.', code: 'unknown' };
}

async function rememberSaved(rawUrl: string) {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    const urls = (await savedUrls.getValue()).filter((saved) => saved !== url);
    urls.push(url);
    await savedUrls.setValue(urls.slice(-MAX_SAVED_URLS));
}

async function injectContentScript(tabId: number) {
    try {
        await browser.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
    } catch {
        // Restricted pages (Chrome Web Store, PDF viewer, ...) can't be scripted.
    }
}

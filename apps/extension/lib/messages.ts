import type { ExplainRequest, ProgressRequest, SaveArticleRequest } from '@coreeder/shared';
import { browser } from 'wxt/browser';

/** Messages from content scripts / popup to the background worker. */
export type BackgroundRequest =
    | { type: 'save'; payload: SaveArticleRequest }
    | { type: 'progress'; payload: ProgressRequest }
    | { type: 'auth:status' }
    | { type: 'auth:signIn' }
    | { type: 'auth:signOut' };

export type ErrorCode = 'unauthorized' | 'limit_reached' | 'rate_limited' | 'network' | 'unknown';

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string; code: ErrorCode };

export interface AuthStatus {
    signedIn: boolean;
    email: string | null;
    configured: boolean;
}

export interface BackgroundResponses {
    save: Result<{ alreadySaved: boolean }>;
    progress: Result<object>;
    'auth:status': AuthStatus;
    'auth:signIn': Result<{ email: string | null }>;
    'auth:signOut': Result<object>;
}

/** Messages from the background worker to a tab's content script. */
export type ContentRequest = { type: 'explain-selection'; selectionText: string };

/** The explain flow uses a long-lived port so the answer can stream in. */
export const EXPLAIN_PORT = 'coreeder-explain';

export type ExplainPortRequest = ExplainRequest;

export type ExplainPortEvent =
    | { type: 'delta'; text: string }
    | { type: 'done'; remaining: number | null }
    | { type: 'error'; message: string; code: ErrorCode };

export async function sendToBackground<T extends BackgroundRequest>(
    message: T,
): Promise<BackgroundResponses[T['type']]> {
    return browser.runtime.sendMessage(message);
}

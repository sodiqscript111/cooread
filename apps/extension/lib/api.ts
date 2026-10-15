// API client used by the background worker. Content scripts never see tokens.

import type {
    ApiError as ApiErrorBody,
    ExplainEvent,
    ExplainRequest,
    ProgressRequest,
    SaveArticleRequest,
    SaveArticleResponse,
} from '@coreeder/shared';
import { getAccessToken } from './auth';
import { config } from './config';
import type { ErrorCode } from './messages';
import { createSseParser } from './sse';

export class ApiError extends Error {
    constructor(message: string, readonly code: ErrorCode) {
        super(message);
    }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const send = async (token: string) => {
        try {
            return await fetch(`${config.apiUrl}${path}`, {
                ...init,
                headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` },
            });
        } catch (err) {
            if ((err as Error).name === 'AbortError') throw err;
            throw new ApiError('Could not reach CoReeder. Check your connection and try again.', 'network');
        }
    };

    const token = await getAccessToken();
    if (!token) throw new ApiError('Sign in to CoReeder to continue.', 'unauthorized');

    let res = await send(token);
    if (res.status === 401) {
        // The token may have been revoked or rotated early; try one refresh.
        const fresh = await getAccessToken({ forceRefresh: true });
        if (!fresh) throw new ApiError('Your session has expired. Please sign in again.', 'unauthorized');
        res = await send(fresh);
    }

    if (!res.ok) {
        const body = await res.json().catch(() => null) as ApiErrorBody | null;
        throw new ApiError(body?.error ?? `Request failed (${res.status}).`, toErrorCode(body?.code, res.status));
    }
    return res;
}

export async function saveArticle(payload: SaveArticleRequest): Promise<SaveArticleResponse> {
    const res = await request('/api/articles', { method: 'POST', body: JSON.stringify(payload) });
    return res.json();
}

export async function sendProgress(payload: ProgressRequest): Promise<void> {
    await request('/api/articles/progress', { method: 'POST', body: JSON.stringify(payload), keepalive: true });
}

/** Streams an explanation, calling `onEvent` for every server event. */
export async function streamExplanation(
    payload: ExplainRequest,
    signal: AbortSignal,
    onEvent: (event: ExplainEvent) => void,
): Promise<void> {
    const res = await request('/api/explain', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { Accept: 'text/event-stream' },
        signal,
    });
    if (!res.body) throw new ApiError('Empty response from CoReeder.', 'unknown');

    const parse = createSseParser((data) => onEvent(JSON.parse(data) as ExplainEvent));
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parse(value);
    }
}

function toErrorCode(code: ApiErrorBody['code'], status: number): ErrorCode {
    if (code === 'unauthorized' || status === 401) return 'unauthorized';
    if (code === 'limit_reached') return 'limit_reached';
    if (code === 'rate_limited' || status === 429) return 'rate_limited';
    return 'unknown';
}

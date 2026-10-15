import { env } from '$env/dynamic/public';
import type {
	ApiError,
	LibraryResponse,
	ShareResponse,
	SharedLibraryResponse
} from '@coreeder/shared';

const API_BASE = (env.PUBLIC_API_URL || 'https://cooread.brimble.app').replace(/\/+$/, '');

export class RequestError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
	const { token, ...rest } = init;
	const res = await fetch(`${API_BASE}${path}`, {
		...rest,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...rest.headers
		}
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as ApiError | null;
		throw new RequestError(body?.error ?? `Request failed (${res.status})`, res.status);
	}
	return res.status === 204 ? (undefined as T) : res.json();
}

export async function fetchLibrary(token: string): Promise<LibraryResponse['library']> {
	const data = await request<LibraryResponse>('/api/library', { token });
	return data.library;
}

export async function removeArticle(token: string, articleId: string): Promise<void> {
	await request<void>(`/api/library/${encodeURIComponent(articleId)}`, { method: 'DELETE', token });
}

export async function shareCategory(token: string, category: string): Promise<string> {
	const data = await request<ShareResponse>('/api/library/share', {
		method: 'POST',
		token,
		body: JSON.stringify({ category })
	});
	return `/shared/${data.token}`;
}

export function fetchSharedLibrary(shareToken: string): Promise<SharedLibraryResponse> {
	return request<SharedLibraryResponse>(`/api/shared/${encodeURIComponent(shareToken)}`);
}

export function joinWaitlist(email: string): Promise<{ success: boolean; message: string }> {
	return request('/api/waitlist', { method: 'POST', body: JSON.stringify({ email }) });
}

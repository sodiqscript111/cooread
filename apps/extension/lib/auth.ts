// Google sign-in through Supabase Auth, run from the background worker.
// The session lives in extension storage, never in page context.

import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { authConfigured, config } from './config';

interface Session {
    accessToken: string;
    refreshToken: string;
    /** Unix seconds. */
    expiresAt: number;
    email: string | null;
}

const SESSION_KEY = 'local:session';
const session = storage.defineItem<Session | null>(SESSION_KEY, { fallback: null });

let refreshing: Promise<Session | null> | null = null;

export async function getSession(): Promise<Session | null> {
    return session.getValue();
}

/** A valid access token, refreshing it if it's about to expire. Null when signed out. */
export async function getAccessToken({ forceRefresh = false } = {}): Promise<string | null> {
    const current = await session.getValue();
    if (!current) return null;
    if (!forceRefresh && current.expiresAt - 60 > Date.now() / 1000) return current.accessToken;

    refreshing ??= refresh(current.refreshToken).finally(() => {
        refreshing = null;
    });
    return (await refreshing)?.accessToken ?? null;
}

export async function signIn(): Promise<Session> {
    if (!authConfigured) throw new Error('Sign-in is not configured for this build of CoReeder.');

    const redirectUrl = browser.identity.getRedirectURL();
    const authorizeUrl = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
    authorizeUrl.searchParams.set('provider', 'google');
    authorizeUrl.searchParams.set('redirect_to', redirectUrl);

    const responseUrl = await browser.identity.launchWebAuthFlow({ url: authorizeUrl.toString(), interactive: true });
    if (!responseUrl) throw new Error('Sign-in was cancelled.');

    // Supabase returns tokens in the URL fragment (implicit flow).
    const params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
    const error = params.get('error_description') ?? params.get('error');
    if (error) throw new Error(error);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) throw new Error('Sign-in did not return a session.');

    const next: Session = {
        accessToken,
        refreshToken,
        expiresAt: Number(params.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(params.get('expires_in') ?? 3600),
        email: emailFromToken(accessToken),
    };
    await session.setValue(next);
    return next;
}

export async function signOut(): Promise<void> {
    const current = await session.getValue();
    await session.setValue(null);
    if (!current || !authConfigured) return;
    // Best effort: revoke the refresh token server-side.
    await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${current.accessToken}` },
    }).catch(() => undefined);
}

export function watchSession(callback: (signedIn: boolean, email: string | null) => void): () => void {
    return session.watch((value) => callback(Boolean(value), value?.email ?? null));
}

async function refresh(refreshToken: string): Promise<Session | null> {
    try {
        const res = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
            // 400/401 means the refresh token is dead; anything else may be transient.
            if (res.status === 400 || res.status === 401) await session.setValue(null);
            return null;
        }
        const data = await res.json() as {
            access_token: string;
            refresh_token: string;
            expires_at?: number;
            expires_in: number;
            user?: { email?: string };
        };
        const next: Session = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at ?? Math.floor(Date.now() / 1000) + data.expires_in,
            email: data.user?.email ?? emailFromToken(data.access_token),
        };
        await session.setValue(next);
        return next;
    } catch {
        return null;
    }
}

function emailFromToken(token: string): string | null {
    try {
        const payload = token.split('.')[1] ?? '';
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const email = (JSON.parse(json) as { email?: unknown }).email;
        return typeof email === 'string' ? email : null;
    } catch {
        return null;
    }
}

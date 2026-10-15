import type { RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Db } from './db';
import { HttpError } from './errors';

export interface AuthUser {
    id: string;
    email: string | null;
}

export type TokenVerifier = (token: string) => Promise<AuthUser>;

declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthUser;
    }
}

/**
 * Verifies Supabase access tokens. Newer projects sign with asymmetric keys
 * published as JWKS; older ones use a shared HS256 secret.
 */
export function createSupabaseVerifier(supabaseUrl: string, jwtSecret?: string): TokenVerifier {
    const issuer = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
    const options = { issuer, audience: 'authenticated' };
    const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
    const jwks = secret ? null : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

    return async (token) => {
        let payload: JWTPayload;
        if (secret) {
            ({ payload } = await jwtVerify(token, secret, options));
        } else {
            ({ payload } = await jwtVerify(token, jwks!, options));
        }
        if (!payload.sub) throw new Error('Token has no subject');
        return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
    };
}

/** Rejects requests without a valid bearer token and records the user. */
export function requireAuth(verify: TokenVerifier, db: Db): RequestHandler {
    return async (req, _res, next) => {
        const header = req.get('authorization') ?? '';
        const match = /^Bearer\s+(.+)$/i.exec(header);
        if (!match?.[1]) throw new HttpError(401, 'unauthorized', 'Sign in to CoReeder to continue.');

        let user: AuthUser;
        try {
            user = await verify(match[1]);
        } catch {
            throw new HttpError(401, 'unauthorized', 'Your session has expired. Please sign in again.');
        }

        await db.query(
            `INSERT INTO users (id, email) VALUES ($1, $2)
             ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
             WHERE users.email IS DISTINCT FROM EXCLUDED.email`,
            [user.id, user.email],
        );

        req.user = user;
        next();
    };
}

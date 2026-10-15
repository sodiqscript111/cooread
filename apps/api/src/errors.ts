import type { ApiError } from '@coreeder/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
    constructor(
        readonly status: number,
        readonly code: NonNullable<ApiError['code']>,
        message: string,
    ) {
        super(message);
    }
}

/** Parses a request body, throwing a 400 that names the bad fields. */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success) throw result.error;
    return result.data;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    let status = 500;
    let body: ApiError = { error: 'Something went wrong. Please try again.', code: 'server_error' };

    if (err instanceof HttpError) {
        status = err.status;
        body = { error: err.message, code: err.code };
    } else if (err instanceof ZodError) {
        status = 400;
        const fields = err.issues.map((issue) => issue.path.join('.') || 'body');
        body = { error: `Invalid request: ${[...new Set(fields)].join(', ')}`, code: 'invalid_request' };
    } else if (err?.type === 'entity.parse.failed') {
        status = 400;
        body = { error: 'Request body is not valid JSON.', code: 'invalid_request' };
    } else if (err?.type === 'entity.too.large') {
        status = 413;
        body = { error: 'Request body is too large.', code: 'invalid_request' };
    } else {
        console.error('[api] Unhandled error:', err);
    }

    if (res.headersSent) {
        res.end();
        return;
    }
    res.status(status).json(body);
};

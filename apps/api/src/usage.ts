import type { Queryable } from './db';

/** Calendar month in UTC, e.g. "2026-10". */
export function currentPeriod(now = new Date()): string {
    return now.toISOString().slice(0, 7);
}

/**
 * Atomically uses up one explanation. Returns how many are left this month,
 * or null when the limit was already reached (nothing is counted then).
 */
export async function consumeExplanation(db: Queryable, userId: string, limit: number): Promise<number | null> {
    const { rows } = await db.query<{ count: number }>(
        `INSERT INTO usage (user_id, period, count) VALUES ($1, $2, 1)
         ON CONFLICT (user_id, period) DO UPDATE SET count = usage.count + 1
         WHERE usage.count < $3
         RETURNING count`,
        [userId, currentPeriod(), limit],
    );
    const row = rows[0];
    return row ? Math.max(0, limit - row.count) : null;
}

/** Gives an explanation back, e.g. when the model call failed before producing anything. */
export async function refundExplanation(db: Queryable, userId: string): Promise<void> {
    await db.query(
        'UPDATE usage SET count = GREATEST(count - 1, 0) WHERE user_id = $1 AND period = $2',
        [userId, currentPeriod()],
    );
}

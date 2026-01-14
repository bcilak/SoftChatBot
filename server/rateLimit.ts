type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export function rateLimitOrThrow(opts: {
    key: string;
    limit: number;
    windowMs: number;
}): { remaining: number; resetAtMs: number } {
    const now = Date.now();
    const existing = buckets.get(opts.key);

    if (!existing || existing.resetAtMs <= now) {
        const next: Bucket = { count: 1, resetAtMs: now + opts.windowMs };
        buckets.set(opts.key, next);
        return { remaining: opts.limit - 1, resetAtMs: next.resetAtMs };
    }

    if (existing.count >= opts.limit) {
        const err = new Error('RATE_LIMITED');
        (err as any).code = 'RATE_LIMITED';
        (err as any).resetAtMs = existing.resetAtMs;
        throw err;
    }

    existing.count += 1;
    buckets.set(opts.key, existing);
    return { remaining: opts.limit - existing.count, resetAtMs: existing.resetAtMs };
}

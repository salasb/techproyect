/**
 * Lightweight Rate Limiter (v1.0)
 * Uses an in-memory cache to track hits per identifier (IP/Token).
 * Note: In serverless, this is per-instance, but effective against basic flood.
 */

const cache = new Map<string, { count: number; expiresAt: number }>();

export async function rateLimit(identifier: string, limit: number = 10, windowMs: number = 60000) {
    const now = Date.now();
    const record = cache.get(identifier);

    if (!record || now > record.expiresAt) {
        cache.set(identifier, { count: 1, expiresAt: now + windowMs });
        return { success: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { success: false, remaining: 0, retryAfter: Math.ceil((record.expiresAt - now) / 1000) };
    }

    record.count++;
    return { success: true, remaining: limit - record.count };
}

/**
 * Cleanup expired records periodically
 */
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of cache.entries()) {
            if (now > val.expiresAt) cache.delete(key);
        }
    }, 300000); // 5 min cleanup
}

// lib/security/rate-limit.ts — Minimal in-memory rate limiter for auth endpoints
// Sliding-window per-IP counter. Does not persist across process restarts.
// For production, replace with Redis-backed implementation.

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

/** In-memory rate limit check. Returns true if request is allowed, false if rate-limited. */
export function checkRateLimit(ip: string | null, limit: number, windowMs: number): boolean {
  if (!ip) return true; // allow requests without IP
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    store.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) {
    return false; // rate limited
  }

  entry.count++;
  return true;
}

/** Clear all rate limit entries. Call between test runs. */
export function resetRateLimitStore(): void {
  store.clear();
}

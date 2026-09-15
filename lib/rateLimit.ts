export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private readonly records = new Map<string, RateLimitRecord>();

  constructor(private readonly maxEntries = 10_000) {}

  consume(key: string, maxRequests: number, windowMs: number, now = Date.now()): RateLimitResult {
    const current = this.records.get(key);
    if (!current || now >= current.resetTime) {
      this.records.set(key, { count: 1, resetTime: now + windowMs });
      this.trim(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetTime - now) / 1000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  evictExpired(now = Date.now()): void {
    for (const [key, record] of this.records) {
      if (now >= record.resetTime) this.records.delete(key);
    }
  }

  private trim(now: number): void {
    this.evictExpired(now);
    while (this.records.size > this.maxEntries) {
      const oldestKey = this.records.keys().next().value;
      if (oldestKey === undefined) break;
      this.records.delete(oldestKey);
    }
  }
}

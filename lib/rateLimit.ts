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

export class SharedRateLimiter {
  private readonly fallback: InMemoryRateLimiter;
  private readonly url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  private readonly token = process.env.UPSTASH_REDIS_REST_TOKEN;

  constructor(maxEntries = 10_000) {
    this.fallback = new InMemoryRateLimiter(maxEntries);
  }

  async consume(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
    if (!this.url || !this.token) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Shared rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
      }
      return this.fallback.consume(key, maxRequests, windowMs);
    }

    const increment = await this.command<number>(['INCR', `rate-limit:${key}`]);
    const keyName = `rate-limit:${key}`;
    if (increment === 1) {
      await this.command(['EXPIRE', keyName, String(Math.max(1, Math.ceil(windowMs / 1000)))]);
    }

    if (increment > maxRequests) {
      const ttl = await this.command<number>(['TTL', keyName]);
      return { allowed: false, retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : Math.ceil(windowMs / 1000)) };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  evictExpired(): void {
    this.fallback.evictExpired();
  }

  private async command<T = unknown>(command: string[]): Promise<T> {
    const response = await fetch(this.url!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!response.ok) throw new Error(`Shared rate-limit store returned ${response.status}.`);
    const payload = await response.json() as { result?: T; error?: string };
    if (payload.error) throw new Error(payload.error);
    return payload.result as T;
  }
}

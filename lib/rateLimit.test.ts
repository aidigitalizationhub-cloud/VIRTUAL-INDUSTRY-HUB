import { describe, expect, it } from 'vitest';
import { InMemoryRateLimiter } from './rateLimit';

describe('InMemoryRateLimiter', () => {
  it('limits each identity and resets after its window', () => {
    const limiter = new InMemoryRateLimiter();
    expect(limiter.consume('user:route', 2, 1000, 0).allowed).toBe(true);
    expect(limiter.consume('user:route', 2, 1000, 1).allowed).toBe(true);
    expect(limiter.consume('user:route', 2, 1000, 2).allowed).toBe(false);
    expect(limiter.consume('user:route', 2, 1000, 1000).allowed).toBe(true);
  });

  it('keeps separate keys independent', () => {
    const limiter = new InMemoryRateLimiter();
    limiter.consume('user:chat', 1, 1000, 0);
    expect(limiter.consume('user:embed', 1, 1000, 1).allowed).toBe(true);
  });
});

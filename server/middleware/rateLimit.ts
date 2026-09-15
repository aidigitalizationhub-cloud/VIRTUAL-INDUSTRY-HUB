import type { NextFunction, Request, Response } from 'express';
import { InMemoryRateLimiter } from '../../lib/rateLimit';

export const rateLimiter = new InMemoryRateLimiter();

if (typeof setInterval === 'function') {
  setInterval(() => rateLimiter.evictExpired(), 10 * 60 * 1000).unref?.();
}

export const throttleLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identity = (req as any).user?.id ? `user:${(req as any).user.id}` : `ip:${req.ip || 'anonymous'}`;
    const endpoint = `${(req as any).baseUrl}:${String((req as any).route?.path || req.path)}`;
    const result = rateLimiter.consume(`${endpoint}:${identity}`, maxRequests, windowMs);
    if (!result.allowed) {
      return res.status(429).json({
        error: `Too many expensive AI requests. Rate limit exceeded. Please retry in ${result.retryAfterSeconds} seconds.`,
      });
    }
    next();
  };
};

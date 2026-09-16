import type { NextFunction, Request, Response } from 'express';
import { SharedRateLimiter } from '../../lib/rateLimit';

export const rateLimiter = new SharedRateLimiter();

if (typeof setInterval === 'function') {
  setInterval(() => rateLimiter.evictExpired(), 10 * 60 * 1000).unref?.();
}

export const throttleLimit = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identity = (req as any).user?.id ? `user:${(req as any).user.id}` : `ip:${req.ip || 'anonymous'}`;
    const endpoint = `${(req as any).baseUrl}:${String((req as any).route?.path || req.path)}`;
    try {
      const result = await rateLimiter.consume(`${endpoint}:${identity}`, maxRequests, windowMs);
      if (!result.allowed) {
        return res.status(429).json({
          error: `Too many expensive AI requests. Rate limit exceeded. Please retry in ${result.retryAfterSeconds} seconds.`,
        });
      }
      return next();
    } catch (error) {
      console.error('[rate-limit] Shared store unavailable:', error);
      return res.status(503).json({ error: 'Rate limiting service is temporarily unavailable.' });
    }
  };
};

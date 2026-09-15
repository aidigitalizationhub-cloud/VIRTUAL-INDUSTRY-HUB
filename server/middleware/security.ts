import type { Express, NextFunction, Request, Response } from 'express';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../lib/auth';
import { BASE64_JSON_BODY_LIMIT_BYTES } from '../../lib/uploadGuard';
import { ALLOWED_ORIGINS } from '../config/env';

export const applyCoreMiddleware = (app: Express) => {
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const url = req.originalUrl || req.url;
        if (
          req.url === '/api/health' ||
          /^\/(@vite|@id|node_modules|src|assets|__open-in-editor)/.test(url) ||
          /\.(js|mjs|css|map|png|jpg|jpeg|svg|ico|woff2?|ttf)(\?|$)/i.test(url)
        )
          return;
        const u: any = (req as any).user;
        const who = u?.email
          ? `${u.email}${(req as any).authSource ? ` via ${(req as any).authSource}` : ''}`
          : 'anon';
        const dur = Date.now() - start;
        console.log(`[api] ${req.method} ${url.split('?')[0]} → ${res.statusCode} ${dur}ms · ${who}`);
      });
      next();
    });
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.includes(origin);
      if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
      }
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Max-Age', '86400');

    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('X-Frame-Options', 'DENY');
    res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; connect-src 'self' https: wss: ws://localhost:*; frame-src https://innoguid.netlify.app https:; object-src 'none'; base-uri 'self'; form-action 'self'",
    );

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.all('/api/auth/*splat', toNodeHandler(auth) as any);

  app.use(express.json({ limit: BASE64_JSON_BODY_LIMIT_BYTES }));
  app.use(express.urlencoded({ limit: BASE64_JSON_BODY_LIMIT_BYTES, extended: true }));
};

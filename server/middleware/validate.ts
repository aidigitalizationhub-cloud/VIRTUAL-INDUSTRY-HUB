import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as any).body ?? {});
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request body.', details: result.error.flatten() });
    }
    (req as any).body = result.data;
    next();
  };
};

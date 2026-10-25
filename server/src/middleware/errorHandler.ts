import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors';

export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join('.') || 'input';
    res.status(400).json({
      error: { code: 'validation', message: `${field}: ${first?.message ?? 'Invalid value'}` },
    });
    return;
  }
  const anyErr = err as { code?: number; name?: string; type?: string };
  if (anyErr?.code === 11000) {
    res.status(409).json({ error: { code: 'duplicate', message: 'That item already exists.' } });
    return;
  }
  if (anyErr?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'too_large', message: 'Request is too large.' } });
    return;
  }
  if (anyErr?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_json', message: 'Invalid request body.' } });
    return;
  }
  // Log the error type and message only: no request bodies, cookies or headers.
  const e = err as Error;
  console.error(`Unhandled error on ${req.method} ${req.path}: ${e?.name ?? 'Error'}: ${e?.message ?? ''}`);
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong. Please try again.' } });
}

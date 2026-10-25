import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError, unauthorized } from '../utils/errors';

export const COOKIE_NAME = 'ff_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthedRequest extends Request {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

const cookieBase = () => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
});

export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieBase(), maxAge: MAX_AGE_MS });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, cookieBase());
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== 'string') return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.sub !== 'string') return next(unauthorized());
    (req as AuthedRequest).userId = payload.sub;
    next();
  } catch {
    next(unauthorized('Your session has expired. Please log in again.'));
  }
}

/**
 * CSRF defence for cookie auth: browsers cannot add a custom header on a cross-site form post,
 * and CORS only allows our own frontend origin to send it.
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'fluentfriend') {
    return next(new HttpError(403, 'csrf', 'Request blocked.'));
  }
  next();
}

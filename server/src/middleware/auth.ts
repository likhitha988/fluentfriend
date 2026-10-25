import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { UserSettings } from '../models/UserSettings';
import { LearningProgress } from '../models/LearningProgress';
import { HttpError } from '../utils/errors';
import { isValidTimeZone } from '../utils/date';

export interface AuthedRequest extends Request {
  userId: string;
}

const GUEST_RE = /^[a-f0-9]{32,64}$/;
const known = new Map<string, string>();

async function resolveGuest(guestId: string, tzHeader?: string): Promise<string> {
  const cached = known.get(guestId);
  if (cached) return cached;
  const email = `${guestId}@guest.local`;
  let user = await User.findOne({ email });
  if (!user) {
    try {
      user = await User.create({
        email,
        passwordHash: crypto.randomBytes(32).toString('hex'),
        displayName: 'Friend',
      });
      const tz = tzHeader && isValidTimeZone(tzHeader) ? tzHeader : 'UTC';
      await UserSettings.create({ user: user._id, timezone: tz });
      await LearningProgress.create({ user: user._id });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      user = await User.findOne({ email });
    }
  }
  if (!user) throw new HttpError(500, 'guest_failed', 'Could not start a session.');
  const uid = String(user._id);
  if (known.size > 5000) known.clear();
  known.set(guestId, uid);
  return uid;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.get('x-guest-id');
  const guestId = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!GUEST_RE.test(guestId)) return next(new HttpError(400, 'bad_guest', 'Missing session id.'));
  resolveGuest(guestId, req.get('x-timezone') ?? undefined)
    .then((uid) => {
      (req as AuthedRequest).userId = uid;
      next();
    })
    .catch(next);
}

export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'fluentfriend') {
    return next(new HttpError(403, 'csrf', 'Request blocked.'));
  }
  next();
}
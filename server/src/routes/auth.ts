import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { UserSettings } from '../models/UserSettings';
import { LearningProgress } from '../models/LearningProgress';
import { AuthedRequest, clearAuthCookie, requireAuth, setAuthCookie } from '../middleware/auth';
import { wrap } from '../middleware/errorHandler';
import { HttpError, conflict, unauthorized } from '../utils/errors';
import { isValidTimeZone } from '../utils/date';
import { serializeSettings, serializeUser } from '../utils/serialize';

export const authRouter = Router();

const BCRYPT_COST = 12;
// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
  displayName: z.string().trim().min(1, 'Please enter your name').max(40),
  timezone: z.string().max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

authRouter.post(
  '/register',
  wrap(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST);
    let user;
    try {
      user = await User.create({ email: body.email, passwordHash, displayName: body.displayName });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw conflict('An account with this email already exists.');
      throw err;
    }
    const tz = body.timezone && isValidTimeZone(body.timezone) ? body.timezone : 'UTC';
    const settings = await UserSettings.create({ user: user._id, timezone: tz });
    await LearningProgress.create({ user: user._id });
    setAuthCookie(res, String(user._id));
    res.status(201).json({ user: serializeUser(user), settings: serializeSettings(settings) });
  }),
);

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email }).select('+passwordHash');
    const ok = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'invalid_credentials', 'Incorrect email or password.');
    let settings = await UserSettings.findOne({ user: user._id });
    if (!settings) settings = await UserSettings.create({ user: user._id });
    setAuthCookie(res, String(user._id));
    res.json({ user: serializeUser(user), settings: serializeSettings(settings) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const user = await User.findById(uid);
    if (!user) {
      clearAuthCookie(res);
      throw unauthorized();
    }
    let settings = await UserSettings.findOne({ user: user._id });
    if (!settings) settings = await UserSettings.create({ user: user._id });
    res.json({ user: serializeUser(user), settings: serializeSettings(settings) });
  }),
);

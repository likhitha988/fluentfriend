import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AuthedRequest, clearAuthCookie } from '../middleware/auth';
import { wrap } from '../middleware/errorHandler';
import { User } from '../models/User';
import { UserSettings, CORRECTION_STYLES, DIFFICULTIES } from '../models/UserSettings';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { LearningProgress } from '../models/LearningProgress';
import { VocabularyWord } from '../models/VocabularyWord';
import { DailyChallenge } from '../models/DailyChallenge';
import { HttpError, notFound } from '../utils/errors';
import { isValidTimeZone } from '../utils/date';
import { serializeSettings, serializeUser } from '../utils/serialize';

export const settingsRouter = Router();
export const accountRouter = Router();

const patchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40),
    difficulty: z.enum(DIFFICULTIES),
    correctionStyle: z.enum(CORRECTION_STYLES),
    voiceURI: z.string().max(300),
    speechRate: z.number().min(0.6).max(1.3),
    recognitionLang: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/),
    autoListen: z.boolean(),
    dailyReminder: z.boolean(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    dailyGoalMinutes: z.number().int().min(1).max(120),
    timezone: z.string().max(64).refine(isValidTimeZone, 'Unknown time zone'),
  })
  .partial()
  .strict();

settingsRouter.get(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const [user, settings] = await Promise.all([User.findById(uid), UserSettings.findOne({ user: uid })]);
    if (!user || !settings) throw notFound('Account not found.');
    res.json({ user: serializeUser(user), settings: serializeSettings(settings) });
  }),
);

settingsRouter.patch(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const { displayName, ...rest } = patchSchema.parse(req.body);
    const [user, settings] = await Promise.all([
      displayName ? User.findByIdAndUpdate(uid, { displayName }, { new: true }) : User.findById(uid),
      UserSettings.findOneAndUpdate({ user: uid }, { $set: rest }, { new: true }),
    ]);
    if (!user || !settings) throw notFound('Account not found.');
    res.json({ user: serializeUser(user), settings: serializeSettings(settings) });
  }),
);

/** Download everything FluentFriend stores about the signed-in user. */
accountRouter.get(
  '/export',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const [user, settings, progress, conversations, messages, words, challenges] = await Promise.all([
      User.findById(uid).lean(),
      UserSettings.findOne({ user: uid }).lean(),
      LearningProgress.findOne({ user: uid }).lean(),
      Conversation.find({ user: uid }).lean(),
      Message.find({ user: uid }).sort({ createdAt: 1 }).lean(),
      VocabularyWord.find({ user: uid }).lean(),
      DailyChallenge.find({ user: uid }).lean(),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="fluentfriend-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      user: user && { email: user.email, displayName: user.displayName, createdAt: user.createdAt },
      settings,
      progress,
      conversations,
      messages,
      vocabulary: words,
      dailyChallenges: challenges,
    });
  }),
);

const deleteSchema = z.object({ password: z.string().min(1).max(72) });

/** Permanently deletes the account and every record that belongs to it. */
accountRouter.delete(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const { password } = deleteSchema.parse(req.body);
    const user = await User.findById(uid).select('+passwordHash');
    if (!user) throw notFound('Account not found.');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(403, 'wrong_password', 'That password is not correct.');
    }
    await Promise.all([
      Message.deleteMany({ user: uid }),
      Conversation.deleteMany({ user: uid }),
      VocabularyWord.deleteMany({ user: uid }),
      DailyChallenge.deleteMany({ user: uid }),
      LearningProgress.deleteMany({ user: uid }),
      UserSettings.deleteMany({ user: uid }),
    ]);
    await User.deleteOne({ _id: uid });
    clearAuthCookie(res);
    res.json({ ok: true });
  }),
);

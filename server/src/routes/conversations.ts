import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthedRequest } from '../middleware/auth';
import { wrap } from '../middleware/errorHandler';
import { Conversation, MODES } from '../models/Conversation';
import { Message } from '../models/Message';
import { UserSettings } from '../models/UserSettings';
import { User } from '../models/User';
import { VocabularyWord } from '../models/VocabularyWord';
import { DailyChallenge } from '../models/DailyChallenge';
import {
  DESCRIBE_PROMPTS,
  OPINION_PROMPTS,
  ROLE_PLAYS,
  STORY_PROMPTS,
  SUGGESTED_TOPICS,
  TIMED_EXERCISES,
} from '../content/practice';
import { HistoryItem, generateOpener, generateSummary, generateTurn } from '../services/ai/engine';
import { PromptContext } from '../services/ai/prompts';
import { getOrCreateProgress, recordPractice, topMistakeCategories, trackWordUsage } from '../services/learning';
import { getTodayChallenge } from '../services/challenges';
import { badRequest, conflict, notFound } from '../utils/errors';
import { parseObjectId } from '../utils/objectId';
import { dateKeyInTz } from '../utils/date';
import { serializeConversation, serializeMessage } from '../utils/serialize';

export const conversationsRouter = Router();

const CHALLENGE_TURNS_REQUIRED = 3;

// 30 AI turns per minute per signed-in user.
const turnLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthedRequest).userId,
  message: { error: { code: 'rate_limited', message: 'You are going a little fast. Wait a moment and try again.' } },
});

const startSchema = z.object({
  mode: z.enum(MODES).default('free'),
  /** Id from the practice catalog (role-play, story, opinion, timed, topic). */
  itemId: z.string().max(60).optional(),
  /** Free text topic for free conversations. */
  topic: z.string().trim().max(200).optional(),
});

interface Resolved {
  mode: (typeof MODES)[number];
  title: string;
  topic: string;
  scenarioId: string;
  timedSeconds: number;
  challengeDateKey: string;
}

async function resolveStart(
  body: z.infer<typeof startSchema>,
  userId: string,
  timezone: string,
): Promise<Resolved> {
  const base: Resolved = { mode: body.mode, title: 'Free conversation', topic: '', scenarioId: '', timedSeconds: 0, challengeDateKey: '' };
  switch (body.mode) {
    case 'free': {
      const preset = SUGGESTED_TOPICS.find((t) => t.id === body.itemId);
      if (preset) return { ...base, title: preset.title, topic: preset.topic };
      if (body.topic) return { ...base, title: body.topic.slice(0, 60), topic: body.topic };
      return base;
    }
    case 'roleplay': {
      const rp = ROLE_PLAYS.find((r) => r.id === body.itemId);
      if (!rp) throw badRequest('Unknown role-play scenario.');
      return { ...base, title: rp.title, topic: rp.blurb, scenarioId: rp.id };
    }
    case 'challenge': {
      const { record } = await getTodayChallenge(userId, timezone);
      return { ...base, title: record.title, topic: record.prompt, challengeDateKey: record.dateKey };
    }
    case 'story': {
      const s = [...STORY_PROMPTS, ...DESCRIBE_PROMPTS].find((p) => p.id === body.itemId);
      if (!s) throw badRequest('Unknown story prompt.');
      return { ...base, title: s.title, topic: s.prompt, scenarioId: s.id };
    }
    case 'opinion': {
      const o = OPINION_PROMPTS.find((p) => p.id === body.itemId);
      if (!o) throw badRequest('Unknown opinion prompt.');
      return { ...base, title: o.title, topic: o.prompt, scenarioId: o.id };
    }
    case 'timed': {
      const t = TIMED_EXERCISES.find((p) => p.id === body.itemId);
      if (!t) throw badRequest('Unknown timed exercise.');
      return { ...base, title: t.title, topic: t.prompt, scenarioId: t.id, timedSeconds: t.seconds };
    }
  }
}

interface LoadedContext {
  ctx: PromptContext;
  savedWordKeys: Set<string>;
  timezone: string;
}

async function loadContext(
  userId: string,
  conv: Pick<Resolved, 'mode' | 'topic' | 'scenarioId' | 'timedSeconds'>,
  userTurnCount: number,
): Promise<LoadedContext> {
  const uid = new Types.ObjectId(userId);
  const [user, settings, progress, words] = await Promise.all([
    User.findById(uid).select('displayName'),
    UserSettings.findOne({ user: uid }),
    getOrCreateProgress(uid),
    VocabularyWord.find({ user: uid }).select('word wordKey status usedCount').lean(),
  ]);
  if (!user || !settings) throw notFound('Account not found.');

  const practiceWords = words
    .filter((w) => w.status !== 'mastered')
    .sort((a, b) => a.usedCount - b.usedCount)
    .slice(0, 5)
    .map((w) => w.word);

  const rp = conv.mode === 'roleplay' ? ROLE_PLAYS.find((r) => r.id === conv.scenarioId) : undefined;
  const ctx: PromptContext = {
    displayName: user.displayName,
    difficulty: settings.difficulty as PromptContext['difficulty'],
    correctionStyle: settings.correctionStyle as PromptContext['correctionStyle'],
    mode: conv.mode,
    topic: conv.topic,
    scenarioSetup: rp?.setup,
    timedSeconds: conv.timedSeconds || undefined,
    focusCategories: topMistakeCategories(progress.mistakeCounts as Map<string, number>, 2, { exclude: ['other', 'natural_phrasing'] })
      .filter((c) => c.count >= 2)
      .map((c) => c.category),
    practiceWords,
    userTurnCount,
  };
  return { ctx, savedWordKeys: new Set(words.map((w) => w.wordKey)), timezone: settings.timezone };
}

/** Start a conversation: the AI opens it. Nothing is saved unless the AI call succeeds. */
conversationsRouter.post(
  '/',
  turnLimiter,
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const body = startSchema.parse(req.body ?? {});
    const settings = await UserSettings.findOne({ user: uid });
    if (!settings) throw notFound('Account not found.');
    const resolved = await resolveStart(body, uid, settings.timezone);

    const { ctx, savedWordKeys } = await loadContext(uid, resolved, 0);
    const opener = await generateOpener(ctx, savedWordKeys);

    const conv = await Conversation.create({ user: uid, ...resolved });
    const msg = await Message.create({
      conversation: conv._id,
      user: uid,
      role: 'assistant',
      source: 'ai',
      content: opener.reply,
    });
    await recordPractice({ userId: uid, timezone: settings.timezone, speakingSeconds: 0, newConversation: true });

    res.status(201).json({ conversation: serializeConversation(conv), messages: [serializeMessage(msg)] });
  }),
);

const messageSchema = z.object({
  text: z.string().trim().min(1, 'Say or type something first').max(1500),
  source: z.enum(['voice', 'text']).default('text'),
  /** Seconds the learner actually spoke, measured in the browser. Ignored for typed messages. */
  speakingSeconds: z.number().min(0).max(600).optional(),
});

conversationsRouter.post(
  '/:id/messages',
  turnLimiter,
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const id = parseObjectId(req.params.id);
    const body = messageSchema.parse(req.body);

    const conv = await Conversation.findOne({ _id: id, user: uid });
    if (!conv) throw notFound('Conversation not found.');
    if (conv.status !== 'active') throw conflict('This conversation has ended. Start a new one to keep practising.');

    const historyDocs = await Message.find({ conversation: conv._id })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    const history: HistoryItem[] = historyDocs.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      correction: m.correction ?? null,
      vocabulary: m.vocabulary ?? null,
    }));

    const { ctx, savedWordKeys, timezone } = await loadContext(uid, conv, conv.userTurns);
    const turn = await generateTurn(ctx, history, body.text, savedWordKeys);

    const seconds = body.source === 'voice' ? Math.round(body.speakingSeconds ?? 0) : 0;

    const userMsg = await Message.create({
      conversation: conv._id,
      user: uid,
      role: 'user',
      source: body.source,
      content: body.text,
      speakingSeconds: seconds,
    });
    const aiMsg = await Message.create({
      conversation: conv._id,
      user: uid,
      role: 'assistant',
      source: 'ai',
      content: turn.reply,
      ...(turn.correction ? { correction: turn.correction } : {}),
      ...(turn.vocabulary ? { vocabulary: turn.vocabulary } : {}),
    });

    conv.userTurns += 1;
    conv.speakingSeconds += seconds;
    await conv.save();

    const [progress, usedWords] = await Promise.all([
      recordPractice({
        userId: uid,
        timezone,
        speakingSeconds: seconds,
        correctionCategory: turn.correction?.category ?? null,
      }),
      trackWordUsage(uid, body.text),
    ]);

    let challengeCompleted = false;
    if (conv.mode === 'challenge' && conv.challengeDateKey && conv.userTurns >= CHALLENGE_TURNS_REQUIRED) {
      const done = await DailyChallenge.findOneAndUpdate(
        { user: uid, dateKey: conv.challengeDateKey, completed: false },
        { completed: true, completedAt: new Date(), conversation: conv._id, speakingSeconds: conv.speakingSeconds },
        { new: true },
      );
      challengeCompleted = !!done;
    }

    const today = dateKeyInTz(timezone);
    const todayActivity = progress.dailyActivity.find((d) => d.date === today);
    res.json({
      userMessage: serializeMessage(userMsg),
      assistantMessage: serializeMessage(aiMsg),
      usedWords,
      challengeCompleted,
      stats: {
        currentStreak: progress.currentStreak,
        todaySpeakingSeconds: todayActivity?.speakingSeconds ?? 0,
        conversationSpeakingSeconds: conv.speakingSeconds,
        userTurns: conv.userTurns,
      },
    });
  }),
);

conversationsRouter.post(
  '/:id/end',
  turnLimiter,
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const id = parseObjectId(req.params.id);
    const conv = await Conversation.findOne({ _id: id, user: uid });
    if (!conv) throw notFound('Conversation not found.');

    if (conv.status === 'active') {
      if (conv.userTurns >= 2) {
        const history = await Message.find({ conversation: conv._id }).sort({ createdAt: 1 }).limit(60).lean();
        const { ctx } = await loadContext(uid, conv, conv.userTurns);
        conv.summary = await generateSummary(
          ctx,
          history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        );
      }
      conv.status = 'ended';
      conv.endedAt = new Date();
      await conv.save();
    }
    res.json({ conversation: serializeConversation(conv) });
  }),
);

conversationsRouter.get(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const items = await Conversation.find({ user: uid }).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ conversations: items.map(serializeConversation) });
  }),
);

conversationsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const id = parseObjectId(req.params.id);
    const conv = await Conversation.findOne({ _id: id, user: uid }).lean();
    if (!conv) throw notFound('Conversation not found.');
    const messages = await Message.find({ conversation: id, user: uid }).sort({ createdAt: 1 }).lean();
    res.json({ conversation: serializeConversation(conv), messages: messages.map(serializeMessage) });
  }),
);

conversationsRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const id = parseObjectId(req.params.id);
    const conv = await Conversation.findOneAndDelete({ _id: id, user: uid });
    if (!conv) throw notFound('Conversation not found.');
    await Message.deleteMany({ conversation: id, user: uid });
    res.json({ ok: true });
  }),
);

/** Delete the learner's whole conversation history (vocabulary and progress totals are kept). */
conversationsRouter.delete(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const [c, m] = await Promise.all([Conversation.deleteMany({ user: uid }), Message.deleteMany({ user: uid })]);
    res.json({ ok: true, conversationsDeleted: c.deletedCount, messagesDeleted: m.deletedCount });
  }),
);

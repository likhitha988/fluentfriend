import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest } from '../middleware/auth';
import { wrap } from '../middleware/errorHandler';
import { VocabularyWord } from '../models/VocabularyWord';
import { badRequest, conflict, notFound } from '../utils/errors';
import { parseObjectId } from '../utils/objectId';
import { serializeWord } from '../utils/serialize';
import { Types } from 'mongoose';

export const vocabularyRouter = Router();

const MAX_WORDS = 1000;

const saveSchema = z.object({
  word: z.string().trim().min(1).max(60),
  meaning: z.string().trim().min(1).max(300),
  pronunciation: z.string().trim().max(80).optional().default(''),
  example: z.string().trim().min(1).max(300),
  dailyExample: z.string().trim().max(300).optional().default(''),
  sourceConversation: z.string().optional(),
});

vocabularyRouter.get(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const filter: Record<string, unknown> = { user: uid };
    const status = req.query.status;
    if (typeof status === 'string' && ['new', 'learning', 'mastered'].includes(status)) filter.status = status;
    const words = await VocabularyWord.find(filter).sort({ createdAt: -1 }).limit(MAX_WORDS).lean();
    res.json({ words: words.map(serializeWord) });
  }),
);

vocabularyRouter.post(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const body = saveSchema.parse(req.body);
    const count = await VocabularyWord.countDocuments({ user: uid });
    if (count >= MAX_WORDS) throw badRequest('Your notebook is full. Remove a few words first.');

    let source: Types.ObjectId | undefined;
    if (body.sourceConversation) {
      try {
        source = parseObjectId(body.sourceConversation);
      } catch {
        source = undefined;
      }
    }
    try {
      const doc = await VocabularyWord.create({
        user: uid,
        word: body.word,
        wordKey: body.word.toLowerCase(),
        meaning: body.meaning,
        pronunciation: body.pronunciation,
        example: body.example,
        dailyExample: body.dailyExample,
        sourceConversation: source,
      });
      res.status(201).json({ word: serializeWord(doc) });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw conflict('This word is already in your notebook.');
      throw err;
    }
  }),
);

// ---- Quiz (built from the user's own saved words; no AI call needed) ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function blankOut(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i');
  return re.test(sentence) ? sentence.replace(re, '_____') : null;
}

vocabularyRouter.get(
  '/quiz',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const count = Math.min(Math.max(Number(req.query.count) || 5, 1), 10);
    const all = await VocabularyWord.find({ user: uid }).lean();
    if (all.length < 3) {
      res.json({ questions: [], message: 'Save at least 3 words to unlock quizzes.' });
      return;
    }
    // Practise words that are not mastered first, least recently reviewed first.
    const pool = [...all].sort((a, b) => {
      const am = a.status === 'mastered' ? 1 : 0;
      const bm = b.status === 'mastered' ? 1 : 0;
      if (am !== bm) return am - bm;
      return (a.lastReviewedAt?.getTime() ?? 0) - (b.lastReviewedAt?.getTime() ?? 0);
    });
    const picked = pool.slice(0, count);

    const questions = picked.map((w) => {
      const distractors = shuffle(all.filter((o) => String(o._id) !== String(w._id))).slice(0, 3);
      const options = shuffle([w.word, ...distractors.map((d) => d.word)]);
      const blanked = blankOut(w.example, w.word);
      return blanked
        ? { wordId: String(w._id), type: 'fill' as const, prompt: blanked, options }
        : { wordId: String(w._id), type: 'meaning' as const, prompt: w.meaning, options };
    });
    res.json({ questions });
  }),
);

const answerSchema = z.object({ wordId: z.string(), answer: z.string().max(60) });

vocabularyRouter.post(
  '/quiz/answer',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const body = answerSchema.parse(req.body);
    const id = parseObjectId(body.wordId);
    const word = await VocabularyWord.findOne({ _id: id, user: uid });
    if (!word) throw notFound('Word not found.');

    const correct = body.answer.trim().toLowerCase() === word.wordKey;
    word.reviewCount += 1;
    word.lastReviewedAt = new Date();
    if (correct) {
      word.correctStreak += 1;
      word.status = word.correctStreak >= 3 ? 'mastered' : 'learning';
    } else {
      word.correctStreak = 0;
      word.status = 'learning';
    }
    await word.save();
    res.json({ correct, answer: word.word, example: word.example, word: serializeWord(word) });
  }),
);

const patchSchema = z.object({ status: z.enum(['new', 'learning', 'mastered']) });

vocabularyRouter.patch(
  '/:id',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const id = parseObjectId(req.params.id);
    const body = patchSchema.parse(req.body);
    const word = await VocabularyWord.findOneAndUpdate({ _id: id, user: uid }, { status: body.status }, { new: true });
    if (!word) throw notFound('Word not found.');
    res.json({ word: serializeWord(word) });
  }),
);

vocabularyRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const id = parseObjectId(req.params.id);
    const del = await VocabularyWord.findOneAndDelete({ _id: id, user: uid });
    if (!del) throw notFound('Word not found.');
    res.json({ ok: true });
  }),
);

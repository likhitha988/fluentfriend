import { Router } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { wrap } from '../middleware/errorHandler';
import { UserSettings } from '../models/UserSettings';
import { LearningProgress } from '../models/LearningProgress';
import { VocabularyWord } from '../models/VocabularyWord';
import {
  DESCRIBE_PROMPTS,
  OPINION_PROMPTS,
  ROLE_PLAYS,
  STORY_PROMPTS,
  SUGGESTED_TOPICS,
  TIMED_EXERCISES,
} from '../content/practice';
import { getTodayChallenge, serializeChallenge } from '../services/challenges';
import { getOrCreateProgress } from '../services/learning';
import { isAiConfigured } from '../services/ai/provider';
import { lastNDateKeys } from '../utils/date';
import { notFound } from '../utils/errors';
import { serializeWord } from '../utils/serialize';

export const practiceRouter = Router();
export const dashboardRouter = Router();

practiceRouter.get(
  '/catalog',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const settings = await UserSettings.findOne({ user: uid });
    if (!settings) throw notFound('Account not found.');
    const today = await getTodayChallenge(uid, settings.timezone);
    res.json({
      today: serializeChallenge(today.record),
      topicOfTheDay: today.topicOfTheDay,
      questionOfTheDay: today.questionOfTheDay,
      rolePlays: ROLE_PLAYS.map(({ id, title, blurb }) => ({ id, title, blurb })),
      stories: STORY_PROMPTS.map(({ id, title, prompt }) => ({ id, title, prompt })),
      describe: DESCRIBE_PROMPTS.map(({ id, title, prompt }) => ({ id, title, prompt })),
      opinions: OPINION_PROMPTS.map(({ id, title, prompt }) => ({ id, title, prompt })),
      timed: TIMED_EXERCISES.map(({ id, title, prompt, seconds }) => ({ id, title, prompt, seconds })),
      topics: SUGGESTED_TOPICS.map(({ id, title }) => ({ id, title })),
    });
  }),
);

dashboardRouter.get(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const settings = await UserSettings.findOne({ user: uid });
    if (!settings) throw notFound('Account not found.');
    const [today, progress, recentWords] = await Promise.all([
      getTodayChallenge(uid, settings.timezone),
      getOrCreateProgress(uid),
      VocabularyWord.find({ user: uid }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const keys = lastNDateKeys(today.dateKey, 7);
    const byDate = new Map(progress.dailyActivity.map((d) => [d.date, d]));
    const week = keys.map((date) => ({
      date,
      speakingSeconds: byDate.get(date)?.speakingSeconds ?? 0,
      userTurns: byDate.get(date)?.userTurns ?? 0,
    }));
    const latestConfidence = progress.confidenceLog.length
      ? progress.confidenceLog[progress.confidenceLog.length - 1]
      : null;

    // Streak is only "alive" if the learner practised today or yesterday.
    const lastKey = progress.lastPracticeDate;
    const alive = lastKey === today.dateKey || lastKey === keys[keys.length - 2];

    res.json({
      aiConfigured: isAiConfigured(),
      challenge: serializeChallenge(today.record),
      topicOfTheDay: today.topicOfTheDay,
      questionOfTheDay: today.questionOfTheDay,
      currentStreak: alive ? progress.currentStreak : 0,
      practicedToday: lastKey === today.dateKey,
      todaySpeakingSeconds: week[week.length - 1].speakingSeconds,
      dailyGoalMinutes: settings.dailyGoalMinutes,
      week,
      recentWords: recentWords.map(serializeWord),
      suggestedTopics: SUGGESTED_TOPICS.map(({ id, title }) => ({ id, title })),
      latestConfidence: latestConfidence ? { rating: latestConfidence.rating, date: latestConfidence.date } : null,
    });
  }),
);

// Keep the import used even if tree-shaken in future refactors.
void LearningProgress;

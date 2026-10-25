import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest } from '../middleware/auth';
import { wrap } from '../middleware/errorHandler';
import { UserSettings } from '../models/UserSettings';
import { VocabularyWord } from '../models/VocabularyWord';
import { DailyChallenge } from '../models/DailyChallenge';
import { getOrCreateProgress, topMistakeCategories } from '../services/learning';
import { CATEGORY_TIPS } from '../content/practice';
import { dateKeyInTz, lastNDateKeys } from '../utils/date';
import { notFound } from '../utils/errors';

export const progressRouter = Router();

progressRouter.get(
  '/',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const settings = await UserSettings.findOne({ user: uid });
    if (!settings) throw notFound('Account not found.');
    const progress = await getOrCreateProgress(uid);
    const today = dateKeyInTz(settings.timezone);

    const byDate = new Map(progress.dailyActivity.map((d) => [d.date, d]));
    const series = (n: number) =>
      lastNDateKeys(today, n).map((date) => ({
        date,
        speakingSeconds: byDate.get(date)?.speakingSeconds ?? 0,
        userTurns: byDate.get(date)?.userTurns ?? 0,
        conversations: byDate.get(date)?.conversations ?? 0,
      }));
    const week = series(7);
    const month = series(30);

    const sum = (rows: typeof week, k: 'speakingSeconds' | 'userTurns') => rows.reduce((a, r) => a + r[k], 0);
    const daysPracticedWeek = week.filter((d) => d.userTurns > 0 || d.conversations > 0).length;
    const daysPracticedMonth = month.filter((d) => d.userTurns > 0 || d.conversations > 0).length;
    const weeklyGoalSeconds = settings.dailyGoalMinutes * 60 * 7;

    const [words, challengesDone] = await Promise.all([
      VocabularyWord.find({ user: uid }).select('status usedCount').lean(),
      DailyChallenge.countDocuments({ user: uid, completed: true }),
    ]);
    const vocab = {
      saved: words.length,
      learning: words.filter((w) => w.status === 'learning').length,
      mastered: words.filter((w) => w.status === 'mastered').length,
      usedInConversation: words.filter((w) => w.usedCount > 0).length,
    };

    const areas = topMistakeCategories(progress.mistakeCounts as Map<string, number>, 5).map((c) => ({
      category: c.category,
      count: c.count,
      label: CATEGORY_TIPS[c.category]?.label ?? c.category,
      tip: CATEGORY_TIPS[c.category]?.tip ?? '',
    }));

    // Plain-language insights built only from real recorded data.
    const insights: string[] = [];
    if (daysPracticedWeek > 0) insights.push(`You practised on ${daysPracticedWeek} of the last 7 days.`);
    else insights.push('You have not practised in the last 7 days. A 5-minute chat is a good way to restart.');
    if (progress.currentStreak >= 3) insights.push(`Your streak is ${progress.currentStreak} days. Consistency is what builds fluency.`);
    if (areas[0] && areas[0].count >= 2) insights.push(`A good area to focus on: ${areas[0].label.toLowerCase()}. ${areas[0].tip}`);
    if (vocab.usedInConversation > 0) insights.push(`You have used ${vocab.usedInConversation} of your saved words in real conversations.`);
    if (sum(week, 'speakingSeconds') >= weeklyGoalSeconds) insights.push('You reached your weekly speaking goal. Well done.');

    const confidence = progress.confidenceLog.slice(-12).map((c) => ({ date: c.date, rating: c.rating }));

    res.json({
      totals: {
        speakingSeconds: progress.totalSpeakingSeconds,
        userTurns: progress.totalUserTurns,
        conversations: progress.totalConversations,
        challengesCompleted: challengesDone,
        longestStreak: progress.longestStreak,
        currentStreak: progress.lastPracticeDate === today || progress.lastPracticeDate === lastNDateKeys(today, 2)[0] ? progress.currentStreak : 0,
      },
      week,
      month,
      weekly: {
        speakingSeconds: sum(week, 'speakingSeconds'),
        goalSeconds: weeklyGoalSeconds,
        daysPracticed: daysPracticedWeek,
      },
      monthly: { speakingSeconds: sum(month, 'speakingSeconds'), daysPracticed: daysPracticedMonth },
      vocab,
      areas,
      insights,
      confidence,
      // Be explicit about what each number is, so nothing is presented as more precise than it is.
      notes: {
        speakingTime:
          'Speaking time is measured in your browser from the first to the last recognised word of each spoken turn. It does not include pauses between turns and is approximate.',
        areas: 'Focus areas are counted from corrections the AI showed you. They are estimates, not a test result.',
        confidence: 'Confidence ratings are your own self-assessment, not a measurement.',
        pronunciation: 'FluentFriend does not score pronunciation.',
      },
    });
  }),
);

const confidenceSchema = z.object({ rating: z.number().int().min(1).max(5) });

progressRouter.post(
  '/confidence',
  wrap(async (req, res) => {
    const uid = (req as AuthedRequest).userId;
    const body = confidenceSchema.parse(req.body);
    const settings = await UserSettings.findOne({ user: uid });
    if (!settings) throw notFound('Account not found.');
    const progress = await getOrCreateProgress(uid);
    const date = dateKeyInTz(settings.timezone);
    const existing = progress.confidenceLog.find((c) => c.date === date);
    if (existing) existing.rating = body.rating;
    else progress.confidenceLog.push({ date, rating: body.rating });
    if (progress.confidenceLog.length > 90) progress.confidenceLog.splice(0, progress.confidenceLog.length - 90);
    await progress.save();
    res.json({ ok: true, date, rating: body.rating });
  }),
);

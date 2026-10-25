import { Types } from 'mongoose';
import { LearningProgress } from '../models/LearningProgress';
import { VocabularyWord } from '../models/VocabularyWord';
import { dateKeyInTz, shiftDateKey } from '../utils/date';

export async function getOrCreateProgress(userId: Types.ObjectId | string) {
  const existing = await LearningProgress.findOne({ user: userId });
  if (existing) return existing;
  try {
    return await LearningProgress.create({ user: userId });
  } catch {
    // Lost a race with a parallel request: read the winner.
    return (await LearningProgress.findOne({ user: userId }))!;
  }
}

interface TurnRecord {
  userId: Types.ObjectId | string;
  timezone: string;
  speakingSeconds: number;
  correctionCategory?: string | null;
  newConversation?: boolean;
}

const MAX_DAYS_KEPT = 120;

/** Applies a practice event to the user's streak, daily activity and mistake counters. */
export async function recordPractice(rec: TurnRecord) {
  const progress = await getOrCreateProgress(rec.userId);
  const today = dateKeyInTz(rec.timezone);

  // Streak: counts a day as soon as the user practises (a message or a started conversation).
  if (progress.lastPracticeDate !== today) {
    progress.currentStreak =
      progress.lastPracticeDate === shiftDateKey(today, -1) ? progress.currentStreak + 1 : 1;
    progress.lastPracticeDate = today;
    progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
  }

  let day = progress.dailyActivity.find((d) => d.date === today);
  if (!day) {
    progress.dailyActivity.push({ date: today, speakingSeconds: 0, userTurns: 0, conversations: 0 });
    day = progress.dailyActivity[progress.dailyActivity.length - 1];
  }
  if (rec.newConversation) {
    day.conversations += 1;
    progress.totalConversations += 1;
  } else {
    day.userTurns += 1;
    day.speakingSeconds += rec.speakingSeconds;
    progress.totalUserTurns += 1;
    progress.totalSpeakingSeconds += rec.speakingSeconds;
  }

  if (progress.dailyActivity.length > MAX_DAYS_KEPT) {
    progress.dailyActivity.sort((a, b) => a.date.localeCompare(b.date));
    progress.dailyActivity.splice(0, progress.dailyActivity.length - MAX_DAYS_KEPT);
  }

  if (rec.correctionCategory) {
    const key = rec.correctionCategory;
    progress.mistakeCounts.set(key, (progress.mistakeCounts.get(key) ?? 0) + 1);
  }

  progress.markModified('dailyActivity');
  await progress.save();
  return progress;
}

export function topMistakeCategories(
  counts: Map<string, number> | undefined,
  n: number,
  opts: { exclude?: string[] } = {},
): { category: string; count: number }[] {
  if (!counts) return [];
  return [...counts.entries()]
    .filter(([k]) => !(opts.exclude ?? []).includes(k))
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** Case-insensitive whole-word match so "act" does not match "react". Phrases (with spaces) work too. */
export function textUsesWord(text: string, word: string): boolean {
  const escaped = word.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  if (!escaped) return false;
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'iu').test(text);
}

/** Bumps usedCount for any saved word the learner just said. Returns the words detected. */
export async function trackWordUsage(userId: Types.ObjectId | string, text: string): Promise<string[]> {
  const words = await VocabularyWord.find({ user: userId }).select('word wordKey').lean();
  const used = words.filter((w) => textUsesWord(text, w.wordKey));
  if (used.length) {
    await VocabularyWord.updateMany({ _id: { $in: used.map((w) => w._id) } }, { $inc: { usedCount: 1 } });
  }
  return used.map((w) => w.word);
}

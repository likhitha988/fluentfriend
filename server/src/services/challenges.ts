import { Types } from 'mongoose';
import { DailyChallenge } from '../models/DailyChallenge';
import { DAILY_CHALLENGES, QUESTIONS_OF_THE_DAY, TOPICS_OF_THE_DAY } from '../content/practice';
import { dateKeyInTz, dayIndex } from '../utils/date';

export async function getTodayChallenge(userId: Types.ObjectId | string, timezone: string) {
  const dateKey = dateKeyInTz(timezone);
  const idx = dayIndex(dateKey);
  const def = DAILY_CHALLENGES[idx % DAILY_CHALLENGES.length];

  let record = await DailyChallenge.findOne({ user: userId, dateKey });
  if (!record) {
    try {
      record = await DailyChallenge.create({
        user: userId,
        dateKey,
        challengeId: def.id,
        title: def.title,
        prompt: def.prompt,
      });
    } catch {
      record = await DailyChallenge.findOne({ user: userId, dateKey });
    }
  }
  return {
    dateKey,
    record: record!,
    topicOfTheDay: TOPICS_OF_THE_DAY[idx % TOPICS_OF_THE_DAY.length],
    questionOfTheDay: QUESTIONS_OF_THE_DAY[idx % QUESTIONS_OF_THE_DAY.length],
  };
}

export function serializeChallenge(r: InstanceType<typeof DailyChallenge>) {
  return {
    dateKey: r.dateKey,
    challengeId: r.challengeId,
    title: r.title,
    prompt: r.prompt,
    completed: r.completed,
    completedAt: r.completedAt ?? null,
    speakingSeconds: r.speakingSeconds,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeUser(u: any) {
  return { id: String(u._id), email: u.email, displayName: u.displayName, createdAt: u.createdAt };
}

export function serializeSettings(s: any) {
  return {
    difficulty: s.difficulty,
    correctionStyle: s.correctionStyle,
    voiceURI: s.voiceURI,
    speechRate: s.speechRate,
    recognitionLang: s.recognitionLang,
    autoListen: s.autoListen,
    dailyReminder: s.dailyReminder,
    reminderTime: s.reminderTime,
    dailyGoalMinutes: s.dailyGoalMinutes,
    timezone: s.timezone,
  };
}

export function serializeMessage(m: any) {
  return {
    id: String(m._id),
    role: m.role,
    content: m.content,
    source: m.source,
    speakingSeconds: m.speakingSeconds,
    correction: m.correction ?? null,
    vocabulary: m.vocabulary ?? null,
    createdAt: m.createdAt,
  };
}

export function serializeConversation(c: any) {
  return {
    id: String(c._id),
    mode: c.mode,
    title: c.title,
    topic: c.topic,
    scenarioId: c.scenarioId,
    timedSeconds: c.timedSeconds,
    status: c.status,
    startedAt: c.startedAt,
    endedAt: c.endedAt ?? null,
    speakingSeconds: c.speakingSeconds,
    userTurns: c.userTurns,
    summary: c.summary,
  };
}

export function serializeWord(w: any) {
  return {
    id: String(w._id),
    word: w.word,
    meaning: w.meaning,
    pronunciation: w.pronunciation,
    example: w.example,
    dailyExample: w.dailyExample,
    status: w.status,
    usedCount: w.usedCount,
    correctStreak: w.correctStreak,
    reviewCount: w.reviewCount,
    lastReviewedAt: w.lastReviewedAt ?? null,
    createdAt: w.createdAt,
  };
}

import { Schema, model, InferSchemaType } from 'mongoose';

const dailyActivitySchema = new Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    speakingSeconds: { type: Number, default: 0, min: 0 },
    userTurns: { type: Number, default: 0, min: 0 },
    conversations: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const confidenceSchema = new Schema(
  {
    date: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false },
);

const learningProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalSpeakingSeconds: { type: Number, default: 0, min: 0 },
    totalUserTurns: { type: Number, default: 0, min: 0 },
    totalConversations: { type: Number, default: 0, min: 0 },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastPracticeDate: { type: String, default: '' },
    /** category -> number of times a correction in this category was shown. */
    mistakeCounts: { type: Map, of: Number, default: {} },
    /** Most recent days only (trimmed to 120 entries). */
    dailyActivity: { type: [dailyActivitySchema], default: [] },
    /** Self-reported confidence, 1-5 (this is NOT a measured value). */
    confidenceLog: { type: [confidenceSchema], default: [] },
  },
  { timestamps: true },
);

export type LearningProgressDoc = InferSchemaType<typeof learningProgressSchema>;
export const LearningProgress = model('LearningProgress', learningProgressSchema);

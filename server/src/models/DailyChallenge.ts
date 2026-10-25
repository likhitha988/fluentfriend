import { Schema, model, InferSchemaType } from 'mongoose';

/** One record per user per day: which challenge they were given and whether they finished it. */
const dailyChallengeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    challengeId: { type: String, required: true, maxlength: 60 },
    title: { type: String, required: true, maxlength: 120 },
    prompt: { type: String, required: true, maxlength: 400 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    speakingSeconds: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

dailyChallengeSchema.index({ user: 1, dateKey: 1 }, { unique: true });

export type DailyChallengeDoc = InferSchemaType<typeof dailyChallengeSchema>;
export const DailyChallenge = model('DailyChallenge', dailyChallengeSchema);

import { Schema, model, InferSchemaType } from 'mongoose';

export const MODES = ['free', 'roleplay', 'challenge', 'story', 'opinion', 'timed'] as const;
export type Mode = (typeof MODES)[number];

const conversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: { type: String, enum: MODES, default: 'free' },
    title: { type: String, default: 'Free conversation', maxlength: 120 },
    /** Topic, role-play scenario or prompt that shaped this conversation. */
    topic: { type: String, default: '', maxlength: 300 },
    scenarioId: { type: String, default: '', maxlength: 60 },
    challengeDateKey: { type: String, default: '', maxlength: 10 },
    timedSeconds: { type: Number, min: 0, max: 600, default: 0 },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    /** Sum of per-turn speaking durations measured in the browser (voice turns only). */
    speakingSeconds: { type: Number, default: 0, min: 0 },
    userTurns: { type: Number, default: 0, min: 0 },
    summary: { type: String, default: '', maxlength: 1200 },
  },
  { timestamps: true },
);

conversationSchema.index({ user: 1, createdAt: -1 });

export type ConversationDoc = InferSchemaType<typeof conversationSchema>;
export const Conversation = model('Conversation', conversationSchema);

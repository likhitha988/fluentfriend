import { Schema, model, InferSchemaType } from 'mongoose';

export const MISTAKE_CATEGORIES = [
  'past_tense',
  'present_tense',
  'future_forms',
  'articles',
  'prepositions',
  'subject_verb_agreement',
  'word_order',
  'plurals',
  'pronouns',
  'word_choice',
  'natural_phrasing',
  'other',
] as const;
export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

const correctionSchema = new Schema(
  {
    original: { type: String, required: true, maxlength: 600 },
    improved: { type: String, required: true, maxlength: 600 },
    explanation: { type: String, required: true, maxlength: 600 },
    category: { type: String, enum: MISTAKE_CATEGORIES, default: 'other' },
  },
  { _id: false },
);

const vocabularySchema = new Schema(
  {
    word: { type: String, required: true, maxlength: 60 },
    meaning: { type: String, required: true, maxlength: 300 },
    pronunciation: { type: String, default: '', maxlength: 80 },
    example: { type: String, required: true, maxlength: 300 },
    dailyExample: { type: String, default: '', maxlength: 300 },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    source: { type: String, enum: ['voice', 'text', 'ai'], default: 'text' },
    /** Measured in the browser from first to last recognised speech of the turn. */
    speakingSeconds: { type: Number, min: 0, max: 600, default: 0 },
    correction: { type: correctionSchema, default: undefined },
    vocabulary: { type: vocabularySchema, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversation: 1, createdAt: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema>;
export const Message = model('Message', messageSchema);

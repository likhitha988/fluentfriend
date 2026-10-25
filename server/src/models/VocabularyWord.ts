import { Schema, model, InferSchemaType } from 'mongoose';

const vocabularyWordSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    word: { type: String, required: true, trim: true, maxlength: 60 },
    wordKey: { type: String, required: true, lowercase: true, trim: true, maxlength: 60 },
    meaning: { type: String, required: true, maxlength: 300 },
    pronunciation: { type: String, default: '', maxlength: 80 },
    example: { type: String, required: true, maxlength: 300 },
    dailyExample: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: ['new', 'learning', 'mastered'], default: 'new' },
    /** Times the user said this word in a conversation after saving it. */
    usedCount: { type: Number, default: 0, min: 0 },
    /** Consecutive correct quiz answers. */
    correctStreak: { type: Number, default: 0, min: 0 },
    reviewCount: { type: Number, default: 0, min: 0 },
    lastReviewedAt: { type: Date },
    sourceConversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  },
  { timestamps: true },
);

vocabularyWordSchema.index({ user: 1, wordKey: 1 }, { unique: true });

export type VocabularyWordDoc = InferSchemaType<typeof vocabularyWordSchema>;
export const VocabularyWord = model('VocabularyWord', vocabularyWordSchema);

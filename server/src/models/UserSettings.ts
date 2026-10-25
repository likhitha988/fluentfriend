import { Schema, model, InferSchemaType } from 'mongoose';

export const DIFFICULTIES = ['comfortable', 'balanced', 'challenging'] as const;
export const CORRECTION_STYLES = ['gentle', 'balanced', 'detailed'] as const;

const userSettingsSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'balanced' },
    correctionStyle: { type: String, enum: CORRECTION_STYLES, default: 'balanced' },
    /** Browser speech-synthesis voice identifier (voiceURI). Empty = browser default. */
    voiceURI: { type: String, default: '', maxlength: 300 },
    speechRate: { type: Number, min: 0.6, max: 1.3, default: 1 },
    /** BCP-47 language tag for speech recognition, e.g. en-US, en-IN, en-GB. */
    recognitionLang: { type: String, default: 'en-US', maxlength: 12 },
    autoListen: { type: Boolean, default: true },
    dailyReminder: { type: Boolean, default: false },
    reminderTime: { type: String, default: '19:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    dailyGoalMinutes: { type: Number, min: 1, max: 120, default: 10 },
    timezone: { type: String, default: 'UTC', maxlength: 64 },
  },
  { timestamps: true },
);

export type UserSettingsDoc = InferSchemaType<typeof userSettingsSchema>;
export const UserSettings = model('UserSettings', userSettingsSchema);

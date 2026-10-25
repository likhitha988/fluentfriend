import { z } from 'zod';
import { MISTAKE_CATEGORIES } from '../../models/Message';

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v ?? '');

export const correctionSchema = z.object({
  original: str(600),
  improved: str(600),
  explanation: str(600),
  category: z
    .string()
    .transform((v) => (MISTAKE_CATEGORIES as readonly string[]).includes(v) ? v : 'other')
    .pipe(z.enum(MISTAKE_CATEGORIES)),
});

export const vocabularySchema = z.object({
  word: str(60),
  meaning: str(300),
  pronunciation: optStr(80),
  example: str(300),
  dailyExample: optStr(300),
});

export const aiTurnSchema = z.object({
  reply: str(900),
  correction: correctionSchema.nullable().optional(),
  vocabulary: vocabularySchema.nullable().optional(),
});

export type AiTurn = {
  reply: string;
  correction: z.infer<typeof correctionSchema> | null;
  vocabulary: z.infer<typeof vocabularySchema> | null;
};

export class MalformedAiResponse extends Error {}

/** Pulls the first balanced top-level JSON object out of a model response (handles code fences / chatter). */
export function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = text.indexOf('{');
  if (start === -1) throw new MalformedAiResponse('No JSON object found');
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          throw new MalformedAiResponse('Invalid JSON');
        }
      }
    }
  }
  throw new MalformedAiResponse('Unterminated JSON');
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeText(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!ta.size) return 0;
  let hit = 0;
  ta.forEach((t) => tb.has(t) && hit++);
  return hit / ta.size;
}

/**
 * Parse + validate one model response, then apply guards so the UI never shows
 * a "correction" that changes nothing, quotes words the user never said, or repeats a saved word.
 */
export function parseAiTurn(raw: string, userText: string, savedWordKeys: Set<string>): AiTurn {
  const json = extractJson(raw);
  const parsed = aiTurnSchema.safeParse(json);
  if (!parsed.success) throw new MalformedAiResponse('Response did not match schema');

  let { correction, vocabulary } = parsed.data;
  const { reply } = parsed.data;

  if (correction) {
    const same = normalizeText(correction.original) === normalizeText(correction.improved);
    const quoted =
      normalizeText(userText).includes(normalizeText(correction.original)) ||
      tokenOverlap(correction.original, userText) >= 0.6;
    if (same || !quoted) correction = null;
  }

  if (vocabulary && savedWordKeys.has(vocabulary.word.trim().toLowerCase())) {
    vocabulary = null;
  }

  return { reply, correction: correction ?? null, vocabulary: vocabulary ?? null };
}

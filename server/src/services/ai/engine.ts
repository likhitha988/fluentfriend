import { z } from 'zod';
import { env } from '../../config/env';
import { ChatMessage, getProvider } from './provider';
import { AiTurn, MalformedAiResponse, extractJson, parseAiTurn } from './schema';
import { PromptContext, SUMMARY_SYSTEM, buildSystemPrompt, openerInstruction } from './prompts';
import { HttpError } from '../../utils/errors';

export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
  correction?: AiTurn['correction'] | null;
  vocabulary?: AiTurn['vocabulary'] | null;
}

/** Keep the last N messages, start with a user message, and merge same-role neighbours (provider requirement). */
export function buildMessages(openerInstructionText: string, history: HistoryItem[], limit: number): ChatMessage[] {
  const recent = history.slice(-limit);
  const mapped: ChatMessage[] = recent.map((h) =>
    h.role === 'user'
      ? { role: 'user', content: h.content }
      : {
          role: 'assistant',
          // Past assistant turns are replayed in the same JSON shape so the model keeps using it.
          content: JSON.stringify({ reply: h.content, correction: h.correction ?? null, vocabulary: h.vocabulary ?? null }),
        },
  );

  const out: ChatMessage[] = [];
  // The very first assistant message is the opener; give it its instruction as the first user turn.
  if (history.length === recent.length) out.push({ role: 'user', content: openerInstructionText });
  else out.push({ role: 'user', content: '[Earlier part of the conversation omitted for length. Continue naturally.]' });

  for (const m of mapped) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else out.push({ ...m });
  }
  return out;
}

async function runTurn(
  ctx: PromptContext,
  messages: ChatMessage[],
  userTextForGuards: string,
  savedWordKeys: Set<string>,
): Promise<AiTurn> {
  const provider = getProvider();
  const system = buildSystemPrompt(ctx);
  const req = { system, messages, maxTokens: 2000, temperature: 0.7, json: true };

  let raw = await provider.complete(req);
  try {
    return parseAiTurn(raw, userTextForGuards, savedWordKeys);
  } catch (err) {
    if (!(err instanceof MalformedAiResponse)) throw err;
  }

  // One repair attempt: show the model its bad output and ask for valid JSON only.
  raw = await provider.complete({
    ...req,
    temperature: 0.2,
    messages: [
      ...messages,
      { role: 'assistant', content: raw.slice(0, 2000) },
      { role: 'user', content: 'That was not valid. Reply again with ONLY the JSON object in the required format.' },
    ],
  });
  try {
    return parseAiTurn(raw, userTextForGuards, savedWordKeys);
  } catch {
    throw new HttpError(502, 'ai_malformed', 'The AI sent a reply I could not read. Please try saying that again.');
  }
}

export async function generateOpener(ctx: PromptContext, savedWordKeys: Set<string>): Promise<AiTurn> {
  const instruction = openerInstruction(ctx);
  const turn = await runTurn(ctx, [{ role: 'user', content: instruction }], '', savedWordKeys);
  // Openers are never lessons.
  return { reply: turn.reply, correction: null, vocabulary: null };
}

export async function generateTurn(
  ctx: PromptContext,
  history: HistoryItem[],
  userText: string,
  savedWordKeys: Set<string>,
): Promise<AiTurn> {
  const full: HistoryItem[] = [...history, { role: 'user', content: userText }];
  const messages = buildMessages(openerInstruction(ctx), full, env.AI_HISTORY_LIMIT);
  return runTurn(ctx, messages, userText, savedWordKeys);
}

const summarySchema = z.object({ summary: z.string().trim().min(1).max(1200) });

/** Optional end-of-session note. Returns '' on any failure; the session summary is a nice-to-have. */
export async function generateSummary(ctx: PromptContext, history: HistoryItem[]): Promise<string> {
  try {
    const transcript = history
      .slice(-30)
      .map((h) => `${h.role === 'user' ? ctx.displayName : 'Fluent'}: ${h.content}`)
      .join('\n');
    if (!transcript) return '';
    const raw = await getProvider().complete({
      system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: `Conversation:\n${transcript}\n\nWrite the note now.` }],
      maxTokens: 250,
      temperature: 0.5,
      json: true,
    });
    return summarySchema.parse(extractJson(raw)).summary;
  } catch {
    return '';
  }
}

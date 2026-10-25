import { describe, expect, it } from 'vitest';
import { MalformedAiResponse, extractJson, parseAiTurn } from './schema';
import { buildMessages } from './engine';

const none = new Set<string>();

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"reply":"Hi"}')).toEqual({ reply: 'Hi' });
  });
  it('handles code fences and chatter', () => {
    expect(extractJson('Sure!\n```json\n{"reply":"Hi {there}"}\n```')).toEqual({ reply: 'Hi {there}' });
  });
  it('throws on garbage', () => {
    expect(() => extractJson('no json here')).toThrow(MalformedAiResponse);
    expect(() => extractJson('{"reply": "unterminated')).toThrow(MalformedAiResponse);
  });
});

describe('parseAiTurn', () => {
  const user = 'Yesterday I go to college and meet my friend';

  it('accepts a reply with a valid correction', () => {
    const raw = JSON.stringify({
      reply: 'Oh, nice! What did you both do together?',
      correction: {
        original: 'Yesterday I go to college and meet my friend',
        improved: 'Yesterday, I went to college and met my friend',
        explanation: 'Use the past tense because you are talking about yesterday.',
        category: 'past_tense',
      },
      vocabulary: null,
    });
    const turn = parseAiTurn(raw, user, none);
    expect(turn.reply).toContain('What did you both do');
    expect(turn.correction?.category).toBe('past_tense');
    expect(turn.vocabulary).toBeNull();
  });

  it('drops a correction that changes nothing (ignoring case and punctuation)', () => {
    const raw = JSON.stringify({
      reply: 'Great!',
      correction: { original: 'I went home.', improved: 'i went home', explanation: 'x', category: 'other' },
    });
    expect(parseAiTurn(raw, 'I went home', none).correction).toBeNull();
  });

  it('drops a correction that quotes words the learner never said', () => {
    const raw = JSON.stringify({
      reply: 'Great!',
      correction: { original: 'She don\'t like tea', improved: 'She doesn\'t like tea', explanation: 'x', category: 'subject_verb_agreement' },
    });
    expect(parseAiTurn(raw, 'I like coffee a lot', none).correction).toBeNull();
  });

  it('maps unknown categories to "other"', () => {
    const raw = JSON.stringify({
      reply: 'Nice.',
      correction: { original: 'I go yesterday', improved: 'I went yesterday', explanation: 'Past tense.', category: 'made_up' },
    });
    expect(parseAiTurn(raw, 'I go yesterday', none).correction?.category).toBe('other');
  });

  it('drops a vocabulary word the learner already saved', () => {
    const raw = JSON.stringify({
      reply: 'Sounds tiring!',
      vocabulary: { word: 'Exhausted', meaning: 'Very tired.', pronunciation: 'ig-ZAW-stid', example: 'I was exhausted.', dailyExample: '' },
    });
    expect(parseAiTurn(raw, 'I was tired', new Set(['exhausted'])).vocabulary).toBeNull();
    expect(parseAiTurn(raw, 'I was tired', none).vocabulary?.word).toBe('Exhausted');
  });

  it('rejects a response without a reply', () => {
    expect(() => parseAiTurn('{"correction":null}', 'hi', none)).toThrow(MalformedAiResponse);
  });
});

describe('buildMessages', () => {
  it('always starts with a user message and alternates roles', () => {
    const history = [
      { role: 'assistant' as const, content: 'Hi!' },
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'How are you?' },
      { role: 'user' as const, content: 'Fine' },
    ];
    const msgs = buildMessages('[start]', history, 16);
    expect(msgs[0].role).toBe('user');
    msgs.forEach((m, i) => i > 0 && expect(m.role).not.toBe(msgs[i - 1].role));
  });

  it('trims long history but still starts with a user message', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'assistant' : 'user') as 'assistant' | 'user',
      content: `m${i}`,
    }));
    const msgs = buildMessages('[start]', history, 6);
    expect(msgs[0].role).toBe('user');
    expect(msgs.length).toBeLessThanOrEqual(7);
    msgs.forEach((m, i) => i > 0 && expect(m.role).not.toBe(msgs[i - 1].role));
  });
});

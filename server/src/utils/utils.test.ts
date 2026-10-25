import { describe, expect, it } from 'vitest';
import { dateKeyInTz, lastNDateKeys, shiftDateKey } from './date';
import { textUsesWord } from '../services/learning';

describe('date helpers', () => {
  it('computes the local date in a time zone', () => {
    // 2026-01-01 20:00 UTC is already Jan 2nd in India (UTC+5:30).
    const d = new Date('2026-01-01T20:00:00Z');
    expect(dateKeyInTz('Asia/Kolkata', d)).toBe('2026-01-02');
    expect(dateKeyInTz('UTC', d)).toBe('2026-01-01');
  });
  it('falls back to UTC for an invalid zone', () => {
    expect(dateKeyInTz('Not/AZone', new Date('2026-03-05T10:00:00Z'))).toBe('2026-03-05');
  });
  it('shifts across month and year boundaries', () => {
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('returns the last n keys oldest first', () => {
    expect(lastNDateKeys('2026-05-03', 3)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
  });
});

describe('textUsesWord', () => {
  it('matches whole words only', () => {
    expect(textUsesWord('I was exhausted after class', 'exhausted')).toBe(true);
    expect(textUsesWord('I will react quickly', 'act')).toBe(false);
  });
  it('matches phrases and ignores case', () => {
    expect(textUsesWord('We should Catch Up soon', 'catch up')).toBe(true);
  });
});

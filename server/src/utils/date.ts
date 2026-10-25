/** Returns YYYY-MM-DD for the given instant in the given IANA time zone. Falls back to UTC. */
export function dateKeyInTz(tz: string, d: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    return parts; // en-CA gives YYYY-MM-DD
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Shift a YYYY-MM-DD key by n days (pure calendar arithmetic, no time zone involved). */
export function shiftDateKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Last `n` date keys ending at `endKey`, oldest first. */
export function lastNDateKeys(endKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftDateKey(endKey, i - (n - 1)));
}

/** Stable day index used to rotate daily content. */
export function dayIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

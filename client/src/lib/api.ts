const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'X-Requested-With': 'fluentfriend',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your internet connection and try again.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Something went wrong. Please try again.');
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string, b?: unknown) => request<T>('DELETE', p, b),
};

// ---------- Types ----------
export interface User { id: string; email: string; displayName: string }
export interface Settings {
  difficulty: 'comfortable' | 'balanced' | 'challenging';
  correctionStyle: 'gentle' | 'balanced' | 'detailed';
  voiceURI: string;
  speechRate: number;
  recognitionLang: string;
  autoListen: boolean;
  dailyReminder: boolean;
  reminderTime: string;
  dailyGoalMinutes: number;
  timezone: string;
}
export interface Correction { original: string; improved: string; explanation: string; category: string }
export interface Vocab { word: string; meaning: string; pronunciation: string; example: string; dailyExample: string }
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'voice' | 'text' | 'ai';
  correction: Correction | null;
  vocabulary: Vocab | null;
  createdAt: string;
}
export interface Conversation {
  id: string; mode: string; title: string; topic: string; status: 'active' | 'ended';
  startedAt: string; speakingSeconds: number; userTurns: number; summary: string;
}
export interface Word extends Vocab {
  id: string; status: 'new' | 'learning' | 'mastered'; usedCount: number; reviewCount: number; correctStreak: number;
}
export interface Challenge { dateKey: string; challengeId: string; title: string; prompt: string; completed: boolean }
export interface CatalogItem { id: string; title: string; blurb?: string; prompt?: string; seconds?: number }
export interface Catalog {
  today: Challenge; topicOfTheDay: string; questionOfTheDay: string;
  rolePlays: CatalogItem[]; stories: CatalogItem[]; describe: CatalogItem[];
  opinions: CatalogItem[]; timed: CatalogItem[]; topics: CatalogItem[];
}
export interface DayStat { date: string; speakingSeconds: number; userTurns: number; conversations?: number }

export const fmtMinutes = (s: number) => {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
};

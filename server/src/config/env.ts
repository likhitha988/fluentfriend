import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_ORIGIN: z.string().min(1, 'CLIENT_ORIGIN is required'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),

  AI_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-5-5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_HISTORY_LIMIT: z.coerce.number().int().min(4).max(40).default(16),
  AI_TIMEOUT_MS: z.coerce.number().int().min(3000).max(120000).default(25000),TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    // Only variable names and messages are printed, never values.
    console.error(`\nInvalid environment configuration:\n${lines.join('\n')}\n`);
    console.error('Copy server/.env.example to server/.env and fill it in.\n');
    process.exit(1);
  }
  const e = parsed.data;
  return {
    ...e,
    isProd: e.NODE_ENV === 'production',
    clientOrigins: e.CLIENT_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
    cookieSameSite: (e.COOKIE_SAMESITE ?? (e.NODE_ENV === 'production' ? 'none' : 'lax')) as
      | 'lax'
      | 'strict'
      | 'none',
  };
}

export const env = load();

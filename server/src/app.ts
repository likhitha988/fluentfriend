import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requireAuth, requireCsrfHeader } from './middleware/auth';
import { authRouter } from './routes/auth';
import { conversationsRouter } from './routes/conversations';
import { vocabularyRouter } from './routes/vocabulary';
import { dashboardRouter, practiceRouter } from './routes/practice';
import { progressRouter } from './routes/progress';
import { accountRouter, settingsRouter } from './routes/account';
import { isAiConfigured } from './services/ai/provider';

export function createApp() {
  const app = express();
  // Render (and most hosts) sit behind one proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server calls (no Origin header) and the configured frontends.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'rate_limited', message: 'Too many requests. Please slow down.' } },
    }),
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many attempts. Please try again in a few minutes.' } },
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: isAiConfigured(), aiProvider: env.AI_PROVIDER });
  });

  app.use('/api', requireCsrfHeader);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth', authRouter);

  app.use('/api/conversations', requireAuth, conversationsRouter);
  app.use('/api/vocabulary', requireAuth, vocabularyRouter);
  app.use('/api/practice', requireAuth, practiceRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/progress', requireAuth, progressRouter);
  app.use('/api/settings', requireAuth, settingsRouter);
  app.use('/api/account', requireAuth, accountRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

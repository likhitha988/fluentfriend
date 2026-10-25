import { env } from './config/env';
import { connectDb, disconnectDb } from './config/db';
import { createApp } from './app';
import { isAiConfigured } from './services/ai/provider';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`FluentFriend API listening on port ${env.PORT} (${env.NODE_ENV})`);
    if (!isAiConfigured()) {
      console.warn(
        `WARNING: AI provider "${env.AI_PROVIDER}" has no API key. Conversations will return a configuration error until you set it.`,
      );
    }
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', (err as Error).message);
  process.exit(1);
});

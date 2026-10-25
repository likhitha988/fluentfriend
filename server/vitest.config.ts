import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Dummy, non-secret values so config/env.ts validates when tests import server modules.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/fluentfriend-test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});

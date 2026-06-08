import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      JWT_SECRET: 'test-secret-key',
      APP_USERNAME: 'Herasova',
      APP_PASSWORD: '1Q2w3e4r',
    },
    // run test files sequentially — DB operations can't run in parallel
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});

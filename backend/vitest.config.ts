import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
    },
    // run test files sequentially — DB operations can't run in parallel
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});

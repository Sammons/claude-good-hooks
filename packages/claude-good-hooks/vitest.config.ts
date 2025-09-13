import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Force sequential execution to avoid file system conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Force single fork mode
      }
    },
    // Increase timeout for potentially slow CLI operations
    testTimeout: 30000,
  },
});
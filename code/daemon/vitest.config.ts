/**
 * vitest.config
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    globals: true,
    environment: 'node',
    // Run tests in serial by default to avoid daemon process conflicts
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    globals: true,
    environment: 'node',
    pool: 'forks'
  }
});
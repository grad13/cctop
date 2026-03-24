/**
 * vitest.config
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      sqlite3: path.resolve(__dirname, '../../node_modules/sqlite3')
    }
  },
  test: {
    testTimeout: 30000,
    globals: true,
    environment: 'node',
    include: ['../../../tests/daemon/**/*.test.ts'],
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
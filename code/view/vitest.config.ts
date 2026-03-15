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
      blessed: path.resolve(__dirname, '../node_modules/blessed'),
      sqlite3: path.resolve(__dirname, '../node_modules/sqlite3'),
      'better-sqlite3': path.resolve(__dirname, '../node_modules/better-sqlite3')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['../../tests/view/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/__tests__/**']
    }
  }
});
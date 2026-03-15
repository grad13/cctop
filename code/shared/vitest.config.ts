/**
 * vitest.config
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: [],
    include: ['../../tests/shared/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        'tests/**',
        'vitest.config.ts',
        '**/*.d.ts'
      ]
    }
  }
});
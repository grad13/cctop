import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 5000,   // 5 seconds max
    hookTimeout: 2000,   // 2 seconds
    teardownTimeout: 1000, // 1 second
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false
      }
    },
    maxConcurrency: 1,
    bail: 1,
    // Only run critical tests
    include: [
      'tests/production-config.test.ts',
      'tests/production-integration.test.ts'
    ],
    // Exclude all heavy tests
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/restore-detection.test.ts',
      'tests/daemon.test.ts',
      'tests/move-detection*.test.ts',
      'tests/find-detection.test.ts',
      'tests/log-file-writing.test.ts',
      'tests/sighup-config-reload.test.ts',
      'tests/suites/**'
    ],
    coverage: {
      enabled: false
    }
  }
});
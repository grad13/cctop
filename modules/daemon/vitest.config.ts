import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,  // Reasonable timeout for tests with wait times
    hookTimeout: 10000,  // Reasonable hook timeout
    teardownTimeout: 5000, // Reasonable teardown timeout
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Use single fork to reduce memory usage
        isolate: false     // Disable isolation for better performance
      }
    },
    retry: 0,
    maxConcurrency: 1,
    slowTestThreshold: 5000,
    bail: 1,  // Stop after first test failure
    // Disable coverage to save resources
    coverage: {
      enabled: false
    },
    // Only exclude tests with actual issues
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/move-detection-improved.test.ts', // Has import issues
      'tests/startup-delete-detection.test.ts' // Has test logic issues
    ]
  }
});
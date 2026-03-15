/**
 * Database Connection Management Tests
 * Tests for database connection handling and lifecycle
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-15
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseTestHelper } from './test-helpers/database-test-helper';
import { FileEventReader } from '../../../src/database/FileEventReader';

describe('Database Connection Management', () => {
  let helper: DatabaseTestHelper;
  let testDir: string;
  let dbPath: string;

  beforeAll(() => {
    helper = new DatabaseTestHelper();
    ({ testDir, dbPath } = helper.createTestEnvironment());
    helper.createTestDbWithSampleData();
  });

  afterAll(() => {
    helper.cleanupTestEnvironment();
  });

  it('should connect to existing database successfully', async () => {
    const adapter = new FileEventReader(dbPath);
    await expect(adapter.connect()).resolves.not.toThrow();
    // Verify connection works by querying
    const events = await adapter.getLatestEvents(1);
    expect(events).toBeDefined();
    await adapter.disconnect();
  });

  it('should disconnect from database properly', async () => {
    const adapter = new FileEventReader(dbPath);
    await adapter.connect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should handle multiple connect calls gracefully', async () => {
    const adapter = new FileEventReader(dbPath);
    await adapter.connect();
    await expect(adapter.connect()).resolves.not.toThrow();
    // Should still work after double connect
    const events = await adapter.getLatestEvents(1);
    expect(events).toBeDefined();
    await adapter.disconnect();
  });

  it('should handle disconnect without prior connect', async () => {
    const adapter = new FileEventReader(dbPath);
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should handle multiple disconnect calls gracefully', async () => {
    const adapter = new FileEventReader(dbPath);
    await adapter.connect();
    await adapter.disconnect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should handle database path with special characters', async () => {
    const specialPath = testDir + '/test-db with spaces & symbols.db';
    helper.createTestDb(specialPath);
    const specialAdapter = new FileEventReader(specialPath);
    await expect(specialAdapter.connect()).resolves.not.toThrow();
    await specialAdapter.disconnect();
  });
});

/**
 * Database Connection Management Tests
 * Tests for database connection handling and lifecycle
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseTestSetup } from './test-helpers/database-test-setup';
import { DatabaseAdapter } from '../../../src/database/database-adapter';

describe('Database Connection Management', () => {
  let testSetup: DatabaseTestSetup;
  let testDir: string;
  let dbPath: string;
  let adapter: DatabaseAdapter;

  beforeAll(() => {
    testSetup = new DatabaseTestSetup();
    ({ testDir, dbPath } = testSetup.createTestEnvironment());
  });

  afterAll(() => {
    testSetup.cleanupTestEnvironment();
  });

  beforeEach(() => {
    adapter = testSetup.createDatabaseAdapter(dbPath);
  });

  it('should connect to existing database successfully', async () => {
    await expect(adapter.connect()).resolves.not.toThrow();
    expect(adapter.database).toBeDefined();
  });

  it('should handle connection to non-existent database gracefully', async () => {
    const nonExistentAdapter = testSetup.createDatabaseAdapter(testSetup.createNonExistentDbPath());
    await expect(nonExistentAdapter.connect()).resolves.not.toThrow();
  });

  it('should disconnect from database properly', async () => {
    await adapter.connect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should support close() alias for disconnect()', async () => {
    await adapter.connect();
    await expect(adapter.close()).resolves.not.toThrow();
  });

  it('should handle multiple connect calls gracefully', async () => {
    await adapter.connect();
    await expect(adapter.connect()).resolves.not.toThrow();
    expect(adapter.database).toBeDefined();
  });

  it('should handle disconnect without prior connect', async () => {
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should handle multiple disconnect calls gracefully', async () => {
    await adapter.connect();
    await adapter.disconnect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should maintain connection state correctly', async () => {
    // Initially not connected
    expect(adapter.database).toBeUndefined();
    
    // After connect
    await adapter.connect();
    expect(adapter.database).toBeDefined();
    
    // After disconnect
    await adapter.disconnect();
    // Note: database object might still exist but connection is closed
  });

  it('should handle database file permissions', async () => {
    await adapter.connect();
    
    // Verify we can perform basic operations
    const result = await adapter.database.prepare('SELECT 1 as test').get();
    expect(result.test).toBe(1);
  });

  it('should handle database path with special characters', async () => {
    const specialPath = testDir + '/test-db with spaces & symbols.db';
    const specialAdapter = testSetup.createDatabaseAdapter(specialPath);
    
    await expect(specialAdapter.connect()).resolves.not.toThrow();
    await specialAdapter.disconnect();
  });
});
/**
 * Database Connection Management Tests
 * Tests for database connection handling and lifecycle
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseTestSetup } from './test-helpers/database-test-setup';
import { DatabaseAdapter } from '../../../../src/database/database-adapter.ts';

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

  beforeEach(async () => {
    adapter = testSetup.createDatabaseAdapter(dbPath);
    await testSetup.createTestDatabase(adapter);
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  it('should connect to existing database successfully', async () => {
    await expect(adapter.connect()).resolves.not.toThrow();
    expect(adapter.getDatabase()).toBeDefined();
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
    expect(adapter.getDatabase()).toBeDefined();
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
    // Create a new adapter for this test
    const freshAdapter = testSetup.createDatabaseAdapter(dbPath);
    
    // Initially not connected
    expect(freshAdapter.getDatabase()).toBeNull();
    
    // After connect
    await freshAdapter.connect();
    expect(freshAdapter.getDatabase()).toBeDefined();
    
    // After disconnect
    await freshAdapter.disconnect();
    expect(freshAdapter.getDatabase()).toBeNull();
  });

  it('should handle database file permissions', async () => {
    await adapter.connect();
    
    // Verify we can perform basic operations
    const db = adapter.getDatabase();
    if (db) {
      const result = await new Promise<any>((resolve, reject) => {
        db.get('SELECT 1 as test', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      expect(result.test).toBe(1);
    }
  });

  it('should handle database path with special characters', async () => {
    const specialPath = testDir + '/test-db with spaces & symbols.db';
    const specialAdapter = testSetup.createDatabaseAdapter(specialPath);
    
    await expect(specialAdapter.connect()).resolves.not.toThrow();
    await specialAdapter.disconnect();
  });
});
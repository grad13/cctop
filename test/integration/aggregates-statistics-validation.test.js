/**
 * FUNC-402 Aggregates Statistics Validation Test
 * Tests aggregates table statistics accuracy, real-time updates, and performance
 * Based purely on FUNC-000 and FUNC-402 specifications
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
const DatabaseManager = require('../../src/database/database-manager.js');

describe('Aggregates Statistics Validation (FUNC-000/402 Specification)', () => {
  let testDir;
  let dbManager;
  let testFiles = [];

  beforeEach(async () => {
    // Create test environment
    testDir = path.join(process.cwd(), 'test-aggregates-stats');
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize database
    dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    testFiles = [];
  });

  afterEach(async () => {
    if (dbManager) {
      await dbManager.close();
    }
    
    // Cleanup test files
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Statistics Accuracy Validation', () => {
    test('should accurately calculate First/Max/Last statistics', async () => {
      // Create test file with known sequence
      const testFile = path.join(testDir, 'stats-test.txt');
      
      // Sequence: Create(100,10,5) -> Modify(200,20,10) -> Modify(150,15,8) -> Delete -> Restore(300,30,15)
      const operations = [
        { type: 'create', size: 100, lines: 10, blocks: 5 },
        { type: 'modify', size: 200, lines: 20, blocks: 10 },
        { type: 'modify', size: 150, lines: 15, blocks: 8 },
        { type: 'delete' },
        { type: 'restore', size: 300, lines: 30, blocks: 15 }
      ];

      let fileId;
      
      for (const [index, op] of operations.entries()) {
        switch (op.type) {
          case 'create':
            await fs.writeFile(testFile, 'x'.repeat(op.size));
            fileId = await dbManager.ensureFile(testFile);
            await dbManager.recordEvent(fileId, 'create', { 
              file_size: op.size, 
              line_count: op.lines, 
              block_count: op.blocks 
            });
            break;
            
          case 'modify':
            await fs.writeFile(testFile, 'x'.repeat(op.size));
            await dbManager.recordEvent(fileId, 'modify', { 
              file_size: op.size, 
              line_count: op.lines, 
              block_count: op.blocks 
            });
            break;
            
          case 'delete':
            await fs.unlink(testFile);
            await dbManager.recordEvent(fileId, 'delete', {});
            break;
            
          case 'restore':
            await fs.writeFile(testFile, 'x'.repeat(op.size));
            await dbManager.recordEvent(fileId, 'restore', { 
              file_size: op.size, 
              line_count: op.lines, 
              block_count: op.blocks 
            });
            break;
        }
        
        // Small delay to ensure timestamp ordering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Get aggregates statistics
      const stats = await dbManager.getAggregateStats(fileId);
      
      // Verify event counts
      expect(stats.total_creates).toBe(1);
      expect(stats.total_modifies).toBe(2);
      expect(stats.total_deletes).toBe(1);
      expect(stats.total_restores).toBe(1);
      expect(stats.total_events).toBe(5);
      
      // Verify First values (should be from create operation)
      expect(stats.first_size).toBe(100);
      expect(stats.first_lines).toBe(10);
      expect(stats.first_blocks).toBe(5);
      
      // Verify Last values (should be from restore operation)
      expect(stats.last_size).toBe(300);
      expect(stats.last_lines).toBe(30);
      expect(stats.last_blocks).toBe(15);
      
      // Verify Max values (should be maximum across all operations)
      expect(stats.max_size).toBe(300);
      expect(stats.max_lines).toBe(30);
      expect(stats.max_blocks).toBe(15);
      
      // Verify timestamp ordering
      expect(stats.first_event_timestamp).toBeLessThan(stats.last_event_timestamp);
    });

    test('should calculate accurate cumulative statistics', async () => {
      const testFile = path.join(testDir, 'cumulative-test.txt');
      await fs.writeFile(testFile, 'test content');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Record multiple events with known metrics
      const events = [
        { type: 'create', size: 100, lines: 10, blocks: 5 },
        { type: 'modify', size: 200, lines: 20, blocks: 10 },
        { type: 'modify', size: 150, lines: 15, blocks: 8 }
      ];
      
      for (const event of events) {
        await dbManager.recordEvent(fileId, event.type, {
          file_size: event.size,
          line_count: event.lines,
          block_count: event.blocks
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const stats = await dbManager.getAggregateStats(fileId);
      
      // Verify total calculations
      expect(stats.total_size).toBe(100 + 200 + 150); // 450
      expect(stats.total_lines).toBe(10 + 20 + 15); // 45
      expect(stats.total_blocks).toBe(5 + 10 + 8); // 23
      
      // Verify average calculations (total / events)
      const expectedAvgSize = 450 / 3; // 150
      const expectedAvgLines = 45 / 3; // 15
      const expectedAvgBlocks = 23 / 3; // 7.67
      
      expect(Math.abs(stats.total_size / stats.total_events - expectedAvgSize)).toBeLessThan(0.01);
      expect(Math.abs(stats.total_lines / stats.total_events - expectedAvgLines)).toBeLessThan(0.01);
      expect(Math.abs(stats.total_blocks / stats.total_events - expectedAvgBlocks)).toBeLessThan(0.01);
    });
  });

  describe('Real-time Trigger Updates', () => {
    test('should update statistics immediately on event insertion', async () => {
      const testFile = path.join(testDir, 'realtime-test.txt');
      await fs.writeFile(testFile, 'initial content');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Get initial statistics (should be empty)
      let stats = await dbManager.getAggregateStats(fileId);
      expect(stats).toBeNull(); // No events recorded yet
      
      // Record first event
      await dbManager.recordEvent(fileId, 'create', {
        file_size: 100,
        line_count: 10,
        block_count: 5
      });
      
      // Verify immediate update
      stats = await dbManager.getAggregateStats(fileId);
      expect(stats).not.toBeNull();
      expect(stats.total_creates).toBe(1);
      expect(stats.total_events).toBe(1);
      expect(stats.first_size).toBe(100);
      expect(stats.last_size).toBe(100);
      
      // Record second event
      await dbManager.recordEvent(fileId, 'modify', {
        file_size: 200,
        line_count: 20,
        block_count: 10
      });
      
      // Verify updated statistics
      stats = await dbManager.getAggregateStats(fileId);
      expect(stats.total_modifies).toBe(1);
      expect(stats.total_events).toBe(2);
      expect(stats.first_size).toBe(100); // Should remain first
      expect(stats.last_size).toBe(200); // Should update to last
      expect(stats.max_size).toBe(200); // Should update to max
    });

    test('should maintain consistency across multiple operations', async () => {
      const testFile = path.join(testDir, 'consistency-test.txt');
      await fs.writeFile(testFile, 'test');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Perform rapid sequence of operations
      const operations = [
        { type: 'create', size: 50, lines: 5, blocks: 2 },
        { type: 'modify', size: 75, lines: 8, blocks: 3 },
        { type: 'modify', size: 25, lines: 3, blocks: 1 },
        { type: 'delete' },
        { type: 'restore', size: 100, lines: 12, blocks: 6 }
      ];
      
      for (const op of operations) {
        if (op.type === 'delete') {
          await dbManager.recordEvent(fileId, 'delete', {});
        } else {
          await dbManager.recordEvent(fileId, op.type, {
            file_size: op.size,
            line_count: op.lines,
            block_count: op.blocks
          });
        }
      }
      
      const stats = await dbManager.getAggregateStats(fileId);
      
      // Verify final state consistency
      expect(stats.total_creates).toBe(1);
      expect(stats.total_modifies).toBe(2);
      expect(stats.total_deletes).toBe(1);
      expect(stats.total_restores).toBe(1);
      expect(stats.total_events).toBe(5);
      
      // Verify metric consistency
      expect(stats.first_size).toBe(50); // First create
      expect(stats.last_size).toBe(100); // Last restore
      expect(stats.max_size).toBe(100); // Maximum value
      
      // Verify total calculations include all measured events (exclude delete)
      expect(stats.total_size).toBe(50 + 75 + 25 + 100); // 250
    });
  });

  describe('Performance Validation', () => {
    test('should maintain performance with large datasets', async () => {
      const testFile = path.join(testDir, 'performance-test.txt');
      await fs.writeFile(testFile, 'test content');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Generate large number of events
      const startTime = Date.now();
      const eventCount = 1000;
      
      for (let i = 0; i < eventCount; i++) {
        await dbManager.recordEvent(fileId, 'modify', {
          file_size: Math.floor(Math.random() * 10000),
          line_count: Math.floor(Math.random() * 1000),
          block_count: Math.floor(Math.random() * 100)
        });
      }
      
      const insertTime = Date.now() - startTime;
      
      // Measure statistics retrieval time
      const queryStartTime = Date.now();
      const stats = await dbManager.getAggregateStats(fileId);
      const queryTime = Date.now() - queryStartTime;
      
      // Verify performance requirements
      expect(insertTime).toBeLessThan(10000); // 10 seconds for 1000 inserts
      expect(queryTime).toBeLessThan(100); // 100ms for statistics query
      
      // Verify data integrity
      expect(stats.total_events).toBe(eventCount + 1); // +1 for initial create
      expect(stats.total_modifies).toBe(eventCount);
    });

    test('should handle concurrent statistics updates efficiently', async () => {
      const testFile = path.join(testDir, 'concurrent-test.txt');
      await fs.writeFile(testFile, 'test');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Simulate concurrent operations
      const concurrentOperations = Array.from({ length: 100 }, (_, i) => 
        dbManager.recordEvent(fileId, 'modify', {
          file_size: 100 + i,
          line_count: 10 + i,
          block_count: 5 + i
        })
      );
      
      const startTime = Date.now();
      await Promise.all(concurrentOperations);
      const concurrentTime = Date.now() - startTime;
      
      // Verify all operations completed
      const stats = await dbManager.getAggregateStats(fileId);
      expect(stats.total_modifies).toBe(100);
      expect(stats.total_events).toBe(100);
      
      // Verify reasonable performance
      expect(concurrentTime).toBeLessThan(5000); // 5 seconds for 100 concurrent ops
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle NULL measurements gracefully', async () => {
      const testFile = path.join(testDir, 'null-test.txt');
      await fs.writeFile(testFile, 'test');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Record event with NULL measurements
      await dbManager.recordEvent(fileId, 'modify', {
        file_size: null,
        line_count: 100,
        block_count: null
      });
      
      const stats = await dbManager.getAggregateStats(fileId);
      
      // Verify NULL handling
      expect(stats.first_size).toBeNull();
      expect(stats.first_lines).toBe(100);
      expect(stats.first_blocks).toBeNull();
      expect(stats.last_size).toBeNull();
      expect(stats.last_lines).toBe(100);
      expect(stats.last_blocks).toBeNull();
    });

    test('should handle negative values appropriately', async () => {
      const testFile = path.join(testDir, 'negative-test.txt');
      await fs.writeFile(testFile, 'test');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Record event with negative values
      await dbManager.recordEvent(fileId, 'modify', {
        file_size: -100,
        line_count: -10,
        block_count: -5
      });
      
      const stats = await dbManager.getAggregateStats(fileId);
      
      // Verify negative value handling (should be stored as-is based on FUNC-000)
      expect(stats.first_size).toBe(-100);
      expect(stats.first_lines).toBe(-10);
      expect(stats.first_blocks).toBe(-5);
    });

    test('should handle missing aggregates data gracefully', async () => {
      // Test with non-existent file ID
      const nonExistentFileId = 99999;
      const stats = await dbManager.getAggregateStats(nonExistentFileId);
      
      // Should return null for non-existent file
      expect(stats).toBeNull();
    });

    test('should maintain data integrity during database errors', async () => {
      const testFile = path.join(testDir, 'integrity-test.txt');
      await fs.writeFile(testFile, 'test');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Record valid event
      await dbManager.recordEvent(fileId, 'create', {
        file_size: 100,
        line_count: 10,
        block_count: 5
      });
      
      let stats = await dbManager.getAggregateStats(fileId);
      expect(stats.total_events).toBe(1);
      
      // Attempt invalid operation (should not corrupt existing data)
      try {
        await dbManager.recordEvent(fileId, 'invalid_type', {
          file_size: 200,
          line_count: 20,
          block_count: 10
        });
      } catch (error) {
        // Expected to fail
      }
      
      // Verify data integrity maintained
      stats = await dbManager.getAggregateStats(fileId);
      expect(stats.total_events).toBe(1); // Should remain unchanged
      expect(stats.first_size).toBe(100); // Should remain unchanged
    });
  });

  describe('FUNC-402 Display Integration', () => {
    test('should provide all required display data', async () => {
      const testFile = path.join(testDir, 'display-test.txt');
      await fs.writeFile(testFile, 'test content');
      
      const fileId = await dbManager.ensureFile(testFile);
      
      // Record comprehensive event sequence
      await dbManager.recordEvent(fileId, 'create', {
        file_size: 100,
        line_count: 10,
        block_count: 5
      });
      
      await dbManager.recordEvent(fileId, 'modify', {
        file_size: 250,
        line_count: 25,
        block_count: 12
      });
      
      const stats = await dbManager.getAggregateStats(fileId);
      
      // Verify all FUNC-402 required fields are present
      expect(stats).toHaveProperty('total_creates');
      expect(stats).toHaveProperty('total_modifies');
      expect(stats).toHaveProperty('total_deletes');
      expect(stats).toHaveProperty('total_moves');
      expect(stats).toHaveProperty('total_restores');
      expect(stats).toHaveProperty('total_events');
      
      expect(stats).toHaveProperty('first_event_timestamp');
      expect(stats).toHaveProperty('last_event_timestamp');
      
      expect(stats).toHaveProperty('first_size');
      expect(stats).toHaveProperty('max_size');
      expect(stats).toHaveProperty('last_size');
      expect(stats).toHaveProperty('total_size');
      
      expect(stats).toHaveProperty('first_lines');
      expect(stats).toHaveProperty('max_lines');
      expect(stats).toHaveProperty('last_lines');
      expect(stats).toHaveProperty('total_lines');
      
      expect(stats).toHaveProperty('first_blocks');
      expect(stats).toHaveProperty('max_blocks');
      expect(stats).toHaveProperty('last_blocks');
      expect(stats).toHaveProperty('total_blocks');
      
      // Verify timestamp format compatibility
      expect(typeof stats.first_event_timestamp).toBe('number');
      expect(typeof stats.last_event_timestamp).toBe('number');
      expect(stats.first_event_timestamp).toBeGreaterThan(0);
      expect(stats.last_event_timestamp).toBeGreaterThan(0);
    });
  });
});
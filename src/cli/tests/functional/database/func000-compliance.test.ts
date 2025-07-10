import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseAdapterFunc000 } from '../../../src/database/database-adapter-func000.ts';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('FUNC-000 Compliance Test', () => {
  let dbAdapter: DatabaseAdapterFunc000;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create a temporary test database with dummy data
    tempDbPath = path.join(os.tmpdir(), `func000-test-db-${Date.now()}.db`);
    
    // First create the database with schema and dummy data
    const { execSync } = require('child_process');
    execSync(`python3 scripts/dummy_data_generator.py --db-path ${tempDbPath} --files 10 --days 1`);
    
    dbAdapter = new DatabaseAdapterFunc000(tempDbPath);
    await dbAdapter.connect();
  });

  afterEach(async () => {
    if (dbAdapter) {
      await dbAdapter.disconnect();
    }
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should retrieve events with correct FUNC-000 schema', async () => {
    const events = await dbAdapter.getLatestEvents(5, 'all');
    
    console.log('FUNC-000 Events:', events);
    
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    
    // Verify each event has FUNC-000 compliant structure
    events.forEach((event, index) => {
      console.log(`Event ${index}:`, {
        id: event.id,
        filename: event.filename,
        event_type: event.event_type,
        lines: event.lines,
        blocks: event.blocks
      });
      
      // Required FUNC-000 fields
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('filename');
      expect(event).toHaveProperty('directory');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('size');
      expect(event).toHaveProperty('lines');
      expect(event).toHaveProperty('blocks');
      expect(event).toHaveProperty('inode');
      
      // Verify data types
      expect(typeof event.id).toBe('number');
      expect(typeof event.timestamp).toBe('number');
      expect(typeof event.filename).toBe('string');
      expect(typeof event.directory).toBe('string');
      expect(typeof event.event_type).toBe('string');
      expect(typeof event.size).toBe('number');
      expect(typeof event.lines).toBe('number');
      expect(typeof event.blocks).toBe('number');
      expect(typeof event.inode).toBe('number');
    });
    
    // Verify we have non-zero lines and blocks (real data)
    const hasNonZeroLines = events.some(e => e.lines > 0);
    const hasNonZeroBlocks = events.some(e => e.blocks > 0);
    
    expect(hasNonZeroLines).toBe(true);
    expect(hasNonZeroBlocks).toBe(true);
  });

  it('should work with unique mode', async () => {
    const events = await dbAdapter.getLatestEvents(5, 'unique');
    
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    
    if (events.length > 0) {
      // Verify structure same as all mode
      const event = events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('filename');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('lines');
      expect(event).toHaveProperty('blocks');
    }
  });
});
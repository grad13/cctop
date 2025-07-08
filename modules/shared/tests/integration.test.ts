/**
 * Integration Tests for Shared Module
 * Tests CLI/Daemon integration through shared components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database, DatabaseReader, ConfigManager } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Shared Module Integration Tests', () => {
  let testDir: string;
  let configManager: ConfigManager;
  let database: Database;
  let databaseReader: DatabaseReader;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-test-'));
    process.chdir(testDir);
    
    configManager = new ConfigManager(testDir);
    
    // Initialize .cctop structure
    await configManager.initializeCctopStructure();
    
    const dbPath = configManager.getDatabasePath();
    database = new Database(dbPath);
    databaseReader = new DatabaseReader(dbPath);
  });

  afterEach(async () => {
    // Cleanup
    if (database) {
      await database.close();
    }
    if (databaseReader) {
      await databaseReader.disconnect();
    }
    
    // Remove test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('ConfigManager Integration', () => {
    it('should create FUNC-105 compliant directory structure', async () => {
      expect(configManager.isInitialized()).toBe(true);
      
      const cctopDir = path.join(testDir, '.cctop');
      const expectedDirs = ['config', 'themes', 'data', 'logs', 'runtime', 'temp'];
      
      for (const dir of expectedDirs) {
        const dirPath = path.join(cctopDir, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      }
    });

    it('should create configuration files', async () => {
      const configDir = path.join(testDir, '.cctop', 'config');
      
      expect(fs.existsSync(path.join(configDir, 'cctop.json'))).toBe(true);
      expect(fs.existsSync(path.join(configDir, 'daemon-config.json'))).toBe(true);
      expect(fs.existsSync(path.join(configDir, 'cli-config.json'))).toBe(true);
    });

    it('should provide valid config paths', () => {
      const dbPath = configManager.getDatabasePath();
      const pidPath = configManager.getPidFilePath();
      const logPath = configManager.getLogFilePath();
      
      expect(dbPath).toContain('.cctop/data/activity.db');
      expect(pidPath).toContain('.cctop/runtime/daemon.pid');
      expect(logPath).toContain('.cctop/logs/daemon.log');
    });
  });

  describe('Database Schema Integration', () => {
    it('should create FUNC-000 compliant normalized schema', async () => {
      await database.connect();
      
      // Check that all required tables exist
      const checkTableSQL = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('events', 'event_types', 'files', 'measurements', 'aggregates')
        ORDER BY name
      `;
      
      const tables = await new Promise((resolve, reject) => {
        (database as any).db.all(checkTableSQL, [], (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        });
      });
      
      expect(tables).toEqual(['aggregates', 'event_types', 'events', 'files', 'measurements']);
    });

    it('should have event_types pre-populated', async () => {
      await database.connect();
      
      const eventTypesSQL = 'SELECT name FROM event_types ORDER BY name';
      const eventTypes = await new Promise((resolve, reject) => {
        (database as any).db.all(eventTypesSQL, [], (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        });
      });
      
      expect(eventTypes).toEqual(['create', 'delete', 'find', 'modify', 'move', 'restore']);
    });
  });

  describe('CLI/Daemon Database Compatibility', () => {
    it('should insert events via Database and read via DatabaseReader', async () => {
      await database.connect();
      await databaseReader.connect();
      
      // Insert test event via Database (daemon interface)
      const testEvent = {
        eventType: 'create',
        filePath: '/test/file.txt',
        directory: '/test',
        fileName: 'file.txt',
        fileSize: 1024,
        timestamp: new Date(),
        inode: 12345
      };
      
      // Insert with measurement data (FUNC-000 compliant)
      const measurement = {
        inode: 12345,
        fileSize: 1024,
        lineCount: 50,
        blockCount: 5
      };
      await database.insertEvent(testEvent, measurement);
      
      // Read events via DatabaseReader (CLI interface)
      const events = await databaseReader.getLatestEvents(1);
      
      expect(events).toHaveLength(1);
      expect(events[0].filename).toBe('file.txt');
      expect(events[0].event_type).toBe('create');
      expect(events[0].size).toBe(1024);
    });

    it('should handle multiple event types correctly', async () => {
      await database.connect();
      await databaseReader.connect();
      
      const eventTypes = ['find', 'create', 'modify', 'delete'];
      
      // Insert multiple events
      for (let i = 0; i < eventTypes.length; i++) {
        const event = {
          eventType: eventTypes[i],
          filePath: `/test/file${i}.txt`,
          directory: '/test',
          fileName: `file${i}.txt`,
          fileSize: 1024 * (i + 1),
          timestamp: new Date(Date.now() + i * 1000),
          inode: 12345 + i
        };
        
        // Insert with measurement data (FUNC-000 compliant)
        const measurement = {
          inode: 12345 + i,
          fileSize: 1024 * (i + 1),
          lineCount: 50,
          blockCount: 5
        };
        await database.insertEvent(event, measurement);
      }
      
      // Read all events
      const events = await databaseReader.getLatestEvents(10);
      
      expect(events).toHaveLength(4);
      
      // Check that all event types are present
      const retrievedTypes = events.map(e => e.event_type).sort();
      expect(retrievedTypes).toEqual(['create', 'delete', 'find', 'modify']);
    });
  });

  describe('End-to-End Integration', () => {
    it('should support complete file lifecycle through normalized schema', async () => {
      await database.connect();
      await databaseReader.connect();
      
      const filePath = '/test/lifecycle.txt';
      const baseEvent = {
        filePath,
        directory: '/test',
        fileName: 'lifecycle.txt',
        fileSize: 1024,
        inode: 54321
      };
      
      // 1. Find file
      await database.insertEvent({
        ...baseEvent,
        eventType: 'find',
        timestamp: new Date(Date.now())
      }, {
        inode: 54321,
        fileSize: 1024,
        lineCount: 50,
        blockCount: 5
      });
      
      // 2. Modify file
      await database.insertEvent({
        ...baseEvent,
        eventType: 'modify',
        fileSize: 2048,
        timestamp: new Date(Date.now() + 1000)
      }, {
        inode: 54321,
        fileSize: 2048,
        lineCount: 75,
        blockCount: 8
      });
      
      // 3. Delete file
      await database.insertEvent({
        ...baseEvent,
        eventType: 'delete',
        timestamp: new Date(Date.now() + 2000)
      }, {
        inode: 54321,
        fileSize: 0,
        lineCount: 0,
        blockCount: 0
      });
      
      // 4. Restore file
      await database.insertEvent({
        ...baseEvent,
        eventType: 'restore',
        timestamp: new Date(Date.now() + 3000)
      }, {
        inode: 54321,
        fileSize: 2048,
        lineCount: 75,
        blockCount: 8
      });
      
      // Read complete history
      const allEvents = await databaseReader.getLatestEvents(10);
      const lifecycleEvents = allEvents
        .filter(e => e.filename === 'lifecycle.txt')
        .sort((a, b) => a.timestamp - b.timestamp);
      
      expect(lifecycleEvents).toHaveLength(4);
      expect(lifecycleEvents.map(e => e.event_type)).toEqual(['find', 'modify', 'delete', 'restore']);
      
      // Check unique files view shows only latest
      const uniqueFiles = await databaseReader.getUniqueFiles(10);
      const uniqueLifecycle = uniqueFiles.filter(e => e.filename === 'lifecycle.txt');
      
      expect(uniqueLifecycle).toHaveLength(1);
      expect(uniqueLifecycle[0].event_type).toBe('restore');
    });
  });
});
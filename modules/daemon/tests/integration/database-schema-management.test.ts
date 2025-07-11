/**
 * Database Schema Management Tests
 * Tests for SchemaManager and related database components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../src/database/database';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';

describe('Database Schema Management Tests', () => {
  const testDbPath = path.join(__dirname, 'test-schema-mgmt.db');
  let database: Database;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    database = new Database(testDbPath);
    await database.connect();
  });

  afterEach(async () => {
    await database.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Schema Creation and Validation', () => {
    it('should create all FUNC-000 compliant tables', async () => {
      const connection = database.getConnection();
      expect(connection).toBeDefined();

      // Check events table structure
      const eventsColumns = await new Promise<any[]>((resolve, reject) => {
        connection!.all("PRAGMA table_info(events)", (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const expectedEventsColumns = ['id', 'timestamp', 'event_type_id', 'file_id', 'file_path', 'file_name', 'directory'];
      const actualEventsColumns = eventsColumns.map(col => col.name);
      expectedEventsColumns.forEach(col => {
        expect(actualEventsColumns).toContain(col);
      });
    });

    it('should create measurements table with proper foreign key', async () => {
      const connection = database.getConnection();
      
      const measurementsColumns = await new Promise<any[]>((resolve, reject) => {
        connection!.all("PRAGMA table_info(measurements)", (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const expectedMeasurementsColumns = ['event_id', 'inode', 'file_size', 'line_count', 'block_count'];
      const actualMeasurementsColumns = measurementsColumns.map(col => col.name);
      expectedMeasurementsColumns.forEach(col => {
        expect(actualMeasurementsColumns).toContain(col);
      });

      // Check foreign key constraints
      const foreignKeys = await new Promise<any[]>((resolve, reject) => {
        connection!.all("PRAGMA foreign_key_list(measurements)", (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      expect(foreignKeys).toHaveLength(1);
      expect(foreignKeys[0].table).toBe('events');
      expect(foreignKeys[0].from).toBe('event_id');
      expect(foreignKeys[0].to).toBe('id');
    });

    it('should create aggregates table with all required columns', async () => {
      const connection = database.getConnection();
      
      const aggregatesColumns = await new Promise<any[]>((resolve, reject) => {
        connection!.all("PRAGMA table_info(aggregates)", (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const requiredColumns = [
        'id', 'file_id', 'period_start',
        'total_size', 'total_lines', 'total_blocks',
        'total_events', 'total_finds', 'total_creates', 'total_modifies', 
        'total_deletes', 'total_moves', 'total_restores',
        'first_event_timestamp', 'last_event_timestamp'
      ];

      const actualColumns = aggregatesColumns.map(col => col.name);
      requiredColumns.forEach(col => {
        expect(actualColumns).toContain(col);
      });
    });

    it('should create proper indexes for performance', async () => {
      const connection = database.getConnection();
      
      const indexes = await new Promise<any[]>((resolve, reject) => {
        connection!.all("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='events'", (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_events_timestamp');
      expect(indexNames).toContain('idx_events_file_path');
      expect(indexNames).toContain('idx_events_file_id');
      expect(indexNames).toContain('idx_events_file_timestamp');
    });
  });

  describe('Event Types Initialization', () => {
    it('should populate event_types with all FUNC-000 event types', async () => {
      const connection = database.getConnection();
      
      const eventTypes = await new Promise<any[]>((resolve, reject) => {
        connection!.all("SELECT id, code, name FROM event_types ORDER BY id", (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      expect(eventTypes).toHaveLength(6);
      
      const expectedTypes = [
        { id: 1, code: 'find', name: 'Find' },
        { id: 2, code: 'create', name: 'Create' },
        { id: 3, code: 'modify', name: 'Modify' },
        { id: 4, code: 'delete', name: 'Delete' },
        { id: 5, code: 'move', name: 'Move' },
        { id: 6, code: 'restore', name: 'Restore' }
      ];

      expectedTypes.forEach(expected => {
        const actual = eventTypes.find(et => et.id === expected.id);
        expect(actual).toBeDefined();
        expect(actual.code).toBe(expected.code);
        expect(actual.name).toBe(expected.name);
      });
    });

    it('should enforce unique constraint on event type codes', async () => {
      const connection = database.getConnection();
      
      // Attempt to insert duplicate event type code
      await expect(new Promise((resolve, reject) => {
        connection!.run(
          "INSERT INTO event_types (code, name) VALUES (?, ?)",
          ['create', 'Duplicate Create'],
          (err) => {
            if (err) reject(err);
            else resolve(undefined);
          }
        );
      })).rejects.toThrow();
    });
  });

  describe('Database Configuration', () => {
    it('should have WAL mode enabled', async () => {
      const connection = database.getConnection();
      
      const journalMode = await new Promise<string>((resolve, reject) => {
        connection!.get("PRAGMA journal_mode", (err, row: any) => {
          if (err) reject(err);
          else resolve(row.journal_mode);
        });
      });

      expect(journalMode.toLowerCase()).toBe('wal');
    });

    it('should have foreign keys enabled', async () => {
      const connection = database.getConnection();
      
      const foreignKeys = await new Promise<number>((resolve, reject) => {
        connection!.get("PRAGMA foreign_keys", (err, row: any) => {
          if (err) reject(err);
          else resolve(row.foreign_keys);
        });
      });

      expect(foreignKeys).toBe(1);
    });
  });

  describe('Database Connection Management', () => {
    it('should handle multiple connection attempts gracefully', async () => {
      // Database is already connected in beforeEach
      expect(database.isConnected()).toBe(true);
      
      // Additional connect calls should not cause issues
      await database.connect();
      expect(database.isConnected()).toBe(true);
    });

    it('should handle directory creation for database path', async () => {
      const nestedDbPath = path.join(__dirname, 'nested', 'deep', 'database.db');
      const nestedDatabase = new Database(nestedDbPath);
      
      await nestedDatabase.connect();
      expect(fs.existsSync(nestedDbPath)).toBe(true);
      
      await nestedDatabase.close();
      
      // Clean up
      fs.unlinkSync(nestedDbPath);
      fs.rmdirSync(path.dirname(nestedDbPath));
      fs.rmdirSync(path.dirname(path.dirname(nestedDbPath)));
    });
  });
});
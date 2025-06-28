/**
 * Database Manager (FUNC-000 v0.2.0.0 compliant)
 * Complete file lifecycle tracking with 5-table structure
 */

import sqlite3 = require('sqlite3');
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  EventType,
  FileEventMetadata,
  EventRecord,
  FileRecord,
  AggregateRecord,
  EventTypeRecord,
  MeasurementRecord,
  DatabaseManagerStats,
  QueryResult,
  EventWithDetails,
  SQLiteDatabase,
  DatabaseSchema,
  DatabaseInitialData
} from '../types/common';

const { schema, initialData }: { schema: DatabaseSchema; initialData: DatabaseInitialData } = require('./schema');

class DatabaseManager {
  private dbPath: string;
  public db: SQLiteDatabase | null = null;
  public isInitialized: boolean = false;
  private transactionActive: boolean = false;
  private verbose: boolean;

  constructor(dbPath: string | null = null) {
    // FUNC-100 compliant: Default is ./.cctop/activity.db (local)
    this.dbPath = dbPath || path.join(process.cwd(), '.cctop', 'activity.db');
    this.verbose = process.env.CCTOP_VERBOSE === 'true';
    
    // Always log the database path for debugging
    console.log(`[DatabaseManager] Initializing with path: ${this.dbPath}`);
  }

  /**
   * Initialize database with complete synchronization
   * Addresses race condition between isInitialized flag and actual DB connection
   */
  async initialize(): Promise<void> {
    try {
      // Create ~/.cctop directory if it doesn't exist
      const cctopDir = path.dirname(this.dbPath);
      if (!fs.existsSync(cctopDir)) {
        fs.mkdirSync(cctopDir, { recursive: true });
        if (this.verbose) {
          console.log(`Created ~/.cctop directory: ${cctopDir}`);
        }
      }

      // 1. Database connection
      await this.connect();
      
      // 2. Connection verification (critical: actual connection test)
      await this.waitForConnection(5000);
      
      // 3. Schema initialization
      await this.createTables();
      await this.createIndexes();
      await this.createTriggers();
      await this.insertInitialData();
      
      // 4. Final connection confirmation
      await this.testConnection();
      
      // 5. Set flag only after everything is confirmed complete
      this.isInitialized = true;
      if (this.verbose) {
        console.log(`Database initialized: ${this.dbPath}`);
      }
      
    } catch (error: any) {
      // Attempt recovery for corrupted database
      if (error.code === 'SQLITE_NOTADB' || error.message.includes('not a database')) {
        if (this.verbose) {
          console.warn('Corrupted database detected, attempting recovery...');
        }
        
        // Close existing connection
        if (this.db) {
          try {
            await this.close();
          } catch (closeError) {
            // Ignore errors (already corrupted)
          }
        }
        
        // Backup corrupted database
        const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
        try {
          fs.renameSync(this.dbPath, backupPath);
          if (this.verbose) {
            console.log(`Backed up corrupted database to: ${path.basename(backupPath)}`);
          }
        } catch (backupError) {
          if (this.verbose) {
            console.error('Failed to backup corrupted database:', backupError);
          }
        }
        
        // Retry with new database
        await this.connect();
        await this.createTables();
        await this.createIndexes();
        await this.createTriggers();
        await this.insertInitialData();
        
        // Final connection confirmation for recovered database
        await this.testConnection();
        
        this.isInitialized = true;
        if (this.verbose) {
          console.log('Database recovery completed successfully');
        }
      } else {
        console.error('Database initialization failed:', error);
        throw error;
      }
    }
  }

  /**
   * Connect to database
   */
  private async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Wait for database connection to be ready
   */
  private async waitForConnection(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await this.testConnection();
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    throw new Error('Database connection timeout');
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.get('SELECT 1', [], (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    for (const [tableName, createSQL] of Object.entries(schema.tables)) {
      await this.run(createSQL);
      if (this.verbose) {
        console.log(`Created table: ${tableName}`);
      }
    }
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    for (const indexSQL of schema.indexes) {
      try {
        await this.run(indexSQL);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
    if (this.verbose) {
      console.log('Database indexes created');
    }
  }

  /**
   * Create database triggers
   */
  private async createTriggers(): Promise<void> {
    for (const triggerSQL of schema.triggers) {
      try {
        await this.run(triggerSQL);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
    if (this.verbose) {
      console.log('Database triggers created');
    }
  }

  /**
   * Insert initial data
   */
  private async insertInitialData(): Promise<void> {
    // Insert event types
    for (const eventType of initialData.event_types) {
      try {
        await this.run(
          'INSERT OR IGNORE INTO event_types (code, name) VALUES (?, ?)',
          [eventType.code, eventType.name]
        );
      } catch (error: any) {
        // Ignore constraint errors for existing data
        if (!error.message.includes('UNIQUE constraint failed')) {
          throw error;
        }
      }
    }
    if (this.verbose) {
      console.log('Initial data inserted');
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      
      this.db.close((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          this.isInitialized = false;
          resolve();
        }
      });
    });
  }

  /**
   * Execute SQL query (wrapper for sqlite3)
   */
  async run(sql: string, params: any[] = []): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.run(sql, params, function(err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Get single row from database
   */
  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get all rows from database
   */
  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get event type ID by code
   */
  private async getEventTypeId(eventType: EventType): Promise<number> {
    const result = await this.get(
      'SELECT id FROM event_types WHERE code = ?',
      [eventType]
    );
    
    if (!result) {
      throw new Error(`Unknown event type: ${eventType}`);
    }
    
    return result.id;
  }

  /**
   * Ensure file exists in database
   */
  async ensureFile(filePath: string): Promise<number> {
    const existing = await this.get(
      'SELECT id FROM files WHERE file_path = ?',
      [filePath]
    );
    
    if (existing) {
      return existing.id;
    }
    
    // Create new file record
    const result = await this.run(
      'INSERT INTO files (file_path) VALUES (?)',
      [filePath]
    );
    
    return result.lastID!;
  }

  /**
   * Find file by path
   */
  async findByPath(filePath: string): Promise<FileRecord | null> {
    return await this.get(
      'SELECT * FROM files WHERE file_path = ?',
      [filePath]
    );
  }

  /**
   * Record file event
   */
  async recordEvent(metadata: FileEventMetadata): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.transactionActive = true;
      await this.run('BEGIN TRANSACTION');
      
      // Get event type ID
      const eventTypeId = await this.getEventTypeId(metadata.event_type!);
      
      // Ensure file exists and get file ID
      const fileId = await this.ensureFile(metadata.file_path);
      
      // Update file record (FUNC-000 compliant: handle delete vs other events)
      if (metadata.event_type === 'delete') {
        await this.run(`
          UPDATE files SET 
            is_active = 0,
            last_event_timestamp = ?
          WHERE id = ?`,
          [metadata.timestamp, fileId]
        );
      } else {
        // For all other events (find, create, modify, move, restore)
        await this.run(`
          UPDATE files SET 
            is_active = 1,
            last_event_timestamp = ?,
            inode = COALESCE(?, inode)
          WHERE id = ?`,
          [metadata.timestamp, metadata.inode, fileId]
        );
      }
      
      // Update aggregates table
      await this.updateAggregates(fileId, metadata.event_type!, metadata);
      
      // Insert into events table
      const eventResult = await this.run(`
        INSERT INTO events (
          timestamp, event_type_id, file_id, file_path, 
          file_name, directory
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          metadata.timestamp,
          eventTypeId,
          fileId,
          metadata.file_path,
          metadata.file_name,
          path.dirname(metadata.file_path)
        ]
      );
      
      // Insert into measurements table (if measurements provided)
      if (metadata.file_size !== undefined || 
          metadata.line_count !== undefined || 
          metadata.block_count !== undefined) {
        await this.run(`
          INSERT INTO measurements (
            event_id, file_size, line_count, block_count, inode
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            eventResult.lastID,
            metadata.file_size,
            metadata.line_count,
            metadata.block_count,
            metadata.inode
          ]
        );
      }
      
      await this.run('COMMIT');
      
      return eventResult.lastID!;
      
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    } finally {
      this.transactionActive = false;
    }
  }

  /**
   * Update aggregates table
   */
  private async updateAggregates(fileId: number, eventType: EventType, metadata: FileEventMetadata): Promise<void> {
    // Check if record exists
    const existing = await this.get(
      'SELECT file_id FROM aggregates WHERE file_id = ?',
      [fileId]
    );
    
    if (existing) {
      // Build update query (FUNC-000 schema compliant)
      const updates = ['last_updated = CURRENT_TIMESTAMP'];
      const params: any[] = [];
      
      // Increment total events
      updates.push('total_events = total_events + 1');
      
      // Event type specific counters (FUNC-000 compliant)
      switch (eventType) {
        case 'find':
          // Find events only increment total_events (no specific counter in FUNC-000)
          break;
        case 'create':
          updates.push('total_creates = total_creates + 1');
          break;
        case 'modify':
          updates.push('total_modifies = total_modifies + 1');
          break;
        case 'move':
          updates.push('total_moves = total_moves + 1');
          break;
        case 'delete':
          updates.push('total_deletes = total_deletes + 1');
          break;
        case 'restore':
          updates.push('total_restores = total_restores + 1');
          break;
      }
      
      // Update cumulative statistics (FUNC-000 compliant)
      if (metadata.file_size !== undefined) {
        updates.push('total_size = ?');
        params.push(metadata.file_size);
      }
      if (metadata.line_count !== undefined) {
        updates.push('total_lines = ?');
        params.push(metadata.line_count);
      }
      if (metadata.block_count !== undefined) {
        updates.push('total_blocks = ?');
        params.push(metadata.block_count);
      }
      
      params.push(fileId);
      
      await this.run(
        `UPDATE aggregates SET ${updates.join(', ')} WHERE file_id = ?`,
        params
      );
    } else {
      // Create new record (FUNC-000 compliant)
      let insertQuery: string;
      let params: any[];
      
      if (eventType === 'find') {
        // Find events only increment total_events
        insertQuery = `
          INSERT INTO aggregates (
            file_id, total_size, total_lines, total_blocks, total_events
          ) VALUES (?, ?, ?, ?, 1)`;
        params = [
          fileId,
          metadata.file_size || 0,
          metadata.line_count || 0,
          metadata.block_count || 0
        ];
      } else {
        // Other events increment both total_events and specific counter
        const eventColumn = `total_${eventType}s`;
        insertQuery = `
          INSERT INTO aggregates (
            file_id, total_size, total_lines, total_blocks,
            total_events, ${eventColumn}
          ) VALUES (?, ?, ?, ?, 1, 1)`;
        params = [
          fileId,
          metadata.file_size || 0,
          metadata.line_count || 0,
          metadata.block_count || 0
        ];
      }
      
      await this.run(insertQuery, params);
    }
  }

  /**
   * Get recent events list
   */
  async getRecentEvents(limit: number = 50): Promise<EventWithDetails[]> {
    return await this.all(`
      SELECT 
        e.id,
        e.timestamp,
        et.code as event_type,
        et.name as event_name,
        e.file_path,
        e.file_name,
        e.directory,
        m.file_size,
        m.line_count,
        m.block_count,
        m.inode
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get aggregate statistics for a file
   */
  async getAggregateStats(fileId: number): Promise<AggregateRecord | null> {
    return await this.get(`
      SELECT * FROM aggregates WHERE file_id = ?`,
      [fileId]
    );
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseManagerStats> {
    const eventCount = await this.get('SELECT COUNT(*) as count FROM events');
    const fileCount = await this.get('SELECT COUNT(*) as count FROM files');
    
    return {
      isInitialized: this.isInitialized,
      transactionActive: this.transactionActive,
      dbPath: this.dbPath,
      totalEvents: eventCount?.count || 0,
      totalFiles: fileCount?.count || 0
    };
  }

  /**
   * Get event count
   */
  async getEventCount(): Promise<number> {
    const result = await this.get('SELECT COUNT(*) as count FROM events');
    return result?.count || 0;
  }

  /**
   * Get events batch for pagination
   */
  async getEventsBatch(offset: number, limit: number): Promise<EventWithDetails[]> {
    return await this.all(`
      SELECT 
        e.id,
        e.timestamp,
        et.code as event_type,
        et.name as event_name,
        e.file_path,
        e.file_name,
        e.directory,
        m.file_size,
        m.line_count,
        m.block_count,
        m.inode
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }
}

export = DatabaseManager;
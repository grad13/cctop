/**
 * Database Manager (FUNC-000 v0.2.0.0 compliant)
 * Complete file lifecycle tracking with 5-table structure
 */

import * as path from 'path';
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
  DatabaseInitialData,
  DatabaseConfig,
  InitializationResult
} from './DatabaseTypes';
import { ConnectionManager } from './ConnectionManager';
import { QueryBuilder } from './QueryBuilder';
import { TransactionManager } from './TransactionManager';

const { schema, initialData }: { schema: DatabaseSchema; initialData: DatabaseInitialData } = require('../schema');

class DatabaseManager {
  private connectionManager: ConnectionManager;
  private transactionManager: TransactionManager | null = null;
  private dbPath: string;
  public db: SQLiteDatabase | null = null;
  public isInitialized: boolean = false;

  constructor(dbPath: string | null = null) {
    // FUNC-100 compliant: Default is ./.cctop/activity.db (local)
    this.dbPath = dbPath || path.join(process.cwd(), '.cctop', 'activity.db');
    
    const config: DatabaseConfig = {
      path: this.dbPath,
      enableWAL: true,
      verbose: false
    };
    
    this.connectionManager = new ConnectionManager(config);
  }

  /**
   * Initialize database with complete synchronization
   */
  async initialize(): Promise<void> {
    try {
      // Connect to database
      this.db = await this.connectionManager.connect();
      this.transactionManager = new TransactionManager(this.db);
      
      // Create schema
      await this.createSchema();
      
      // Insert initial data
      await this.insertInitialData();
      
      // Set initialization flag
      this.isInitialized = true;
      
      // Initial WAL checkpoint
      await this.transactionManager.checkpoint('PASSIVE');
      
    } catch (error) {
      this.isInitialized = false;
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create database schema
   */
  private async createSchema(): Promise<void> {
    if (!this.transactionManager) {
      throw new Error('Transaction manager not initialized');
    }

    await this.transactionManager.transaction(async () => {
      // Create tables
      for (const [name, ddl] of Object.entries(schema.tables)) {
        await this.exec(ddl as string);
      }
      
      // Create indexes
      if (schema.indexes) {
        for (const ddl of schema.indexes) {
          await this.exec(ddl);
        }
      }
      
      // Create triggers
      if ((schema as any).triggers) {
        for (const ddl of (schema as any).triggers) {
          await this.exec(ddl);
        }
      }
    });
  }

  /**
   * Insert initial data
   */
  private async insertInitialData(): Promise<void> {
    if (!this.transactionManager) {
      throw new Error('Transaction manager not initialized');
    }

    await this.transactionManager.transaction(async () => {
      // Insert event types
      for (const eventType of initialData.event_types) {
        await this.run(
          'INSERT OR IGNORE INTO event_types (code, name, description) VALUES (?, ?, ?)',
          [eventType.code, eventType.name, eventType.description]
        );
      }
      
      // No initial measurements or aggregates needed based on current schema
    });
  }

  /**
   * Record a file event
   */
  async recordEvent(metadata: FileEventMetadata & { event_type: EventType }): Promise<number> {
    if (!this.isInitialized || !this.transactionManager) {
      throw new Error('Database not initialized');
    }

    return await this.transactionManager.transaction(async () => {
      let fileId: number;
      
      // Find or create file record
      const existingFile = await this.findByPath(metadata.file_path);
      
      if (existingFile) {
        fileId = existingFile.id;
        
        // Update file record if needed
        if (metadata.event_type !== 'delete') {
          const { sql, params } = QueryBuilder.buildFileUpdate(fileId, {
            file_size: metadata.file_size,
            inode: metadata.inode,
            line_count: metadata.line_count
          });
          await this.run(sql, params);
          
          // Reactivate if needed
          if (!existingFile.is_active) {
            await this.run('UPDATE files SET is_active = 1 WHERE id = ?', [fileId]);
          }
        }
      } else {
        // Create new file record
        const { sql, params } = QueryBuilder.buildFileInsert(metadata);
        const result = await this.run(sql, params);
        fileId = result.lastID!;
      }
      
      // Get event type ID
      const eventTypeId = await this.getEventTypeId(metadata.event_type);
      
      // Insert event record
      const eventQuery = QueryBuilder.buildEventInsert(metadata, eventTypeId);
      eventQuery.params[2] = fileId; // Set file_id (3rd parameter)
      const eventResult = await this.run(eventQuery.sql, eventQuery.params);
      
      // Insert measurements if applicable
      if (metadata.file_size !== undefined || metadata.line_count !== undefined) {
        await this.run(`
          INSERT INTO measurements (event_id, file_size, line_count, block_count, inode)
          VALUES (?, ?, ?, ?, ?)
        `, [eventResult.lastID, metadata.file_size || null, metadata.line_count || null, metadata.block_count || 0, metadata.inode || null]);
      }
      
      // Update aggregates
      await this.updateAggregates(metadata.event_type);
      
      // Handle delete event
      if (metadata.event_type === 'delete') {
        await this.run('UPDATE files SET is_active = 0 WHERE id = ?', [fileId]);
      }
      
      return eventResult.lastID!;
    });
  }

  /**
   * Find file by path
   */
  async findByPath(filePath: string): Promise<FileRecord | null> {
    if (!this.isInitialized) {
      return null;
    }

    const { sql, params } = QueryBuilder.buildFindByPath(filePath);
    const row = await this.get(sql, params);
    return row || null;
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit: number = 10): Promise<EventWithDetails[]> {
    if (!this.isInitialized) {
      return [];
    }

    const { sql, params } = QueryBuilder.buildRecentEventsQuery(limit);
    const rows = await this.all(sql, params);
    return rows || [];
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseManagerStats> {
    if (!this.isInitialized) {
      return {
        isInitialized: false,
        transactionActive: false,
        dbPath: this.dbPath,
        totalEvents: 0,
        totalFiles: 0
      };
    }

    const stats = await this.get(`
      SELECT 
        (SELECT COUNT(*) FROM events) as totalEvents,
        (SELECT COUNT(*) FROM files) as totalFiles,
        (SELECT COUNT(*) FROM files WHERE is_active = 1) as activeFiles
    `);

    const eventBreakdown = await this.all(`
      SELECT event_type, COUNT(*) as count
      FROM events
      GROUP BY event_type
    `);

    const breakdown: Record<string, number> = {};
    for (const row of eventBreakdown || []) {
      breakdown[row.event_type] = row.count;
    }

    return {
      isInitialized: this.isInitialized,
      transactionActive: this.transactionManager?.isInTransaction() || false,
      dbPath: this.dbPath,
      totalEvents: stats?.totalEvents || 0,
      totalFiles: stats?.totalFiles || 0
    };
  }

  /**
   * Get event type ID by code
   */
  private async getEventTypeId(eventType: EventType): Promise<number> {
    const row = await this.get(
      'SELECT id FROM event_types WHERE code = ?',
      [eventType]
    );
    
    if (!row) {
      throw new Error(`Unknown event type: ${eventType}`);
    }
    
    return row.id;
  }

  /**
   * Update aggregates
   */
  private async updateAggregates(eventType: EventType): Promise<void> {
    const aggregateMap: Record<EventType, string> = {
      'find': 'total_finds',
      'create': 'total_creates',
      'modify': 'total_modifies',
      'delete': 'total_deletes',
      'move': 'total_moves',
      'restore': 'total_restores'
    };

    const aggregateType = aggregateMap[eventType];
    if (aggregateType) {
      await this.run(`
        UPDATE aggregates 
        SET value = CAST(value AS INTEGER) + 1, updated_at = ?
        WHERE type = ?
      `, [Date.now(), aggregateType]);
    }

    // Update total events
    await this.run(`
      UPDATE aggregates 
      SET value = CAST(value AS INTEGER) + 1, updated_at = ?
      WHERE type = 'total_events'
    `, [Date.now()]);
  }

  /**
   * Clean up old data
   */
  async cleanup(daysToKeep: number = 30): Promise<void> {
    if (!this.isInitialized || !this.transactionManager) {
      return;
    }

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    await this.transactionManager.transaction(async () => {
      // Delete old events
      await this.run('DELETE FROM events WHERE timestamp < ?', [cutoffTime]);
      
      // Delete inactive files with no recent events
      const { sql, params } = QueryBuilder.buildDeleteInactiveFiles(cutoffTime);
      await this.run(sql, params);
      
      // Vacuum database
      await this.exec('VACUUM');
    });
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.isInitialized && this.connectionManager.isConnectionActive();
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.close();
    }
    this.db = null;
    this.isInitialized = false;
  }

  // Helper methods for backward compatibility

  /**
   * Execute SQL with no return value
   */
  private exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Run SQL with parameters
   */
  private run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Get single row
   */
  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all rows
   */
  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

export = DatabaseManager;
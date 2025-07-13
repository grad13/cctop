import sqlite3 from 'sqlite3';

/**
 * File Event Reader
 * Persistent database connection and operations for file events
 */
export class FileEventReader {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async getLatestEvents(limit: number = 50, mode: 'all' | 'unique' = 'all', offset: number = 0, filters?: string[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Build filter condition
      const buildFilterCondition = (filters?: string[]): string => {
        if (!filters || filters.length === 0 || filters.length >= 6) {
          return ''; // No filtering if no filters or all types selected
        }
        const filterConditions = filters.map(f => `'${f}'`).join(',');
        return `AND et.name IN (${filterConditions})`;
      };
      
      const filterCondition = buildFilterCondition(filters);
      
      // Standard compliant query only
      const query = mode === 'unique' ? 
        `WITH latest_events AS (
          SELECT 
            e.*,
            ROW_NUMBER() OVER (PARTITION BY e.file_name, e.directory ORDER BY e.timestamp DESC) as rn
          FROM events e
          ${filters && filters.length > 0 && filters.length < 6 ? 
            `JOIN event_types et2 ON e.event_type_id = et2.id 
             WHERE et2.name IN (${filters.map(f => `'${f}'`).join(',')})` : ''}
        )
        SELECT 
          le.id,
          le.timestamp,
          le.file_name as filename,
          le.directory,
          et.name as event_type,
          COALESCE(m.file_size, 0) as size,
          m.line_count as lines,
          m.block_count as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM latest_events le
        JOIN event_types et ON le.event_type_id = et.id
        LEFT JOIN measurements m ON le.id = m.event_id
        WHERE le.rn = 1
        ORDER BY le.id DESC 
        LIMIT ? OFFSET ?` :
        `SELECT 
          e.id,
          e.timestamp,
          e.file_name as filename,
          e.directory,
          et.name as event_type,
          COALESCE(m.file_size, 0) as size,
          m.line_count as lines,
          m.block_count as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        ${filterCondition ? `WHERE ${filterCondition.replace('AND ', '')}` : ''}
        ORDER BY e.id DESC 
        LIMIT ? OFFSET ?`;

      this.db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Search events with keyword and filters
   * Implementation with staged fetching
   */
  async searchEvents(params: {
    keyword: string;
    filters?: string[];
    mode?: 'all' | 'unique';
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { 
      keyword, 
      filters = ['find', 'create', 'modify', 'delete', 'move', 'restore'], 
      mode = 'all',
      limit = 100,
      offset = 0 
    } = params;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Build filter conditions
      const filterConditions = filters.map(f => `'${f}'`).join(',');
      
      // Standard compliant query with search
      const query = mode === 'unique' ? 
        `WITH latest_events AS (
          SELECT 
            e.*,
            ROW_NUMBER() OVER (PARTITION BY e.file_name, e.directory ORDER BY e.timestamp DESC) as rn
          FROM events e
          WHERE (e.file_name LIKE ? OR e.directory LIKE ?)
        )
        SELECT 
          le.id,
          le.timestamp,
          le.file_name as filename,
          le.directory,
          et.name as event_type,
          COALESCE(m.file_size, 0) as size,
          m.line_count as lines,
          m.block_count as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM latest_events le
        JOIN event_types et ON le.event_type_id = et.id
        LEFT JOIN measurements m ON le.id = m.event_id
        WHERE 
          le.rn = 1
          AND et.name IN (${filterConditions})
        ORDER BY le.timestamp DESC 
        LIMIT ? OFFSET ?` :
        `SELECT 
          e.id,
          e.timestamp,
          e.file_name as filename,
          e.directory,
          et.name as event_type,
          COALESCE(m.file_size, 0) as size,
          m.line_count as lines,
          m.block_count as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE 
          (e.file_name LIKE ? OR e.directory LIKE ?)
          AND et.name IN (${filterConditions})
        ORDER BY e.timestamp DESC 
        LIMIT ? OFFSET ?`;

      const searchPattern = `%${keyword}%`;
      this.db.all(query, [searchPattern, searchPattern, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}
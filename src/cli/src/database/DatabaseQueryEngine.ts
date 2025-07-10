/**
 * Database Query Engine
 * Handles complex queries and schema compatibility
 */

import { EventRow } from '../types/event-row';
import { DatabaseConnection } from './DatabaseConnection';

export class DatabaseQueryEngine {
  constructor(private connection: DatabaseConnection) {}

  async getLatestEvents(limit: number = 25, mode: 'all' | 'unique' = 'all', offset: number = 0, filters?: string[]): Promise<EventRow[]> {
    if (this.connection.isUsingRandomData()) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const db = this.connection.getDatabase();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Try different table schemas with mode support
      const queries = this.buildQueries(mode, limit, offset, filters);

      const tryQuery = (queryIndex: number) => {
        if (queryIndex >= queries.length) {
          reject(new Error('No compatible table schema found'));
          return;
        }

        db.all(queries[queryIndex], [limit, offset], (err, rows: any[]) => {
          if (err) {
            // Try next query
            tryQuery(queryIndex + 1);
          } else {
            const events: EventRow[] = rows.map(row => ({
              id: row.id,
              timestamp: row.timestamp,
              filename: row.filename || 'Unknown',
              directory: row.directory || '.',
              event_type: row.event_type || 'unknown',
              size: row.size || 0,
              lines: row.lines || 0,
              blocks: row.blocks || 0,
              inode: row.inode || 0,
              elapsed_ms: row.elapsed_ms || 0
            }));
            resolve(events);
          }
        });
      };

      tryQuery(0);
    });
  }

  private buildFilterCondition(filters?: string[]): string {
    if (!filters || filters.length === 0 || filters.length >= 6) {
      return ''; // No filtering if no filters or all types selected
    }
    
    const filterConditions = filters.map(f => `'${f}'`).join(',');
    return `AND et.name IN (${filterConditions})`;
  }

  private buildQueries(mode: 'all' | 'unique', limit: number, offset: number = 0, filters?: string[]): string[] {
    const filterCondition = this.buildFilterCondition(filters);
    return [
      // Actual production schema (events table with direct event_type)
      mode === 'unique' ? 
      `SELECT 
        e.id,
        e.timestamp,
        e.file_name as filename,
        e.directory,
        et.name as event_type,
        COALESCE(m.file_size, 0) as size,
        COALESCE(m.line_count, 0) as lines,
        COALESCE(m.block_count, 0) as blocks,
        COALESCE(m.inode, 0) as inode,
        0 as elapsed_ms
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      WHERE e.id IN (
        SELECT MAX(e2.id)
        FROM events e2
        GROUP BY e2.file_id
      )
      ${filterCondition}
      ORDER BY e.timestamp DESC 
      LIMIT ? OFFSET ?` :
      `SELECT 
        e.id,
        e.timestamp,
        e.file_name as filename,
        e.directory,
        et.name as event_type,
        COALESCE(m.file_size, 0) as size,
        COALESCE(m.line_count, 0) as lines,
        COALESCE(m.block_count, 0) as blocks,
        COALESCE(m.inode, 0) as inode,
        0 as elapsed_ms
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ${filterCondition ? `WHERE ${filterCondition.replace('AND ', '')}` : ''}
      ORDER BY e.timestamp DESC 
      LIMIT ? OFFSET ?`,
      
      // Legacy v0.3.0 schema (fallback)
      mode === 'unique' ? 
      `SELECT 
        e.id,
        e.timestamp,
        e.filename,
        e.directory,
        e.event_type,
        e.size,
        e.lines,
        e.blocks,
        e.inode,
        e.elapsed_ms
      FROM events e
      INNER JOIN (
        SELECT filename, directory, MAX(timestamp) as max_timestamp
        FROM events
        GROUP BY filename, directory
      ) latest ON e.filename = latest.filename 
               AND e.directory = latest.directory 
               AND e.timestamp = latest.max_timestamp
      ORDER BY e.timestamp DESC 
      LIMIT ?` :
      `SELECT 
        id,
        timestamp,
        filename,
        directory,
        event_type,
        size,
        lines,
        blocks,
        inode,
        elapsed_ms
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT ?`,
      
      // v0.2.x schema 
      mode === 'unique' ?
      `SELECT 
        e.id,
        e.created_at as timestamp,
        e.filename,
        e.directory,
        e.event_type,
        e.file_size as size,
        e.line_count as lines,
        e.block_count as blocks,
        e.inode_number as inode,
        0 as elapsed_ms
      FROM file_events e
      INNER JOIN (
        SELECT filename, directory, MAX(created_at) as max_timestamp
        FROM file_events
        GROUP BY filename, directory
      ) latest ON e.filename = latest.filename 
               AND e.directory = latest.directory 
               AND e.created_at = latest.max_timestamp
      ORDER BY e.created_at DESC 
      LIMIT ?` :
      `SELECT 
        id,
        created_at as timestamp,
        filename,
        directory,
        event_type,
        file_size as size,
        line_count as lines,
        block_count as blocks,
        inode_number as inode,
        0 as elapsed_ms
      FROM file_events 
      ORDER BY created_at DESC 
      LIMIT ?`
    ];
  }

  async getEventsByType(eventType: string, limit: number = 25): Promise<EventRow[]> {
    const events = await this.getLatestEvents(limit * 2);
    return events.filter(event => event.event_type === eventType).slice(0, limit);
  }

  async getDirectoryEvents(directory: string, limit: number = 25): Promise<EventRow[]> {
    const events = await this.getLatestEvents(limit * 2);
    return events.filter(event => 
      event.directory.includes(directory)
    ).slice(0, limit);
  }

  async getEventCount(): Promise<number> {
    if (this.connection.isUsingRandomData()) {
      return Math.floor(Math.random() * 500) + 100;
    }

    return new Promise((resolve, reject) => {
      const db = this.connection.getDatabase();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      const queries = [
        'SELECT COUNT(*) as count FROM events',
        'SELECT COUNT(*) as count FROM file_events'
      ];

      const tryQuery = (queryIndex: number) => {
        if (queryIndex >= queries.length) {
          resolve(0);
          return;
        }

        db.get(queries[queryIndex], (err, row: any) => {
          if (err) {
            tryQuery(queryIndex + 1);
          } else {
            resolve(row.count);
          }
        });
      };

      tryQuery(0);
    });
  }
}
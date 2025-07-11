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

      const query = this.buildQueries(mode, limit, offset, filters)[0];

      db.all(query, [limit, offset], (err, rows: any[]) => {
        if (err) {
          reject(err);
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
    
    if (mode === 'unique') {
      return [`SELECT 
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
      ORDER BY e.id DESC 
      LIMIT ? OFFSET ?`];
    } else {
      return [`SELECT 
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
      ORDER BY e.id DESC 
      LIMIT ? OFFSET ?`];
    }
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

      db.get('SELECT COUNT(*) as count FROM events', (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}
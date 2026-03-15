/**
 * FileEventReader
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */
import sqlite3 from 'sqlite3';
import { QueryBuilder } from './QueryBuilder';

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
        const db = this.db;
        this.db = null;
        db.close((err) => {
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

      const filterCond = QueryBuilder.filterCondition(filters);
      let query: string;

      if (mode === 'unique') {
        const cteWhere = filters && filters.length > 0 && filters.length < 6
          ? `JOIN event_types et2 ON e.event_type_id = et2.id
             WHERE et2.name IN (${filters.map(f => `'${f}'`).join(',')})`
          : '';
        query = `${QueryBuilder.uniqueCTE(cteWhere)}
          SELECT ${QueryBuilder.selectColumns('le')}
          FROM latest_events le
          ${QueryBuilder.joins('le')}
          WHERE le.rn = 1
          ORDER BY le.id DESC
          LIMIT ? OFFSET ?`;
      } else {
        const whereClause = filterCond ? `WHERE ${filterCond}` : '';
        query = `SELECT ${QueryBuilder.selectColumns()}
          FROM events e
          ${QueryBuilder.joins()}
          ${whereClause}
          ORDER BY e.id DESC
          LIMIT ? OFFSET ?`;
      }

      this.db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

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

      const filterConditions = filters.map(f => `'${f}'`).join(',');
      let query: string;

      if (mode === 'unique') {
        query = `${QueryBuilder.uniqueCTE('WHERE (e.file_name LIKE ? OR e.directory LIKE ?)')}
          SELECT ${QueryBuilder.selectColumns('le')}
          FROM latest_events le
          ${QueryBuilder.joins('le')}
          WHERE le.rn = 1
            AND et.name IN (${filterConditions})
          ORDER BY le.timestamp DESC
          LIMIT ? OFFSET ?`;
      } else {
        query = `SELECT ${QueryBuilder.selectColumns()}
          FROM events e
          ${QueryBuilder.joins()}
          WHERE (e.file_name LIKE ? OR e.directory LIKE ?)
            AND et.name IN (${filterConditions})
          ORDER BY e.timestamp DESC
          LIMIT ? OFFSET ?`;
      }

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

  async getEventsAfterId(lastEventId: number, limit: number = 100): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      const query = `SELECT ${QueryBuilder.selectColumns()}
        FROM events e
        ${QueryBuilder.joins()}
        WHERE e.id > ?
        ORDER BY e.id ASC
        LIMIT ?`;

      this.db.all(query, [lastEventId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}

/**
 * Event Operations
 * Events table operations
 */

import sqlite3 from 'sqlite3';
import { FileEvent, EventMeasurement } from './types';

export class EventOperations {
  private db: sqlite3.Database;
  private eventTypeMap: Map<string, number> | null = null;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  clearCache(): void {
    this.eventTypeMap = null;
  }

  private async ensureEventTypesLoaded(): Promise<void> {
    if (this.eventTypeMap !== null) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, code FROM event_types ORDER BY code', (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to load event types: ${err.message}`));
          return;
        }
        if (!rows || rows.length === 0) {
          reject(new Error('No event types found in database. Schema may not be initialized.'));
          return;
        }
        this.eventTypeMap = new Map();
        rows.forEach(row => {
          this.eventTypeMap!.set(row.code, row.id);
        });
        resolve();
      });
    });
  }

  async insertEvent(event: FileEvent, measurement?: EventMeasurement): Promise<number> {
    await this.ensureEventTypesLoaded();

    this.validateEventInput(event, measurement);

    return new Promise((resolve, reject) => {
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.upsertFileRecord(event, measurement!.inode, (err, fileId, skipEvent) => {
          if (err) {
            this.rollback();
            reject(err);
            return;
          }
          if (skipEvent) {
            this.db.run('COMMIT', () => {});
            resolve(fileId!);
            return;
          }

          this.insertEventRecord(event, fileId!, (err, eventId) => {
            if (err) {
              this.rollback();
              reject(err);
              return;
            }

            if (event.eventType === 'delete' || event.eventType === 'move') {
              this.commit(eventId!, resolve, reject);
            } else {
              this.insertMeasurementRecord(eventId!, measurement!, (err) => {
                if (err) {
                  this.rollback();
                  reject(err);
                  return;
                }
                this.commit(eventId!, resolve, reject);
              });
            }
          });
        });
      });
    });
  }

  private validateEventInput(event: FileEvent, measurement?: EventMeasurement): void {
    if (['delete', 'move'].includes(event.eventType)) {
      if (!measurement || !measurement.inode) {
        throw new Error('inode is required for delete/move events');
      }
    } else {
      if (!measurement || !measurement.inode) {
        throw new Error('Measurement with inode is required for database compliance');
      }
    }
  }

  private upsertFileRecord(
    event: FileEvent,
    inode: number,
    callback: (err: Error | null, fileId?: number, skipEvent?: boolean) => void
  ): void {
    this.db.get('SELECT id FROM files WHERE inode = ?', [inode], (err, row: any) => {
      if (err) {
        callback(err);
        return;
      }

      if (row) {
        const fileId = row.id;
        if (event.eventType === 'find') {
          callback(null, fileId, true);
          return;
        }
        const isActive = event.eventType !== 'delete' ? 1 : 0;
        this.db.run('UPDATE files SET is_active = ? WHERE id = ?', [isActive, fileId], (err) => {
          callback(err, fileId);
        });
      } else {
        const isActive = event.eventType !== 'delete' ? 1 : 0;
        const db = this.db;
        db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', [inode, isActive], function(err) {
          callback(err, err ? undefined : this.lastID);
        });
      }
    });
  }

  private insertEventRecord(
    event: FileEvent,
    fileId: number,
    callback: (err: Error | null, eventId?: number) => void
  ): void {
    const eventTypeId = this.eventTypeMap!.get(event.eventType);
    if (!eventTypeId) {
      callback(new Error(`Unknown event type: ${event.eventType}`));
      return;
    }

    const timestamp = Math.floor(event.timestamp.getTime() / 1000);
    const sql = `
      INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [timestamp, eventTypeId, fileId, event.filePath, event.fileName, event.directory];

    const db = this.db;
    db.run(sql, params, function(err) {
      callback(err, err ? undefined : this.lastID);
    });
  }

  private insertMeasurementRecord(
    eventId: number,
    measurement: EventMeasurement,
    callback: (err: Error | null) => void
  ): void {
    const sql = `
      INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      eventId,
      measurement.inode,
      measurement.fileSize,
      measurement.lineCount || null,
      measurement.blockCount || null
    ];
    this.db.run(sql, params, callback);
  }

  private rollback(): void {
    this.db.run('ROLLBACK', () => {});
  }

  private commit(eventId: number, resolve: (id: number) => void, reject: (err: Error) => void): void {
    this.db.run('COMMIT', (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(eventId);
      }
    });
  }

  async getRecentEvents(limit: number = 100, filePath?: string): Promise<FileEvent[]> {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT
          e.id,
          e.timestamp,
          e.event_type_id,
          e.file_path,
          e.file_name,
          e.directory,
          et.code as event_type,
          COALESCE(m.inode, f.inode) as inode
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        JOIN files f ON e.file_id = f.id
        LEFT JOIN measurements m ON e.id = m.event_id
      `;

      const params: any[] = [];

      if (filePath) {
        sql += ' WHERE e.file_path = ?';
        params.push(filePath);
      }

      sql += ' ORDER BY e.timestamp DESC LIMIT ?';
      params.push(limit);

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: FileEvent[] = rows.map(row => ({
            id: row.id,
            eventType: row.event_type as 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore',
            filePath: row.file_path,
            directory: row.directory,
            fileName: row.file_name,
            timestamp: new Date(row.timestamp * 1000),
            inode: row.inode
          }));
          resolve(events);
        }
      });
    });
  }

  async getEventById(eventId: number): Promise<FileEvent | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          e.id,
          e.timestamp,
          e.event_type_id,
          e.file_path,
          e.file_name,
          e.directory,
          et.code as event_type
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        WHERE e.id = ?
      `;

      this.db.get(sql, [eventId], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (row) {
          const event: FileEvent = {
            id: row.id,
            eventType: row.event_type as 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore',
            filePath: row.file_path,
            directory: row.directory,
            fileName: row.file_name,
            timestamp: new Date(row.timestamp * 1000)
          };
          resolve(event);
        } else {
          resolve(null);
        }
      });
    });
  }
}

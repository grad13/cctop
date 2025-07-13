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

    return new Promise((resolve) => {
      this.db.all('SELECT id, code FROM event_types ORDER BY code', (err, rows: any[]) => {
        if (err || !rows || rows.length === 0) {
          // Use specified order as fallback
          this.eventTypeMap = new Map([
            ['find', 1],
            ['create', 2],
            ['modify', 3],
            ['delete', 4],
            ['move', 5],
            ['restore', 6]
          ]);
        } else {
          // Build map based on actual DB content
          this.eventTypeMap = new Map();
          rows.forEach(row => {
            this.eventTypeMap!.set(row.code, row.id);
          });
        }
        resolve();
      });
    });
  }

  async insertEvent(event: FileEvent, measurement?: EventMeasurement): Promise<number> {
    await this.ensureEventTypesLoaded();
    
    return new Promise((resolve, reject) => {
      let fileId: number;
      let eventId: number;
      
      // delete/move events don't require measurements
      if (['delete', 'move'].includes(event.eventType)) {
        // For delete/move events, inode can be provided without full measurement
        if (!measurement || !measurement.inode) {
          reject(new Error('inode is required for delete/move events'));
          return;
        }
      } else {
        // For create/modify/find/restore events, full measurement is required
        if (!measurement || !measurement.inode) {
          reject(new Error('Measurement with inode is required for database compliance'));
          return;
        }
      }

      // Start transaction
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }

        // First, handle file tracking
        this.db.get('SELECT id FROM files WHERE inode = ?', [measurement.inode], (err, row: any) => {
          if (err) {
            this.db.run('ROLLBACK', () => {});
            reject(err);
            return;
          }
          
          if (row) {
            // File exists in files table
            fileId = row.id;
            
            // For find events, skip insertion since file already exists
            if (event.eventType === 'find') {
              this.db.run('COMMIT', () => {});
              resolve(fileId); // Return existing file_id (not event_id since no event was created)
              return;
            }
            
            // For non-find events, proceed normally
            this.db.run('UPDATE files SET is_active = ? WHERE id = ?', 
              [event.eventType !== 'delete' ? 1 : 0, fileId], 
              (updateErr) => {
                if (updateErr) {
                  this.db.run('ROLLBACK', () => {});
                  reject(updateErr);
                  return;
                }
                insertEventAndMeasurement();
              }
            );
          } else {
            // File doesn't exist, insert it
            const db = this.db;
            db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', 
              [measurement.inode, event.eventType !== 'delete' ? 1 : 0], 
              function(insertErr) {
                if (insertErr) {
                  db.run('ROLLBACK', () => {});
                  reject(insertErr);
                  return;
                }
                fileId = this.lastID;
                insertEventAndMeasurement();
              }
            );
          }
        });

        // Function to insert event and measurement
        const insertEventAndMeasurement = () => {
          const insertEventSql = `
            INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          
          const eventTypeId = this.eventTypeMap!.get(event.eventType);
          if (!eventTypeId) {
            reject(new Error(`Unknown event type: ${event.eventType}`));
            return;
          }
          const timestamp = Math.floor(event.timestamp.getTime() / 1000);
          
          const eventParams = [
            timestamp,
            eventTypeId,
            fileId,
            event.filePath,
            event.fileName,
            event.directory
          ];
          
          const db = this.db;
          db.run(insertEventSql, eventParams, function(err) {
            if (err) {
              db.run('ROLLBACK', () => {});
              reject(err);
              return;
            }
            
            eventId = this.lastID;
            
            // Check if measurement should be saved (no measurements for delete/move)
            if (event.eventType === 'delete' || event.eventType === 'move') {
              // Commit without saving measurement
              db.run('COMMIT', (commitErr: any) => {
                if (commitErr) {
                  reject(commitErr);
                } else {
                  resolve(eventId);
                }
              });
            } else {
              // Insert measurement for create/modify/find/restore events
              const measurementSql = `
                INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
                VALUES (?, ?, ?, ?, ?)
              `;
              
              const measurementParams = [
                eventId,
                measurement.inode,
                measurement.fileSize,
                measurement.lineCount || null,
                measurement.blockCount || null
              ];
              
              db.run(measurementSql, measurementParams, (measurementErr: any) => {
                if (measurementErr) {
                  db.run('ROLLBACK', () => {});
                  reject(measurementErr);
                } else {
                  db.run('COMMIT', (commitErr: any) => {
                    if (commitErr) {
                      reject(commitErr);
                    } else {
                      resolve(eventId);
                    }
                  });
                }
              });
            }
          });
        };
      });
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
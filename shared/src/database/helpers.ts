/**
 * Database helper functions for sqlite3 promisification
 */

import sqlite3 from 'sqlite3';

/**
 * Promisified database.run
 */
export function runAsync(
  db: sqlite3.Database,
  sql: string,
  params?: any[]
): Promise<{ changes: number; lastID: number }> {
  return new Promise((resolve, reject) => {
    const callback = function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    };
    
    if (params) {
      db.run(sql, params, callback);
    } else {
      db.run(sql, callback);
    }
  });
}

/**
 * Promisified database.get
 */
export function getAsync<T>(
  db: sqlite3.Database,
  sql: string,
  params?: any[]
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, row: T) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    };
    
    if (params) {
      db.get(sql, params, callback);
    } else {
      db.get(sql, callback);
    }
  });
}

/**
 * Promisified database.all
 */
export function allAsync<T>(
  db: sqlite3.Database,
  sql: string,
  params?: any[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, rows: T[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    };
    
    if (params) {
      db.all(sql, params, callback);
    } else {
      db.all(sql, callback);
    }
  });
}

/**
 * Promisified database.close
 */
export function closeAsync(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
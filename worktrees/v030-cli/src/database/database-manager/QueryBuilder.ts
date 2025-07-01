/**
 * Query Builder
 * Handles SQL query construction and parameter binding
 */

import {
  EventType,
  FileEventMetadata,
  EventRecord,
  FileRecord
} from './DatabaseTypes';

export class QueryBuilder {
  /**
   * Build insert query for event
   */
  static buildEventInsert(metadata: FileEventMetadata & { event_type: EventType }, eventTypeId: number): {
    sql: string;
    params: any[];
  } {
    const sql = `
      INSERT INTO events (
        timestamp, event_type_id, file_id, 
        file_path, file_name, directory
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      metadata.timestamp,
      eventTypeId,
      null, // file_id will be set later
      metadata.file_path,
      metadata.file_name,
      metadata.directory
    ];

    return { sql, params };
  }

  /**
   * Build insert query for file
   */
  static buildFileInsert(metadata: FileEventMetadata): {
    sql: string;
    params: any[];
  } {
    const sql = `
      INSERT INTO files (
        inode, is_active
      ) VALUES (?, 1)
    `;

    const params = [
      metadata.inode || null
    ];

    return { sql, params };
  }

  /**
   * Build update query for file
   */
  static buildFileUpdate(fileId: number, metadata: Partial<FileEventMetadata>): {
    sql: string;
    params: any[];
  } {
    const updates: string[] = [];
    const params: any[] = [];

    if (metadata.file_size !== undefined) {
      updates.push('file_size = ?');
      params.push(metadata.file_size);
    }

    if (metadata.inode !== undefined) {
      updates.push('inode = ?');
      params.push(metadata.inode);
    }

    if (metadata.line_count !== undefined) {
      updates.push('line_count = ?');
      params.push(metadata.line_count);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(fileId);
    const sql = `UPDATE files SET ${updates.join(', ')} WHERE id = ?`;

    return { sql, params };
  }

  /**
   * Build find file by path query
   */
  static buildFindByPath(path: string): {
    sql: string;
    params: any[];
  } {
    const sql = `
      SELECT DISTINCT
        f.*,
        (SELECT MAX(e.timestamp) FROM events e WHERE e.file_id = f.id) as last_event_timestamp
      FROM files f 
      JOIN events e ON f.id = e.file_id
      WHERE e.file_path = ?
      ORDER BY e.timestamp DESC
      LIMIT 1
    `;
    return { sql, params: [path] };
  }

  /**
   * Build active files query
   */
  static buildActiveFilesQuery(): {
    sql: string;
    params: any[];
  } {
    const sql = `
      SELECT f.id, f.file_path, f.inode
      FROM files f 
      WHERE f.is_active = 1
    `;
    return { sql, params: [] };
  }

  /**
   * Build event statistics query
   */
  static buildEventStatsQuery(startTime?: number, endTime?: number): {
    sql: string;
    params: any[];
  } {
    let sql = `
      SELECT 
        event_type,
        COUNT(*) as count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM events
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (startTime !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }

    if (endTime !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY event_type';

    return { sql, params };
  }

  /**
   * Build recent events query
   */
  static buildRecentEventsQuery(limit: number = 10): {
    sql: string;
    params: any[];
  } {
    const sql = `
      SELECT 
        e.*,
        e.file_path,
        e.file_name,
        e.directory,
        f.inode,
        f.is_active,
        et.code as event_type,
        m.file_size,
        m.line_count,
        m.block_count
      FROM events e
      JOIN files f ON e.file_id = f.id
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ?
    `;
    return { sql, params: [limit] };
  }

  /**
   * Build aggregates query
   */
  static buildAggregatesQuery(): {
    sql: string;
    params: any[];
  } {
    const sql = `
      SELECT 
        a.type,
        a.value,
        a.updated_at
      FROM aggregates a
      ORDER BY a.type
    `;
    return { sql, params: [] };
  }

  /**
   * Build update aggregate query
   */
  static buildUpdateAggregate(type: string, value: string | number): {
    sql: string;
    params: any[];
  } {
    const sql = `
      INSERT OR REPLACE INTO aggregates (type, value, updated_at)
      VALUES (?, ?, ?)
    `;
    return { sql, params: [type, value.toString(), Date.now()] };
  }

  /**
   * Build delete inactive files query
   */
  static buildDeleteInactiveFiles(beforeTimestamp: number): {
    sql: string;
    params: any[];
  } {
    const sql = `
      DELETE FROM files
      WHERE is_active = 0
      AND id IN (
        SELECT f.id
        FROM files f
        LEFT JOIN events e ON f.id = e.file_id
        GROUP BY f.id
        HAVING MAX(e.timestamp) < ? OR MAX(e.timestamp) IS NULL
      )
    `;
    return { sql, params: [beforeTimestamp] };
  }

  /**
   * Build vacuum query
   */
  static buildVacuumQuery(): {
    sql: string;
    params: any[];
  } {
    return { sql: 'VACUUM', params: [] };
  }

  /**
   * Build integrity check query
   */
  static buildIntegrityCheckQuery(): {
    sql: string;
    params: any[];
  } {
    return { sql: 'PRAGMA integrity_check', params: [] };
  }

  /**
   * Escape string for LIKE queries
   */
  static escapeLike(str: string): string {
    return str.replace(/[_%\\]/g, '\\$&');
  }

  /**
   * Build search files query
   */
  static buildSearchFilesQuery(pattern: string, isActive?: boolean): {
    sql: string;
    params: any[];
  } {
    const escapedPattern = this.escapeLike(pattern);
    let sql = `
      SELECT f.*
      FROM files f
      WHERE f.file_path LIKE ? ESCAPE '\\'
    `;

    const params: any[] = [`%${escapedPattern}%`];

    if (isActive !== undefined) {
      sql += ' AND f.is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    sql += ' ORDER BY f.file_path';

    return { sql, params };
  }
}
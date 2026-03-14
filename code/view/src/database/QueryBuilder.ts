/**
 * Query Builder
 * Provides common SQL fragments for event queries
 */

const EVENT_SELECT_COLUMNS = `
  e.id,
  e.timestamp,
  e.file_name as filename,
  e.directory,
  et.name as event_type,
  COALESCE(m.file_size, 0) as size,
  m.line_count as lines,
  m.block_count as blocks,
  COALESCE(m.inode, 0) as inode,
  0 as elapsed_ms`;

const EVENT_JOINS = `
  JOIN event_types et ON e.event_type_id = et.id
  LEFT JOIN measurements m ON e.id = m.event_id`;

export class QueryBuilder {
  static selectColumns(alias: string = 'e'): string {
    return EVENT_SELECT_COLUMNS.replace(/\be\./g, `${alias}.`);
  }

  static joins(alias: string = 'e'): string {
    return EVENT_JOINS.replace(/\be\./g, `${alias}.`).replace(/\be\.id/g, `${alias}.id`);
  }

  static uniqueCTE(whereClause: string = ''): string {
    return `WITH latest_events AS (
      SELECT
        e.*,
        ROW_NUMBER() OVER (PARTITION BY e.file_name, e.directory ORDER BY e.timestamp DESC) as rn
      FROM events e
      ${whereClause}
    )`;
  }

  static filterCondition(filters?: string[]): string {
    if (!filters || filters.length === 0 || filters.length >= 6) {
      return '';
    }
    const filterConditions = filters.map(f => `'${f}'`).join(',');
    return `et.name IN (${filterConditions})`;
  }
}

/**
 * Database Trigger Management
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import sqlite3 from 'sqlite3';

interface AggregateSelectOptions {
  useCoalesce: boolean;
  fileIdExpression: string;
}

export class TriggerManager {
  constructor(private db: sqlite3.Database) {}

  async createTriggers(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dropTriggersSQL = `
        DROP TRIGGER IF EXISTS trigger_update_aggregates_on_event;
        DROP TRIGGER IF EXISTS trigger_maintain_files_and_aggregates;
        DROP TRIGGER IF EXISTS trigger_maintain_aggregates;
        DROP TRIGGER IF EXISTS trigger_maintain_aggregates_on_measurement;
        DROP TRIGGER IF EXISTS trigger_maintain_aggregates_on_event;
      `;

      this.db.exec(dropTriggersSQL, (err) => {
        if (err) {
          process.stderr.write(`TriggerManager: drop triggers error: ${err}\n`);
        }

        const measurementSelect = this.buildAggregateInsertSelect({
          useCoalesce: false,
          fileIdExpression: '(SELECT file_id FROM events WHERE id = NEW.event_id)',
        });

        const eventSelect = this.buildAggregateInsertSelect({
          useCoalesce: true,
          fileIdExpression: 'NEW.file_id',
        });

        const createTriggerSQL = `
          CREATE TRIGGER trigger_maintain_aggregates_on_measurement
          AFTER INSERT ON measurements
          FOR EACH ROW
          BEGIN
            DELETE FROM aggregates WHERE file_id = (SELECT file_id FROM events WHERE id = NEW.event_id);
            ${measurementSelect}
          END;

          CREATE TRIGGER trigger_maintain_aggregates_on_event
          AFTER INSERT ON events
          FOR EACH ROW
          WHEN NEW.event_type_id IN (4, 5)
          BEGIN
            DELETE FROM aggregates WHERE file_id = NEW.file_id;
            ${eventSelect}
          END;
        `;

        this.db.exec(createTriggerSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async recreateTriggers(): Promise<void> {
    return this.createTriggers();
  }

  private buildAggregateInsertSelect(options: AggregateSelectOptions): string {
    const { useCoalesce, fileIdExpression } = options;

    const wrapCoalesce = (expr: string): string =>
      useCoalesce ? `COALESCE(${expr}, 0)` : expr;

    return `
      INSERT INTO aggregates (
        file_id,
        period_start,
        total_size, total_lines, total_blocks,
        total_events, total_creates, total_modifies,
        total_deletes, total_moves, total_restores,
        first_event_timestamp, last_event_timestamp,
        first_size, max_size, last_size,
        first_lines, max_lines, last_lines,
        first_blocks, max_blocks, last_blocks
      )
      SELECT
        e.file_id,
        strftime('%s', date('now', 'start of day')) as period_start,

        COALESCE(SUM(m.file_size), 0) as total_size,
        COALESCE(SUM(m.line_count), 0) as total_lines,
        COALESCE(SUM(m.block_count), 0) as total_blocks,

        COUNT(DISTINCT e.id) as total_events,
        SUM(CASE WHEN et.code = 'create' THEN 1 ELSE 0 END) as total_creates,
        SUM(CASE WHEN et.code = 'modify' THEN 1 ELSE 0 END) as total_modifies,
        SUM(CASE WHEN et.code = 'delete' THEN 1 ELSE 0 END) as total_deletes,
        SUM(CASE WHEN et.code = 'move' THEN 1 ELSE 0 END) as total_moves,
        SUM(CASE WHEN et.code = 'restore' THEN 1 ELSE 0 END) as total_restores,

        MIN(e.timestamp) as first_event_timestamp,
        MAX(e.timestamp) as last_event_timestamp,

        ${wrapCoalesce(`(SELECT m2.file_size FROM measurements m2
         JOIN events e2 ON m2.event_id = e2.id
         WHERE e2.file_id = e.file_id
         ORDER BY e2.timestamp ASC LIMIT 1)`)} as first_size,
        ${wrapCoalesce('MAX(m.file_size)')} as max_size,
        ${wrapCoalesce(`(SELECT m2.file_size FROM measurements m2
         JOIN events e2 ON m2.event_id = e2.id
         WHERE e2.file_id = e.file_id
         ORDER BY e2.timestamp DESC LIMIT 1)`)} as last_size,

        ${wrapCoalesce(`(SELECT m2.line_count FROM measurements m2
         JOIN events e2 ON m2.event_id = e2.id
         WHERE e2.file_id = e.file_id
         ORDER BY e2.timestamp ASC LIMIT 1)`)} as first_lines,
        ${wrapCoalesce('MAX(m.line_count)')} as max_lines,
        ${wrapCoalesce(`(SELECT m2.line_count FROM measurements m2
         JOIN events e2 ON m2.event_id = e2.id
         WHERE e2.file_id = e.file_id
         ORDER BY e2.timestamp DESC LIMIT 1)`)} as last_lines,

        ${wrapCoalesce(`(SELECT m2.block_count FROM measurements m2
         JOIN events e2 ON m2.event_id = e2.id
         WHERE e2.file_id = e.file_id
         ORDER BY e2.timestamp ASC LIMIT 1)`)} as first_blocks,
        ${wrapCoalesce('MAX(m.block_count)')} as max_blocks,
        ${wrapCoalesce(`(SELECT m2.block_count FROM measurements m2
         JOIN events e2 ON m2.event_id = e2.id
         WHERE e2.file_id = e.file_id
         ORDER BY e2.timestamp DESC LIMIT 1)`)} as last_blocks

      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      WHERE e.file_id = ${fileIdExpression}
      GROUP BY e.file_id;`;
  }
}

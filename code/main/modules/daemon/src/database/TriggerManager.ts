/**
 * Database Trigger Management
 */

import sqlite3 from 'sqlite3';

export class TriggerManager {
  constructor(private db: sqlite3.Database) {}

  async createTriggers(): Promise<void> {
    return new Promise((resolve, reject) => {
      // First drop all existing triggers
      const dropTriggersSQL = `
        DROP TRIGGER IF EXISTS trigger_update_aggregates_on_event;
        DROP TRIGGER IF EXISTS trigger_maintain_files_and_aggregates;
        DROP TRIGGER IF EXISTS trigger_maintain_aggregates;
        DROP TRIGGER IF EXISTS trigger_maintain_aggregates_on_measurement;
        DROP TRIGGER IF EXISTS trigger_maintain_aggregates_on_event;
      `;

      this.db.exec(dropTriggersSQL, (err) => {
        if (err) {
        }

        // Create new triggers for aggregate table maintenance
        const createTriggerSQL = `
          -- Trigger on measurements table for events with measurements
          CREATE TRIGGER trigger_maintain_aggregates_on_measurement
          AFTER INSERT ON measurements
          FOR EACH ROW
          BEGIN
            -- Delete existing aggregate for this file
            DELETE FROM aggregates WHERE file_id = (SELECT file_id FROM events WHERE id = NEW.event_id);
            
            -- Insert new aggregate with complete recalculation
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
              
              -- Cumulative totals
              COALESCE(SUM(m.file_size), 0) as total_size,
              COALESCE(SUM(m.line_count), 0) as total_lines,
              COALESCE(SUM(m.block_count), 0) as total_blocks,
              
              -- Event counts
              COUNT(DISTINCT e.id) as total_events,
              SUM(CASE WHEN et.code = 'create' THEN 1 ELSE 0 END) as total_creates,
              SUM(CASE WHEN et.code = 'modify' THEN 1 ELSE 0 END) as total_modifies,
              SUM(CASE WHEN et.code = 'delete' THEN 1 ELSE 0 END) as total_deletes,
              SUM(CASE WHEN et.code = 'move' THEN 1 ELSE 0 END) as total_moves,
              SUM(CASE WHEN et.code = 'restore' THEN 1 ELSE 0 END) as total_restores,
              
              -- Timestamps
              MIN(e.timestamp) as first_event_timestamp,
              MAX(e.timestamp) as last_event_timestamp,
              
              -- First values - from earliest event with measurement
              (SELECT m2.file_size FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp ASC LIMIT 1) as first_size,
              
              -- Max values - maximum across all measurements
              MAX(m.file_size) as max_size,
              
              -- Last values - from latest event with measurement
              (SELECT m2.file_size FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp DESC LIMIT 1) as last_size,
              
              -- Same pattern for lines
              (SELECT m2.line_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp ASC LIMIT 1) as first_lines,
              MAX(m.line_count) as max_lines,
              (SELECT m2.line_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp DESC LIMIT 1) as last_lines,
              
              -- Same pattern for blocks
              (SELECT m2.block_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp ASC LIMIT 1) as first_blocks,
              MAX(m.block_count) as max_blocks,
              (SELECT m2.block_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp DESC LIMIT 1) as last_blocks
              
            FROM events e
            JOIN event_types et ON e.event_type_id = et.id
            LEFT JOIN measurements m ON e.id = m.event_id
            WHERE e.file_id = (SELECT file_id FROM events WHERE id = NEW.event_id)
            GROUP BY e.file_id;
          END;
          
          -- Trigger on events table for delete/move events (no measurements)
          CREATE TRIGGER trigger_maintain_aggregates_on_event
          AFTER INSERT ON events
          FOR EACH ROW
          WHEN NEW.event_type_id IN (4, 5) -- delete=4, move=5
          BEGIN
            -- Delete existing aggregate for this file
            DELETE FROM aggregates WHERE file_id = NEW.file_id;
            
            -- Insert new aggregate with complete recalculation
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
              
              -- Cumulative totals
              COALESCE(SUM(m.file_size), 0) as total_size,
              COALESCE(SUM(m.line_count), 0) as total_lines,
              COALESCE(SUM(m.block_count), 0) as total_blocks,
              
              -- Event counts
              COUNT(DISTINCT e.id) as total_events,
              SUM(CASE WHEN et.code = 'create' THEN 1 ELSE 0 END) as total_creates,
              SUM(CASE WHEN et.code = 'modify' THEN 1 ELSE 0 END) as total_modifies,
              SUM(CASE WHEN et.code = 'delete' THEN 1 ELSE 0 END) as total_deletes,
              SUM(CASE WHEN et.code = 'move' THEN 1 ELSE 0 END) as total_moves,
              SUM(CASE WHEN et.code = 'restore' THEN 1 ELSE 0 END) as total_restores,
              
              -- Timestamps
              MIN(e.timestamp) as first_event_timestamp,
              MAX(e.timestamp) as last_event_timestamp,
              
              -- Size values - COALESCE to handle no measurements case
              COALESCE((SELECT m2.file_size FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp ASC LIMIT 1), 0) as first_size,
              COALESCE(MAX(m.file_size), 0) as max_size,
              COALESCE((SELECT m2.file_size FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp DESC LIMIT 1), 0) as last_size,
              
              -- Line values
              COALESCE((SELECT m2.line_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp ASC LIMIT 1), 0) as first_lines,
              COALESCE(MAX(m.line_count), 0) as max_lines,
              COALESCE((SELECT m2.line_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp DESC LIMIT 1), 0) as last_lines,
              
              -- Block values
              COALESCE((SELECT m2.block_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp ASC LIMIT 1), 0) as first_blocks,
              COALESCE(MAX(m.block_count), 0) as max_blocks,
              COALESCE((SELECT m2.block_count FROM measurements m2 
               JOIN events e2 ON m2.event_id = e2.id 
               WHERE e2.file_id = e.file_id 
               ORDER BY e2.timestamp DESC LIMIT 1), 0) as last_blocks
              
            FROM events e
            JOIN event_types et ON e.event_type_id = et.id
            LEFT JOIN measurements m ON e.id = m.event_id
            WHERE e.file_id = NEW.file_id
            GROUP BY e.file_id;
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
}
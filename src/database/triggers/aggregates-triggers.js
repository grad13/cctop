/**
 * Aggregates Table Triggers (HO-20250627-003)
 * Auto-update aggregates statistics on events/measurements INSERT
 */

const aggregatesTriggers = {
  // Events INSERT trigger
  updateAggregatesOnEvent: `
    CREATE TRIGGER IF NOT EXISTS update_aggregates_on_event
    AFTER INSERT ON events
    FOR EACH ROW
    BEGIN
      -- Create aggregates record if not exists
      INSERT OR IGNORE INTO aggregates (file_id) VALUES (NEW.file_id);
      
      -- Update basic statistics
      UPDATE aggregates SET
        total_events = total_events + 1,
        total_creates = total_creates + CASE WHEN NEW.event_type_id = 2 THEN 1 ELSE 0 END,
        total_modifies = total_modifies + CASE WHEN NEW.event_type_id = 3 THEN 1 ELSE 0 END,
        total_deletes = total_deletes + CASE WHEN NEW.event_type_id = 4 THEN 1 ELSE 0 END,
        total_moves = total_moves + CASE WHEN NEW.event_type_id = 5 THEN 1 ELSE 0 END,
        total_restores = total_restores + CASE WHEN NEW.event_type_id = 6 THEN 1 ELSE 0 END,
        
        -- Update time series statistics
        first_event_timestamp = COALESCE(first_event_timestamp, NEW.timestamp),
        last_event_timestamp = NEW.timestamp,
        
        last_updated = CURRENT_TIMESTAMP
      WHERE file_id = NEW.file_id;
    END;
  `,

  // Measurements INSERT trigger
  updateAggregatesOnMeasurement: `
    CREATE TRIGGER IF NOT EXISTS update_aggregates_on_measurement
    AFTER INSERT ON measurements
    FOR EACH ROW
    BEGIN
      UPDATE aggregates SET
        -- Update cumulative statistics
        total_size = total_size + COALESCE(NEW.file_size, 0),
        total_lines = total_lines + COALESCE(NEW.line_count, 0),
        total_blocks = total_blocks + COALESCE(NEW.block_count, 0),
        
        -- Update First values (only if NULL)
        first_size = COALESCE(first_size, NEW.file_size),
        first_lines = COALESCE(first_lines, NEW.line_count),
        first_blocks = COALESCE(first_blocks, NEW.block_count),
        
        -- Update Max values
        max_size = MAX(COALESCE(max_size, 0), COALESCE(NEW.file_size, 0)),
        max_lines = MAX(COALESCE(max_lines, 0), COALESCE(NEW.line_count, 0)),
        max_blocks = MAX(COALESCE(max_blocks, 0), COALESCE(NEW.block_count, 0)),
        
        -- Update Last values
        last_size = NEW.file_size,
        last_lines = NEW.line_count,
        last_blocks = NEW.block_count,
        
        last_updated = CURRENT_TIMESTAMP
      WHERE file_id = (SELECT file_id FROM events WHERE id = NEW.event_id);
    END;
  `,

  // DROP triggers (for cleanup/reset)
  dropTriggers: [
    'DROP TRIGGER IF EXISTS update_aggregates_on_event',
    'DROP TRIGGER IF EXISTS update_aggregates_on_measurement'
  ]
};

module.exports = aggregatesTriggers;
/**
 * Database Schema (FUNC-000 v0.2.0.0準拠)
 * 5テーブル構成でファイルライフサイクル完全追跡
 */

const schema = {
  tables: {
    // 1. Event types definition table
    event_types: `
    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    )`,
  
  // 2. Events history table
  events: `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      directory TEXT NOT NULL,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
    )`,
  
  // 3. Files current state table (FUNC-000 compliant: simplified structure)
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inode INTEGER,
      is_active BOOLEAN DEFAULT TRUE
    )`,
    
  // 4. Measurements history table
  measurements: `
    CREATE TABLE IF NOT EXISTS measurements (
      event_id INTEGER PRIMARY KEY,
      file_size INTEGER,
      line_count INTEGER,
      block_count INTEGER,
      inode INTEGER,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    
  // 5. Aggregates table (FUNC-000 compliant structure + HO-003 extensions)
  aggregates: `
    CREATE TABLE IF NOT EXISTS aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      period_start INTEGER,
      
      -- Cumulative statistics
      total_size INTEGER DEFAULT 0,
      total_lines INTEGER DEFAULT 0,
      total_blocks INTEGER DEFAULT 0,
      
      -- Event counts
      total_events INTEGER DEFAULT 0,
      total_creates INTEGER DEFAULT 0,
      total_modifies INTEGER DEFAULT 0,
      total_deletes INTEGER DEFAULT 0,
      total_moves INTEGER DEFAULT 0,
      total_restores INTEGER DEFAULT 0,
      
      -- HO-003: Time series statistics
      first_event_timestamp INTEGER,
      last_event_timestamp INTEGER,
      
      -- HO-003: Size metrics (First/Max/Last)
      first_size INTEGER,
      max_size INTEGER,
      last_size INTEGER,
      
      -- HO-003: Lines metrics (First/Max/Last)
      first_lines INTEGER,
      max_lines INTEGER,
      last_lines INTEGER,
      
      -- HO-003: Blocks metrics (First/Max/Last)
      first_blocks INTEGER,
      max_blocks INTEGER,
      last_blocks INTEGER,
      
      -- Metadata
      last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
      calculation_method TEXT DEFAULT 'trigger',
      
      FOREIGN KEY (file_id) REFERENCES files(id)
    )`
  },

  // Index definitions
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_events_file_path ON events(file_path)',
    'CREATE INDEX IF NOT EXISTS idx_events_file_id ON events(file_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_file_timestamp ON events(file_id, timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_events_event_type_id ON events(event_type_id)',
    'CREATE INDEX IF NOT EXISTS idx_measurements_event_id ON measurements(event_id)',
    'CREATE INDEX IF NOT EXISTS idx_files_inode ON files(inode)',
    'CREATE INDEX IF NOT EXISTS idx_aggregates_file_id ON aggregates(file_id)'
  ],

  // HO-003: Triggers for automatic aggregates updates
  triggers: [
    `CREATE TRIGGER IF NOT EXISTS update_aggregates_on_event
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
    END`,

    `CREATE TRIGGER IF NOT EXISTS update_aggregates_on_measurement
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
    END`
  ]
};

// Initial data (FUNC-000 compliant: 6 event types)
const initialData = {
  event_types: [
    { code: 'find', name: 'Find', description: 'Initial file discovery' },
    { code: 'create', name: 'Create', description: 'File creation' },
    { code: 'modify', name: 'Modify', description: 'File modification' },
    { code: 'delete', name: 'Delete', description: 'File deletion' },
    { code: 'move', name: 'Move', description: 'File move/rename' },
    { code: 'restore', name: 'Restore', description: 'File restoration after deletion' }
  ]
};

// v0.1.x to v0.2.0 migration information
const migration = {
  version: '0.2.0',
  tables: {
    // Old table name -> New table name mapping
    'object_fingerprint': 'files',
    'object_statistics': 'aggregates'
  },
  // Migration logic implementation in database-manager.js
};

export = { schema, initialData, migration };
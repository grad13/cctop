/**
 * Database Schema (FUNC-000 v0.2.0.0準拠)
 * 5テーブル構成でファイルライフサイクル完全追跡
 */

const schema = {
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
    
  // 5. Aggregates table (FUNC-000 compliant structure)
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
      
      -- Metadata
      last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
      calculation_method TEXT DEFAULT 'trigger',
      
      FOREIGN KEY (file_id) REFERENCES files(id)
    )`,

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

module.exports = { schema, initialData, migration };
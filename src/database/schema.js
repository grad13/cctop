/**
 * Database Schema (db001準拠)
 * PLAN-20250624-001に記載されたスキーマ定義
 */

const schema = {
  event_types: `
    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    )`,
  
  object_fingerprint: `
    CREATE TABLE IF NOT EXISTS object_fingerprint (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inode INTEGER UNIQUE
    )`,
  
  events: `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type_id INTEGER NOT NULL,
      object_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      directory TEXT NOT NULL,
      previous_event_id INTEGER,
      source_path TEXT,
      file_size INTEGER,
      line_count INTEGER,
      block_count INTEGER,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id),
      FOREIGN KEY (previous_event_id) REFERENCES events(id),
      FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
    )`,
    
  object_statistics: `
    CREATE TABLE IF NOT EXISTS object_statistics (
      object_id INTEGER PRIMARY KEY,
      current_file_size INTEGER DEFAULT 0,
      current_line_count INTEGER DEFAULT 0,
      current_block_count INTEGER DEFAULT 0,
      total_events INTEGER DEFAULT 0,
      total_modifications INTEGER DEFAULT 0,
      total_line_count INTEGER DEFAULT 0,
      total_block_count INTEGER DEFAULT 0,
      total_line_changes INTEGER DEFAULT 0,
      total_block_changes INTEGER DEFAULT 0,
      create_events INTEGER DEFAULT 0,
      modify_events INTEGER DEFAULT 0,
      move_events INTEGER DEFAULT 0,
      last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
      calculation_method TEXT DEFAULT 'trigger',
      FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
    )`
};

// 初期データ
const initialData = {
  event_types: [
    { code: 'find', name: 'Find', description: 'Initial file discovery' },
    { code: 'create', name: 'Create', description: 'File creation' },
    { code: 'modify', name: 'Modify', description: 'File modification' },
    { code: 'delete', name: 'Delete', description: 'File deletion' },
    { code: 'move', name: 'Move', description: 'File move/rename' }
  ]
};

module.exports = { schema, initialData };
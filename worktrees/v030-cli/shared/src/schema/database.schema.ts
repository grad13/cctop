/**
 * SQLite database schema definitions
 */

export const DATABASE_VERSION = 1;

export const SCHEMA_SQL = `
-- Activity events table
CREATE TABLE IF NOT EXISTS activity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL CHECK(event_type IN ('find', 'create', 'modify', 'move', 'delete', 'restore')),
  file_path TEXT NOT NULL,
  directory TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  line_count INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  inode INTEGER NOT NULL DEFAULT 0,
  old_path TEXT,
  error TEXT,
  UNIQUE(timestamp, file_path, event_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timestamp ON activity_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_type ON activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_file_path ON activity_events(file_path);
CREATE INDEX IF NOT EXISTS idx_directory ON activity_events(directory);

-- Metadata table
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize metadata
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '${DATABASE_VERSION}');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('created_at', CURRENT_TIMESTAMP);
`;

export const PRAGMA_SETTINGS = [
  'PRAGMA journal_mode=WAL',
  'PRAGMA busy_timeout=5000',
  'PRAGMA synchronous=NORMAL',
  'PRAGMA cache_size=10000',
  'PRAGMA temp_store=MEMORY'
];
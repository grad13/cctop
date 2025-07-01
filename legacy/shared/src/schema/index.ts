// Database schema definitions for cctop

export const SCHEMA_VERSION = '1.0.0';

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS file_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('find', 'create', 'modify', 'delete', 'move')),
    project_path TEXT NOT NULL,
    full_path TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    is_directory BOOLEAN NOT NULL,
    size INTEGER NOT NULL,
    line_count INTEGER,
    extension TEXT,
    depth INTEGER NOT NULL,
    inode INTEGER,
    parent_dir TEXT,
    old_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_timestamp ON file_events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_event_type ON file_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_relative_path ON file_events(relative_path);
  CREATE INDEX IF NOT EXISTS idx_extension ON file_events(extension);
  CREATE INDEX IF NOT EXISTS idx_project_path ON file_events(project_path);
`;

export const ENABLE_WAL_MODE_SQL = `
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  PRAGMA cache_size=10000;
  PRAGMA temp_store=MEMORY;
`;

export const QUERIES = {
  INSERT_EVENT: `
    INSERT INTO file_events (
      timestamp, event_type, project_path, full_path, relative_path,
      is_directory, size, line_count, extension, depth, inode, parent_dir, old_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  
  GET_RECENT_EVENTS: `
    SELECT * FROM file_events 
    ORDER BY timestamp DESC 
    LIMIT ?
  `,
  
  GET_PROJECT_STATS: `
    SELECT 
      COUNT(DISTINCT CASE WHEN is_directory = 0 THEN relative_path END) as total_files,
      COUNT(DISTINCT CASE WHEN is_directory = 1 THEN relative_path END) as total_directories,
      SUM(CASE WHEN is_directory = 0 THEN size ELSE 0 END) as total_size
    FROM (
      SELECT DISTINCT ON (relative_path) * 
      FROM file_events 
      WHERE project_path = ?
      ORDER BY relative_path, timestamp DESC
    )
  `,

  DELETE_OLD_EVENTS: `
    DELETE FROM file_events 
    WHERE timestamp < datetime('now', '-30 days')
  `
};
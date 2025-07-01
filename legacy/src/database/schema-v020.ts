/**
 * Database Schema v0.2.0.0 (FUNC-000準拠)
 * 5テーブル構成: events, event_types, files, measurements, aggregates
 */

interface EventTypeData {
  code: string;
  name: string;
  description: string;
}

interface SchemaDefinitions {
  event_types: string;
  files: string;
  events: string;
  measurements: string;
  aggregates: string;
}

interface InitialData {
  event_types: EventTypeData[];
}

interface SchemaV020 {
  schemaV020: SchemaDefinitions;
  indicesV020: string[];
  initialDataV020: InitialData;
}

const schemaV020: SchemaDefinitions = {
  // イベントタイプマスタ
  event_types: `
    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    )`,
  
  // ファイル管理（inode再利用対応）
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inode INTEGER,
      is_active BOOLEAN DEFAULT TRUE
    )`,
  
  // イベント履歴
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
    
  // 測定値（イベント時点のメタデータ）
  measurements: `
    CREATE TABLE IF NOT EXISTS measurements (
      event_id INTEGER PRIMARY KEY,
      inode INTEGER,
      file_size INTEGER,
      line_count INTEGER,
      block_count INTEGER,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    
  // 集計値
  aggregates: `
    CREATE TABLE IF NOT EXISTS aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      period_start INTEGER,
      total_size INTEGER DEFAULT 0,
      total_lines INTEGER DEFAULT 0,
      total_blocks INTEGER DEFAULT 0,
      total_events INTEGER DEFAULT 0,
      total_creates INTEGER DEFAULT 0,
      total_modifies INTEGER DEFAULT 0,
      total_deletes INTEGER DEFAULT 0,
      total_moves INTEGER DEFAULT 0,
      total_restores INTEGER DEFAULT 0,
      last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
      calculation_method TEXT DEFAULT 'trigger',
      FOREIGN KEY (file_id) REFERENCES files(id)
    )`
};

// インデックス定義
const indicesV020: string[] = [
  'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_events_file_path ON events(file_path)',
  'CREATE INDEX IF NOT EXISTS idx_events_file_id ON events(file_id)',
  'CREATE INDEX IF NOT EXISTS idx_events_file_timestamp ON events(file_id, timestamp)'
];

// 初期データ（6イベントタイプ）
const initialDataV020: InitialData = {
  event_types: [
    { code: 'find', name: 'Find', description: 'Initial file discovery' },
    { code: 'create', name: 'Create', description: 'File creation' },
    { code: 'modify', name: 'Modify', description: 'File modification' },
    { code: 'delete', name: 'Delete', description: 'File deletion' },
    { code: 'move', name: 'Move', description: 'File move/rename' },
    { code: 'restore', name: 'Restore', description: 'File restoration after deletion' }
  ]
};

const schemaV020Export: SchemaV020 = { schemaV020, indicesV020, initialDataV020 };

export = schemaV020Export;
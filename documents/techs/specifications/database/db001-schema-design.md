# Database Schema Design (cctop v2)

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**対象**: cctop データベーススキーマ

## 📊 5テーブル構成（MVP用シンプル設計）

**Phase 1（MVP）**: 
1. **event_types**: イベントタイプマスター（6種類）
2. **object_fingerprint**: オブジェクト指紋（hash+inode、最小設計）
3. **events**: メインイベントテーブル（chokidar統合）
4. **object_statistics**: オブジェクト統計（リアルタイム更新）

**🔄 Next Phase（将来拡張）**:
- **period_types**: 期間タイプマスター
- **object_statistics_by_period**: 期間別統計（セッション非連続性対応）

### 1. event_types（イベントタイプマスター）

```sql
CREATE TABLE event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);
```

**初期データ**（IDはAUTOINCREMENTで自動採番）:
| Code | Name | Description |
|------|------|-------------|
| find | Initial Discovery | Found during initial scan |
| create | File Created | New file creation |
| modify | File Modified | File content changed |
| move | Directory Moved | Directory relocation |
| rename | File Renamed | File name changed |
| delete | File Deleted | File deletion |


### 2. object_fingerprint（オブジェクト指紋テーブル）

```sql
CREATE TABLE object_fingerprint (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inode INTEGER UNIQUE
);
```

### 3. events（メインイベントテーブル）

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,              -- chokidarのstats.mtimeから取得
  event_type_id INTEGER NOT NULL,
  
  object_id INTEGER NOT NULL,
  
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  directory TEXT NOT NULL,
  
  previous_event_id INTEGER,
  source_path TEXT,
  
  -- ファイル状態（その瞬間の値）
  file_size INTEGER,
  line_count INTEGER,
  block_count INTEGER,
    
  FOREIGN KEY (event_type_id) REFERENCES event_types(id),
  FOREIGN KEY (previous_event_id) REFERENCES events(id),
  FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
);
```

### 4. object_statistics（オブジェクト統計テーブル）

```sql
CREATE TABLE object_statistics (
  object_id INTEGER PRIMARY KEY,           -- 1 Object = 1統計レコード
  
  -- 現在の状態値
  current_file_size INTEGER DEFAULT 0,
  current_line_count INTEGER DEFAULT 0,
  current_block_count INTEGER DEFAULT 0,
  
  -- 累積統計（全期間）
  total_events INTEGER DEFAULT 0,
  total_modifications INTEGER DEFAULT 0,
  total_line_count INTEGER DEFAULT 0,      -- 現在の総行数
  total_block_count INTEGER DEFAULT 0,     -- 現在の総ブロック数
  total_line_changes INTEGER DEFAULT 0,    -- 累積行数変化（絶対値の合計）
  total_block_changes INTEGER DEFAULT 0,   -- 累積ブロック数変化（絶対値の合計）
  
  -- イベント種別カウント
  create_events INTEGER DEFAULT 0,
  modify_events INTEGER DEFAULT 0,
  move_events INTEGER DEFAULT 0,
  
  -- メタデータ
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  calculation_method TEXT DEFAULT 'trigger',
  
  FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
);
```

## 🔧 設計原則

### 完全正規化による利点
1. **データ整合性**: Single Source of Truth
2. **責務分離**: 各テーブルが明確な役割
3. **スケーラビリティ**: 将来拡張が容易
4. **メンテナンス性**: 変更影響範囲が限定的

### パフォーマンス最適化
1. **キャッシュテーブル**: 高頻度アクセス用
2. **プリコンピューテッド統計**: リアルタイム更新
3. **適切なインデックス**: クエリ最適化
4. **AUTOINCREMENT統一**: JOIN効率向上

### inode管理の設計方針
- **UNIQUE制約**: 同一inodeは同一オブジェクトとして管理
- **理由**: ファイルの同一性追跡を保証
- **注意**: inode再利用は極めて稀であり、実用上問題なし

---

*関連文書*:
- `triggers-and-indexes.md`: トリガーとインデックス定義
- `queries-and-views.md`: 主要クエリパターン
- `implementation-guide.md`: 実装ガイド
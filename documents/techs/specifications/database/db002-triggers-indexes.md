# Database Triggers and Indexes

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**対象**: トリガーとインデックス定義

## 📈 インデックス戦略

### events テーブル
```sql
CREATE INDEX idx_events_id ON events(id DESC);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_file_path ON events(file_path);
CREATE INDEX idx_events_previous ON events(previous_event_id);
CREATE INDEX idx_events_type_id ON events(event_type_id);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_object_id ON events(object_id);
CREATE INDEX idx_events_object_id_desc ON events(object_id, id DESC);
CREATE INDEX idx_events_file_size ON events(file_size);
CREATE INDEX idx_events_line_count ON events(line_count);
CREATE INDEX idx_events_block_count ON events(block_count);
CREATE INDEX idx_events_line_delta ON events(line_count_delta);
CREATE INDEX idx_events_block_delta ON events(block_count_delta);
```

### object_statistics テーブル
```sql
CREATE INDEX idx_stats_total_events ON object_statistics(total_events DESC);
CREATE INDEX idx_stats_total_modifications ON object_statistics(total_modifications DESC);
CREATE INDEX idx_stats_total_line_count ON object_statistics(total_line_count DESC);
CREATE INDEX idx_stats_total_block_count ON object_statistics(total_block_count DESC);
CREATE INDEX idx_stats_total_line_changes ON object_statistics(total_line_changes DESC);
CREATE INDEX idx_stats_total_block_changes ON object_statistics(total_block_changes DESC);
```

### object_statistics_by_period テーブル
```sql
CREATE INDEX idx_period_stats_window_start ON object_statistics_by_period(window_start DESC);
CREATE INDEX idx_period_stats_event_count ON object_statistics_by_period(event_count DESC);
CREATE INDEX idx_period_stats_line_changes ON object_statistics_by_period(line_changes DESC);
CREATE INDEX idx_period_stats_block_changes ON object_statistics_by_period(block_changes DESC);
```

### file_objects_cache テーブル
```sql
CREATE INDEX idx_cache_path ON file_objects_cache(current_file_path);
CREATE INDEX idx_cache_name ON file_objects_cache(current_file_name);
CREATE INDEX idx_cache_last_event ON file_objects_cache(last_event_timestamp DESC);
CREATE INDEX idx_cache_event_type ON file_objects_cache(last_event_type_id);
CREATE INDEX idx_cache_created ON file_objects_cache(created_at DESC);
```

## 🔄 統計更新トリガー

### A. キャッシュテーブル更新トリガー（高速化）
```sql
CREATE TRIGGER tr_update_objects_cache
AFTER INSERT ON events
FOR EACH ROW
WHEN NEW.object_id IS NOT NULL
BEGIN
  -- file_objects_cacheの現在情報を更新
  INSERT OR REPLACE INTO file_objects_cache (
    object_id,
    current_file_path,
    current_file_name,
    current_directory,
    last_event_timestamp,
    last_event_id,
    last_event_type_id
  ) VALUES (
    NEW.object_id,
    NEW.file_path,
    NEW.file_name,
    NEW.directory,
    NEW.timestamp,  -- chokidarのstats.mtimeを使用
    NEW.id,
    NEW.event_type_id
  );
END;
```

### B. 統計更新トリガー（シンプル化版）
```sql
CREATE TRIGGER tr_update_object_statistics 
AFTER INSERT ON events
FOR EACH ROW
WHEN NEW.object_id IS NOT NULL
BEGIN
  -- object_statisticsの累積統計を更新
  INSERT OR REPLACE INTO object_statistics (
    object_id,
    current_file_size,
    current_line_count,
    current_block_count,
    total_events,
    total_modifications,
    total_line_count,
    total_block_count,
    total_line_changes,
    total_block_changes,
    create_events,
    modify_events,
    move_events,
    last_updated
  )
  SELECT
    NEW.object_id,
    NEW.file_size,  -- 最新のファイル状態を保存
    NEW.line_count,
    NEW.block_count,
    COALESCE(existing.total_events, 0) + 1,
    COALESCE(existing.total_modifications, 0) + (CASE WHEN NEW.event_type_id = 3 THEN 1 ELSE 0 END),
    NEW.line_count,     -- 現在の総行数（最新の値）
    NEW.block_count,    -- 現在の総ブロック数（最新の値）
    COALESCE(existing.total_line_changes, 0) + ABS(COALESCE(NEW.line_count_delta, 0)),
    COALESCE(existing.total_block_changes, 0) + ABS(COALESCE(NEW.block_count_delta, 0)),
    COALESCE(existing.create_events, 0) + (CASE WHEN NEW.event_type_id = 2 THEN 1 ELSE 0 END),
    COALESCE(existing.modify_events, 0) + (CASE WHEN NEW.event_type_id = 3 THEN 1 ELSE 0 END),
    COALESCE(existing.move_events, 0) + (CASE WHEN NEW.event_type_id = 4 THEN 1 ELSE 0 END),
    CURRENT_TIMESTAMP
  FROM (
    SELECT * FROM object_statistics WHERE object_id = NEW.object_id
  ) as existing;
END;
```

## 🔍 便利ビュー

### オブジェクト統合ビュー
```sql
CREATE VIEW object_complete_view AS
SELECT 
  fo.id as object_id,
  fo.hash as object_hash,
  foc.created_at,
  
  -- キャッシュテーブルから現在情報
  foc.current_file_name,
  foc.current_file_path,
  foc.current_directory,
  foc.last_event_timestamp,
  foc.last_event_type_id,
  
  -- 統計情報（object_statistics）
  os.total_events,
  os.total_modifications,
  os.total_line_count,
  os.total_block_count,
  os.total_line_changes,
  os.total_block_changes,
  os.last_updated as stats_last_updated
FROM object_fingerprint fo
LEFT JOIN file_objects_cache foc ON fo.id = foc.object_id
LEFT JOIN object_statistics os ON fo.id = os.object_id
ORDER BY os.total_events DESC;
```

### イベント詳細ビュー
```sql
CREATE VIEW events_detailed_view AS
SELECT 
  e.*,
  et.event_type_code,
  et.event_type_name,
  foc.current_file_name as object_current_name,
  CASE 
    WHEN e.source_path IS NOT NULL 
    THEN e.source_path || ' -> ' || e.file_path
    ELSE e.file_path
  END as path_info
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN file_objects_cache foc ON e.object_id = foc.object_id;
```

## ⚡ パフォーマンス特性

### インデックス効果
| 操作 | パフォーマンス | 使用インデックス |
|------|----------------|------------------|
| **最新イベント取得** | 🚀 超高速 | idx_events_timestamp |
| **オブジェクト履歴** | 🚀 高速 | idx_events_object_id_desc |
| **統計ランキング** | 🚀 高速 | idx_stats_total_events |
| **ファイル検索** | 🚀 高速 | idx_events_file_path |
| **期間別統計** | 🚀 高速 | idx_period_stats_window_start |

### トリガー処理負荷
- **キャッシュ更新**: 1-2ms（単純なINSERT OR REPLACE）
- **統計更新**: 2-5ms（集計計算含む）
- **合計オーバーヘッド**: 3-7ms/イベント

---

*関連文書*:
- `schema-design.md`: テーブル定義
- `queries-and-views.md`: 主要クエリパターン
- `implementation-guide.md`: 実装ガイド
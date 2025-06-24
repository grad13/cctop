# Database Queries and Views

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**対象**: 主要クエリパターンとビュー定義

## 🔍 主要クエリパターン

### 1. Object統計ランキング取得

```sql
-- 1時間あたりの更新回数トップ10（高速キャッシュ使用）
SELECT 
  current_file_name,
  current_file_path,
  total_events,
  total_modifications,
  total_line_count,      -- 現在の総行数
  total_block_count,     -- 現在の総ブロック数
  total_line_changes,    -- 累積変化量
  total_block_changes
FROM object_complete_view
WHERE total_events > 0
ORDER BY total_events DESC
LIMIT 10;
```

### 2. Object履歴の完全追跡

```sql
-- 特定Objectの全パス履歴
SELECT DISTINCT
  fe.file_path,
  MIN(fe.timestamp) as first_seen,
  MAX(fe.timestamp) as last_seen,
  COUNT(*) as event_count
FROM events fe
WHERE fe.object_id = ?
GROUP BY fe.file_path
ORDER BY first_seen;
```

### 3. ホットスポット検出

```sql
-- 最近1時間で最も活発なObject（正規化版・キャッシュテーブル使用）
SELECT 
  foc.object_id,
  foc.current_file_name,
  foc.current_file_path,
  COUNT(fe.id) as recent_events,
  SUM(ABS(COALESCE(fe.line_count_delta, 0))) as recent_line_changes
FROM file_objects_cache foc
JOIN events fe ON foc.object_id = fe.object_id
WHERE fe.timestamp >= datetime('now', '-1 hour')
GROUP BY foc.object_id
ORDER BY recent_events DESC, recent_line_changes DESC
LIMIT 5;
```

### 4. 統計ダッシュボード用クエリ

```sql
-- 全体統計サマリー（統合ビューで簡素化）
SELECT 
  COUNT(DISTINCT object_id) as total_objects,
  COUNT(DISTINCT CASE WHEN total_events > 0 THEN object_id END) as active_objects,
  SUM(total_events) as total_events_all_time,
  COUNT(DISTINCT CASE WHEN last_event_timestamp >= datetime('now', '-1 hour') THEN object_id END) as recently_active
FROM object_complete_view;
```

### 5. 期間別統計取得

```sql
-- 特定Objectの期間別統計詳細
SELECT 
  tp.period_name,
  ops.window_start,
  ops.window_end,
  ops.event_count,
  ops.line_changes,
  ops.block_changes
FROM object_statistics_by_period ops
JOIN period_types tp ON ops.period_id = tp.id
WHERE ops.object_id = ?
ORDER BY tp.duration_minutes, ops.window_start DESC;
```

### 6. リアルタイムストリーム表示

```sql
-- 最新イベント取得（ストリーム表示用）
SELECT 
  strftime('%H:%M:%S', e.timestamp) as time,
  et.event_type_name,
  e.file_name,
  e.directory,
  e.line_count,
  e.block_count,
  CASE 
    WHEN e.source_path IS NOT NULL 
    THEN e.source_path || ' -> ' || e.file_path
    ELSE e.file_path
  END as path_info
FROM events e
JOIN event_types et ON e.event_type_id = et.id
ORDER BY e.timestamp DESC 
LIMIT 20;
```

### 7. ファイル変更履歴追跡

```sql
-- 特定ファイルの完全変更履歴
WITH RECURSIVE file_history AS (
  -- 最新イベントから開始
  SELECT * FROM events_detailed_view
  WHERE file_path = '/path/to/file'
  ORDER BY timestamp DESC 
  LIMIT 1
  
  UNION ALL
  
  -- previous_event_idを辿って履歴を遡る
  SELECT ev.* FROM events_detailed_view ev
  INNER JOIN file_history h ON ev.id = h.previous_event_id
)
SELECT timestamp, event_type_name, path_info, line_count, block_count
FROM file_history
ORDER BY timestamp;
```

## 📊 統計分析クエリ

### 1. 効率性分析

```sql
-- ファイル効率性ランキング（行数変化 vs イベント数）
SELECT 
  current_file_name,
  current_file_path,
  total_events,
  total_line_changes,
  CASE 
    WHEN total_events > 0 
    THEN ROUND(CAST(total_line_changes AS FLOAT) / total_events, 2)
    ELSE 0
  END as lines_per_event
FROM object_complete_view
WHERE total_events >= 5
ORDER BY lines_per_event DESC
LIMIT 10;
```

### 2. 活動パターン分析

```sql
-- 時間帯別活動パターン
SELECT 
  strftime('%H', timestamp) as hour,
  COUNT(*) as event_count,
  COUNT(DISTINCT object_id) as unique_files,
  SUM(ABS(COALESCE(line_count_delta, 0))) as total_line_changes
FROM events
WHERE timestamp >= datetime('now', '-7 days')
GROUP BY strftime('%H', timestamp)
ORDER BY hour;
```

### 3. ファイルタイプ別分析

```sql
-- ファイル拡張子別統計
SELECT 
  CASE 
    WHEN current_file_name LIKE '%.js' THEN 'JavaScript'
    WHEN current_file_name LIKE '%.md' THEN 'Markdown'
    WHEN current_file_name LIKE '%.json' THEN 'JSON'
    WHEN current_file_name LIKE '%.html' THEN 'HTML'
    WHEN current_file_name LIKE '%.css' THEN 'CSS'
    ELSE 'Other'
  END as file_type,
  COUNT(*) as file_count,
  SUM(total_events) as total_events,
  SUM(total_line_changes) as total_line_changes
FROM object_complete_view
WHERE total_events > 0
GROUP BY file_type
ORDER BY total_events DESC;
```

## 🚀 パフォーマンス最適化クエリ

### 1. 大量データ対応の分散処理

```sql
-- バッチ処理用：期間指定での統計再計算
SELECT 
  object_id,
  COUNT(*) as event_count,
  SUM(ABS(COALESCE(line_count_delta, 0))) as line_changes,
  MIN(timestamp) as period_start,
  MAX(timestamp) as period_end
FROM events
WHERE timestamp BETWEEN ? AND ?
  AND object_id BETWEEN ? AND ?  -- 分散処理用の範囲指定
GROUP BY object_id
HAVING event_count > 0;
```

### 2. キャッシュ効率最大化

```sql
-- 高頻度アクセス用：キャッシュテーブル活用
SELECT 
  foc.current_file_name,
  foc.current_file_path,
  foc.last_event_timestamp,
  et.event_type_name,
  os.total_events,
  os.total_modifications
FROM file_objects_cache foc
JOIN event_types et ON foc.last_event_type_id = et.event_type_id
JOIN object_statistics os ON foc.object_id = os.object_id
WHERE foc.last_event_timestamp >= datetime('now', '-1 hour')
ORDER BY foc.last_event_timestamp DESC;
```

## 🔧 メンテナンス用クエリ

### 1. データ整合性チェック

```sql
-- 統計値とイベント履歴の整合性確認
SELECT 
  os.object_id,
  os.total_events as stats_total,
  COUNT(e.id) as actual_total,
  os.total_events - COUNT(e.id) as difference
FROM object_statistics os
LEFT JOIN events e ON os.object_id = e.object_id
GROUP BY os.object_id
HAVING difference != 0;
```

### 2. パフォーマンス監視

```sql
-- 最もクエリコストの高いオブジェクト特定
SELECT 
  object_id,
  total_events,
  total_line_changes,
  -- 複雑度スコア（イベント数 × 変更量）
  total_events * total_line_changes as complexity_score
FROM object_statistics
WHERE total_events > 100
ORDER BY complexity_score DESC
LIMIT 10;
```

---

*関連文書*:
- `schema-design.md`: テーブル定義
- `triggers-and-indexes.md`: トリガーとインデックス定義
- `implementation-guide.md`: 実装ガイド
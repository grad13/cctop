---
**アーカイブ情報**
- アーカイブ日: 2025-06-18（surveillance統合）
- アーカイブ週: 2025/0616-0622
- 元パス: surveillance/docs/issues/
- 検索キーワード: iI002ヘルスダッシュボード統計問題, 621ファイル vs 503ファイル不一致, タイムスタンプフィルタリング問題, SQLiteデータ同期不具合, 3段階対策オプション, 計算ロジック修正, surveillanceシステム問題分析

---

# Health Dashboard統計問題分析・対策指針

## 現状の問題

### 統計の不整合
- **合計値の不一致**: 追跡中621ファイル vs 時間別統計の合計503ファイル (21+482)
- **時間帯の偏り**: 12時間以内に482ファイルが集中、他の時間帯は0
- **24時間統計**: 常に0を示している

### 根本原因の可能性

#### 1. タイムスタンプフィルタリングの副作用
- `getLatestRecordsForHealth()`でのフィルタリング（1600000000-2000000000）
- 正常なタイムスタンプも除外されている可能性
- バイナリ復元時の不正タイムスタンプが混在

#### 2. ファイルマッピングとSQLiteデータの同期問題
- file-mapping.json: 664ファイル
- 実際の追跡: 621ファイル
- SQLiteのfilesテーブルとの不整合

#### 3. 時間計算ロジックの問題
- `health-check-module.js`の時間帯分類ロジック
- 排他的カウント（5分以内→10分以内→...）の境界条件

## 対策オプション

### Option A: データクリーンアップ・再構築
**メリット**: 確実にクリーンなデータを得られる
**デメリット**: 履歴データの消失リスク
**手順**:
1. SQLiteデータベースのバックアップ
2. 不正タイムスタンプの特定・削除
3. file-mapping.jsonの再生成
4. 統計計算ロジックの検証

### Option B: 統計計算ロジックの修正
**メリット**: データを保持したまま修正
**デメリット**: 根本原因が残る可能性
**手順**:
1. 現在の統計計算ロジックのデバッグ
2. タイムスタンプフィルタリングの調整
3. 時間帯分類ロジックの見直し

### Option C: 段階的検証・修正
**メリット**: リスクを最小化、問題箇所を特定
**デメリット**: 時間がかかる
**手順**:
1. SQLiteデータの詳細分析
2. タイムスタンプ分布の可視化
3. 統計計算の各段階での検証
4. 問題箇所の特定・修正

## 推奨アプローチ

### Phase 1: 問題の詳細特定
- [ ] SQLiteデータベースのタイムスタンプ分布調査
- [ ] file-mapping.jsonとSQLite files テーブルの整合性確認
- [ ] health-check-module.jsのデバッグログ追加

### Phase 2: 選択的修正
調査結果に基づいて以下のいずれかを実行:
- 不正データの削除（タイムスタンプが異常値のレコード）
- 統計計算ロジックの修正
- file-mappingの再同期

### Phase 3: 検証・監視
- [ ] 修正後の統計値の妥当性確認
- [ ] 継続的な監視体制の確立
- [ ] 異常値検出アラートの実装

## 次のアクション

1. **即座実行**: SQLiteデータの分析クエリ実行
2. **ユーザー判断**: 上記3つのオプションから選択
3. **実装**: 選択されたアプローチの実行

## 調査用SQLクエリ

```sql
-- タイムスタンプ分布確認
SELECT 
  MIN(timestamp) as min_ts,
  MAX(timestamp) as max_ts,
  COUNT(*) as total_records,
  COUNT(DISTINCT file_id) as unique_files
FROM changes;

-- 異常タイムスタンプの特定
SELECT timestamp, COUNT(*) as count
FROM changes 
WHERE timestamp < 1600000000 OR timestamp > 2000000000
GROUP BY timestamp
ORDER BY count DESC;

-- 時間帯別ファイル数（現在のロジックを再現）
SELECT 
  SUM(CASE WHEN (strftime('%s', 'now') - timestamp) <= 300 THEN 1 ELSE 0 END) as '5min',
  SUM(CASE WHEN (strftime('%s', 'now') - timestamp) > 300 AND (strftime('%s', 'now') - timestamp) <= 600 THEN 1 ELSE 0 END) as '10min',
  SUM(CASE WHEN (strftime('%s', 'now') - timestamp) > 43200 AND (strftime('%s', 'now') - timestamp) <= 86400 THEN 1 ELSE 0 END) as '24hours'
FROM (
  SELECT file_id, MAX(timestamp) as timestamp
  FROM changes
  WHERE timestamp > 1600000000 AND timestamp < 2000000000
  GROUP BY file_id
);
```

---
*作成日時: 2025-06-17*
*最終更新: 2025-06-17*
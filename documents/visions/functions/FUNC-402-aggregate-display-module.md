# FUNC-402: Aggregate Display Module

**作成日**: 2025年6月27日 23:45  
**更新日**: 2025年6月27日 23:45  
**作成者**: Architect Agent  
**Version**: 0.2.3.0  
**関連仕様**: FUNC-000, FUNC-001, FUNC-401, FUNC-403  

## 概要

詳細表示モードの上段部分として、選択ファイルの基本情報と集約統計を表示するモジュール。

## 🎯 機能境界

### FUNC-402の責務
- **基本情報表示**: ファイル名・パス・最終操作・サイズ情報の表示
- **集約統計表示**: aggregatesテーブルからの統計データ表示
- **静的表示制御**: 上段エリアのレイアウト・フォーマット管理
- **データ取得**: FUNC-000からの基本情報・統計データ取得

### 他機能との境界
- **FUNC-401**: FUNC-401から呼び出され、表示データを受け取る
- **FUNC-403**: 下段の履歴表示とは独立、レイアウト境界のみ連携
- **FUNC-000**: aggregatesテーブルからの統計データ取得のみ依存
- **FUNC-001**: ファイル基本情報の取得のみ依存

### 責務外の除外事項
- **ユーザー入力処理**: キー入力処理はFUNC-401が担当
- **履歴表示**: 下段の履歴表示はFUNC-403が担当
- **状態管理**: 詳細モード全体の状態管理はFUNC-401が担当
- **データ更新**: 統計データの更新・計算は対象外

## 📋 技術仕様

### 表示レイアウト
```
┌─ File Details ─────────────────────────────┐
│ FileID: 123  inode: 456789                 │
│                                            │
│ Created:     2025/06/15 10:30              │
│ Last Update: 2025/06/27 14:22              │
│                                            │
│ Number of Events                           │
│ Create=1  Delete=3   Modify=102            │
│ Move=12   Restore=3  Total=121             │
│                                            │
│ Metric Statistics                          │
│       Byte  Line Block  Date               │
│ First  222   222   444  2025/06/15 10:30  │
│ Last   333   333   555  2025/06/27 14:22  │
│ Max    999   555   777         -          │
│ Avg    456   389   592         -          │
├─ (FUNC-403 境界) ───────────────────────────┤
```

### 表示項目仕様

#### 識別情報セクション
- **FileID**: files.id（内部識別子）
- **inode**: files.inode（ファイルシステム識別子）

#### 時系列情報セクション  
- **Created**: first_event_timestamp（最初のイベント時刻）
- **Last Update**: last_event_timestamp（最新のイベント時刻）

#### イベント統計セクション
- **Create**: total_creates（作成回数）
- **Delete**: total_deletes（削除回数）  
- **Modify**: total_modifies（変更回数）
- **Move**: total_moves（移動回数）
- **Restore**: total_restores（復活回数）
- **Total**: total_events（総イベント数）

#### メトリック統計セクション
- **First**: first_size, first_lines, first_blocks + first_event_timestamp
- **Last**: last_size, last_lines, last_blocks + last_event_timestamp  
- **Max**: max_size, max_lines, max_blocks（日付なし）
- **Avg**: 平均値（total_size/total_events等で計算）

### データ取得仕様

#### メイン統計取得
```sql
SELECT 
  -- 識別情報
  f.id as file_id,
  f.inode,
  
  -- イベント統計
  a.total_events,
  a.total_creates,
  a.total_modifies,
  a.total_deletes,
  a.total_moves,
  a.total_restores,
  
  -- 時系列統計
  a.first_event_timestamp,
  a.last_event_timestamp,
  
  -- メトリック統計
  a.first_size, a.max_size, a.last_size, a.total_size,
  a.first_lines, a.max_lines, a.last_lines, a.total_lines,
  a.first_blocks, a.max_blocks, a.last_blocks, a.total_blocks
FROM files f
JOIN aggregates a ON f.id = a.file_id
WHERE f.id = ?
```


## 🚀 実装仕様

### 実装要件
1. **AggregateDisplayRenderer クラス**
   - 上段表示の描画・フォーマット制御
   - 基本情報と統計の統合表示
   - 境界線の描画管理

2. **FileInfoProvider モジュール**
   - 基本ファイル情報の取得・フォーマット
   - タイムスタンプの人間可読形式変換
   - ファイルサイズの適切な表示

3. **AggregateStatsProvider モジュール**
   - aggregatesテーブルからの統計取得
   - 統計データの検証・デフォルト値処理
   - 統計値のフォーマット（カンマ区切り等）

4. **LayoutManager モジュール**
   - 上段エリアのレイアウト制御
   - 項目の整列・パディング管理
   - FUNC-403との境界線制御

### 表示フォーマット要件
- **項目ラベル**: 黄色（`chalk.yellow`）で統一
- **値部分**: 白色（デフォルト）で表示
- **境界線**: グレー（`chalk.gray`）の罫線
- **幅制御**: 80文字幅での整列表示

## 🧪 テスト要件

### 単体テスト
1. **AggregateDisplayRenderer テスト**
   - 基本情報の正確な表示確認
   - 統計値の適切なフォーマット確認
   - 境界線の正確な描画確認

2. **FileInfoProvider テスト**
   - ファイル情報取得の正確性
   - タイムスタンプフォーマットの確認
   - 不正データのエラーハンドリング

3. **AggregateStatsProvider テスト**
   - 統計データ取得の正確性
   - 集計値の計算確認
   - 統計データ不在時のデフォルト表示

### 統合テスト
1. **FUNC-401連携テスト**
   - FUNC-401からの適切な呼び出し確認
   - データ受け渡しの正確性確認
   - 表示タイミングの同期確認

2. **データベース連携テスト**
   - FUNC-000との適切なデータ取得
   - SQLクエリの性能確認
   - 大量データ時の表示性能

## 制限事項

### 技術的制限
- **データ取得性能**: 大量統計データ時の取得遅延
- **表示幅制限**: 80文字幅での項目表示制限
- **フォーマット固定**: 表示形式のカスタマイズ不可

### 機能制限
- **静的表示**: 表示中のリアルタイム更新不可
- **単一ファイル**: 複数ファイルの同時表示不可
- **集約期間固定**: 統計の期間指定不可

## 🔗 関連機能との連携

### 必須連携機能
- **FUNC-401**: 詳細表示モード制御 - 表示データの受け取り・描画指示
- **FUNC-000**: SQLiteデータベース基盤 - 基本情報・統計データの取得
- **FUNC-001**: ファイルライフサイクル追跡 - ファイル状態情報の取得

### 任意連携機能
- **FUNC-403**: 履歴表示モジュール - レイアウト境界の調整
- **FUNC-201**: 二重バッファ描画 - 描画最適化の利用

## 参考資料

### 類似機能の参考
- **ls -l**: ファイル情報表示形式
- **stat**: ファイル詳細情報表示
- **git log --stat**: 統計情報表示パターン
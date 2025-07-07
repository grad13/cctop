# Runner Handoff: daemon FUNC-000 Compliance Implementation

**作成日**: 2025-07-04  
**Runner**: daemon-v1001-restore worktree  
**目的**: daemon を FUNC-000 仕様書に完全準拠させる

---

## 📋 プロジェクト概要

### 現状
- daemon v1.0.0.2 として基本機能は実装済み
- 6種イベントタイプ（find/create/modify/delete/move/restore）対応
- SQLite によるイベント保存・集計機能
- 全テストスイート正常動作（69テスト）

### 目標
- FUNC-000 仕様書完全準拠の daemon 実装
- 5テーブル構成の完全実装
- 詳細測定値履歴管理
- 高度統計分析機能

---

## 🎯 実装計画

### **Phase 1: 必須テーブル追加 (High Priority)**

#### 1.1 event_types テーブル作成
```sql
CREATE TABLE event_types (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);
```
- 6種類のイベントタイプ定義
- 初期データ投入（find/create/modify/delete/move/restore）
- events テーブルとの外部キー関係構築

#### 1.2 measurements テーブル作成
```sql
CREATE TABLE measurements (
  id INTEGER PRIMARY KEY,
  event_id INTEGER UNIQUE NOT NULL,
  inode_number INTEGER,
  line_count INTEGER,
  block_count INTEGER,
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```
- event_id で events テーブルと 1:1 関係
- inode 履歴管理
- 測定値（size, lines, blocks）

### **Phase 2: 測定値計算機能実装 (High Priority)**

#### 2.1 MeasurementCalculator モジュール
- `src/measurements/MeasurementCalculator.ts`
- ファイル解析のコア機能
- プラットフォーム依存処理の抽象化

#### 2.2 line_count 計算機能
- テキストファイルの行数計算
- バイナリファイルの除外処理
- エンコーディング対応

#### 2.3 block_count 計算機能
- ファイルシステムのブロック数取得
- クロスプラットフォーム対応（Linux/macOS/Windows）
- fs.stat() の blocks フィールド活用

### **Phase 3: スキーマ正規化 (Medium Priority)**

#### 3.1 events テーブル正規化
- event_type から event_type_id への移行
- 既存データのマイグレーション処理
- 後方互換性の確保

#### 3.2 aggregates テーブル拡張
- 測定値統計の追加
- 詳細メトリクスの計算
- パフォーマンス最適化

### **Phase 4: テスト実装 (High Priority)**

#### 4.1 測定値計算機能のテスト
- `tests/unit/measurement-calculator.test.ts`
- line_count 計算のテストケース
- block_count 計算のテストケース
- エラーハンドリングのテスト

#### 4.2 integration テスト 4 作成
- `tests/integration/measurements-integration.test.ts`
- 新テーブル対応の統合テスト
- E2E 測定値計算テスト

### **Phase 5: 最適化 (Low Priority)**

#### 5.1 FUNC-000 インデックス最適化
- `idx_events_file_timestamp` - traverse 高速化
- `idx_events_file_id` - 参照高速化
- クエリパフォーマンス向上

---

## 📁 実装影響範囲

### データベース層
- **SchemaManager**: 新テーブル作成ロジック
- **EventOperations**: 正規化対応・measurements 連携
- **TriggerManager**: 新テーブル対応のトリガー

### 測定値計算層（新規）
- **MeasurementCalculator**: コア計算機能
- **FileAnalyzer**: ファイル解析ユーティリティ
- **PlatformUtils**: プラットフォーム依存処理

### イベント処理層
- **FileEventHandler**: measurements 計算・保存連携
- **Database**: 新テーブル操作の統合

### テスト層
- **新テーブル対応**: 全テストケースの更新
- **測定値計算**: 専用テストスイート
- **パフォーマンス**: 大量データ処理テスト

---

## 🔄 実装順序

### Step 1: データベース基盤 (1-2時間)
1. event_types テーブル作成・初期データ
2. measurements テーブル作成
3. SchemaManager 更新

### Step 2: 測定値計算機能 (2-3時間)
1. MeasurementCalculator モジュール作成
2. line_count 計算実装
3. block_count 計算実装

### Step 3: 統合・テスト (1-2時間)
1. FileEventHandler との統合
2. 測定値計算テスト作成
3. integration テスト 4 作成

### Step 4: 正規化・最適化 (1時間)
1. events テーブル正規化
2. インデックス最適化
3. 全体テスト実行

**総予想工数**: 5-8時間

---

## 📊 期待される効果

### 仕様準拠
- ✅ FUNC-000 仕様書 100% 準拠
- ✅ 5テーブル構成の完全実装
- ✅ 詳細測定値履歴管理

### 機能強化
- 📈 高度な統計分析機能
- 🔍 詳細なファイル変化追跡
- 📋 inode 履歴による正確な追跡

### パフォーマンス
- ⚡ スキーマ正規化による性能向上
- 🗂️ 最適化されたインデックス
- 💾 効率的なクエリ実行

---

## ⚠️ 注意事項

### データ移行
- 既存データベースの互換性確保
- マイグレーション処理の実装
- ロールバック機能の準備

### テスト品質
- 新機能の網羅的テスト
- 既存テストの回帰確認
- パフォーマンステストの追加

### ドキュメント更新
- README.md の機能説明更新
- データベーススキーマ図の更新
- API リファレンスの追加

---

**Next Action**: event_types テーブル作成から開始
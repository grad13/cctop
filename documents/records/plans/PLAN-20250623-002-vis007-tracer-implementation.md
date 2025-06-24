# PLAN-20250623-002: vis007 Tracer機能実装計画

**作成日**: 2025年6月23日 17:00  
**作成者**: Builder Agent  
**対象**: vis007 Tracer機能（3モード分析インターフェース）の実装  
**前提**: v0.1.0.0基盤（30/32テスト合格、安定動作確認済み）

## 🎯 実装概要

### ゴール
vis007ビジョンに基づく**3モード Tracer機能**の実装：
1. **Unique Mode**: ファイル最新状態の一覧表示
2. **Selection Mode**: キーボード操作による選択インターフェース  
3. **Detail Mode**: 選択ファイルの完全変更履歴表示

### アプローチ
**段階的実装** + **シンプル設計優先**
- 現在の2テーブル設計を活用
- db001仕様は簡素化版を採用（トリガーなし）
- 実用性を確認してから高度化

## 📊 データベース移行戦略

### Phase 1: 現在設計の活用
**現在のテーブル**をvis007 Mode 1実装に使用：
```sql
-- 既存
events (id, event_type, file_path, timestamp, file_size, line_count, block_count, inode)
moves (id, from_path, to_path, timestamp, confidence, detection_method)
```

### Phase 2: db001簡素化版への移行
**3テーブル構成**（トリガーなし、統計なし）：
```sql
-- 新規
event_types (id, code, name, description)
object_fingerprint (id, inode)  -- hashは削除済み
events (id, timestamp, event_type_id, object_id, file_path, file_name, directory, 
        previous_event_id, source_path, file_size, line_count, block_count)
```

**移行タイミング**: Mode 1動作確認後

## 🚀 実装フェーズ

### Phase 1: Mode 1 (Unique Mode) - 最優先
**期間**: 2-3日  
**目標**: 各ファイルの最新状態を一覧表示

#### 実装内容
1. **TracerCore クラス作成**
   - データ取得・表示ロジックの基盤
   - 現在のeventsテーブルを活用

2. **Unique Mode UI実装**
   ```
   ┌─ Unique Mode ─────────────────────────────────────────┐
   │ [M] src/index.js          2025-06-23 14:30:15         │
   │ [C] tests/new-test.js     2025-06-23 14:28:03         │
   │ [D] old-config.json       2025-06-23 14:25:44         │
   └───────────────────────────────────────────────────────┘
   ```

3. **コマンドライン統合**
   - `bin/cctop tracer` コマンド追加
   - 既存のclassic/inkモードと並列配置

#### 技術実装
```sql
-- 各ファイルの最新イベント取得（現在のテーブル使用）
WITH latest_events AS (
  SELECT file_path, event_type, timestamp,
         ROW_NUMBER() OVER (PARTITION BY file_path ORDER BY timestamp DESC) as rn
  FROM events
  WHERE timestamp > ?
)
SELECT * FROM latest_events WHERE rn = 1 ORDER BY timestamp DESC;
```

### Phase 2: データベース移行 - 中優先
**期間**: 1-2日  
**目標**: db001簡素化版への移行

#### 実装内容
1. **マイグレーションスクリプト作成**
   - 既存データの新スキーマへの変換
   - バックアップ・ロールバック機能

2. **DatabaseManager更新**
   - 新しい3テーブル構成対応
   - object_fingerprint管理機能

3. **データ整合性検証**
   - 移行前後のデータ一致確認
   - テストスイートでの動作確認

### Phase 3: Mode 2 (Selection Mode) - 中優先
**期間**: 2-3日  
**目標**: キーボード操作による選択UI

#### 実装内容
1. **キーバインディングシステム**
   ```javascript
   const keyBindings = {
     'up': () => this.moveCursor('up'),
     'down': () => this.moveCursor('down'),
     'enter': () => this.transitionToDetail(),
     'escape': () => this.transitionToUnique()
   };
   ```

2. **カーソル移動・選択状態管理**
   - 視覚的なカーソル表示
   - ページング機能（大量ファイル対応）

3. **プレビュー機能**
   - 選択ファイルの基本情報表示
   - イベント数・サイズ・最終更新時刻

### Phase 4: Mode 3 (Detail Mode) - 中優先
**期間**: 2-3日  
**目標**: 選択ファイルの完全履歴表示

#### 実装内容
1. **履歴表示エンジン**
   ```sql
   -- ファイル完全履歴（object_idベース）
   SELECT e.timestamp, et.name as event_type, e.file_size, e.line_count,
          LAG(e.file_size) OVER (ORDER BY e.timestamp) as prev_size
   FROM events e
   JOIN event_types et ON e.event_type_id = et.id
   WHERE e.object_id = ?
   ORDER BY e.timestamp DESC;
   ```

2. **変更差分計算**
   - サイズ変化量の表示
   - 行数増減の可視化

3. **統計サマリー**
   - 総イベント数、期間、平均変更頻度
   - イベントタイプ別分布

### Phase 5: 高度機能 - 低優先
**期間**: 実装判断は Phase 4完了後

1. **エクスポート機能** (JSON/CSV/Markdown)
2. **フィルタリング機能** (期間・イベントタイプ別)
3. **パフォーマンス最適化** (仮想スクロール・遅延ロード)
4. **統計ダッシュボード**

## 🧪 テスト戦略

### 各フェーズのテスト
1. **Mode 1**: 基本的なデータ取得・表示機能
2. **移行**: データベース移行前後の整合性
3. **Mode 2**: キーボード操作・UI遷移
4. **Mode 3**: 履歴表示・統計計算

### テストデータ
- 既存のtest-workspaceを活用
- 多様なイベントパターン（Create/Modify/Delete/Move）
- 大量ファイル（100+）での性能検証

## 🎨 UI/UX設計原則

### 一貫性
- 既存のclassic UIとの操作感統一
- カラースキーマの統一（chalk活用）

### パフォーマンス
- 60fps での滑らかな動作
- 大量データでも遅延なし（1000+ ファイル）

### 学習容易性
- 直感的なキーバインディング（vi-like）
- ヘルプ表示機能

## ⚖️ リスク・対策

### 技術リスク
1. **データベース移行**
   - 対策: 段階的移行・十分なテスト・ロールバック準備
2. **パフォーマンス**
   - 対策: 最初からパフォーマンス測定・必要に応じて最適化
3. **UI複雑性**
   - 対策: Mode 1から段階的実装・ユーザビリティテスト

### スケジュールリスク
1. **scope creep**
   - 対策: MVP機能に集中・高度機能は後回し
2. **デバッグ時間**
   - 対策: 各フェーズで十分なテスト時間を確保

## 📅 スケジュール

### Week 1
- **Day 1-2**: Phase 1 (Mode 1) 実装
- **Day 3**: Phase 2 (DB移行) 準備・実装
- **Day 4-5**: Phase 3 (Mode 2) 実装開始

### Week 2
- **Day 1-2**: Phase 3 完了・テスト
- **Day 3-4**: Phase 4 (Mode 3) 実装
- **Day 5**: 統合テスト・調整

### 判断ポイント
- **Phase 1完了後**: ユーザビリティ確認・Phase 2進行判断
- **Phase 4完了後**: Phase 5（高度機能）の実装判断

## 🎯 成功指標

### 機能面
- ✅ 3モード間のスムーズな遷移（<50ms）
- ✅ 1000ファイルでも快適な動作
- ✅ 直感的な操作（5分以内で基本操作習得）

### 品質面
- ✅ 既存テストの維持（30/32パス以上）
- ✅ 新機能の十分なテストカバレッジ
- ✅ メモリリーク・パフォーマンス劣化なし

### ユーザー価値
- ✅ ファイル変更履歴の直感的な確認
- ✅ 開発作業の振り返り・分析支援
- ✅ デバッグ・問題調査の効率化

---

**次のステップ**: Phase 1 (Mode 1) 実装開始の承認確認
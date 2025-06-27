# HO-20250627-003: Aggregates Table Extension Implementation

**作成日**: 2025年6月27日  
**依頼者**: Architect Agent  
**対象**: Builder Agent  
**優先度**: High  
**関連仕様**: FUNC-000, PIL-008  

## 📋 実装依頼内容

### aggregatesテーブル拡張実装
FUNC-000のaggregatesテーブルに、メトリック統計（First/Max/Last）カラムを追加し、対応するトリガーを実装してください。

## 🎯 実装要件

### 1. Schema Migration実装
```sql
-- 新カラム追加
ALTER TABLE aggregates ADD COLUMN first_event_timestamp INTEGER;
ALTER TABLE aggregates ADD COLUMN last_event_timestamp INTEGER;

-- メトリック統計（Size）
ALTER TABLE aggregates ADD COLUMN first_size INTEGER;
ALTER TABLE aggregates ADD COLUMN max_size INTEGER;
ALTER TABLE aggregates ADD COLUMN last_size INTEGER;

-- メトリック統計（Lines）
ALTER TABLE aggregates ADD COLUMN first_lines INTEGER;
ALTER TABLE aggregates ADD COLUMN max_lines INTEGER;
ALTER TABLE aggregates ADD COLUMN last_lines INTEGER;

-- メトリック統計（Blocks）
ALTER TABLE aggregates ADD COLUMN first_blocks INTEGER;
ALTER TABLE aggregates ADD COLUMN max_blocks INTEGER;
ALTER TABLE aggregates ADD COLUMN last_blocks INTEGER;
```

### 2. トリガー実装
#### events INSERT/UPDATE時のトリガー
```sql
CREATE TRIGGER update_aggregates_on_event
AFTER INSERT ON events
FOR EACH ROW
BEGIN
  -- aggregatesレコード存在確認・作成
  INSERT OR IGNORE INTO aggregates (file_id) VALUES (NEW.file_id);
  
  -- 基本統計更新
  UPDATE aggregates SET
    total_events = total_events + 1,
    total_creates = total_creates + CASE WHEN NEW.event_type_id = 2 THEN 1 ELSE 0 END,
    total_modifies = total_modifies + CASE WHEN NEW.event_type_id = 3 THEN 1 ELSE 0 END,
    total_deletes = total_deletes + CASE WHEN NEW.event_type_id = 4 THEN 1 ELSE 0 END,
    total_moves = total_moves + CASE WHEN NEW.event_type_id = 5 THEN 1 ELSE 0 END,
    total_restores = total_restores + CASE WHEN NEW.event_type_id = 6 THEN 1 ELSE 0 END,
    
    -- 時系列統計更新
    first_event_timestamp = COALESCE(first_event_timestamp, NEW.timestamp),
    last_event_timestamp = NEW.timestamp,
    
    last_updated = CURRENT_TIMESTAMP
  WHERE file_id = NEW.file_id;
END;
```

#### measurements INSERT時のトリガー
```sql
CREATE TRIGGER update_aggregates_on_measurement
AFTER INSERT ON measurements
FOR EACH ROW
BEGIN
  UPDATE aggregates SET
    -- 累積統計更新
    total_size = total_size + COALESCE(NEW.file_size, 0),
    total_lines = total_lines + COALESCE(NEW.line_count, 0),
    total_blocks = total_blocks + COALESCE(NEW.block_count, 0),
    
    -- First値設定（初回のみ）
    first_size = COALESCE(first_size, NEW.file_size),
    first_lines = COALESCE(first_lines, NEW.line_count),
    first_blocks = COALESCE(first_blocks, NEW.block_count),
    
    -- Max値更新
    max_size = MAX(max_size, NEW.file_size),
    max_lines = MAX(max_lines, NEW.line_count),
    max_blocks = MAX(max_blocks, NEW.block_count),
    
    -- Last値更新
    last_size = NEW.file_size,
    last_lines = NEW.line_count,
    last_blocks = NEW.block_count,
    
    last_updated = CURRENT_TIMESTAMP
  WHERE file_id = (SELECT file_id FROM events WHERE id = NEW.event_id);
END;
```

### 3. 実装ファイル
- **src/database/schema-v021.js**: 新スキーマ定義
- **src/database/migrations/**: マイグレーション実装
- **src/database/triggers/**: トリガー定義

## 🧪 テスト要件

### 単体テスト
1. **Schema Migration テスト**
   - 新カラム追加の正常動作確認
   - 既存データの保持確認
   - マイグレーション実行の冪等性確認

2. **Trigger テスト**
   - events INSERT時の統計更新確認
   - measurements INSERT時のメトリック更新確認
   - First/Max/Last値の正確な計算確認

### 統合テスト
1. **ファイル監視統合テスト**
   - 実際のファイル変更でのトリガー動作確認
   - 複数イベント発生時の統計整合性確認
   - トランザクション内での一貫性確保確認

## 📊 検証項目

### データ整合性検証
1. **統計値の正確性**
   - 手動計算との比較検証
   - 累積値の整合性確認
   - First/Max/Last値の論理的整合性

2. **パフォーマンス検証**
   - トリガー実行時間の測定
   - 大量データ投入時の性能確認
   - インデックス効果の検証

## 🔗 関連実装

### 既存実装への影響
- **database-manager.js**: aggregates取得クエリの更新
- **event-processor.js**: 新統計カラムの活用検討
- **既存テスト**: 新カラム対応の修正

### 将来実装との連携
- **PIL-008**: 拡張統計の表示実装（Validatorが担当）
- **統計API**: 新統計値のAPI提供検討

## ⚠️ 注意事項

### 実装時の考慮点
- **既存データ対応**: マイグレーション時の既存aggregatesレコード処理
- **NULL値処理**: measurements情報がない場合のNULL値適切処理
- **トランザクション**: events/measurements INSERTとトリガー実行の原子性確保

### エラーハンドリング
- **トリガーエラー**: SQLエラー時の適切なロールバック
- **データ不整合**: 手動修正が必要な場合の検出・報告機能
- **マイグレーション失敗**: 失敗時のロールバック手順

## 📅 完了基準

- [ ] Schema Migration実装・テスト完了
- [ ] Trigger実装・テスト完了  
- [ ] 既存データの統計値再計算完了
- [ ] 統合テスト通過
- [ ] パフォーマンス検証完了
- [ ] ドキュメント更新完了

**完了予定**: 2日以内  
**Validatorへの引き継ぎ**: 実装完了後、HO-20250627-004として検証依頼
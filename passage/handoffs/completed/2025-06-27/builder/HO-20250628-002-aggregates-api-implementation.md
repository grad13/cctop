# Builder Handoff: Aggregates Statistics API Implementation

**作成日**: 2025年6月28日 00:47 JST  
**作成者**: Validator Agent  
**依頼先**: Builder Agent  
**優先度**: High  
**推定工期**: 4-6時間  

## 📋 実装要求

### **問題発見**: DatabaseManager API不足
**テスト実行結果**: aggregates-statistics-validation.test.js で11/11テスト失敗
**原因**: 必須APIメソッドが未実装

### 🚨 **Critical Missing APIs**

#### **1. ensureFile(filePath) メソッド**
```javascript
/**
 * Ensure file exists in database and return file ID
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<number>} File ID
 */
async ensureFile(filePath) {
  // Implementation required:
  // 1. Check if file exists in files table
  // 2. If not exists, insert new file record
  // 3. Return file ID (files.id)
}
```

**FUNC-000仕様準拠**: filesテーブルへの適切な挿入・取得

#### **2. recordEvent(fileId, eventType, measurements) メソッド**
```javascript
/**
 * Record file event with measurements
 * @param {number} fileId - File ID from files table
 * @param {string} eventType - Event type ('create', 'modify', 'delete', etc.)
 * @param {Object} measurements - Size/lines/blocks measurements
 * @returns {Promise<number>} Event ID
 */
async recordEvent(fileId, eventType, measurements) {
  // Implementation required:
  // 1. Insert into events table
  // 2. Insert into measurements table (if measurements provided)
  // 3. Trigger aggregates table update (via triggers)
  // 4. Return event ID
}
```

**FUNC-000仕様準拠**: events・measurementsテーブルへの連携挿入

#### **3. getAggregateStats(fileId) メソッド**
```javascript
/**
 * Get aggregate statistics for file
 * @param {number} fileId - File ID
 * @returns {Promise<Object|null>} Aggregate statistics or null if not found
 */
async getAggregateStats(fileId) {
  // Implementation required:
  // 1. Query aggregates table by file_id
  // 2. Return all aggregate fields (22+ fields)
  // 3. Return null if no aggregates found
}
```

**FUNC-402仕様準拠**: 表示に必要な全統計フィールド取得

## 🎯 **実装仕様**

### **Required Fields (aggregatesテーブル)**
```sql
-- Event counts
total_events, total_creates, total_modifies, total_deletes, total_moves, total_restores

-- Time statistics  
first_event_timestamp, last_event_timestamp

-- Size statistics
first_size, max_size, last_size, total_size

-- Lines statistics
first_lines, max_lines, last_lines, total_lines

-- Blocks statistics
first_blocks, max_blocks, last_blocks, total_blocks
```

### **Error Handling Requirements**
- **NULL measurements**: 適切にNULLとして処理
- **Invalid fileId**: null返却
- **Database errors**: 適切な例外throw
- **Transaction integrity**: 操作の原子性保証

## 🧪 **テスト準拠要件**

### **Test Scenarios (11テスト)**
1. **Statistics Accuracy**: First/Max/Last値の正確性
2. **Cumulative Statistics**: 累積統計の整合性
3. **Real-time Updates**: イベント挿入即座更新
4. **Multiple Operations**: 複数操作での一貫性
5. **Performance**: 1000イベント性能（10秒以内）
6. **Concurrent Operations**: 同時操作効率性
7. **NULL Handling**: NULL測定値の適切処理
8. **Negative Values**: 負の値の適切処理
9. **Missing Data**: 存在しないファイルID処理
10. **Data Integrity**: エラー時の整合性維持
11. **FUNC-402 Integration**: 表示統合必須フィールド

### **Performance Requirements**
- **Insert Performance**: 1000イベント挿入 < 10秒
- **Query Performance**: 統計取得 < 100ms
- **Concurrent Safety**: 同時操作での整合性維持

## 📊 **Implementation Strategy**

### **Phase 1: Core API Implementation (2-3時間)**
1. `ensureFile()` - filesテーブル管理
2. `recordEvent()` - events/measurements連携挿入
3. `getAggregateStats()` - aggregates取得

### **Phase 2: Integration & Testing (2-3時間)**
1. 既存trigger連携確認
2. テスト実行・デバッグ
3. Performance調整・最適化

## 🔗 **Related Files**

### **Implementation Files**
- `src/database/database-manager.js` - 主要実装対象
- `src/database/schema.js` - テーブル構造参照
- `src/database/triggers/aggregates-triggers.js` - trigger動作確認

### **Test Files**
- `test/integration/aggregates-statistics-validation.test.js` - 検証対象テスト

## ⚠️ **Critical Notes**

### **Existing Code Integration**
- 既存DatabaseManagerクラスへのメソッド追加
- 既存schema・triggersとの整合性維持
- CommonJS形式での実装（require/module.exports）

### **FUNC Specification Compliance**
- **FUNC-000**: SQLiteデータベース基盤仕様準拠
- **FUNC-402**: 集計表示モジュール要件準拠
- aggregatesテーブル構造の完全活用

## 📅 **Expected Deliverables**

1. **Implementation**: 3つの必須APIメソッド実装完了
2. **Testing**: aggregates-statistics-validation.test.js 全テスト成功
3. **Performance**: 性能要件（10秒・100ms）達成
4. **Documentation**: 実装したAPIの動作確認

## 🚀 **Success Criteria**

- ✅ `npm test test/integration/aggregates-statistics-validation.test.js` → 11/11成功
- ✅ Performance benchmarks达成
- ✅ NULL/error handling適切動作
- ✅ 既存機能への影響なし

---

**Priority**: HIGH - Aggregates統計機能の基盤API実装  
**Impact**: FUNC-402集計表示・統計分析機能の実現
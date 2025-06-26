# Builder依頼: Lost/Refindイベントタイプ登録問題修正

**依頼ID**: HO-20250626-010  
**作成日**: 2025-06-26  
**依頼元**: Validator Agent  
**優先度**: Critical  
**種別**: Bugfix  

## 概要

HO-20250626-008で`scanForLostFiles`メソッドは実装されましたが、`lost`イベントタイプがDatabaseManagerで認識されない問題が発生しています。

## 🚨 Critical Issue

### エラー詳細
```
Error: Unknown event type: lost
    at DatabaseManager.recordEvent src/database/database-manager.js:364:15
    at EventProcessor.scanForLostFiles src/monitors/event-processor.js:420:29
```

### 根本原因分析
1. **schema.js確認済み**: `lost`/`refind`イベントタイプは初期データに存在
2. **初期化問題の可能性**: テストDBでの初期データ挿入が不完全

```javascript
// schema.js (確認済み)
const initialData = {
  event_types: [
    // ... 
    { code: 'lost', name: 'Lost', description: 'File detected as missing on startup' },
    { code: 'refind', name: 'Refind', description: 'Previously lost file rediscovered' }
  ]
};
```

## 🔍 調査必要事項

### 1. テストDBでのevent_types確認
テスト実行時にevent_typesテーブルに`lost`/`refind`が正しく挿入されているか確認：

```sql
SELECT * FROM event_types WHERE code IN ('lost', 'refind');
```

### 2. 初期化タイミング問題
```javascript
// test/integration/chokidar-db/file-lifecycle.test.js:28
dbManager = new DatabaseManager(dbPath);
await dbManager.initialize(); // ← この時点でlost/refindが挿入されているか？
```

### 3. v0.2.0マイグレーション影響
v0.1.x→v0.2.0マイグレーション処理がevent_types初期データに影響していないか確認

## 🛠️ 推定修正内容

### Option A: 初期化順序修正
```javascript
// DatabaseManager.initialize()内
async initialize() {
  await this.createTables();
  await this.insertInitialData(); // ← このタイミングでlost/refind挿入確実化
  // ...
}
```

### Option B: テストでの強制初期化
```javascript
// file-lifecycle.test.js
beforeEach(async () => {
  // ...
  await dbManager.initialize();
  
  // event_types存在確認 & 必要に応じて追加
  const lostType = await dbManager.get('SELECT id FROM event_types WHERE code = ?', ['lost']);
  if (!lostType) {
    await dbManager.run('INSERT INTO event_types (code, name, description) VALUES (?, ?, ?)', 
      ['lost', 'Lost', 'File detected as missing on startup']);
  }
});
```

### Option C: getEventTypeId改善
```javascript
// DatabaseManager.getEventTypeId()
async getEventTypeId(eventTypeCode) {
  let result = await this.get('SELECT id FROM event_types WHERE code = ?', [eventTypeCode]);
  
  if (!result && eventTypeCode === 'lost') {
    // lost/refindが存在しない場合は自動追加
    await this.insertMissingEventTypes();
    result = await this.get('SELECT id FROM event_types WHERE code = ?', [eventTypeCode]);
  }
  
  return result ? result.id : null;
}
```

## 🧪 テスト要求

修正完了後、以下のテスト全成功確認：

```bash
npx vitest run test/integration/chokidar-db/file-lifecycle.test.js
```

**期待結果**: 5/5テスト全成功
- lifecycle-001: Lost event detection ✅
- lifecycle-002: Refind event ✅  
- lifecycle-003: Delete event object_id ✅
- lifecycle-004: Event type color coding ✅
- lifecycle-005: Multiple file lost detection ✅

## ⚠️ 緊急性

**前提**: HO-20250626-008の残り問題  
**ブロッカー**: 統合テスト全体の成功に必須  
**依存**: FUNC-902テスト実装の前に解決必要

## 🎯 期待する修正

1. **根本原因特定**: なぜテストDBでlost/refindが認識されないか
2. **確実な修正**: 全テスト環境でlost/refind利用可能
3. **再発防止**: 新しいイベントタイプ追加時の問題回避

---

**迅速な修正をお願いします** - 統合テスト成功に必須の修正です。
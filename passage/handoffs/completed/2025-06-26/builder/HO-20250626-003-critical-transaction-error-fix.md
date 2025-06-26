# Handoff: Critical Transaction Error Fix Required

**From**: Validator  
**To**: Builder  
**Date**: 2025-06-26 14:30 JST  
**Priority**: Critical  
**Type**: Bug Fix - Transaction Error  

## 🚨 緊急修正が必要な問題

BP-001 Day1-4テスト実行で**重大なSQLiteトランザクションエラー**が大量発生しています。

## 🔍 問題の詳細

### エラー症状
```
❌ Event processing failed: [Error: SQLITE_ERROR: cannot start a transaction within a transaction] {
  errno: 1,
  code: 'SQLITE_ERROR'
}
```

### 影響範囲
- **data-integrity.test.js**: 全テストが失敗（9/9件失敗）
- **その他統合テスト**: 複数のテストで同じエラー
- **実動作**: 大量ファイル処理時の安定性に影響

## 🔬 根本原因分析

### 原因: ネストしたトランザクション
**場所**: `src/database/database-manager.js:recordEvent()` 

**問題構造**:
```javascript
async recordEvent(eventData) {
  await this.run('BEGIN TRANSACTION');  // ← 最初のトランザクション
  
  try {
    // 複数のイベントが同時に処理されると...
    let file = await this.getOrCreateFile(...);     // ← WALモードでも競合
    const eventTypeId = await this.getEventTypeId(...); // ← 複数クエリ実行
    await this.run('INSERT INTO events...');
    await this.updateFile(...);          // ← 更に複数クエリ
    await this.updateAggregates(...);    // ← 更に複数クエリ
    
    await this.run('COMMIT');
  } catch (error) {
    await this.run('ROLLBACK');  // ← エラー時のロールバック
  }
}
```

### 競合発生シナリオ
1. **初期スキャン時**: 複数ファイルが同時に`add`イベントを発生
2. **chokidar並行処理**: `addDir` + `add`イベントの同時実行  
3. **大量ファイル変更**: 1000+ファイルの一括処理時

## 💡 推奨修正方法

### Option 1: better-sqlite3のトランザクション機能使用 (推奨)
```javascript
async recordEvent(eventData) {
  // ネストしたトランザクションを避けるため、better-sqlite3のtransaction()を使用
  const transaction = this.db.transaction(() => {
    // 同期的に全ての操作を実行
    let file = this.db.prepare('SELECT * FROM files WHERE file_path = ?').get(file_path);
    
    if (!file) {
      const result = this.db.prepare('INSERT INTO files...').run(...);
      file = { id: result.lastInsertRowid, ... };
    }
    
    const eventType = this.db.prepare('SELECT id FROM event_types WHERE code = ?').get(event_type);
    const eventResult = this.db.prepare('INSERT INTO events...').run(...);
    this.db.prepare('INSERT INTO measurements...').run(...);
    this.db.prepare('UPDATE files...').run(...);
    this.updateAggregatesSync(...);  // 同期版が必要
    
    return eventResult.lastInsertRowid;
  });
  
  return transaction();
}
```

### Option 2: イベントキューイング
```javascript
// EventProcessorレベルでキューイング
class EventProcessor {
  constructor() {
    this.eventQueue = [];
    this.processing = false;
  }
  
  async processFileEvent(event) {
    this.eventQueue.push(event);
    if (!this.processing) {
      this.processing = true;
      await this.processQueue();
      this.processing = false;
    }
  }
}
```

## 🎯 修正に必要な作業

### 1. DatabaseManager修正 (src/database/database-manager.js)
- [ ] `recordEvent`メソッドのトランザクション処理改修
- [ ] `updateAggregatesSync`同期版メソッド追加
- [ ] `updateFileSync`同期版メソッド追加

### 2. 関連テスト修正
- [ ] data-integrity.test.js: トランザクションエラー対応
- [ ] 他の統合テスト: 同期化問題の修正

### 3. 動作確認
- [ ] 1000ファイル初期スキャンでエラーなし
- [ ] 大量ファイル変更での安定性確認
- [ ] 全テストスイートのPASS確認

## 📊 現在のテスト失敗状況

```
❌ data-integrity.test.js (0/9 passed)
❌ cli-display-buffered-rendering.test.js (4件失敗)
✅ config-validation.test.js (10/10 passed)
✅ その他の基本テスト (ほぼ成功)
```

## ⚠️ 重要な注意事項

1. **WALモード継続**: 現在のWALモード設定は維持
2. **非同期API保持**: 外部APIは非同期のまま
3. **パフォーマンス**: トランザクション内は同期処理で高速化
4. **後方互換性**: 既存のDBマイグレーション処理を壊さない

## 🚀 期待される効果

- **エラー解消**: トランザクションエラーの完全解決
- **パフォーマンス向上**: better-sqlite3の高速トランザクション
- **安定性向上**: 大量ファイル処理での信頼性確保
- **テスト成功率**: 90%+ → 100%達成

この修正により、BP-001のv0.2.0リリースに向けた品質基準を達成できます。

---
**緊急度**: 最高 - v0.2.0リリースのブロッカー  
**推定作業時間**: 2-3時間
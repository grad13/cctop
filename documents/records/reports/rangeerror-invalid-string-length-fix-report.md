# RangeError: Invalid string Length エラー修正レポート

**作成日**: 2025-06-27  
**作成者**: Validator  
**問題**: Claude Codeが3度handoff処理中にRangeErrorで落ちる  

## 問題分析

### エラー詳細
```
> npm test test/integration/chokidar-db/basic-operations.test.js
> RangeError: Invalid string length
```

### 根本原因
1. **EventProcessor無限ループ**
   - データベース未初期化時にイベントを再キューイング（event-processor.js:99-102）
   - 同じイベントが無限に処理され続ける
   - 大量のログメッセージが出力される

2. **ログ出力の無限増殖**
   ```
   [EventProcessor] Database not initialized, queueing event: /path/to/file
   ```
   - このメッセージが無限に出力され、文字列長が限界を超える

3. **テスト環境のタイミング問題**
   - DatabaseManagerの初期化完了前にEventProcessorがイベント処理開始
   - EventProcessorのコンストラクタでdbManagerを受け取るが、初期化状態をチェックしていない

## 修正案

### 1. EventProcessorの無限ループ防止
```javascript
// event-processor.js の修正
async processEventInternal(event) {
  // 既存のretry回数を追跡
  if (!event.retryCount) {
    event.retryCount = 0;
  }
  
  // 最大retry回数を超えたらドロップ
  if (event.retryCount > 10) {
    console.error('[EventProcessor] Max retries exceeded, dropping event:', event.path);
    return null;
  }
  
  if (!this.db || !this.db.isInitialized) {
    event.retryCount++;
    // 少し待ってから再キュー
    setTimeout(() => {
      this.eventQueue.push(event);
    }, 100);
    return null;
  }
}
```

### 2. テストの初期化順序修正
```javascript
// basic-operations.test.js の修正
beforeEach(async () => {
  // データベース初期化
  dbManager = new DatabaseManager(dbPath);
  await dbManager.initialize();
  
  // 初期化完了を確実に待つ
  let retries = 0;
  while (!dbManager.isInitialized && retries < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }
  
  if (!dbManager.isInitialized) {
    throw new Error('Database initialization failed');
  }
  
  // EventProcessorをデータベース初期化後に作成
  eventProcessor = new EventProcessor(dbManager);
});
```

### 3. ログ出力の制限
```javascript
// event-processor.js の修正
if (!this.db || !this.db.isInitialized) {
  // 最初の1回だけログ出力
  if (!this.dbInitWarningShown) {
    console.warn('[EventProcessor] Database not initialized, queueing events...');
    this.dbInitWarningShown = true;
  }
  // ...
}
```

## 推奨される実装優先順位

1. **即座の対処（High Priority）**
   - EventProcessorの無限ループ防止（retry制限追加）
   - ログ出力の制限

2. **根本的解決（Medium Priority）**
   - テストの初期化順序改善
   - EventProcessorにデータベース初期化待機メカニズム追加

3. **長期的改善（Low Priority）**
   - イベントキューのサイズ制限実装
   - メモリ使用量監視機能追加

## Builder向け修正依頼内容

1. **event-processor.js**
   - retry回数トラッキング実装
   - 最大retry回数（10回）でイベントドロップ
   - ログ出力の重複防止

2. **テストファイル全般**
   - データベース初期化完了の確実な待機
   - EventProcessor作成タイミングの調整

これにより、Claude Codeのクラッシュを防ぎ、安定したテスト実行が可能になります。
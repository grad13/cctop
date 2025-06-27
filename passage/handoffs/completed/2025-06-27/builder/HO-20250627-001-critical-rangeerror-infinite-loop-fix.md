# HO-20250627-001: Critical - RangeError無限ループ修正依頼

**作成日時**: 2025-06-27 00:30 JST  
**作成者**: Validator  
**優先度**: Critical（Claude Codeクラッシュ防止）  
**対象**: Builder  

## 問題概要

Claude Codeが3度handoff処理中に`RangeError: Invalid string length`でクラッシュ。
根本原因はEventProcessorの無限ループによる大量ログ出力。

## 技術的詳細

### 現象
```bash
> npm test test/integration/chokidar-db/basic-operations.test.js
> RangeError: Invalid string length
```

### 根本原因
1. **EventProcessor無限ループ**（event-processor.js:99-102）
   ```javascript
   if (!this.db || !this.db.isInitialized) {
     console.warn('[EventProcessor] Database not initialized, queueing event:', event.path);
     this.eventQueue.push(event); // 同じイベントを無限に再追加
     return null;
   }
   ```

2. **ログの無限増殖**
   - 各イベントが無限に再処理される
   - ログメッセージが指数関数的に増加
   - 文字列長が限界を超えてRangeError発生

## 修正要求

### 1. event-processor.js の修正（最優先）

```javascript
async processEventInternal(event) {
  try {
    // Retry回数トラッキング追加
    if (!event.retryCount) {
      event.retryCount = 0;
    }
    
    // 最大retry回数チェック
    if (event.retryCount > 10) {
      console.error('[EventProcessor] Max retries exceeded, dropping event:', event.path);
      return null;
    }
    
    // Check database connection before processing
    if (!this.db || !this.db.isInitialized) {
      // 初回のみ警告表示
      if (!this.dbInitWarningShown) {
        console.warn('[EventProcessor] Database not initialized, queueing events...');
        this.dbInitWarningShown = true;
      }
      
      event.retryCount++;
      
      // 遅延再キューイング（無限ループ防止）
      setTimeout(() => {
        if (!this.destroyed && this.eventQueue.length < 1000) { // キューサイズ制限
          this.eventQueue.push(event);
        }
      }, 100);
      
      return null;
    }
    
    // 以下既存のコード...
```

### 2. コンストラクタへのフラグ追加

```javascript
constructor(dbManager) {
  this.db = dbManager;
  this.eventQueue = [];
  this.processing = false;
  this.destroyed = false;
  this.dbInitWarningShown = false; // 追加
  // ...
}
```

### 3. テストファイルの初期化改善（オプション）

test/integration/chokidar-db/basic-operations.test.js:
```javascript
beforeEach(async () => {
  // ... 既存のコード ...
  
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
    throw new Error('Database initialization failed after 5 seconds');
  }
  
  // Event Processor初期化（DB初期化後）
  eventProcessor = new EventProcessor(dbManager);
  // ...
});
```

## 実装チェックリスト

- [ ] event-processor.jsにretry回数トラッキング実装
- [ ] 最大10回のretryで自動ドロップ
- [ ] ログ出力を初回のみに制限
- [ ] setTimeout使用で無限ループ防止
- [ ] eventQueueサイズ制限（1000イベント）
- [ ] テスト実行でRangeError発生しないことを確認

## 期待される効果

1. Claude Codeのクラッシュ防止
2. テスト実行の安定化
3. メモリ使用量の制限
4. デバッグログの適切な制御

## 検証方法

```bash
# 修正後、以下のコマンドで確認
cd /Users/takuo-h/Workspace/Code/06-cctop/cctop
npm test test/integration/chokidar-db/basic-operations.test.js

# エラーが発生しないこと、テストが正常終了することを確認
```

よろしくお願いします。
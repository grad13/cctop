# REP-0091: Test Async Interference Investigation

**作成日**: 2025-06-24
**作成者**: Validator Agent
**カテゴリ**: テスト問題調査

## 概要

cctopプロジェクトの統合テストにおいて、テスト間の非同期処理干渉による失敗が発生。根本原因の調査と対処を実施。

## 問題の症状

### エラーメッセージ
```
● Feature 4: File Monitor (chokidar統合) › Should detect create events after initial find
    TypeError: Cannot read properties of null (reading 'off')
    at Timeout._onTimeout (test/integration/feature-5-event-processor.test.js:202:24)
```

### 特徴
- 個別テスト実行では成功
- 全体実行時のみ失敗
- エラーの発生箇所が異なるテストファイル

## 調査結果

### 1. テスト分離問題（REP-090）
- `~/.cctop/activity.db`の共有による副作用
- feature-2-database.test.jsにクリーンアップ処理追加で改善

### 2. 非同期処理の残存問題
**原因**: 前のテストの非同期コールバックが次のテストで実行される

**証拠**:
- feature-4のテスト名でエラーが表示
- しかし実行場所はfeature-5のコード
- `Timeout._onTimeout`はsetTimeoutのコールバック

### 3. JavaScript/Node.jsの非同期処理特性
- Promiseは一度作成されると停止不可
- イベントリスナーは明示的な削除が必要
- Jestの`--runInBand`でも非同期タスクはイベントループに残る

## 実施した対処

### 1. イベントリスナーの完全削除
```javascript
afterEach(async () => {
  if (fileMonitor) {
    fileMonitor.removeAllListeners(); // 追加
    await fileMonitor.stop();
    fileMonitor = null;
  }
});
```

### 2. タイムアウト付きPromiseの実装
```javascript
await new Promise((resolve, reject) => {
  const handler = (event) => {
    if (event.type === 'create') {
      fileMonitor.off('fileEvent', handler);
      clearTimeout(timeoutId); // タイマークリア
      resolve();
    }
  };
  
  const timeoutId = setTimeout(() => {
    fileMonitor.off('fileEvent', handler); // リスナー削除
    reject(new Error('Create event timeout'));
  }, 5000);
  
  fileMonitor.on('fileEvent', handler);
});
```

### 3. 保護的コーディング
```javascript
fileMonitor.on('ready', () => {
  if (eventProcessor) { // nullチェック追加
    eventProcessor.onInitialScanComplete();
  }
});
```

## 結果

- 根本的な解決には至らず（Jestの非同期処理の限界）
- 保護的コーディングで実用上の問題は回避可能
- 1つのテストエラーに削減（元は複数）

## 教訓

1. **テストの独立性確保の重要性**
   - グローバルリソース（~/.cctop/）の適切な管理
   - 非同期処理の確実なクリーンアップ

2. **Jestの限界の理解**
   - `--runInBand`でも非同期タスクの完全制御は困難
   - イベントループの共有による副作用

3. **防御的プログラミングの必要性**
   - nullチェックの重要性
   - タイムアウト設定による無限待機の防止

## 今後の推奨事項

1. テストの完全分離を目指す場合は、別プロセスでの実行を検討
2. 非同期処理を多用するテストは、より慎重なクリーンアップ設計が必要
3. CI/CD環境での実行時は、より長いタイムアウト設定を検討
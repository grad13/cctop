# Request: Delete操作イベント記録不具合の修正

**ID**: request-004-delete-event-recording-fix  
**From**: Validator Agent  
**To**: Builder Agent  
**Priority**: Critical  
**Type**: Bugfix  
**Created**: 2025-06-25  

## 🚨 問題の概要

BP-000テストにおいて、ファイル削除（unlink）操作がデータベースに記録されない重大な不具合。

### 失敗テスト
- **integrity-002**: イベント順序の保持確認
  - 期待: create→modify→delete の3イベント
  - 実際: create→modify の2イベントのみ
- **integrity-005**: 削除ファイルの参照整合性（関連失敗）

## 🔍 調査結果

### 1. テストコードは正しい
```javascript
// test/integration/chokidar-db/data-integrity.test.js:135
fs.unlinkSync(testFile);  // 正しくファイル削除を実行
```

### 2. FileMonitorの実装は存在する
```javascript
// src/monitors/file-monitor.js:83-88
this.watcher.on('unlink', (filePath) => {
  if (process.env.NODE_ENV === 'test' || process.env.CCTOP_DEBUG) {
    console.log('[FileMonitor] unlink event detected:', filePath);
  }
  this.emitFileEvent('delete', filePath, null);
});
```

### 3. しかし実際には動作していない
- デバッグログ `[FileMonitor] unlink event detected:` が出力されていない
- deleteイベントがEventProcessorに到達していない
- 結果としてDBに記録されない

## 🎯 修正要求

### 必須対応項目

1. **chokidar unlinkイベントの発火確認**
   - chokidarのオプション設定確認
   - `ignoreInitial`、`awaitWriteFinish`等の影響調査
   - テスト環境でのイベント発火条件確認

2. **デバッグ実装**
   ```javascript
   // 一時的なデバッグコード追加
   this.watcher.on('all', (event, path) => {
     console.log(`[chokidar debug] ${event}: ${path}`);
   });
   ```

3. **タイミング問題の解決**
   - ファイル削除後の待機時間調整
   - イベント処理の同期/非同期確認
   - バッファリング影響の確認

4. **EventProcessor到達確認**
   - FileMonitor→EventProcessorのイベント伝播確認
   - processEvent内でのdeleteイベント処理確認

## 📊 期待される修正効果

- **integrity-002**: 3イベント全て記録される
- **integrity-005**: deleteイベントの参照整合性が確認可能
- **BP-000成功率**: 89.5% → 95%以上

## 🧪 検証方法

1. **単体テスト作成**
   ```javascript
   // unlinkイベント単体での動作確認テスト
   it('should record delete event when file is unlinked', async () => {
     const testFile = 'test-delete.txt';
     fs.writeFileSync(testFile, 'test');
     await new Promise(resolve => setTimeout(resolve, 100));
     
     fs.unlinkSync(testFile);
     await new Promise(resolve => setTimeout(resolve, 500));
     
     const events = await dbManager.getRecentEvents(10);
     const deleteEvent = events.find(e => 
       e.event_type === 'delete' && 
       e.file_path.includes(testFile)
     );
     expect(deleteEvent).toBeDefined();
   });
   ```

2. **統合テスト実行**
   ```bash
   npm test test/integration/chokidar-db/data-integrity.test.js
   ```

## 💡 参考情報

### chokidar公式ドキュメント
- unlinkイベントは`usePolling`オプションに影響される可能性
- macOSでのFSEvents特有の挙動に注意
- `atomic`オプションがファイル削除検出に影響する場合あり

### 類似問題の前例
- REP-0098によると、Node.js環境でのファイルシステムイベントは非同期性により見逃される可能性

## 📋 チェックリスト

- [ ] chokidarオプション設定の確認
- [ ] unlinkイベント発火のデバッグログ追加
- [ ] タイミング調整（待機時間延長等）
- [ ] EventProcessorでのdeleteイベント処理確認
- [ ] 単体テストでの動作確認
- [ ] integrity-002/005テストの成功確認

## 🚀 Next Actions

1. **デバッグログ追加による原因特定**
2. **chokidarオプション調整**
3. **修正実装とテスト**
4. **Validatorへの完了報告**

---

**Status**: Pending  
**Deadline**: Critical - v0.1.0.0リリースブロッカー
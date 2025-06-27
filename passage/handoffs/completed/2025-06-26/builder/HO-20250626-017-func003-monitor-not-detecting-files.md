# HO-20250626-017: FUNC-003 Monitor実動作バグ修正依頼

**作成日**: 2025年6月26日 23:58  
**依頼者**: Validator Agent  
**対象者**: Builder Agent  
**優先度**: Critical  
**種別**: Bugfix  

## 🚨 Critical Issue発見

### 問題概要
FUNC-003 Background Activity Monitorが**実際のファイル変更を検出しない**重大なバグを発見。テストでは起動確認のみ行っていたため検出できず、実動作で判明。

### 症状詳細
```
cctop起動結果：
Unique Files  0 files
[a] All  [u] Unique  [q] Exit
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
>> Database: 0 events, 0 active files
```

**期待される動作**: 既存ファイルの検出・リアルタイム監視
**実際の動作**: 0 files、0 events（何も検出しない）

## 🔍 推定原因分析

### 1. Monitor Process起動問題
**可能性**: Monitor Processが実際には起動していない
**確認方法**: 
```bash
ps aux | grep monitor
cat .cctop/monitor.pid  # PIDファイル確認
cat .cctop/logs/monitor.log  # ログ確認
```

### 2. ファイル監視設定問題
**可能性**: chokidar設定が不正・監視パス設定エラー
**確認対象**: 
- FUNC-101設定読み込み: monitoring.watchPaths
- chokidar初期化パラメータ
- ignoreInitial設定の誤設定

### 3. Database連携問題
**可能性**: Monitor→Database書き込みが失敗
**確認対象**:
- SQLite WAL mode設定
- EventProcessor→DatabaseManager連携
- トランザクション処理エラー

### 4. プロセス間通信問題
**可能性**: Monitor/Viewer間のデータ共有失敗
**確認対象**:
- ViewerProcessのDatabase読み取り
- activity.dbファイル生成・アクセス権限

## 🎯 修正要求項目

### 必須修正事項

#### 1. 実動作確認機能追加
```javascript
// Monitor起動後の動作確認
async function verifyMonitorOperation() {
  // 1. 既存ファイルスキャン確認
  const initialScan = await eventProcessor.getRecentEvents();
  console.log(`Initial scan found: ${initialScan.length} files`);
  
  // 2. リアルタイム監視確認
  const testFile = 'monitor-test.txt';
  fs.writeFileSync(testFile, 'test');
  
  setTimeout(async () => {
    const events = await eventProcessor.getRecentEvents();
    console.log(`After file creation: ${events.length} events`);
  }, 1000);
}
```

#### 2. デバッグログ強化
```javascript
// FUNC-101設定のbackgroundMonitor.logLevel="debug"対応
await this.processManager.log('debug', `Watching paths: ${JSON.stringify(this.config.monitoring.watchPaths)}`);
await this.processManager.log('debug', `Chokidar options: ${JSON.stringify(chokidarOptions)}`);
```

#### 3. エラーハンドリング強化
```javascript
// 各段階でのエラー詳細出力
this.fileMonitor.on('error', async (error) => {
  await this.processManager.log('error', `File monitor error: ${error.message}`);
  console.error('[Monitor] Detailed error:', error);
});
```

#### 4. 設定検証機能
```javascript
// 起動時設定検証
function validateConfiguration(config) {
  if (!config.monitoring?.watchPaths?.length) {
    throw new Error('No watch paths configured');
  }
  // 他の必須設定確認
}
```

### 修正優先順位

1. **Priority 1**: Monitor Process実動作確認
   - PIDファイル・ログの詳細確認
   - プロセス生存・動作状態の検証

2. **Priority 2**: ファイル監視機能修正
   - chokidar設定見直し
   - 初期スキャン・リアルタイム監視の動作確認

3. **Priority 3**: Database連携修正
   - EventProcessor→DatabaseManager書き込み確認
   - WAL mode並行アクセス問題解決

4. **Priority 4**: Viewer Process修正
   - Database読み取り・表示更新の確認

## 🧪 検証要求

### 修正完了時の動作確認
```bash
# 1. 基本動作確認
cd /path/to/test/directory
cctop

# 期待結果: 既存ファイルが表示される
# Unique Files  X files (X > 0)

# 2. リアルタイム監視確認
echo "test" > test.txt

# 期待結果: 即座にイベント表示
# test.txt    create    1 line
```

### 必須確認項目
- [ ] 既存ファイルの初期スキャン動作
- [ ] リアルタイムファイル変更検出
- [ ] Database正常書き込み・読み取り
- [ ] Monitor/Viewer間正常通信
- [ ] エラー時の適切なログ出力

## 📊 品質基準

### 修正完了基準
1. **機能動作**: 既存ファイル検出・リアルタイム監視100%動作
2. **データ整合性**: Monitor書き込み→Viewer読み取り完全同期
3. **エラー処理**: 問題発生時の詳細ログ・適切復旧
4. **性能要件**: ファイル変更→表示反映60ms以内

### テスト要求
- 実環境での動作確認（テストディレクトリでなく実プロジェクト）
- 複数ファイル同時変更での安定性確認
- 長時間運用での動作継続性確認

## 💬 備考

**Validator反省**: テストが起動確認に留まり、実際のファイル監視動作を検証できていませんでした。今後は実動作確認を必須とします。

**緊急度**: Critical（基本機能が動作しない状態）  
**期限**: 24時間以内の修正完了を要求  
**連絡**: 修正完了時はValidator再検証を依頼してください  

---
**Issue Type**: Critical Functional Bug  
**Affected**: FUNC-003 Background Activity Monitor全機能  
**Status**: Builder修正待ち
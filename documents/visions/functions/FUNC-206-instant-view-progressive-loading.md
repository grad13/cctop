# FUNC-206: 即時表示・プログレッシブローディング機能

**作成日**: 2025年6月27日 01:00  
**更新日**: 2025年6月27日 01:00  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-003, FUNC-202, FUNC-205

## 📊 機能概要

`cctop`コマンド実行時に即座にViewerを起動し、Monitor起動やデータ読み込みの進捗を表示しながらプログレッシブにコンテンツを表示する。

**ユーザー価値**:
- 即座の視覚的フィードバック（0.1秒以内）
- 起動処理の透明性（何が起きているか分かる）
- 待ち時間のストレス軽減
- エラー時も画面を維持

## 🎯 機能境界

### ✅ **実行する**
- Viewer即時起動（0.1秒以内）
- Monitor起動状況の表示
- Database接続進捗の表示
- データのプログレッシブ読み込み
- エラー時の画面維持とリトライ表示

### ❌ **実行しない**
- Monitor起動のブロッキング待機
- データ完全読み込みまでの画面非表示
- エラー時の即座終了
- 複雑な起動アニメーション

## 📋 必要な仕様

### **起動フロー仕様**

#### **ユーザー体験の流れ**
1. **即時画面表示**: コマンド実行から0.1秒以内にViewer画面を表示
2. **Monitor起動表示**: "Starting background monitor..."等の進捗をFUNC-205のステータスエリアにリアルタイム表示
3. **データ流入**: Monitorからのデータが到着次第、画面に反映

#### **表示状態の遷移**
| 状態 | 表示内容 | 表示場所 | 時間 |
|------|---------|---------|------|
| Initial | 空の表示エリア + "Initializing..." | FUNC-205ステータスエリア | 0-100ms |
| Monitor Starting | "Starting background monitor..." | FUNC-205ステータスエリア | 100-500ms |
| Data Loading | "Loading file events..." + 既存データ | FUNC-205ステータスエリア + メインエリア | 500ms-2s |
| Live Mode | リアルタイムイベント表示 | メインエリア（通常動作） | 2s以降 |

### **進捗メッセージ仕様**

各フェーズで表示するメッセージ（FUNC-205のステータスエリアに表示）：

```
Phase 1: ">> Initializing cctop..."
Phase 2: ">> Checking monitor status..."
Phase 3: ">> Starting background monitor..." (必要時)
Phase 4: ">> Connecting to database..."
Phase 5: ">> Loading existing events..." 
Phase 6: ">> Ready - Monitoring active"
```

## 🔧 実装ガイドライン

### **起動シーケンス設計**

```javascript
// 1. cctop実行
// 2. Viewer即時起動（0.1秒以内）
async function startViewer() {
  // 3. 空画面表示 + 初期化メッセージ
  displayInitialScreen();
  // FUNC-205のステータスエリアに表示
  statusDisplay.addMessage(">> Initializing cctop...", "normal", "progress");
  
  // 4. Monitor起動チェック（非ブロッキング）
  checkMonitorStatus().then(status => {
    if (!status.running) {
      // 5. Monitor未起動なら起動（バックグラウンド）
      // FUNC-205のステータスエリアに表示
      statusDisplay.addMessage(">> Starting background monitor...", "normal", "progress");
      // 起動者="viewer"として記録
      startMonitorProcess({ started_by: "viewer" });
    } else {
      // Monitor既起動の場合は起動者情報を維持
      statusDisplay.addMessage(">> Background monitor already running", "normal", "info");
    }
  });
  
  // 6. Database接続試行（リトライ付き）
  // FUNC-205のステータスエリアに表示
  statusDisplay.addMessage(">> Connecting to database...", "normal", "progress");
  connectToDatabase();
  
  // 7. 既存データ読み込み（プログレッシブ）
  loadExistingData();
  
  // 8. リアルタイム監視開始
  startRealtimeMonitoring();
}
```

### **プログレッシブローディング設計**

#### **非ブロッキング処理**
- Promise/async-awaitによる非同期処理
- 各処理の並列実行（Monitor起動とDB接続を同時進行）
- タイムアウト設定（各処理最大5秒）

#### **段階的表示戦略**
```javascript
// データが到着次第、即座に表示開始
db.on('data', (events) => {
  displayManager.addEvents(events);
  // FUNC-205のステータスエリアに進捗更新
  statusDisplay.updateMessage(
    `>> Loading existing events... (${events.length} loaded)`,
    "normal",
    "progress"
  );
});

// データ読み込み完了
db.on('ready', () => {
  // FUNC-205のステータスエリアに完了表示
  statusDisplay.addMessage(">> Ready - Monitoring active", "normal", "info");
});
```

#### **エラーリカバリー**
- DB接続失敗: 
  - 1秒間隔で最大10回リトライ
  - FUNC-205ステータスエリアに `!! Database connection failed, retrying... (attempt 3/10)` 表示
- Monitor起動失敗: 
  - 読み取り専用モードで継続
  - FUNC-205ステータスエリアに `!! Monitor start failed, running in read-only mode` 表示
- 予期せぬエラー: 
  - エラー詳細をFUNC-205ステータスエリアに表示しつつ画面維持

## 🔗 他機能との連携

### FUNC-003: Background Activity Monitor
- Monitor起動処理を非ブロッキング化
- PIDファイルチェックを非同期実行
- Monitor起動完了をポーリングで確認
- **起動者記録**: Monitor未起動時の自動起動では起動者="viewer"として記録
- **終了制御**: Viewer終了時に起動者="viewer"の場合のみMonitorも停止

### FUNC-202: CLI Display Integration
- 既存の表示機能を拡張
- 初期表示時の空状態をサポート
- プログレッシブなデータ追加に対応

### FUNC-205: Status Display Area
- 起動進捗メッセージの表示に活用
  - 「>> Initializing cctop...」「>> Starting background monitor...」等をストリーム表示
- エラー・警告の優先表示
  - 「!! Database connection failed」等を最上行に即座表示
- 複数行での詳細状態表示
  - 最大3行（設定可能）で起動プロセスを透明化

### **実装上の考慮事項**

#### **初期化の軽量化**
- 最小限のモジュールのみ初期ロード
- 設定ファイル読み込みを非同期化
- 重い処理は画面表示後に実行

#### **画面更新の継続性**
- setInterval(16ms)による定期描画
- データ未到着でも画面更新は継続
- ステータスメッセージの定期更新

## 🧪 テスト要件
### **パフォーマンステスト**
- Viewer起動時間測定（目標: 100ms以内）
- 各フェーズの遷移時間測定
- メモリ使用量の推移確認

### **シナリオテスト**
- Monitor未起動時の自動起動確認
- Database接続失敗時のリトライ動作
- 大量既存データのプログレッシブ表示
- エラー発生時の画面維持確認
- **Monitor終了制御テスト**:
  - Monitor未起動時: Viewer終了でMonitorも停止
  - Monitor既起動時: Viewer終了でMonitorは継続

### **統合テスト**
- FUNC-003との連携動作
- FUNC-205ステータス表示との統合
- 全体的なユーザー体験の確認

## 🎯 成功指標

1. **即応性**: コマンド実行から0.1秒以内の視覚的フィードバック
2. **透明性**: 起動プロセスの各段階が明確に可視化
3. **堅牢性**: エラー時も画面を維持し、適切な情報提供
4. **快適性**: 待ち時間を感じさせないプログレッシブ表示

---

## 💡 使用シナリオ

### **初回起動時（Monitor未起動）**
```bash
$ cctop
# 0.1秒以内に画面表示
# ">> Initializing cctop..." 表示
# ">> Starting background monitor..." 表示
# Monitor自動起動（started_by="viewer"として記録）
# データ読み込み開始
# 2秒後には通常表示
# Ctrl+Cで終了時にMonitorも停止
```

### **Monitor起動済み時（Standalone Monitor）**
```bash
$ cctop
# 0.1秒以内に画面表示
# ">> Background monitor already running" 表示
# ">> Connecting to database..." 表示
# 既存データ即座に表示開始
# 1秒以内に完全動作
# Ctrl+Cで終了してもMonitorは継続実行
```

### **エラー発生時**
```bash
$ cctop
# 0.1秒以内に画面表示
# "!! Database connection failed, retrying..." 表示
# リトライカウント表示
# 最終的に読み取り専用モードで起動
```

---

**核心価値**: コマンド実行時の即座の視覚的フィードバックにより、ユーザーの待機ストレスを解消し、起動プロセスの透明性を提供する
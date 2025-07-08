# FUNC-206: 即時表示・プログレッシブローディング機能

**作成日**: 2025年6月27日 01:00  
**更新日**: 2025年7月7日  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-003, FUNC-202, FUNC-301

## 📊 機能概要

`cctop`コマンド実行時に即座にCLIを起動し、Daemon起動やデータ読み込みの進捗を表示しながらプログレッシブにコンテンツを表示する。

**ユーザー価値**:
- 即座の視覚的フィードバック（0.1秒以内）
- 起動処理の透明性（何が起きているか分かる）
- 待ち時間のストレス軽減
- エラー時も画面を維持

## 🎯 機能境界

### ✅ **実行する**
- CLI即時起動（0.1秒以内）
- Daemon起動状況の表示
- Database接続進捗の表示
- データのプログレッシブ読み込み
- 動的データロードトリガー管理
- vanilla table容量管理・最適化
- エラー時の画面維持とリトライ表示

### ❌ **実行しない**
- Daemon起動のブロッキング待機
- データ完全読み込みまでの画面非表示
- **フィルター状態管理（FUNC-301の責務）**
- **表示データの生成（FUNC-301の責務）**
- エラー時の即座終了
- 複雑な起動アニメーション

## 📋 必要な仕様

### **起動フロー仕様**

#### **ユーザー体験の流れ**
1. **即時画面表示**: コマンド実行から0.1秒以内にCLI画面を表示
2. **Daemon起動表示**: "Starting background daemon..."等の進捗をFUNC-205のステータスエリアにリアルタイム表示
3. **データ流入**: Daemonからのデータが到着次第、画面に反映

#### **表示状態の遷移**
| 状態 | 表示内容 | 表示場所 | 時間 |
|------|---------|---------|------|
| Initial | 空の表示エリア + "Initializing..." | ヘッダーエリア | 0-100ms |
| Daemon Starting | "Starting background daemon..." | ヘッダーエリア | 100-500ms |
| Data Loading | "Loading file events..." + 既存データ | ヘッダーエリア + メインエリア | 500ms-2s |
| Live Mode | リアルタイムイベント表示 | メインエリア（通常動作） | 2s以降 |

**注**: FUNC-205（ステータスエリア）はSuspend状態のため、代替としてヘッダーエリアを使用

### **動的データロードトリガー**（conversation-20250707.log準拠）

**トリガー条件**（以下のいずれかを満たし、かつ"end of data"が表示されていない場合）:
1. **画面内rowが不足**: 表示可能行数に対してrowが不足している
2. **下端選択**: 選択rowがtable最下部になった
3. **100msポーリング**: 定期的なDB更新確認

**ロード戦略**:
- 初回100件取得
- 最大1000件まで段階的取得
- vanilla table容量管理（一定件数超過時は古い順に削除）

### **FUNC-301との連携フロー**

```javascript
// 動的データロード時の処理
onDataLoad(newEvents) {
  // 1. FUNC-301のvanilla tableに統合
  FUNC301.updateVanillaTable(newEvents);
  
  // 2. 操作履歴を再適用
  const filteredData = FUNC301.generateDisplaySet();
  
  // 3. 画面に反映
  FUNC202.updateDisplay(filteredData);
  
  // 4. 容量管理
  if (FUNC301.getVanillaTableSize() > MAX_EVENTS) {
    FUNC301.optimizeVanillaTable();
  }
}
```

### **進捗メッセージ仕様**

各フェーズで表示するメッセージ（ヘッダーエリアに表示）：

```
Phase 1: ">> Initializing cctop..."
Phase 2: ">> Checking daemon status..."
Phase 3: ">> Starting background daemon..." (必要時)
Phase 4: ">> Connecting to database..."
Phase 5: ">> Loading existing events..." 
Phase 6: ">> Ready - Watching active"
```

## 🔧 実装ガイドライン

### **起動シーケンス設計**

```javascript
// 1. cctop実行
// 2. CLI即時起動（0.1秒以内）
async function startCLI() {
  // 3. 空画面表示 + 初期化メッセージ
  displayInitialScreen();
  // ヘッダーエリアに表示（FUNC-205はSuspend状態）
  headerDisplay.showMessage(">> Initializing cctop...");
  
  // 4. Daemon起動チェック（非ブロッキング）
  checkDaemonStatus().then(status => {
    if (!status.running) {
      // 5. Daemon未起動なら起動（バックグラウンド）
      headerDisplay.showMessage(">> Starting background daemon...");
      // 起動者="cli"として記録
      startDaemonProcess({ started_by: "cli" });
    } else {
      // Daemon既起動の場合は起動者情報を維持
      headerDisplay.showMessage(">> Background daemon already running");
    }
  });
  
  // 6. Database接続試行（リトライ付き）
  headerDisplay.showMessage(">> Connecting to database...");
  connectToDatabase();
  
  // 7. 既存データ読み込み（プログレッシブ）
  loadExistingData();
  
  // 8. 動的データロード設定
  setupDynamicLoading();
  
  // 9. リアルタイム監視開始
  startRealtimeMonitoring();
}
```

### **プログレッシブローディング設計**

#### **非ブロッキング処理**
- Promise/async-awaitによる非同期処理
- 各処理の並列実行（Daemon起動とDB接続を同時進行）
- タイムアウト設定（各処理最大5秒）

#### **段階的表示戦略**
```javascript
// データが到着次第、即座に表示開始
db.on('data', (events) => {
  // FUNC-301経由で状態管理
  FUNC301.updateVanillaTable(events);
  const filteredData = FUNC301.generateDisplaySet();
  FUNC202.updateDisplay(filteredData);
  
  // ヘッダーに進捗更新
  headerDisplay.showMessage(`>> Loading existing events... (${events.length} loaded)`);
});

// データ読み込み完了
db.on('ready', () => {
  headerDisplay.showMessage(">> Ready - Watching active");
  
  // 動的ロードトリガー設定
  setupDynamicLoadTriggers();
});

// 動的データロードトリガー
function setupDynamicLoadTriggers() {
  // 1. スクロール位置監視
  FUNC202.onScrollToBottom(() => {
    if (!isEndOfData()) {
      loadMoreData();
    }
  });
  
  // 2. 行数不足監視
  FUNC202.onInsufficientRows(() => {
    if (!isEndOfData()) {
      loadMoreData();
    }
  });
  
  // 3. 100msポーリング
  setInterval(checkAndLoadNewData, 100);
}
```

#### **エラーリカバリー**
- DB接続失敗: 
  - 1秒間隔で最大10回リトライ
  - ヘッダーエリアに `!! Database connection failed, retrying... (attempt 3/10)` 表示
- Daemon起動失敗: 
  - 読み取り専用モードで継続
  - ヘッダーエリアに `!! Daemon start failed, running in read-only mode` 表示
- 動的ロード失敗:
  - リトライ機構で対応、FUNC-301のvanilla table整合性を維持
- 予期せぬエラー: 
  - エラー詳細をヘッダーエリアに表示しつつ画面維持

## 🔗 他機能との連携

### FUNC-003: Background Activity Daemon
- Daemon起動処理を非ブロッキング化
- PIDファイルチェックを非同期実行
- Daemon起動完了をポーリングで確認
- **起動者記録**: Daemon未起動時の自動起動では起動者="cli"として記録
- **終了制御**: CLI終了時に起動者="cli"の場合のみDaemonも停止

### FUNC-202: CLI Display Integration
- 既存の表示機能を拡張
- 初期表示時の空状態をサポート
- プログレッシブなデータ追加に対応

### FUNC-301: フィルター状態管理
- vanilla table管理との連携
  - 動的ロードデータの統合・管理
  - 容量管理による古いデータの削除
- 操作履歴の継続的適用
  - 新規データロード後のフィルター再適用
  - フィルター状態の一貫性維持

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
- CLI起動時間測定（目標: 100ms以内）
- 各フェーズの遷移時間測定
- メモリ使用量の推移確認

### **シナリオテスト**
- Daemon未起動時の自動起動確認
- Database接続失敗時のリトライ動作
- 大量既存データのプログレッシブ表示
- エラー発生時の画面維持確認
- **Daemon終了制御テスト**:
  - Daemon未起動時: CLI終了でDaemonも停止
  - Daemon既起動時: CLI終了でDaemonは継続

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
# HO-20250627-001: FUNC-206即時表示・プログレッシブローディング機能実装

**作成日**: 2025年6月27日 01:30  
**期限**: 2025年6月28日 18:00  
**優先度**: High  
**作成者**: Architect Agent  
**対象**: Builder Agent  

## 📋 実装要求概要

FUNC-206「即時表示・プログレッシブローディング機能」を実装してください。ユーザー体験として最も重要な機能です：

- **即座の画面表示**: コマンド実行から0.1秒以内
- **プログレッシブローディング**: Monitor起動やデータ読み込みを待たずに画面表示
- **起動プロセスの透明性**: FUNC-205ステータスエリアでの進捗表示

## 🎯 実装対象

### **主要な実装項目**
1. **即時Viewer起動機能**（0.1秒以内）
2. **Monitor起動者記録機能**（PIDファイル拡張）
3. **プログレッシブデータ読み込み**
4. **FUNC-205連携メッセージ表示**
5. **Monitor終了制御機能**

## 📝 技術仕様

### **1. 即時Viewer起動（最重要）**

#### **軽量初期化の実装**
```javascript
// bin/cctop - エントリポイント
async function main() {
  // 最小限のモジュールのみロード
  const { InstantViewer } = require('../src/ui/instant-viewer');
  
  // 0.1秒以内に画面表示開始
  const viewer = new InstantViewer();
  await viewer.start();
}
```

#### **段階的初期化**
```javascript
// src/ui/instant-viewer.js
class InstantViewer {
  async start() {
    // Phase 1: 即座に空画面表示（0.1秒以内）
    this.displayInitialScreen();
    this.statusDisplay.addMessage(">> Initializing cctop...");
    
    // Phase 2: 非ブロッキングでMonitor確認
    this.checkAndStartMonitor();
    
    // Phase 3: Database接続（リトライ付き）
    this.connectDatabase();
    
    // Phase 4: データのプログレッシブ読み込み
    this.loadDataProgressively();
  }
}
```

### **2. Monitor起動者記録機能**

#### **PIDファイル拡張**
```javascript
// src/monitors/process-manager.js
class ProcessManager {
  async startMonitor(options = {}) {
    const pidData = {
      pid: process.pid,
      started_by: options.started_by || "standalone",
      started_at: Math.floor(Date.now() / 1000),
      config_path: this.configPath
    };
    
    await fs.writeFile('.cctop/monitor.pid', JSON.stringify(pidData, null, 2));
  }
  
  async checkMonitorStatus() {
    try {
      const pidData = JSON.parse(await fs.readFile('.cctop/monitor.pid'));
      const isRunning = await this.isProcessRunning(pidData.pid);
      return { running: isRunning, ...pidData };
    } catch (error) {
      return { running: false };
    }
  }
}
```

#### **Monitor終了制御**
```javascript
// Viewer終了時の処理
async function onViewerExit() {
  const status = await processManager.checkMonitorStatus();
  
  if (status.running && status.started_by === "viewer") {
    // Viewerが起動したMonitorは停止
    await processManager.stopMonitor();
    statusDisplay.addMessage(">> Monitor stopped (started by viewer)");
  } else if (status.running && status.started_by === "standalone") {
    // 独立起動Monitorは継続
    statusDisplay.addMessage(">> Monitor continues running (standalone)");
  }
}
```

### **3. プログレッシブデータ読み込み**

#### **非ブロッキングデータ読み込み**
```javascript
// src/database/progressive-loader.js
class ProgressiveLoader {
  async loadData() {
    const stream = this.database.createEventStream();
    
    stream.on('data', (events) => {
      // データが到着次第、即座に表示更新
      this.displayManager.addEvents(events);
      this.statusDisplay.updateMessage(
        `>> Loading existing events... (${events.length} loaded)`
      );
    });
    
    stream.on('end', () => {
      this.statusDisplay.addMessage(">> Ready - Monitoring active");
    });
  }
}
```

### **4. FUNC-205連携実装**

#### **ステータスメッセージ表示**
```javascript
// 各フェーズでのメッセージ表示
const STARTUP_MESSAGES = {
  initializing: ">> Initializing cctop...",
  checking_monitor: ">> Checking monitor status...",
  starting_monitor: ">> Starting background monitor...",
  monitor_running: ">> Background monitor already running",
  connecting_db: ">> Connecting to database...",
  loading_data: ">> Loading existing events...",
  ready: ">> Ready - Monitoring active"
};

// エラー時のメッセージ
const ERROR_MESSAGES = {
  db_connection_failed: "!! Database connection failed, retrying...",
  monitor_start_failed: "!! Monitor start failed, running in read-only mode"
};
```

## 🔧 実装ガイドライン

### **ファイル構成**
```
src/
├── ui/
│   ├── instant-viewer.js          # 新規作成（即時表示制御）
│   └── progressive-loader.js      # 新規作成（プログレッシブ読み込み）
├── monitors/
│   └── process-manager.js         # 既存拡張（PIDファイル拡張）
└── utils/
    └── startup-timer.js           # 新規作成（起動時間測定）
```

### **既存ファイル連携**
- **FUNC-202**: CLI表示機能を拡張利用
- **FUNC-205**: ステータスメッセージ表示に活用
- **FUNC-003**: Monitor起動・管理機能を拡張

### **パフォーマンス要件**
- Viewer起動時間: < 100ms
- 初期画面表示: < 100ms  
- Monitor状態確認: < 500ms
- Database接続: < 1000ms（リトライ含む）

## 🧪 実装確認項目

### **1. 即応性テスト**
- [ ] `cctop`実行から0.1秒以内に画面表示
- [ ] 初期化メッセージが即座に表示される
- [ ] Monitor起動待機でブロックしない

### **2. Monitor管理テスト**
- [ ] Monitor未起動時: 自動起動でstarted_by="viewer"記録
- [ ] Monitor既起動時: 起動者情報を維持
- [ ] PIDファイルのJSON形式が正しい

### **3. 終了制御テスト**
- [ ] Viewer起動Monitor: Viewer終了でMonitorも停止
- [ ] Standalone Monitor: Viewer終了でMonitorは継続
- [ ] 正常終了・異常終了両方での動作確認

### **4. プログレッシブ読み込みテスト**
- [ ] データが到着次第、即座に画面に反映
- [ ] FUNC-205ステータスエリアに進捗表示
- [ ] エラー時もリトライ状況を表示

## 📊 成功基準

1. **即応性**: 0.1秒以内の視覚的フィードバック
2. **透明性**: 起動プロセスの各段階が明確に表示
3. **制御性**: Monitor終了制御が期待通りに動作
4. **堅牢性**: エラー時も画面を維持し適切な情報提供

## 🔗 参考資料

- **FUNC-206仕様書**: `documents/visions/functions/FUNC-206-instant-view-progressive-loading.md`
- **FUNC-003仕様書**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`
- **FUNC-205仕様書**: `documents/visions/functions/FUNC-205-status-display-area.md`

## ⚠️ 重要事項

1. **ユーザー体験最優先**: この機能はユーザー体験向上の核心機能です
2. **非ブロッキング必須**: すべての重い処理は非ブロッキングで実装
3. **エラー耐性**: 接続失敗時も画面を維持し、適切な情報提供
4. **既存機能活用**: FUNC-202/205の既存機能を最大限活用

---

**完了時の報告事項**:
- 実装完了したファイル一覧
- パフォーマンス測定結果（起動時間等）
- 動作確認結果（各テストケース）
- 発見した課題や改善提案
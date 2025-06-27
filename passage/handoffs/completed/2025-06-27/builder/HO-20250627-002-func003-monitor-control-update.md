# HO-20250627-002: FUNC-003 Monitor終了制御機能更新

**作成日**: 2025年6月27日 01:30  
**期限**: 2025年6月28日 16:00  
**優先度**: Medium  
**作成者**: Architect Agent  
**対象**: Builder Agent  

## 📋 更新要求概要

FUNC-003「Background Activity Monitor」に Monitor起動者記録・終了制御機能を追加してください。これにより「気持ちの良い」Monitor管理を実現します。

## 🎯 更新対象

### **主要更新項目**
1. **PIDファイル形式拡張**（JSON形式・起動者記録）
2. **Monitor終了制御ロジック**（起動者による制御）
3. **起動者判定機能**
4. **プロセス管理強化**

## 📝 技術仕様

### **1. PIDファイル形式拡張**

#### **新しいPIDファイル形式**
```json
// .cctop/monitor.pid
{
  "pid": 12345,
  "started_by": "viewer",  // "viewer" or "standalone"
  "started_at": 1719456789,
  "config_path": "/path/to/.cctop/config.json"
}
```

#### **従来との互換性**
```javascript
// src/monitors/process-manager.js
class ProcessManager {
  async readPidFile() {
    try {
      const content = await fs.readFile('.cctop/monitor.pid', 'utf8');
      
      // 新形式（JSON）の場合
      if (content.startsWith('{')) {
        return JSON.parse(content);
      }
      
      // 従来形式（数値のみ）の場合
      const pid = parseInt(content.trim());
      return {
        pid,
        started_by: "unknown",  // 従来起動は不明扱い
        started_at: null,
        config_path: null
      };
    } catch (error) {
      return null;
    }
  }
  
  async writePidFile(pidData) {
    const content = JSON.stringify(pidData, null, 2);
    await fs.writeFile('.cctop/monitor.pid', content);
  }
}
```

### **2. Monitor起動・終了制御**

#### **起動時の記録**
```javascript
// Monitor起動時
async function startMonitor(options = {}) {
  const pidData = {
    pid: process.pid,
    started_by: options.started_by || "standalone",
    started_at: Math.floor(Date.now() / 1000),
    config_path: this.getConfigPath()
  };
  
  await this.writePidFile(pidData);
  
  // ログに記録
  this.logger.info(`Monitor started by: ${pidData.started_by}`);
}
```

#### **Viewer終了時の制御ロジック**
```javascript
// src/ui/viewer-process.js
class ViewerProcess {
  async onExit() {
    const monitorStatus = await this.processManager.checkMonitorStatus();
    
    if (monitorStatus.running && monitorStatus.started_by === "viewer") {
      // Viewerが起動したMonitorは停止
      await this.processManager.stopMonitor();
      this.logger.info("Monitor stopped (started by viewer)");
      
    } else if (monitorStatus.running && monitorStatus.started_by === "standalone") {
      // 独立起動Monitorは継続
      this.logger.info("Monitor continues running (started standalone)");
      
    } else if (monitorStatus.running && monitorStatus.started_by === "unknown") {
      // 不明起動は継続（安全側）
      this.logger.info("Monitor continues running (unknown origin)");
    }
  }
}
```

### **3. 状態確認・判定機能**

#### **Monitor状態確認の拡張**
```javascript
// src/monitors/process-manager.js
async function checkMonitorStatus() {
  const pidData = await this.readPidFile();
  
  if (!pidData) {
    return { running: false };
  }
  
  const isRunning = await this.isProcessRunning(pidData.pid);
  
  if (!isRunning) {
    // プロセスが死んでいる場合はPIDファイル削除
    await this.cleanupPidFile();
    return { running: false };
  }
  
  return {
    running: true,
    pid: pidData.pid,
    started_by: pidData.started_by,
    started_at: pidData.started_at,
    config_path: pidData.config_path,
    uptime: Date.now() / 1000 - pidData.started_at
  };
}
```

#### **プロセス存在確認**
```javascript
async function isProcessRunning(pid) {
  try {
    // PIDの存在確認（kill -0）
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') {
      // プロセスが存在しない
      return false;
    }
    // その他のエラー（権限不足等）
    throw error;
  }
}
```

### **4. Signal Handling強化**

#### **適切なシグナル処理**
```javascript
// src/monitors/monitor-process.js
class MonitorProcess {
  setupSignalHandlers() {
    // 通常終了シグナル
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    
    // アプリケーション定義シグナル
    process.on('SIGUSR1', () => this.reloadConfig());
    process.on('SIGUSR2', () => this.dumpStatus());
  }
  
  async gracefulShutdown(signal) {
    this.logger.info(`Received ${signal}, shutting down gracefully...`);
    
    // 1. 新規イベント監視停止
    await this.watcher.close();
    
    // 2. 未処理イベントを処理
    await this.flushPendingEvents();
    
    // 3. データベース接続クローズ
    await this.database.close();
    
    // 4. PIDファイル削除
    await this.cleanupPidFile();
    
    this.logger.info('Monitor shutdown completed');
    process.exit(0);
  }
}
```

## 🔧 実装ガイドライン

### **更新対象ファイル**
```
src/monitors/
├── process-manager.js     # 既存拡張（PIDファイル・制御ロジック）
├── monitor-process.js     # 既存拡張（シグナルハンドリング）
└── pid-file-manager.js    # 新規作成（PIDファイル専用管理）

src/ui/
└── viewer-process.js      # 既存拡張（終了時制御）

test/monitors/
├── process-manager.test.js      # PIDファイル・制御テスト
└── monitor-lifecycle.test.js    # 起動・終了ライフサイクルテスト
```

### **設定ファイル拡張**
```json
// .cctop/config.json に追加
{
  "monitoring": {
    "backgroundMonitor": {
      "pidFile": {
        "format": "json",           // "json" or "simple"
        "includeMetadata": true     // 起動者情報等の記録
      },
      "shutdown": {
        "gracefulTimeout": 10000,   // 10秒
        "forceKillTimeout": 5000    // 5秒
      }
    }
  }
}
```

## 🧪 実装確認項目

### **1. PIDファイル機能確認**
- [ ] JSON形式での正確な記録
- [ ] 従来形式との互換性維持
- [ ] ファイル破損時の適切な処理

### **2. 起動・終了制御確認**
```bash
# テストシナリオ1: Viewer起動Monitor
$ cctop &                    # Viewerでmonitor起動
$ cat .cctop/monitor.pid     # started_by="viewer"確認
$ kill $VIEWER_PID           # Viewer終了
$ ps aux | grep monitor      # Monitor停止確認

# テストシナリオ2: Standalone Monitor
$ cctop-monitor &            # Monitor独立起動
$ cat .cctop/monitor.pid     # started_by="standalone"確認
$ cctop                      # Viewer起動
$ kill $VIEWER_PID           # Viewer終了
$ ps aux | grep monitor      # Monitor継続確認
```

### **3. 異常系処理確認**
- [ ] PIDファイル破損時の回復
- [ ] Monitor異常終了時のクリーンアップ
- [ ] 権限不足時の適切なエラー処理

### **4. 既存機能回帰確認**
- [ ] 従来のMonitor機能が正常動作
- [ ] ファイル監視機能の継続性
- [ ] データベース書き込みの正確性

## 📊 テスト要件

### **単体テスト**
```javascript
// test/monitors/process-manager.test.js
describe('ProcessManager', () => {
  test('PIDファイルJSON形式記録', async () => {
    const pidData = {
      pid: 12345,
      started_by: "viewer",
      started_at: Math.floor(Date.now() / 1000),
      config_path: "/test/.cctop/config.json"
    };
    
    await processManager.writePidFile(pidData);
    const read = await processManager.readPidFile();
    
    expect(read).toEqual(pidData);
  });
  
  test('従来形式互換性', async () => {
    await fs.writeFile('.cctop/monitor.pid', '12345');
    const read = await processManager.readPidFile();
    
    expect(read.pid).toBe(12345);
    expect(read.started_by).toBe("unknown");
  });
});
```

### **統合テスト**
- Monitor起動→Viewer起動→Viewer終了のフルサイクル
- 複数Viewerインスタンスでの動作確認
- 長時間動作でのPIDファイル整合性

## 🔗 参考資料

- **FUNC-003更新仕様**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`
- **既存実装**: `src/monitors/`ディレクトリ内の現在の実装

## ⚠️ 重要事項

1. **後方互換性**: 既存のPIDファイル形式との互換性必須
2. **安全側制御**: 不明な起動者の場合は継続実行（停止しない）
3. **ログ記録**: 起動者情報・制御判定をログに詳細記録
4. **テスト重視**: 「気持ちの良さ」は主観的なため、客観的テストで担保

---

**完了時の報告事項**:
- 更新したファイル一覧
- テスト実行結果
- 従来機能の回帰確認結果
- 新機能の動作確認結果
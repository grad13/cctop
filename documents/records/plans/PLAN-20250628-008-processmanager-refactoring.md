# process-manager.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-008  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: High  
**Phase**: Phase 2 - 中成功率ファイル（65%成功見込み）  
**対象ファイル**: `src/monitors/process-manager.ts` (446行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-003 Process Manager準拠、PIDファイル管理・プロセス制御
- **責務**: プロセス起動・停止、PIDファイル管理、ログ管理、ライフサイクル制御
- **依存関係**: Node.js child_process、fs、path
- **TypeScript状況**: interface定義済み、Promise型活用済み

### 現在の責務（詳細分析済み）
1. **プロセス制御** (~140行): 起動・停止・状態確認・Orphan処理
2. **PIDファイル管理** (~120行): 保存・読み込み・削除・検証
3. **ログ管理** (~80行): ログ出力・ローテーション・クリーンアップ
4. **プロセス監視** (~80行): 生存確認・タイムアウト・強制終了
5. **初期化・設定** (~40行): ディレクトリ作成・設定管理

### 分解の容易さ評価
- ✅ **明確な責務分離**: PID・ログ・プロセス制御が独立性高い
- ✅ **interface定義済み**: ProcessStatus、PidInfo等の型完備
- ⚠️ **中程度の課題**: プロセス間通信、ファイルシステム操作の複雑性
- ⚠️ **潜在的課題**: 非同期処理の競合状態、プラットフォーム依存の処理

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. プロセス型定義・基盤 (60行程度)
src/monitors/types/ProcessTypes.ts
export interface PidInfo {
  pid: number;
  started_by: string;
  started_at: number | null;
  startTime: string | null;
  scriptPath: string | null;
  processName?: string;
  parentPid?: number;
  config_path: string | null;
}

export interface ProcessStatus {
  status: 'running' | 'stopped' | 'stale' | 'error';
  running: boolean;
  pid: number | null;
  started_by?: string;
  started_at?: number;
  startTime: string | null;
  scriptPath?: string;
  config_path?: string;
  uptime?: number;
  error?: string;
}

export interface StartOptions {
  started_by?: string;
  configFile?: string;
  logLevel?: string;
  [key: string]: any;
}

export interface ProcessManagerConfig {
  baseDir?: string;
  processName?: string;
  maxLogSize?: number;
  logRetentionCount?: number;
  processTimeout?: number;
}

export type ProcessSignal = 'SIGTERM' | 'SIGKILL' | 'SIGINT';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 2. PIDファイル管理 (120行程度)
src/monitors/managers/PidFileManager.ts
export class PidFileManager {
  private pidFile: string;
  private processName: string;

  constructor(config: ProcessManagerConfig = {}) {
    const baseDir = config.baseDir || './.cctop';
    this.pidFile = path.join(baseDir, 'monitor.pid');
    this.processName = config.processName || 'cctop-monitor';
  }

  async savePidInfo(pid: number, scriptPath: string, options: StartOptions = {}): Promise<void> {
    const pidInfo: PidInfo = {
      pid: pid,
      started_by: options.started_by || 'standalone',
      started_at: Math.floor(Date.now() / 1000),
      startTime: new Date().toISOString(),
      scriptPath: scriptPath,
      processName: this.processName,
      parentPid: process.pid,
      config_path: options.configFile || '.cctop/config.json'
    };

    try {
      await fs.writeFile(this.pidFile, JSON.stringify(pidInfo, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save PID file: ${error.message}`);
    }
  }

  async getPidInfo(): Promise<PidInfo | null> {
    try {
      const content = await fs.readFile(this.pidFile, 'utf8');
      
      // Handle JSON format (new) vs plain PID (legacy)
      if (content.trim().startsWith('{')) {
        return JSON.parse(content);
      }
      
      // Legacy format: just PID number
      const pid = parseInt(content.trim());
      if (!isNaN(pid)) {
        return {
          pid: pid,
          started_by: 'unknown',
          started_at: null,
          startTime: null,
          scriptPath: null,
          config_path: null
        };
      }
      
      return null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw new Error(`Failed to read PID file: ${error.message}`);
    }
  }

  async removePidFile(): Promise<void> {
    try {
      await fs.unlink(this.pidFile);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to remove PID file: ${error.message}`);
      }
      // Ignore ENOENT - file doesn't exist
    }
  }

  async validatePidFile(): Promise<boolean> {
    const pidInfo = await this.getPidInfo();
    if (!pidInfo) {
      return false;
    }

    // Validate PID format
    if (!Number.isInteger(pidInfo.pid) || pidInfo.pid <= 0) {
      return false;
    }

    // Validate timestamps (if present)
    if (pidInfo.started_at && pidInfo.started_at > Math.floor(Date.now() / 1000)) {
      return false; // Future timestamp
    }

    return true;
  }

  getPidFilePath(): string {
    return this.pidFile;
  }

  // Debugging support
  async getPidFileStats(): Promise<object> {
    try {
      const stats = await fs.stat(this.pidFile);
      const pidInfo = await this.getPidInfo();
      
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        valid: await this.validatePidFile(),
        pidInfo: pidInfo
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }
}

// 3. プロセス制御 (140行程度)
src/monitors/controllers/ProcessController.ts
export class ProcessController {
  private config: ProcessManagerConfig;
  private timeout: number;

  constructor(config: ProcessManagerConfig = {}) {
    this.config = config;
    this.timeout = config.processTimeout || 5000;
  }

  async startProcess(scriptPath: string, options: StartOptions = {}): Promise<number> {
    try {
      // Validate script path
      if (!await this.validateScriptPath(scriptPath)) {
        throw new Error(`Invalid script path: ${scriptPath}`);
      }

      // Kill any orphaned processes first
      await this.killOrphanedProcesses(scriptPath);

      // Create lock to prevent race conditions
      const lockFile = `${scriptPath}.lock`;
      await this.createLock(lockFile);

      let pid: number;
      try {
        // Spawn process
        const child = spawn('node', [scriptPath], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
          cwd: process.cwd()
        });

        child.unref();
        pid = child.pid!;

        if (!pid) {
          throw new Error('Failed to get PID from spawned process');
        }

        // Wait briefly to ensure process started successfully
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!await this.isProcessRunning(pid)) {
          throw new Error('Process failed to start or exited immediately');
        }

      } finally {
        // Always remove lock
        await this.removeLock(lockFile);
      }

      return pid;
    } catch (error) {
      throw new Error(`Process start failed: ${error.message}`);
    }
  }

  async stopProcess(pid: number, graceful: boolean = true): Promise<boolean> {
    if (!await this.isProcessRunning(pid)) {
      return true; // Already stopped
    }

    try {
      if (graceful) {
        // Send SIGTERM first
        process.kill(pid, 'SIGTERM');
        
        // Wait for graceful shutdown
        const exited = await this.waitForProcessExit(pid, this.timeout);
        
        if (exited) {
          return true;
        }
      }

      // Force kill if still running
      if (await this.isProcessRunning(pid)) {
        process.kill(pid, 'SIGKILL');
        
        // Brief wait for force kill
        await this.waitForProcessExit(pid, 1000);
        
        return !await this.isProcessRunning(pid);
      }

      return true;
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return true; // Process doesn't exist
      }
      throw new Error(`Process stop failed: ${error.message}`);
    }
  }

  async isProcessRunning(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0); // Signal 0 checks existence without killing
      return true;
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return false;
      }
      
      // Permission error - try alternative check
      if (error.code === 'EPERM') {
        return await this.checkProcessAlternative(pid);
      }
      
      return false;
    }
  }

  async waitForProcessExit(pid: number, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (!await this.isProcessRunning(pid)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  async killOrphanedProcesses(scriptPath: string): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Find processes running the same script
      const psCommand = `ps aux | grep "${scriptPath}" | grep -v grep | awk '{print $2}'`;
      const output = execSync(psCommand, { encoding: 'utf8' }).trim();
      
      if (!output) {
        return; // No processes found
      }

      const pids = output
        .split('\n')
        .map(pid => parseInt(pid.trim()))
        .filter(pid => pid && pid !== process.pid);

      for (const pid of pids) {
        try {
          await this.stopProcess(pid, false); // Force kill orphans
        } catch (error) {
          // Ignore errors for orphan cleanup
        }
      }
    } catch (error) {
      // Platform-specific command may fail, ignore
    }
  }

  // Private helpers
  private async validateScriptPath(scriptPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(scriptPath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  private async createLock(lockFile: string): Promise<void> {
    try {
      await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        throw new Error('Another process is already starting');
      }
      throw error;
    }
  }

  private async removeLock(lockFile: string): Promise<void> {
    try {
      await fs.unlink(lockFile);
    } catch (error) {
      // Ignore lock removal errors
    }
  }

  private async checkProcessAlternative(pid: number): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      const result = execSync(`ps -p ${pid} -o pid=`, { encoding: 'utf8' });
      return result.trim() === pid.toString();
    } catch (error) {
      return false;
    }
  }

  // Status and debugging
  getControllerStatus(): object {
    return {
      timeout: this.timeout,
      config: this.config
    };
  }
}

// 4. ログ管理 (80行程度)
src/monitors/loggers/ProcessLogger.ts
export class ProcessLogger {
  private logFile: string;
  private logDir: string;
  private maxLogSize: number;
  private retentionCount: number;

  constructor(config: ProcessManagerConfig = {}) {
    const baseDir = config.baseDir || './.cctop';
    this.logDir = path.join(baseDir, 'logs');
    this.logFile = path.join(this.logDir, 'monitor.log');
    this.maxLogSize = config.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.retentionCount = config.logRetentionCount || 3;
  }

  async log(level: LogLevel, message: string): Promise<void> {
    try {
      await this.ensureLogDirectory();
      
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      
      await fs.appendFile(this.logFile, logEntry, 'utf8');
      
      // Also log to console in verbose mode
      if (process.env.CCTOP_VERBOSE || process.env.NODE_ENV === 'test') {
        console.log(`[ProcessLogger] ${logEntry.trim()}`);
      }

      // Check if rotation is needed
      await this.checkRotation();
    } catch (error: any) {
      // Fallback to console if file logging fails
      console.error(`[ProcessLogger] File logging failed: ${error.message}`);
      console.log(`[ProcessLogger] [${level.toUpperCase()}] ${message}`);
    }
  }

  async getRecentLogs(lines: number = 50): Promise<string[]> {
    try {
      const logData = await fs.readFile(this.logFile, 'utf8');
      const logLines = logData.trim().split('\n');
      return logLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  async rotateLogs(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size <= this.maxLogSize) {
        return; // No rotation needed
      }

      const backupFile = `${this.logFile}.${Date.now()}.bak`;
      await fs.rename(this.logFile, backupFile);
      
      await this.log('info', `Log rotated to: ${path.basename(backupFile)}`);
      
      // Clean up old backups
      await this.cleanupOldLogs();
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        await this.log('error', `Log rotation failed: ${error.message}`);
      }
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logFile, '', 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to clear logs: ${error.message}`);
    }
  }

  getLogPath(): string {
    return this.logFile;
  }

  // Private helpers
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create log directory: ${error.message}`);
      }
    }
  }

  private async checkRotation(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size > this.maxLogSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // Ignore stat errors
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const backupFiles = files
        .filter(file => file.startsWith('monitor.log.') && file.endsWith('.bak'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          timestamp: parseInt(file.split('.')[2])
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Remove old backups beyond retention count
      const filesToDelete = backupFiles.slice(this.retentionCount);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        await this.log('info', `Deleted old log backup: ${file.name}`);
      }
    } catch (error: any) {
      await this.log('error', `Failed to cleanup old logs: ${error.message}`);
    }
  }

  // Status and debugging
  async getLoggerStatus(): Promise<object> {
    try {
      const stats = await fs.stat(this.logFile);
      const files = await fs.readdir(this.logDir);
      const backupCount = files.filter(f => f.endsWith('.bak')).length;
      
      return {
        logFile: this.logFile,
        size: stats.size,
        maxSize: this.maxLogSize,
        needsRotation: stats.size > this.maxLogSize,
        backupCount: backupCount,
        retentionCount: this.retentionCount
      };
    } catch (error) {
      return {
        logFile: this.logFile,
        error: error.message
      };
    }
  }
}

// 5. 統合プロセス管理 (50行程度)
src/monitors/ProcessManager.ts
export class ProcessManager {
  private pidManager: PidFileManager;
  private processController: ProcessController;
  private logger: ProcessLogger;
  private config: ProcessManagerConfig;

  constructor(config: ProcessManagerConfig = {}) {
    this.config = config;
    this.pidManager = new PidFileManager(config);
    this.processController = new ProcessController(config);
    this.logger = new ProcessLogger(config);
  }

  // 既存API完全互換
  async startMonitor(monitorScriptPath: string, options: StartOptions = {}): Promise<number> {
    try {
      // Check for existing process
      const existingPid = await this.getMonitorPid();
      if (existingPid && await this.processController.isProcessRunning(existingPid)) {
        await this.logger.log('info', `Monitor already running with PID: ${existingPid}`);
        return existingPid;
      }

      // Clean up stale PID file
      if (existingPid) {
        await this.pidManager.removePidFile();
        await this.logger.log('info', `Cleaned up stale PID file: ${existingPid}`);
      }

      // Start new process
      const pid = await this.processController.startProcess(monitorScriptPath, options);
      
      // Save PID info
      await this.pidManager.savePidInfo(pid, monitorScriptPath, options);
      await this.logger.log('info', `Monitor process started with PID: ${pid}`);

      return pid;
    } catch (error: any) {
      await this.logger.log('error', `Failed to start monitor: ${error.message}`);
      throw error;
    }
  }

  async stopMonitor(): Promise<boolean> {
    try {
      const pid = await this.getMonitorPid();
      
      if (!pid) {
        await this.logger.log('info', 'No monitor process found');
        return false;
      }

      const stopped = await this.processController.stopProcess(pid);
      
      if (stopped) {
        await this.pidManager.removePidFile();
        await this.logger.log('info', `Monitor process stopped: ${pid}`);
      } else {
        await this.logger.log('warn', `Failed to stop monitor process: ${pid}`);
      }

      return stopped;
    } catch (error: any) {
      await this.logger.log('error', `Failed to stop monitor: ${error.message}`);
      throw error;
    }
  }

  async getMonitorStatus(): Promise<ProcessStatus> {
    try {
      const pidInfo = await this.pidManager.getPidInfo();
      if (!pidInfo) {
        return { status: 'stopped', pid: null, startTime: null, running: false };
      }

      const isRunning = await this.processController.isProcessRunning(pidInfo.pid);
      
      const uptime = isRunning && pidInfo.started_at 
        ? Math.floor(Date.now() / 1000) - pidInfo.started_at 
        : null;
      
      return {
        status: isRunning ? 'running' : 'stale',
        running: isRunning,
        pid: pidInfo.pid,
        started_by: pidInfo.started_by || 'unknown',
        started_at: pidInfo.started_at || undefined,
        startTime: pidInfo.startTime || null,
        scriptPath: pidInfo.scriptPath || undefined,
        config_path: pidInfo.config_path || undefined,
        uptime: uptime || undefined
      };
    } catch (error: any) {
      await this.logger.log('error', `Failed to get monitor status: ${error.message}`);
      return { status: 'error', pid: null, startTime: null, running: false, error: error.message };
    }
  }

  async getMonitorPid(): Promise<number | null> {
    const pidInfo = await this.pidManager.getPidInfo();
    return pidInfo ? pidInfo.pid : null;
  }

  // Delegate to logger
  async log(level: string, message: string): Promise<void> {
    await this.logger.log(level as LogLevel, message);
  }

  async getRecentLogs(lines: number = 50): Promise<string[]> {
    return await this.logger.getRecentLogs(lines);
  }

  async rotateLogs(maxSizeBytes: number = this.logger['maxLogSize']): Promise<void> {
    await this.logger.rotateLogs();
  }

  // 新規: 統合ステータス
  async getIntegratedStatus(): Promise<object> {
    return {
      process: await this.getMonitorStatus(),
      pidFile: await this.pidManager.getPidFileStats(),
      logger: await this.logger.getLoggerStatus(),
      controller: this.processController.getControllerStatus()
    };
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 5: process-manager.ts分解 (6-8日)

#### **Day 1**: 型定義・基盤整備
- ProcessTypes.ts作成・既存interface統合
- プラットフォーム依存処理の抽象化検討
- **予期しない課題**: プラットフォーム固有API差異 (+0.5日)

#### **Day 2**: PIDファイル管理クラス実装
- PidFileManager.ts実装・テスト
- JSON/Legacy形式の互換性確保
- **予期しない課題**: ファイル競合状態・権限問題 (+0.5日)

#### **Day 3**: プロセス制御クラス実装
- ProcessController.ts実装・テスト
- プロセス起動・停止・監視ロジック
- **予期しない課題**: プロセス間通信の複雑化 (+1日)

#### **Day 4**: ログ管理クラス実装
- ProcessLogger.ts実装・テスト
- ログローテーション・クリーンアップ
- **予期しない課題**: ファイルI/O性能問題 (+0.5日)

#### **Day 5**: 統合プロセス管理実装
- ProcessManager.ts実装・既存API互換確認
- コンポーネント間の連携テスト
- **予期しない課題**: 初期化順序・依存関係問題 (+0.5日)

#### **Day 6**: 統合テスト・信頼性確認
- プロセス制御の信頼性テスト
- 異常系・エラー回復テスト
- **予期しない課題**: 実環境での予期しない挙動 (+1日)

#### **Day 7-8**: バッファ・品質確認
- 長時間稼働テスト
- プラットフォーム互換性確認
- ドキュメント更新

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **プロセス間通信の複雑性** (発生確率: 50%)
- **課題**: 非同期プロセス操作の競合状態・デッドロック
- **対策**: ロック機構、タイムアウト設定、状態管理強化
- **代替案**: より単純な同期的処理への変更

#### 2. **ファイルシステム競合** (発生確率: 40%)
- **課題**: PIDファイル・ログファイルへの同時アクセス
- **対策**: ファイルロック、atomic操作、リトライ機構
- **代替案**: インメモリ状態管理への部分移行

#### 3. **プラットフォーム依存処理** (発生確率: 35%)
- **課題**: Windows/Linux/macOSでのプロセス制御差異
- **対策**: 条件分岐・抽象化レイヤー
- **代替案**: プラットフォーム固有実装の分離

### 実装上の課題

#### 4. **非同期処理の安定性** (発生確率: 30%)
- **課題**: Promise chaining、エラー伝播の複雑化
- **対策**: 明確なエラーハンドリング、状態検証
- **代替案**: より単純なコールバック方式

#### 5. **長時間稼働での安定性** (発生確率: 25%)
- **課題**: メモリリーク、ファイルハンドルリーク
- **対策**: 定期的なクリーンアップ、リソース監視
- **代替案**: 定期的な再起動機構

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- Promise型の適切な使用確認
- プラットフォーム依存型の整合性確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- プロセス制御の信頼性テスト（起動・停止・監視）
- 異常系テスト（プロセス異常終了・ファイル競合）
- 長時間稼働テスト（24時間以上）

### 性能品質チェック
- プロセス起動時間（±10%以内）
- ログ書き込み性能（バッチ処理）
- メモリ使用量監視（リーク検出）

## 📈 期待効果

### 開発効率向上
- **プロセス制御機能追加**: 40-60%効率化（ProcessController独立）
- **ログ機能修正**: 50-70%効率化（ProcessLogger独立）
- **PID管理機能**: 60-80%効率化（PidFileManager独立）

### 保守性向上
- **単体テスト**: 各コンポーネントの独立テスト可能
- **信頼性**: プロセス制御問題の特定・修正容易
- **拡張性**: 新しいプロセス管理機能追加容易

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存ProcessManager APIの100%互換性維持
- [ ] プロセス制御の信頼性確認（起動・停止・監視）
- [ ] ファイル操作の安全性確認（競合状態回避）
- [ ] 長時間稼働での安定性確認
- [ ] 既存テストスイート全パス
- [ ] 新規単体テスト80%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- プロセス制御の信頼性に重大な問題
- ファイルシステム操作で競合状態が解決困難
- 長時間稼働での安定性に問題

### ロールバック手順
1. 元の process-manager.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. プロセス制御機能の動作確認

---

**次のステップ**: InteractiveFeatures.ts完了後実行開始  
**所要時間**: 6-8日（バッファ含む）  
**成功確率**: 65%（プロセス間通信・ファイル競合に注意）
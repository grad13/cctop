/**
 * CLI Display (ui001準拠)
 * 機能6: リアルタイムファイルイベント表示
 */

const chalk = require('chalk');
const EventEmitter = require('events');

class CLIDisplay extends EventEmitter {
  constructor(databaseManager, displayConfig = {}) {
    super();
    this.db = databaseManager;
    this.displayMode = displayConfig.mode || 'all'; // 'all' or 'unique'
    this.maxLines = displayConfig.maxEvents; // config.jsonから必ず来る
    this.events = [];
    this.uniqueEvents = new Map(); // fileName -> latest event
    this.isRunning = false;
    this.refreshInterval = null;
    this.displayConfig = displayConfig;
    
    // レスポンシブディレクトリ表示用の幅設定
    this.widthConfig = this.calculateDynamicWidth();
    
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log('🖥️ CLIDisplay initialized');
    }
    this.setupKeyboardHandlers();
    this.setupResizeHandler();
  }

  /**
   * 表示開始
   */
  start() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // 初期データ取得
    this.loadInitialEvents();
    
    // リアルタイム表示開始
    this.startRefreshLoop();
    
    // ヘルプ表示
    // this.showInitialHelp();
    
    if (process.env.NODE_ENV === 'test') {
      console.log('📺 CLI Display started');
    }
  }

  /**
   * 表示停止
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // 標準入力のrawモードを解除
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    
    console.log('📺 CLI Display stopped');
  }

  /**
   * イベント追加（EventProcessorから呼ばれる）
   */
  addEvent(eventData) {
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_DEBUG) {
      console.log('[CLIDisplay] Adding event:', eventData.event_type, 'for', eventData.file_name);
    }
    
    this.events.unshift(eventData);
    
    // 最大行数を超えた場合は古いイベントを削除
    if (this.events.length > this.maxLines * 2) {
      this.events = this.events.slice(0, this.maxLines * 2);
    }
    
    // Uniqueモード用のマップ更新
    const fileName = eventData.file_name;
    this.uniqueEvents.set(fileName, eventData);
  }

  /**
   * 初期データ取得
   */
  async loadInitialEvents() {
    try {
      const recentEvents = await this.db.getRecentEvents(this.maxLines);
      this.events = recentEvents;
      
      // Uniqueモード用のマップ構築
      for (const event of recentEvents) {
        this.uniqueEvents.set(event.file_name, event);
      }
    } catch (error) {
      console.error('Failed to load initial events:', error);
    }
  }

  /**
   * リアルタイム表示ループ
   */
  startRefreshLoop() {
    // 初回表示
    this.render();
    
    this.refreshInterval = setInterval(() => {
      this.render();
    }, 1000); // 1秒間隔でリフレッシュ
  }

  /**
   * 画面レンダリング
   */
  render() {
    if (!this.isRunning) {
      return;
    }
    
    // 画面クリア（完全クリア）
    console.clear();
    
    // ヘッダー表示
    this.renderHeader();
    
    // イベント一覧表示
    this.renderEvents();
    
    // フッター表示
    this.renderFooter();
  }

  /**
   * ヘッダー表示
   */
  renderHeader() {
    const directoryHeaderWidth = this.widthConfig.directory;
    const directoryHeader = 'Directory'.padEnd(directoryHeaderWidth);
    const header = `Modified               Elapsed  File Name                    Event    Lines Blocks ${directoryHeader}`;
    const separator = '─'.repeat(this.widthConfig.terminal || 97);
    
    process.stdout.write(chalk.bold(header) + '\n');
    process.stdout.write(chalk.gray(separator) + '\n');
  }

  /**
   * イベント一覧表示
   */
  renderEvents() {
    const eventsToShow = this.getEventsToDisplay();
    
    for (let i = 0; i < Math.min(eventsToShow.length, this.maxLines); i++) {
      const event = eventsToShow[i];
      this.renderEventLine(event);
    }
    
    // 空行で埋める
    const remainingLines = this.maxLines - Math.min(eventsToShow.length, this.maxLines);
    for (let i = 0; i < remainingLines; i++) {
      process.stdout.write('\n');
    }
  }

  /**
   * 表示するイベント取得
   */
  getEventsToDisplay() {
    if (this.displayMode === 'unique') {
      // Uniqueモード: ファイルごとに最新のみ
      return Array.from(this.uniqueEvents.values())
        .sort((a, b) => b.timestamp - a.timestamp);
    } else {
      // Allモード: すべてのイベント
      return this.events;
    }
  }

  /**
   * イベント行表示
   */
  renderEventLine(event) {
    const timestamp = new Date(event.timestamp);
    const now = new Date();
    
    
    // 各カラムのフォーマット
    const modified = this.formatTimestamp(timestamp);
    const elapsed = this.formatElapsed(now - timestamp);
    const fileName = this.truncateString(event.file_name, 28);
    const directory = this.truncateDirectoryPath(this.formatDirectory(event.directory), this.widthConfig.directory);
    const eventType = this.formatEventType(event.event_type);
    const lines = this.formatNumber(event.line_count, 5);
    const blocks = this.formatNumber(event.block_count, 6);
    
    // 行組み立て（レスポンシブレイアウト - Directory列を最右端で動的幅）
    const line = `${modified}  ${elapsed}  ${fileName}  ${eventType} ${lines} ${blocks}  ${directory}`;
    
    process.stdout.write(line + '\n');
  }

  /**
   * タイムスタンプフォーマット
   */
  formatTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 経過時間フォーマット
   */
  formatElapsed(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`.padStart(8);
    }
  }

  /**
   * ディレクトリパス短縮（UI002/UI007準拠）
   */
  formatDirectory(dirPath) {
    if (!dirPath) return './';
    
    const path = require('path');
    const cwd = process.cwd();
    
    try {
      const absoluteFullPath = path.resolve(dirPath);
      const absoluteWatchPath = path.resolve(cwd);
      
      // 監視ディレクトリ配下かチェック
      if (absoluteFullPath.startsWith(absoluteWatchPath + path.sep) || absoluteFullPath === absoluteWatchPath) {
        const relativePath = path.relative(absoluteWatchPath, absoluteFullPath);
        return relativePath ? './' + relativePath : './';
      }
      
      return dirPath; // 配下にない場合は元のパス
    } catch (error) {
      return dirPath; // エラー時は元のパス
    }
  }

  /**
   * レスポンシブディレクトリ表示用の動的幅計算
   */
  calculateDynamicWidth() {
    const terminalWidth = process.stdout.columns || 80;
    // 固定カラム: Modified(19) + Elapsed(10) + FileName(28) + Event(8) + Lines(5) + Blocks(6) + スペース(6*2=12)
    const fixedWidth = 19 + 10 + 28 + 8 + 5 + 6 + 12; // 88文字
    const directoryWidth = Math.max(10, terminalWidth - fixedWidth - 2); // 最小10文字保証、最後のスペース2文字
    
    return {
      terminal: terminalWidth,
      directory: directoryWidth
    };
  }

  /**
   * ディレクトリパスの動的切り詰め（末尾優先）
   */
  truncateDirectoryPath(path, maxWidth) {
    if (path.length <= maxWidth) {
      return path.padEnd(maxWidth);
    }
    
    // 末尾優先の切り詰め（パスの終わり部分を保持）
    const truncated = '...' + path.slice(-(maxWidth - 3));
    return truncated.padEnd(maxWidth);
  }

  /**
   * イベントタイプの色付けフォーマット
   */
  formatEventType(eventType) {
    if (!eventType) {
      eventType = 'unknown';
    }
    const formatted = eventType.padEnd(8);
    
    switch (eventType) {
      case 'find':
        return chalk.blue(formatted);
      case 'create':
        return chalk.greenBright(formatted);
      case 'modify':
        return formatted; // デフォルト色
      case 'move':
        return chalk.cyan(formatted);
      case 'delete':
        return chalk.gray(formatted);
      default:
        return formatted;
    }
  }

  /**
   * 数値フォーマット
   */
  formatNumber(value, width) {
    if (value === null || value === undefined) {
      return '-'.padStart(width);
    }
    return String(value).padStart(width);
  }

  /**
   * 文字列切り詰め
   */
  truncateString(str, maxLength) {
    if (str.length <= maxLength) {
      return str.padEnd(maxLength);
    }
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * フッター表示
   */
  renderFooter() {
    const totalEvents = this.events.length;
    const uniqueFiles = this.uniqueEvents.size;
    
    const separator = '─'.repeat(this.widthConfig.terminal || 97);
    const modeIndicator = this.displayMode === 'all' ? 'All Activities' : 'Unique Files';
    const stats = this.displayMode === 'all' 
      ? `${totalEvents} events`
      : `${uniqueFiles} files`;
    
    const statusLine = `${modeIndicator}  ${stats}`;
    const helpLine = '[a] All  [u] Unique  [q] Exit';
    
    process.stdout.write(chalk.gray(separator) + '\n');
    process.stdout.write(chalk.bold(statusLine) + '\n');
    process.stdout.write(chalk.dim(helpLine) + '\n');
  }

  /**
   * 初期ヘルプ表示
   */
  showInitialHelp() {
    console.log('');
    console.log(chalk.cyan('🎯 cctop v0.1.0.0 - File Activity Monitor'));
    console.log(chalk.dim('Press [a] for All mode, [u] for Unique mode, [q] to quit'));
    console.log('');
  }

  /**
   * キーボードハンドラー設定
   */
  setupKeyboardHandlers() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (key) => {
        this.handleKeyPress(key);
      });
    }
  }

  /**
   * ターミナルリサイズイベントハンドラー設定
   */
  setupResizeHandler() {
    if (process.stdout.isTTY) {
      process.stdout.on('resize', () => {
        this.widthConfig = this.calculateDynamicWidth();
        // 表示中の場合は再描画（パフォーマンス考慮で次のrefreshで反映）
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_DEBUG) {
          console.log(`Terminal resized: ${this.widthConfig.terminal}x? Directory width: ${this.widthConfig.directory}`);
        }
      });
    }
  }

  /**
   * キー押下処理
   */
  handleKeyPress(key) {
    switch (key) {
      case 'a':
      case 'A':
        this.setDisplayMode('all');
        break;
      case 'u':
      case 'U':
        this.setDisplayMode('unique');
        break;
      case 'q':
      case 'Q':
      case '\u0003': // Ctrl+C
        this.handleExit();
        break;
      case 's':
      case 'S':
        // TODO: Scan filter toggle
        break;
      case 'c':
      case 'C':
        // TODO: Create filter toggle
        break;
      case 'm':
      case 'M':
        // TODO: Modify filter toggle
        break;
      case 'v':
      case 'V':
        // TODO: Move filter toggle
        break;
      case 'd':
      case 'D':
        // TODO: Delete filter toggle
        break;
      case '/':
        // TODO: Search functionality
        break;
    }
  }

  /**
   * 表示モード切り替え
   */
  setDisplayMode(mode) {
    if (mode !== this.displayMode) {
      this.displayMode = mode;
      console.log(chalk.yellow(`🔄 Switched to ${mode.toUpperCase()} mode`));
    }
  }

  /**
   * 終了処理
   */
  handleExit() {
    this.stop();
    process.stdout.write('\x1b[2J\x1b[H'); // 画面クリア
    console.log(chalk.green('👋 cctop stopped'));
    
    // SIGINTイベントを発行して親プロセスに終了を通知
    process.kill(process.pid, 'SIGINT');
  }

  /**
   * 統計情報取得
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      displayMode: this.displayMode,
      totalEvents: this.events.length,
      uniqueFiles: this.uniqueEvents.size,
      maxLines: this.maxLines
    };
  }
}

module.exports = CLIDisplay;
/**
 * CLI Display (ui001準拠)
 * 機能6: リアルタイムファイルイベント表示
 */

const chalk = require('chalk');
const EventEmitter = require('events');

class CLIDisplay extends EventEmitter {
  constructor(databaseManager) {
    super();
    this.db = databaseManager;
    this.displayMode = 'all'; // 'all' or 'unique'
    this.maxLines = 30;
    this.events = [];
    this.uniqueEvents = new Map(); // fileName -> latest event
    this.isRunning = false;
    this.refreshInterval = null;
    
    console.log('🖥️ CLIDisplay initialized');
    this.setupKeyboardHandlers();
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
    const header = 'Modified               Elapsed  File Name                    Directory       Event    Lines Blocks';
    const separator = '─'.repeat(97);
    
    console.log(chalk.bold(header));
    console.log(chalk.gray(separator));
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
      console.log('');
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
    const directory = this.truncateString(this.formatDirectory(event.directory), 15);
    const eventType = this.formatEventType(event.event_type);
    const lines = this.formatNumber(event.line_count, 5);
    const blocks = this.formatNumber(event.block_count, 6);
    
    // 行組み立て（UI002準拠 - 97文字固定幅）
    const line = `${modified}  ${elapsed}  ${fileName}  ${directory} ${eventType} ${lines} ${blocks}`;
    
    console.log(line);
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
   * イベントタイプの色付けフォーマット
   */
  formatEventType(eventType) {
    if (!eventType) {
      eventType = 'unknown';
    }
    const formatted = eventType.padEnd(8);
    
    switch (eventType) {
      case 'scan':
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
    
    const separator = '─'.repeat(97);
    const modeIndicator = this.displayMode === 'all' ? 'All Activities' : 'Unique Files';
    const stats = this.displayMode === 'all' 
      ? `${totalEvents} events`
      : `${uniqueFiles} files`;
    
    const statusLine = `${modeIndicator}  Scan:ON Create:ON Modify:ON Move:ON Delete:ON  ${stats}`;
    const helpLine1 = '[a] All  [u] Unique  [q] Exit';
    const helpLine2 = '[s] Scan  [c] Create  [m] Modify  [v] moVe  [d] Delete  [/] Search';
    
    console.log(chalk.gray(separator));
    console.log(chalk.bold(statusLine));
    console.log(chalk.dim(helpLine1));
    console.log(chalk.dim(helpLine2));
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
/**
 * CLI Display (ui001 compliant)
 * Feature 6: Real-time file event display
 */

const chalk = require('chalk');
const EventEmitter = require('events');
const stringWidth = require('string-width');
const { padEndWithWidth, padStartWithWidth, truncateWithEllipsis } = require('../utils/display-width');
const BufferedRenderer = require('../utils/buffered-renderer');
const EventFilterManager = require('../filter/event-filter-manager');
const FilterStatusRenderer = require('./filter-status-renderer');
const StatusDisplay = require('../display/status-display');

class CLIDisplay extends EventEmitter {
  constructor(databaseManager, displayConfig = {}) {
    super();
    this.db = databaseManager;
    this.displayMode = displayConfig.mode || 'all'; // 'all' or 'unique'
    this.maxLines = displayConfig.maxEvents; // Always comes from config.json
    this.events = [];
    this.uniqueEvents = new Map(); // fileName -> latest event
    this.isRunning = false;
    this.refreshInterval = null;
    this.displayConfig = displayConfig;
    
    // Width settings for responsive directory display
    this.widthConfig = this.calculateDynamicWidth();
    
    // FUNC-018: 二重バッファ描画機能
    this.renderer = new BufferedRenderer({
      renderInterval: 16, // 60fps limit
      maxBufferSize: this.maxLines * 2,
      enableDebounce: true
    });
    
    // FUNC-020: イベントフィルタリング機能
    this.filterManager = new EventFilterManager();
    
    // FUNC-205: ステータス表示エリア機能
    this.statusDisplay = new StatusDisplay(displayConfig);
    
    // Redraw when filter changes
    this.filterManager.on('filterChanged', () => {
      this.updateDisplay();
    });
    
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log('CLIDisplay initialized');
    }
    this.setupKeyboardHandlers();
    this.setupResizeHandler();
  }

  /**
   * Start display
   */
  start() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Load initial data
    this.loadInitialEvents();
    
    // Start real-time display
    this.startRefreshLoop();
    
    // Show help
    // this.showInitialHelp();
    
    if (process.env.NODE_ENV === 'test') {
      console.log('📺 CLI Display started');
    }
  }

  /**
   * Stop display
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
    
    // Release BufferedRenderer resources
    if (this.renderer) {
      this.renderer.destroy();
    }
    
    // Exit raw mode for stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    
    // FUNC-205: Cleanup status display
    if (this.statusDisplay) {
      this.statusDisplay.destroy();
    }
    
    console.log('📺 CLI Display stopped');
  }

  /**
   * Add event (called from EventProcessor)
   */
  addEvent(eventData) {
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log('[CLIDisplay] Adding event:', eventData.event_type, 'for', eventData.file_name);
    }
    
    this.events.unshift(eventData);
    
    // Remove old events if maximum lines exceeded
    if (this.events.length > this.maxLines * 2) {
      this.events = this.events.slice(0, this.maxLines * 2);
    }
    
    // Update map for Unique mode
    const fileName = eventData.file_name;
    this.uniqueEvents.set(fileName, eventData);
  }

  /**
   * Load initial data
   */
  async loadInitialEvents() {
    try {
      const recentEvents = await this.db.getRecentEvents(this.maxLines);
      this.events = recentEvents;
      
      // Build map for Unique mode
      for (const event of recentEvents) {
        this.uniqueEvents.set(event.file_name, event);
      }
    } catch (error) {
      console.error('Failed to load initial events:', error);
    }
  }

  /**
   * Real-time display loop
   */
  startRefreshLoop() {
    // Initial display
    this.render();
    
    this.refreshInterval = setInterval(() => {
      this.render();
    }, 100); // Refresh every 100ms (BufferedRenderer limits to 60fps)
    
    // FUNC-205: Start statistics timer
    if (this.statusDisplay && this.db) {
      this.statusDisplay.startStatisticsTimer(this.db);
    }
  }

  /**
   * Screen rendering (FUNC-018: Double buffer rendering)
   */
  render() {
    if (!this.isRunning) {
      return;
    }
    
    // Build buffer for BufferedRenderer
    this.renderer.clear();
    
    // Add header
    this.buildHeader();
    
    // Add events list
    this.buildEvents();
    
    // Add footer
    this.buildFooter();
    
    // Double buffer rendering (delayed rendering)
    this.renderer.renderDebounced();
  }

  /**
   * Build header (for BufferedRenderer)
   */
  buildHeader() {
    const directoryHeaderWidth = this.widthConfig.directory;
    const directoryHeader = padEndWithWidth('Directory', directoryHeaderWidth);
    const header = `Event Timestamp       Elapsed  File Name                    Event    Lines Blocks ${directoryHeader}`;
    const separator = '─'.repeat(this.widthConfig.terminal || 97);
    
    this.renderer.addLine(chalk.bold(header));
    this.renderer.addLine(chalk.gray(separator));
  }

  /**
   * Render header (backward compatibility)
   */
  renderHeader() {
    this.buildHeader();
  }

  /**
   * Build events list (for BufferedRenderer)
   */
  buildEvents() {
    const eventsToShow = this.getEventsToDisplay();
    
    for (let i = 0; i < Math.min(eventsToShow.length, this.maxLines); i++) {
      const event = eventsToShow[i];
      const eventLine = this.formatEventLine(event);
      this.renderer.addLine(eventLine);
    }
    
    // Fill with empty lines
    const remainingLines = this.maxLines - Math.min(eventsToShow.length, this.maxLines);
    for (let i = 0; i < remainingLines; i++) {
      this.renderer.addLine('');
    }
  }

  /**
   * Render events list (backward compatibility)
   */
  renderEvents() {
    this.buildEvents();
  }

  /**
   * Get events to display
   */
  getEventsToDisplay() {
    let eventsToShow;
    
    if (this.displayMode === 'unique') {
      // Unique mode: Only latest per file
      eventsToShow = Array.from(this.uniqueEvents.values())
        .sort((a, b) => b.timestamp - a.timestamp);
    } else {
      // All mode: All events
      eventsToShow = this.events;
    }
    
    // Apply filtering
    return this.filterManager.filterEvents(eventsToShow);
  }

  /**
   * Format event line (for BufferedRenderer)
   */
  formatEventLine(event) {
    const timestamp = new Date(event.timestamp);
    const now = new Date();
    
    // Format each column
    const modified = this.formatTimestamp(timestamp);
    const elapsed = this.formatElapsed(now - timestamp);
    const fileName = padEndWithWidth(event.file_name, 28);
    const directory = this.truncateDirectoryPathWithWidth(this.formatDirectory(event.directory), this.widthConfig.directory);
    const eventType = this.formatEventType(event.event_type);
    const lines = this.formatNumber(event.line_count, 5);
    const blocks = this.formatNumber(event.block_count, 6);
    
    // Build line (responsive layout - Directory column at rightmost with dynamic width)
    return `${modified}  ${elapsed}  ${fileName}  ${eventType} ${lines} ${blocks}  ${directory}`;
  }

  /**
   * Render event line (backward compatibility)
   */
  renderEventLine(event) {
    const line = this.formatEventLine(event);
    process.stdout.write(line + '\n');
  }

  /**
   * Format timestamp
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
   * Format elapsed time
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
   * Shorten directory path (UI002/UI007 compliant)
   */
  formatDirectory(dirPath) {
    if (!dirPath) return '.';
    
    const path = require('path');
    const cwd = process.cwd();
    
    try {
      const absoluteFullPath = path.resolve(dirPath);
      const absoluteWatchPath = path.resolve(cwd);
      
      // Check if under monitored directory
      if (absoluteFullPath.startsWith(absoluteWatchPath + path.sep) || absoluteFullPath === absoluteWatchPath) {
        const relativePath = path.relative(absoluteWatchPath, absoluteFullPath);
        return relativePath || '.';
      }
      
      return dirPath; // Return original path if not under
    } catch (error) {
      return dirPath; // Return original path on error
    }
  }

  /**
   * Calculate dynamic width for responsive directory display
   */
  calculateDynamicWidth() {
    const terminalWidth = process.stdout.columns || 80;
    // Fixed columns: Event Timestamp(19) + Elapsed(10) + FileName(28) + Event(8) + Lines(5) + Blocks(6) + Spaces(6*2=12)
    const fixedWidth = 19 + 10 + 28 + 8 + 5 + 6 + 12; // 88文字
    const directoryWidth = Math.max(10, terminalWidth - fixedWidth - 2); // Minimum 10 chars guaranteed, last 2 chars for spacing
    
    return {
      terminal: terminalWidth,
      directory: directoryWidth
    };
  }

  /**
   * Dynamic directory path truncation (tail priority)
   */
  truncateDirectoryPathWithWidth(path, maxWidth) {
    if (stringWidth(path) <= maxWidth) {
      return padEndWithWidth(path, maxWidth);
    }
    
    // Tail-priority truncation (preserve end part of path)
    const ellipsis = '...';
    const ellipsisWidth = stringWidth(ellipsis);
    let truncated = '';
    let width = 0;
    const targetWidth = maxWidth - ellipsisWidth;
    
    // Get characters from the end
    for (let i = path.length - 1; i >= 0; i--) {
      const char = path[i];
      const charWidth = stringWidth(char);
      if (width + charWidth > targetWidth) {
        break;
      }
      truncated = char + truncated;
      width += charWidth;
    }
    
    return padEndWithWidth(ellipsis + truncated, maxWidth);
  }

  /**
   * Color formatting for event types
   */
  formatEventType(eventType) {
    if (!eventType) {
      eventType = 'unknown';
    }
    const formatted = padEndWithWidth(eventType, 8);
    
    switch (eventType) {
      case 'find':
        return chalk.blue(formatted);
      case 'create':
        return chalk.greenBright(formatted);
      case 'modify':
        return formatted; // Default color
      case 'move':
        return chalk.cyan(formatted);
      case 'delete':
        return chalk.gray(formatted);
      case 'restore':
        return chalk.yellowBright(formatted);
      default:
        return formatted;
    }
  }

  /**
   * Format numbers
   */
  formatNumber(value, width) {
    if (value === null || value === undefined) {
      return padStartWithWidth('-', width);
    }
    return padStartWithWidth(String(value), width);
  }

  /**
   * String truncation (display width aware)
   */
  truncateStringWithWidth(str, maxWidth) {
    return truncateWithEllipsis(str, maxWidth);
  }

  /**
   * Build footer (for BufferedRenderer)
   */
  buildFooter() {
    const totalEvents = this.events.length;
    const uniqueFiles = this.uniqueEvents.size;
    
    const separator = '─'.repeat(this.widthConfig.terminal || 97);
    const modeIndicator = this.displayMode === 'all' ? 'All Activities' : 'Unique Files';
    const stats = this.displayMode === 'all' 
      ? `${totalEvents} events`
      : `${uniqueFiles} files`;
    
    const statusLine = `${modeIndicator}  ${stats}`;
    const helpLine = '[a] All  [u] Unique  [q] Exit';
    
    // Filter line (FUNC-020)
    const filterStates = this.filterManager.getFilterStates();
    const filterLine = FilterStatusRenderer.renderFilterLine(filterStates, this.widthConfig.terminal);
    
    this.renderer.addLine(chalk.gray(separator));
    this.renderer.addLine(chalk.bold(statusLine));
    this.renderer.addLine(chalk.dim(helpLine));
    this.renderer.addLine(filterLine); // Filter line at bottom
    
    // FUNC-205: Status display area
    const statusLines = this.statusDisplay.getDisplayLines();
    statusLines.forEach(line => {
      this.renderer.addLine(line);
    });
  }

  /**
   * Render footer (backward compatibility)
   */
  renderFooter() {
    this.buildFooter();
  }

  /**
   * Show initial help
   */
  showInitialHelp() {
    console.log('');
    console.log(chalk.cyan('cctop v0.1.0.0 - File Activity Monitor'));
    console.log(chalk.dim('Press [a] for All mode, [u] for Unique mode, [q] to quit'));
    console.log('');
  }

  /**
   * Setup keyboard handlers
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
   * Setup terminal resize event handler
   */
  setupResizeHandler() {
    if (process.stdout.isTTY) {
      process.stdout.on('resize', () => {
        this.widthConfig = this.calculateDynamicWidth();
        
        // Reset BufferedRenderer and redraw immediately
        if (this.renderer && this.isRunning) {
          this.renderer.reset();
          this.render(); // Redraw immediately
        }
        
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.log(`Terminal resized: ${this.widthConfig.terminal}x? Directory width: ${this.widthConfig.directory}`);
        }
      });
    }
  }

  /**
   * Handle key press
   */
  handleKeyPress(key) {
    // Check filter keys (lowercase only)
    const lowerKey = key.toLowerCase();
    if (this.filterManager.toggleByKey(lowerKey)) {
      // End processing if filter was toggled
      // Automatically redrawn by filterChanged event
      return;
    }
    
    // Existing key handling
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
      case '/':
        // TODO: Search functionality
        break;
    }
  }

  /**
   * Switch display mode
   */
  setDisplayMode(mode) {
    if (mode !== this.displayMode) {
      this.displayMode = mode;
      console.log(chalk.yellow(`Switched to ${mode.toUpperCase()} mode`));
    }
  }

  /**
   * Exit processing
   */
  handleExit() {
    this.stop();
    
    // Emergency full clear for BufferedRenderer
    if (this.renderer) {
      this.renderer.reset();
    }
    
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen
    console.log(chalk.green('cctop stopped'));
    
    // Emit SIGINT event to notify parent process of exit
    process.kill(process.pid, 'SIGINT');
  }

  /**
   * Update display (when filter changes, etc.)
   */
  updateDisplay() {
    if (this.isRunning) {
      this.render();
    }
  }

  /**
   * Add status message (FUNC-205)
   */
  addStatusMessage(text, type = 'info') {
    this.statusDisplay.addMessage(text, type);
  }

  /**
   * Update status message (FUNC-205)
   */
  updateStatusMessage(oldText, newText, type = 'info') {
    this.statusDisplay.updateMessage(oldText, newText, type);
  }

  /**
   * Get statistics
   */
  getStats() {
    const rendererStats = this.renderer ? this.renderer.getStats() : {};
    const statusStats = this.statusDisplay ? this.statusDisplay.getStatus() : {};
    
    return {
      isRunning: this.isRunning,
      displayMode: this.displayMode,
      totalEvents: this.events.length,
      uniqueFiles: this.uniqueEvents.size,
      maxLines: this.maxLines,
      renderer: rendererStats,
      statusDisplay: statusStats
    };
  }
}

module.exports = CLIDisplay;
/**
 * CLI Display (ui001 compliant)
 * Feature 6: Real-time file event display
 */

import chalk = require('chalk');
import { EventEmitter } from 'events';
import {
  CLIDisplayLegacyConfig,
  CLIDisplayLegacyStats,
  CLIDisplayLegacyWidthConfig,
  EventData,
  DatabaseManager,
  BufferedRenderer,
  EventFilterManager,
  StatusDisplay
} from '../types/common';
import { EventFormatter } from './renderers/EventFormatter';
import { HeaderFooterRenderer } from './renderers/HeaderFooterRenderer';
import { EventDataManager } from './managers/EventDataManager';
import { InputHandler } from './managers/InputHandler';

const BufferedRendererClass = require('../utils/buffered-renderer');
const EventFilterManagerClass = require('../filter/event-filter-manager');
const FilterStatusRenderer = require('./filter-status-renderer');
const StatusDisplayClass = require('../display/status-display');

class CLIDisplayLegacy extends EventEmitter {
  private db: DatabaseManager;
  private displayMode: 'all' | 'unique';
  private maxLines: number;
  private isRunning: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private displayConfig: CLIDisplayLegacyConfig;
  private widthConfig: CLIDisplayLegacyWidthConfig;
  private renderer: BufferedRenderer;
  private filterManager: EventFilterManager;
  private statusDisplay: StatusDisplay;
  
  // New modular components
  private eventFormatter: EventFormatter;
  private headerFooterRenderer: HeaderFooterRenderer;
  private eventDataManager: EventDataManager;
  private inputHandler: InputHandler;

  constructor(databaseManager: DatabaseManager, displayConfig: CLIDisplayLegacyConfig = {}) {
    super();
    this.db = databaseManager;
    this.displayMode = displayConfig.mode || 'all'; // 'all' or 'unique'
    this.maxLines = displayConfig.maxEvents || 20; // Always comes from config.json
    this.displayConfig = displayConfig;
    
    // Width settings for responsive directory display
    this.widthConfig = this.calculateDynamicWidth();
    
    // FUNC-018: 二重バッファ描画機能
    this.renderer = new BufferedRendererClass({
      renderInterval: 16, // 60fps limit
      maxBufferSize: this.maxLines * 2,
      enableDebounce: true
    });
    
    // FUNC-020: イベントフィルタリング機能
    this.filterManager = new EventFilterManagerClass();
    
    // FUNC-205: ステータス表示エリア機能
    this.statusDisplay = new StatusDisplayClass(displayConfig);
    
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
  start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Load initial data
    this.loadInitialEvents();
    
    // Start real-time display
    this.startRefreshLoop();
    
    if (process.env.NODE_ENV === 'test') {
      console.log('📺 CLI Display started');
    }
  }

  /**
   * Stop display
   */
  stop(): void {
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
  addEvent(eventData: EventData): void {
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
  private async loadInitialEvents(): Promise<void> {
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
  private startRefreshLoop(): void {
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
  private render(): void {
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
  private buildHeader(): void {
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
  renderHeader(): void {
    this.buildHeader();
  }

  /**
   * Build events list (for BufferedRenderer)
   */
  private buildEvents(): void {
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
  renderEvents(): void {
    this.buildEvents();
  }

  /**
   * Get events to display
   */
  private getEventsToDisplay(): EventData[] {
    let eventsToShow: EventData[];
    
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
  private formatEventLine(event: EventData): string {
    const timestamp = new Date(event.timestamp);
    const now = new Date();
    
    // Format each column
    const modified = this.formatTimestamp(timestamp);
    const elapsed = this.formatElapsed(now.getTime() - timestamp.getTime());
    const fileName = padEndWithWidth(event.file_name, 28);
    const directory = this.truncateDirectoryPathWithWidth(this.formatDirectory(event.directory || ''), this.widthConfig.directory);
    const eventType = this.formatEventType(event.event_type);
    const lines = this.formatNumber(event.line_count, 5);
    const blocks = this.formatNumber(event.block_count, 6);
    
    // Build line (responsive layout - Directory column at rightmost with dynamic width)
    return `${modified}  ${elapsed}  ${fileName}  ${eventType} ${lines} ${blocks}  ${directory}`;
  }

  /**
   * Render event line (backward compatibility)
   */
  renderEventLine(event: EventData): void {
    const line = this.formatEventLine(event);
    process.stdout.write(line + '\n');
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(date: Date): string {
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
  private formatElapsed(ms: number): string {
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
  private formatDirectory(dirPath: string): string {
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
  private calculateDynamicWidth(): CLIDisplayLegacyWidthConfig {
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
   * Truncate directory path with consideration for East Asian width
   */
  private truncateDirectoryPathWithWidth(dirPath: string, maxWidth: number): string {
    return truncateWithEllipsis(dirPath, maxWidth);
  }

  /**
   * Format event type with color
   */
  private formatEventType(eventType: string): string {
    const eventColors: Record<string, any> = {
      'find': chalk.blue,
      'create': chalk.green,
      'modify': chalk.yellow,
      'delete': chalk.red,
      'move': chalk.magenta,
      'restore': chalk.cyan
    };
    
    const colorFunc = eventColors[eventType] || chalk.white;
    return padEndWithWidth(colorFunc(eventType.toUpperCase()), 7);
  }

  /**
   * Format number with null handling
   */
  private formatNumber(value: number | null | undefined, width: number): string {
    if (value === null || value === undefined) {
      return padStartWithWidth('-', width);
    }
    return padStartWithWidth(value.toString(), width);
  }

  /**
   * Build footer (for BufferedRenderer)
   */
  private buildFooter(): void {
    // Status line with filtering information
    const modeIndicator = this.displayMode === 'unique' ? 'UNIQUE' : 'ALL';
    const totalEvents = this.events.length;
    const uniqueFiles = this.uniqueEvents.size;
    const stats = `${modeIndicator} | Events: ${totalEvents} | Files: ${uniqueFiles}`;
    
    // Key help
    const help = 'q:Quit | m:Mode | f/c/d/r/u:Filters';
    
    this.renderer.addLine('');
    this.renderer.addLine(chalk.gray('─'.repeat(this.widthConfig.terminal || 97)));
    this.renderer.addLine(chalk.cyan(stats) + ' | ' + chalk.gray(help));
  }

  /**
   * Setup keyboard handlers
   */
  private setupKeyboardHandlers(): void {
    if (!process.stdin.isTTY) {
      return;
    }
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key: string) => {
      this.handleKeyPress(key);
    });
  }

  /**
   * Setup window resize handler
   */
  private setupResizeHandler(): void {
    process.stdout.on('resize', () => {
      this.widthConfig = this.calculateDynamicWidth();
      this.updateDisplay();
    });
  }

  /**
   * Handle key press
   */
  private handleKeyPress(key: string): void {
    switch (key) {
      case '\u0003': // Ctrl+C
      case 'q':
      case 'Q':
        this.handleExit();
        break;
      case 'm':
      case 'M':
        this.toggleDisplayMode();
        break;
      case 'f':
      case 'F':
        this.filterManager.emit('toggleFilter', 'find');
        break;
      case 'c':
      case 'C':
        this.filterManager.emit('toggleFilter', 'create');
        break;
      case 'd':
      case 'D':
        this.filterManager.emit('toggleFilter', 'delete');
        break;
      case 'r':
      case 'R':
        this.filterManager.emit('toggleFilter', 'restore');
        break;
      case 'u':
      case 'U':
        this.filterManager.emit('toggleFilter', 'modify');
        break;
    }
  }

  /**
   * Toggle display mode
   */
  private toggleDisplayMode(): void {
    const mode = this.displayMode === 'all' ? 'unique' : 'all';
    this.displayMode = mode;
    this.updateDisplay();
    
    if (process.env.NODE_ENV === 'test') {
      console.log(chalk.yellow(`Switched to ${mode.toUpperCase()} mode`));
    }
  }

  /**
   * Exit processing
   */
  private handleExit(): void {
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
  updateDisplay(): void {
    if (this.isRunning) {
      this.render();
    }
  }

  /**
   * Add status message (FUNC-205)
   */
  addStatusMessage(text: string, type: string = 'info'): void {
    this.statusDisplay.addMessage(text, type);
  }

  /**
   * Update status message (FUNC-205)
   */
  updateStatusMessage(oldText: string, newText: string, type: string = 'info'): void {
    this.statusDisplay.updateMessage(oldText, newText, type);
  }

  /**
   * Get statistics
   */
  getStats(): CLIDisplayLegacyStats {
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

export = CLIDisplayLegacy;
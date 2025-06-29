/**
 * CLI Display Refactored
 * Modularized version using separate components
 */

import { EventEmitter } from 'events';
import {
  CLIDisplayLegacyConfig,
  CLIDisplayLegacyWidthConfig,
  EventData,
  DatabaseManager,
  BufferedRenderer,
  EventFilterManager,
  StatusDisplay
} from '../types';
import { EventFormatter } from './renderers/EventFormatter';
import { HeaderFooterRenderer } from './renderers/HeaderFooterRenderer';
import { EventDataManager } from './managers/EventDataManager';
import { InputHandler } from './managers/InputHandler';

const BufferedRendererClass = require('../utils/buffered-renderer');
const EventFilterManagerClass = require('../filter/event-filter-manager');
const StatusDisplayClass = require('../display/status-display');

export class CLIDisplayRefactored extends EventEmitter {
  private db: DatabaseManager;
  private displayMode: 'all' | 'unique';
  private maxLines: number;
  private isRunning: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private displayConfig: CLIDisplayLegacyConfig;
  private widthConfig: CLIDisplayLegacyWidthConfig;
  
  // External components
  private renderer: BufferedRenderer;
  private filterManager: EventFilterManager;
  private statusDisplay: StatusDisplay;
  
  // Modular components
  private eventFormatter: EventFormatter;
  private headerFooterRenderer: HeaderFooterRenderer;
  private eventDataManager: EventDataManager;
  private inputHandler: InputHandler;

  constructor(databaseManager: DatabaseManager, displayConfig: CLIDisplayLegacyConfig = {}) {
    super();
    this.db = databaseManager;
    this.displayMode = (displayConfig.mode || 'all') as 'all' | 'unique';
    this.maxLines = displayConfig.maxEvents || 20;
    this.displayConfig = displayConfig;
    
    // Width settings
    this.widthConfig = this.calculateDynamicWidth();
    
    // Initialize external components
    this.renderer = new BufferedRendererClass({
      renderInterval: 16,
      maxBufferSize: this.maxLines * 2,
      enableDebounce: true
    });
    
    this.filterManager = new EventFilterManagerClass();
    this.statusDisplay = new StatusDisplayClass(displayConfig);
    
    // Initialize modular components
    this.eventFormatter = new EventFormatter(this.widthConfig);
    this.headerFooterRenderer = new HeaderFooterRenderer(this.widthConfig);
    this.eventDataManager = new EventDataManager(databaseManager, this.maxLines);
    this.inputHandler = new InputHandler();
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Start display
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('CLIDisplay is already running');
      return;
    }

    this.isRunning = true;
    
    // Load initial events
    await this.eventDataManager.loadInitialEvents();
    
    // Start refresh loop
    this.startRefreshLoop();
    
    // Start input handling
    this.inputHandler.start();
    
    // Initial render
    this.render();
    
    this.emit('started');
  }

  /**
   * Stop display
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Stop refresh loop
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Stop input handling
    this.inputHandler.stop();
    
    // Stop renderer
    this.renderer.stop();
    
    // Clear screen
    console.clear();
    
    this.emit('stopped');
  }

  /**
   * Add event to display
   */
  addEvent(eventData: EventData): void {
    // Apply filters
    if (!this.filterManager.shouldDisplayEvent(eventData)) {
      return;
    }
    
    // Add to data manager
    this.eventDataManager.addEvent(eventData);
    
    // Update render if running
    if (this.isRunning) {
      this.render();
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Filter changes
    this.filterManager.on('filterChanged', () => {
      this.updateDisplay();
    });
    
    // Input events
    this.inputHandler.on('keypress', (key: string) => {
      this.handleKeyPress(key);
    });
    
    this.inputHandler.on('resize', () => {
      this.handleResize();
    });
    
    this.inputHandler.on('exit', () => {
      this.handleExit();
    });
  }

  /**
   * Start refresh loop
   */
  private startRefreshLoop(): void {
    const refreshRate = 250; // 4fps for status updates
    
    this.refreshInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      // Update stats
      const stats = this.eventDataManager.getStats();
      this.headerFooterRenderer.updateStats({
        totalEvents: stats.totalEvents,
        uniqueFiles: stats.uniqueFiles,
        eventsPerSecond: this.calculateEventsPerSecond()
      });
      
      // Update status display
      this.statusDisplay.update(`Events: ${stats.totalEvents}, Files: ${stats.uniqueFiles}`);
      
      // Render if needed
      if (this.renderer.isDirty) {
        this.render();
      }
    }, refreshRate);
  }

  /**
   * Main render method
   */
  private render(): void {
    if (!this.isRunning) return;
    
    this.renderer.clear();
    
    // Build and render header
    this.buildHeader();
    
    // Build and render events
    this.buildEvents();
    
    // Build and render footer
    this.buildFooter();
    
    // Render status display
    this.statusDisplay.render();
    
    // Flush to terminal
    this.renderer.render();
  }

  /**
   * Build header section
   */
  private buildHeader(): void {
    const headerLines = this.headerFooterRenderer.buildHeader();
    headerLines.forEach(line => this.renderer.addLine(line));
  }

  /**
   * Build events section
   */
  private buildEvents(): void {
    const events = this.eventDataManager.getEventsToDisplay(this.displayMode);
    
    events.forEach(event => {
      const line = this.eventFormatter.formatEventLine(event);
      this.renderer.addLine(line);
    });
    
    // Fill empty lines
    const emptyLines = this.maxLines - events.length;
    for (let i = 0; i < emptyLines; i++) {
      this.renderer.addLine('');
    }
  }

  /**
   * Build footer section
   */
  private buildFooter(): void {
    const FilterStatusRenderer = require('./filter-status-renderer');
    const filterStatus = FilterStatusRenderer.render(this.filterManager.getState());
    
    const footerLines = this.headerFooterRenderer.buildFooter(
      this.displayMode,
      filterStatus
    );
    
    footerLines.forEach(line => this.renderer.addLine(line));
  }

  /**
   * Handle key press
   */
  private handleKeyPress(key: string): void {
    switch (key.toLowerCase()) {
      case 'a':
        this.toggleDisplayMode('all');
        break;
      case 'u':
        this.toggleDisplayMode('unique');
        break;
      case 'f':
      case 'c':
      case 'm':
      case 'd':
      case 'v':
      case 'r':
        this.filterManager.toggleFilter(key.toLowerCase() as any);
        break;
      case 'h':
      case '?':
        this.showHelp();
        break;
    }
  }

  /**
   * Toggle display mode
   */
  private toggleDisplayMode(mode?: 'all' | 'unique'): void {
    if (mode) {
      this.displayMode = mode;
    } else {
      this.displayMode = this.displayMode === 'all' ? 'unique' : 'all';
    }
    
    this.emit('modeChanged', this.displayMode);
    this.render();
  }

  /**
   * Handle terminal resize
   */
  private handleResize(): void {
    // Update width configuration
    this.widthConfig = this.calculateDynamicWidth();
    this.eventFormatter.updateWidthConfig(this.widthConfig);
    this.headerFooterRenderer.updateWidthConfig(this.widthConfig);
    
    // Update renderer dimensions
    this.renderer.updateDimensions(
      process.stdout.columns || 120,
      process.stdout.rows || 40
    );
    
    // Re-render
    this.render();
  }

  /**
   * Handle exit
   */
  private handleExit(): void {
    this.stop();
    this.emit('exit');
    process.exit(0);
  }

  /**
   * Calculate dynamic width configuration
   */
  private calculateDynamicWidth(): CLIDisplayLegacyWidthConfig {
    const termWidth = process.stdout.columns || 120;
    const baseWidth = 8 + 3 + 7 + 3 + 6 + 3 + 10 + 3 + 8; // Fixed columns
    const variableWidth = Math.max(40, termWidth - baseWidth - 10); // Leave margin
    
    const fileNameWidth = Math.floor(variableWidth * 0.4);
    const directoryWidth = Math.floor(variableWidth * 0.6);
    
    return {
      totalWidth: termWidth,
      fileNameWidth: Math.max(20, fileNameWidth),
      directoryWidth: Math.max(20, directoryWidth),
      eventCode: 8,
      timestamp: 19,
      fileSize: 10,
      filePath: 28
    };
  }

  /**
   * Calculate events per second
   */
  private calculateEventsPerSecond(): number {
    // Simple implementation - could be enhanced with sliding window
    return 0;
  }

  /**
   * Update display
   */
  updateDisplay(): void {
    if (this.isRunning) {
      this.render();
    }
  }

  /**
   * Show help
   */
  private showHelp(): void {
    // TODO: Implement help display
    console.log('Help: Press q to quit, a for all events, u for unique files');
  }

  /**
   * Add status message
   */
  addStatusMessage(text: string, type: string = 'info'): void {
    this.statusDisplay.addMessage(text, type);
  }

  /**
   * Get current configuration
   */
  getConfig(): CLIDisplayLegacyConfig {
    return { ...this.displayConfig };
  }

  /**
   * Get current stats
   */
  getStats(): any {
    return {
      ...this.eventDataManager.getStats(),
      ...this.headerFooterRenderer.getStats(),
      displayMode: this.displayMode,
      isRunning: this.isRunning
    };
  }
}
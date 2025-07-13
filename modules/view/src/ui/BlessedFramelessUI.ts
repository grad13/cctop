/**
 * Frameless UI Implementation
 * Main UI controller integrating all UI components
 * East Asian Width support
 * 
 * Refactored to use UIDataManager for data operations
 */

import * as path from 'path';
import { EventRow } from '../types/event-row';
import { FileEventReader } from '../database/FileEventReader';
import { ViewConfig } from '../config/ViewConfig';
import { ConfigLoader } from '../config/config-loader';
import { LocalSetupInitializer } from '../config/local-setup-initializer';
import { DaemonStatusMonitor } from '../utils/daemon-status-monitor';

import { UIState, DisplayMode } from './UIState';
import { UIScreenManager } from './UIScreenManager';
import { UILayoutManager } from './UILayoutManager';
import { UIKeyHandler } from './UIKeyHandler';
import { UIDataManager } from './UIDataManager';

export interface UIFramelessConfigSimple {
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: DisplayMode;
  viewConfig?: ViewConfig;
}

export class BlessedFramelessUISimple {
  // Core components
  private uiState: UIState;
  private screenManager: UIScreenManager;
  private layoutManager!: UILayoutManager;
  private keyHandler!: UIKeyHandler;
  private dataManager: UIDataManager;

  // Data and configuration
  private db: FileEventReader;
  private viewConfig!: ViewConfig;
  private refreshTimer?: NodeJS.Timeout;
  private daemonStatusMonitor: DaemonStatusMonitor;
  private initConfig?: UIFramelessConfigSimple;

  constructor(db: FileEventReader, config: UIFramelessConfigSimple = {}) {
    this.db = db;
    this.initConfig = config;
    
    // Initialize components
    this.uiState = new UIState(config.displayMode || 'all');
    this.screenManager = new UIScreenManager();
    this.dataManager = new UIDataManager(this.db, this.uiState);
    
    // Initialize daemon monitor with current working directory .cctop
    // The daemon PID file should be in the same location where we run the CLI
    this.daemonStatusMonitor = new DaemonStatusMonitor();
  }

  private initializeDaemonMonitor(): void {
    // Daemon monitor already initialized in constructor with default .cctop directory
    // This ensures daemon status is checked in the same location as CLI execution
  }

  private async initializeConfig(config: UIFramelessConfigSimple): Promise<void> {
    try {
      if (config.viewConfig) {
        this.viewConfig = config.viewConfig;
      } else {
        // Create config loader and load configuration
        const configLoader = new ConfigLoader();
        const mergedConfig = await configLoader.loadConfiguration();
        this.viewConfig = mergedConfig.view;
      }
      
      // Set maxRows from config if provided
      if (this.viewConfig.display?.maxEvents) {
        this.uiState.setViewportHeight(this.viewConfig.display.maxEvents);
      }
    } catch (error) {
      // Use default ViewConfig object (import default)
      const { defaultViewConfig } = require('../config/ViewConfig');
      this.viewConfig = defaultViewConfig;
    }
  }

  private async updateDaemonStatus(): Promise<void> {
    try {
      const status = await this.daemonStatusMonitor.checkStatus();
      
      if (status.isRunning && status.pid) {
        this.uiState.setDaemonStatus(`{green-fg}Daemon: ●RUNNING (PID: ${status.pid}){/green-fg}`);
      } else if (status.status === 'stopped') {
        this.uiState.setDaemonStatus(`{red-fg}Daemon: ●STOPPED{/red-fg}`);
      } else {
        this.uiState.setDaemonStatus(`{yellow-fg}Daemon: ●UNKNOWN{/yellow-fg}`);
      }
    } catch (error) {
      this.uiState.setDaemonStatus(`{yellow-fg}Daemon: ●CHECKING{/yellow-fg}`);
    }
  }

  private updateDisplay(): void {
    this.layoutManager.updateDisplay();
  }

  private updateDynamicControl(): void {
    this.layoutManager.updateDynamicControl();
  }

  private updateStatusBar(): void {
    this.layoutManager.updateStatusBar();
  }
  
  /**
   * Auto-fill screen with data when it's not fully filled
   */
  private async autoFillScreen(): Promise<void> {
    // Auto-fill strategy: load more data until screen is filled
    while (this.uiState.shouldLoadMoreData() && this.uiState.hasMoreDataToLoad()) {
      // Prevent infinite loops
      const eventCountBefore = this.uiState.getEventsCount();
      
      await this.loadMore();
      
      const eventCountAfter = this.uiState.getEventsCount();
      
      // If no new events were loaded, break to prevent infinite loop
      if (eventCountAfter === eventCountBefore) {
        break;
      }
      
      // Max iterations to prevent infinite loop in edge cases
      if (eventCountAfter > 1000) {
        break;
      }
    }
  }

  /**
   * Load more data when user reaches bottom
   */
  private async loadMore(): Promise<void> {
    await this.dataManager.loadMore();
    this.updateDisplay();
  }

  /**
   * Refreshes event data from database
   */
  private async refreshData(append: boolean = false): Promise<void> {
    // Update daemon status asynchronously (don't wait)
    this.updateDaemonStatus().catch(() => {
      // Silently handle daemon status errors
    });
    
    await this.dataManager.refreshData(append);
    this.updateDisplay();
  }

  /**
   * Initialize all UI components and start the application
   */
  public async start(): Promise<void> {
    
    // Initialize configuration
    await this.initializeConfig(this.initConfig || {});
    
    // Initialize daemon monitor with correct .cctop path
    this.initializeDaemonMonitor();
    
    // Initialize screen
    const screen = this.screenManager.initializeScreen();
    
    // Initialize layout manager
    this.layoutManager = new UILayoutManager(screen, this.uiState, this.viewConfig);
    this.layoutManager.setupFramelessLayout();
    
    // Initialize key handler
    this.keyHandler = new UIKeyHandler(
      screen,
      this.uiState,
      this.layoutManager.getEventList(),
      {
        refreshData: () => this.refreshData(),
        updateDisplay: () => this.updateDisplay(),
        updateDynamicControl: () => this.updateDynamicControl(),
        updateStatusBar: () => this.updateStatusBar(),
        stop: async () => await this.stop(),
        loadMore: () => this.loadMore()
      }
    );
    this.keyHandler.setupKeyHandlers();
    
    // Handle terminal resize
    process.stdout.on('resize', () => {
      this.uiState.calculateDynamicWidth();
      this.updateDisplay();
      this.updateStatusBar();  // Update lines on resize
    });
    
    // Start refreshing
    await this.refreshData();
    
    // Auto-fill screen after initial data load
    await this.autoFillScreen();
    
    this.refreshTimer = setInterval(async () => {
      // Only refresh if not paused and not loading
      if (!this.uiState.isPausedState() && !this.uiState.isLoadingMoreData()) {
        // Skip refresh if top row is not visible (viewport scrolled down)
        if (!this.uiState.isTopRowVisible()) {
          return;
        }
        
        // Skip refresh if we have filters and no more data
        const hasFilters = this.uiState.getEventTypeFilters().countActiveFilters() < 6;
        const hasNoMoreData = !this.uiState.hasMoreDataToLoad();
        if (hasFilters && hasNoMoreData) {
          return;
        }
        
        await this.refreshData();
        
        // Auto-fill screen if needed (non-blocking)
        this.autoFillScreen().catch(err => {
          // Silently handle auto-fill errors
        });
      }
    }, 100); // 100ms refresh interval

    screen.render();
  }

  public async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    // Properly disconnect database
    if (this.db) {
      await this.db.disconnect();
    }
    
    this.screenManager.destroy();
  }
}
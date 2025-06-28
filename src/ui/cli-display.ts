/**
 * CLI Display (Refactored - Single Responsibility Architecture)
 * Main orchestrator for all UI components
 */

import { EventEmitter } from 'events';
import chalk = require('chalk');

// New modular components
import EventDisplayManager = require('./managers/event-display-manager');
import EventFormatter = require('./formatters/event-formatter');
import LayoutManager = require('./layout/layout-manager');
import RenderController = require('./render/render-controller');
import InputHandler = require('./input/input-handler');

// Interactive features (FUNC-400/401/402/403)
import InteractiveFeatures = require('./interactive/InteractiveFeatures');

// Legacy components (will be integrated)
import EventFilterManager = require('../filter/event-filter-manager');
import StatusDisplay = require('../display/status-display');

import {
  CLIDisplayConfig,
  CLIDisplayStats,
  WidthConfig,
  ProcessMonitorStatus
} from '../types/common';

class CLIDisplay extends EventEmitter {
  private db: any; // DatabaseManager instance
  private isRunning: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private displayConfig: CLIDisplayConfig;
  private startTime: number = Date.now();

  // Manager instances
  private eventDisplayManager: any; // EventDisplayManager
  private layoutManager: any; // LayoutManager
  private eventFormatter: any; // EventFormatter
  private renderController: any; // RenderController
  private inputHandler: any; // InputHandler
  private filterManager: any; // EventFilterManager
  private statusDisplay: any; // StatusDisplay
  private interactiveFeatures: any; // InteractiveFeatures

  constructor(databaseManager: any, displayConfig: CLIDisplayConfig = {}) {
    super();
    this.db = databaseManager;
    this.displayConfig = displayConfig;

    // Initialize all managers
    this.initializeManagers(displayConfig);
    
    // Setup dependencies between managers
    this.setupDependencies();
    
    // Setup event listeners
    this.setupEventListeners();
    
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log('CLIDisplay (Refactored) initialized');
    }
  }

  /**
   * Initialize all manager instances
   */
  private initializeManagers(displayConfig: CLIDisplayConfig): void {
    // Core managers
    this.eventDisplayManager = new EventDisplayManager(displayConfig as any);
    this.layoutManager = new LayoutManager();
    this.eventFormatter = new EventFormatter({
      widthConfig: this.layoutManager.getWidthConfig(),
      startTime: this.startTime,
      configPath: displayConfig.configPath || '.cctop'
    });
    this.renderController = new RenderController(displayConfig);
    this.inputHandler = new InputHandler();
    
    // Legacy components (maintained for compatibility)
    this.filterManager = new EventFilterManager();
    this.statusDisplay = new StatusDisplay(displayConfig);
    
    // Interactive features (FUNC-400/401/402/403)
    this.interactiveFeatures = new InteractiveFeatures(this.db, this.renderController, this);
  }

  /**
   * Setup dependencies between managers
   */
  private setupDependencies(): void {
    // Set database for event manager
    this.eventDisplayManager.setDatabase(this.db);
    this.eventDisplayManager.setFilterManager(this.filterManager);
    
    // Configure render controller
    this.renderController.setEventDisplayManager(this.eventDisplayManager);
    this.renderController.setEventFormatter(this.eventFormatter);
    this.renderController.setLayoutManager(this.layoutManager);
    this.renderController.setFilterManager(this.filterManager);
    this.renderController.setStatusDisplay(this.statusDisplay);
    
    // Configure input handler
    this.inputHandler.setEventDisplayManager(this.eventDisplayManager);
    this.inputHandler.setFilterManager(this.filterManager);
    this.inputHandler.setRenderController(this.renderController);
    this.inputHandler.setExitCallback(() => this.handleExit());
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Filter changes trigger re-render
    this.filterManager.on('filterChanged', () => {
      this.updateDisplay();
    });
    
    // Layout changes update formatter
    this.layoutManager.onResize((widthConfig: WidthConfig) => {
      this.eventFormatter.updateWidthConfig(widthConfig);
      this.renderController.handleResize();
    });
  }

  /**
   * Start display system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Start all subsystems
    this.renderController.start();
    // NOTE: inputHandler disabled to avoid conflict with InteractiveFeatures
    // this.inputHandler.setupKeyboardHandlers();
    this.layoutManager.setupResizeHandler();
    
    // Start interactive features (FUNC-400/401/402/403)
    if (process.env.CCTOP_VERBOSE) {
      console.log('[CLIDisplay] Starting interactive features...');
    }
    // Set display renderer before initialization
    this.interactiveFeatures.setDisplayRenderer(this.renderController);
    await this.interactiveFeatures.initialize();
    if (process.env.CCTOP_VERBOSE) {
      console.log('[CLIDisplay] Interactive features started successfully');
    }
    
    // Load initial data
    await this.eventDisplayManager.loadInitialEvents();
    
    // Update interactive features file list after initial events loaded
    if (this.interactiveFeatures) {
      console.log('[CLIDisplay] Updating interactive features file list after initial load');
      this.interactiveFeatures.updateFileListFromEvents();
    }
    
    // Start status display statistics
    this.statusDisplay.startStatisticsTimer(this.db);
    
    // Start refresh timer
    this.refreshInterval = setInterval(() => {
      // FUNC-401: Don't auto-refresh if detail mode is active
      if (this.renderController.isDetailMode && this.renderController.isDetailMode()) {
        return;
      }
      this.updateDisplay();
    }, 100); // 100ms refresh
    
    // Store reference in renderController for detail mode control
    this.renderController.cliDisplay = this;
    
    // Initial render
    if (!this.renderController.isDetailMode || !this.renderController.isDetailMode()) {
      this.renderController.render();
    }
    
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log('CLIDisplay started');
    }
  }

  /**
   * Stop display system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Stop all subsystems
    this.renderController.stop();
    this.inputHandler.destroy();
    this.statusDisplay.stopStatisticsTimer();
    
    // Clear refresh timer
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log('CLIDisplay stopped');
    }
  }

  /**
   * Add new event to display
   */
  addEvent(eventData: any): void {
    this.eventDisplayManager.addEvent(eventData);
    this.updateDisplay();
  }

  /**
   * Update display immediately
   */
  updateDisplay(): void {
    if (this.isRunning) {
      // FUNC-401: Check if detail mode is active before rendering
      if (this.renderController.isDetailMode && this.renderController.isDetailMode()) {
        return; // Do not render if detail mode is active
      }
      
      // Update interactive features file list when display updates
      if (this.interactiveFeatures) {
        this.interactiveFeatures.updateFileListFromEvents();
      }
      
      this.renderController.render();
    }
  }

  /**
   * Handle application exit
   */
  private handleExit(): void {
    this.stop();
    
    // Clear screen and show exit message
    this.renderController.reset();
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen
    
    if (process.env.CCTOP_VERBOSE) {
      console.log(chalk.green('cctop stopped'));
    }
    
    // Emit SIGINT event to notify parent process
    process.kill(process.pid, 'SIGINT');
  }

  /**
   * Add status message (FUNC-205 integration)
   */
  addStatusMessage(message: string, type: string = 'info'): void {
    this.statusDisplay.addMessage(message, type);
  }

  /**
   * Update status message (FUNC-205 integration)
   */
  updateStatusMessage(oldMessage: string, newMessage: string, type: string = 'info'): void {
    this.statusDisplay.updateMessage(oldMessage, newMessage, type);
  }

  /**
   * Get current statistics
   */
  getStats(): CLIDisplayStats {
    const eventStats = this.eventDisplayManager.getStats();
    const renderStats = this.renderController.getStats();
    const layoutStats = {
      widthConfig: this.layoutManager.getWidthConfig(),
      layoutMode: this.layoutManager.getLayoutMode()
    };

    return {
      ...eventStats,
      renderer: renderStats,
      layout: layoutStats,
      isRunning: this.isRunning
    };
  }

  /**
   * Force immediate render (for external calls)
   */
  forceRender(): void {
    this.renderController.forceRender();
  }

  /**
   * Get current display mode
   */
  getDisplayMode(): 'all' | 'unique' {
    return this.eventDisplayManager.getDisplayMode();
  }

  /**
   * Set display mode
   */
  setDisplayMode(mode: 'all' | 'unique'): void {
    this.eventDisplayManager.setDisplayMode(mode);
    this.updateDisplay();
  }

  /**
   * Update monitor status (FUNC-003 integration)
   */
  updateMonitorStatus(status: ProcessMonitorStatus): void {
    if (!status) {
      return;
    }
    
    // Update status display with monitor information
    const message = `Monitor: ${status.status}${status.pid ? ` (PID: ${status.pid})` : ''}`;
    const type = status.status === 'running' ? 'success' : 'warning';
    
    this.statusDisplay.addMessage(message, type);
    this.updateDisplay();
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.stop();
    
    // Destroy all managers
    this.renderController.destroy();
    this.inputHandler.destroy();
    this.layoutManager.destroy();
    this.statusDisplay.destroy();
    
    // Clear all event listeners
    this.removeAllListeners();
  }
}

export = CLIDisplay;
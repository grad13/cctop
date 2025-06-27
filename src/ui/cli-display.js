/**
 * CLI Display (Refactored - Single Responsibility Architecture)
 * Main orchestrator for all UI components
 */

const EventEmitter = require('events');
const chalk = require('chalk');

// New modular components
const EventDisplayManager = require('./managers/event-display-manager');
const EventFormatter = require('./formatters/event-formatter');
const LayoutManager = require('./layout/layout-manager');
const RenderController = require('./render/render-controller');
const InputHandler = require('./input/input-handler');

// Legacy components (will be integrated)
const EventFilterManager = require('../filter/event-filter-manager');
const StatusDisplay = require('../display/status-display');

class CLIDisplay extends EventEmitter {
  constructor(databaseManager, displayConfig = {}) {
    super();
    this.db = databaseManager;
    this.isRunning = false;
    this.refreshInterval = null;
    this.displayConfig = displayConfig;
    this.startTime = Date.now();

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
  initializeManagers(displayConfig) {
    // Core managers
    this.eventDisplayManager = new EventDisplayManager(displayConfig);
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
  }

  /**
   * Setup dependencies between managers
   */
  setupDependencies() {
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
  setupEventListeners() {
    // Filter changes trigger re-render
    this.filterManager.on('filterChanged', () => {
      this.updateDisplay();
    });
    
    // Layout changes update formatter
    this.layoutManager.onResize((widthConfig) => {
      this.eventFormatter.updateWidthConfig(widthConfig);
      this.renderController.handleResize();
    });
  }

  /**
   * Start display system
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Start all subsystems
    this.renderController.start();
    this.inputHandler.setupKeyboardHandlers();
    this.layoutManager.setupResizeHandler();
    
    // Load initial data
    await this.eventDisplayManager.loadInitialEvents();
    
    // Start status display statistics
    this.statusDisplay.startStatisticsTimer(this.db);
    
    // Start refresh timer
    this.refreshInterval = setInterval(() => {
      this.updateDisplay();
    }, 100); // 100ms refresh
    
    // Initial render
    this.renderController.render();
    
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log('CLIDisplay started');
    }
  }

  /**
   * Stop display system
   */
  stop() {
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
  addEvent(eventData) {
    this.eventDisplayManager.addEvent(eventData);
    this.updateDisplay();
  }

  /**
   * Update display immediately
   */
  updateDisplay() {
    if (this.isRunning) {
      this.renderController.render();
    }
  }

  /**
   * Handle application exit
   */
  handleExit() {
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
  addStatusMessage(message, type = 'info') {
    this.statusDisplay.addMessage(message, type);
  }

  /**
   * Update status message (FUNC-205 integration)
   */
  updateStatusMessage(oldMessage, newMessage, type = 'info') {
    this.statusDisplay.updateMessage(oldMessage, newMessage, type);
  }

  /**
   * Get current statistics
   */
  getStats() {
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
  forceRender() {
    this.renderController.forceRender();
  }

  /**
   * Get current display mode
   */
  getDisplayMode() {
    return this.eventDisplayManager.getDisplayMode();
  }

  /**
   * Set display mode
   */
  setDisplayMode(mode) {
    this.eventDisplayManager.setDisplayMode(mode);
    this.updateDisplay();
  }

  /**
   * Update monitor status (FUNC-003 integration)
   */
  updateMonitorStatus(status) {
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
  destroy() {
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

module.exports = CLIDisplay;
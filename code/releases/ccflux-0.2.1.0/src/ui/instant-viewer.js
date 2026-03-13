/**
 * Instant Viewer (FUNC-206 compliant)
 * Provides immediate visual feedback and progressive loading
 */

const CLIDisplay = require('./cli-display');
const StatusDisplay = require('../display/status-display');
const DatabaseManager = require('../database/database-manager');
const ProcessManager = require('../monitors/process-manager');
const ProgressiveLoader = require('./progressive-loader');
const DatabaseWatcher = require('../monitors/database-watcher');
const path = require('path');

class InstantViewer {
  constructor(config = {}) {
    this.config = config;
    this.startTime = process.hrtime.bigint();
    this.cliDisplay = null;
    this.statusDisplay = null;
    this.databaseManager = null;
    this.processManager = null;
    this.progressiveLoader = null;
    this.databaseWatcher = null;
    this.isRunning = false;
    this.monitorCheckInterval = null;
  }

  /**
   * Start instant viewer with progressive loading
   * Target: < 100ms for initial screen display
   */
  async start() {
    try {
      // Phase 1: Immediate screen display (< 100ms)
      await this.displayInitialScreen();
      
      // Phase 2: Non-blocking monitor check
      this.checkAndStartMonitor();
      
      // Phase 3: Database already connected in displayInitialScreen()
      
      // Phase 4: Progressive data loading
      await this.loadDataProgressively();
      
      // Phase 5: Start real-time database watching
      this.startDatabaseWatcher();
      
      this.isRunning = true;
      
    } catch (error) {
      console.error('Failed to start instant viewer:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Display initial screen immediately
   */
  async displayInitialScreen() {
    const elapsed = this.getElapsedMs();
    
    // Initialize minimal status display only
    this.statusDisplay = new StatusDisplay();
    
    // Initialize database first
    await this.initializeDatabase();
    
    // Initialize CLI display with database
    this.cliDisplay = new CLIDisplay(this.databaseManager, {
      refreshRate: 60,
      showMonitorStatus: true,
      statusDisplay: this.statusDisplay
    });
    
    // Start display immediately
    await this.cliDisplay.start();
    this.statusDisplay.addMessage(">> Initializing cctop...");
    
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log(`[InstantViewer] Initial screen displayed in ${elapsed}ms`);
    }
  }

  /**
   * Initialize database synchronously for instant display
   */
  async initializeDatabase() {
    try {
      const dbPath = this.config.database?.path || '.cctop/activity.db';
      // Display the database path in the message area
      if (this.statusDisplay) {
        this.statusDisplay.addMessage(`>> Database path: ${dbPath}`);
      }
      
      this.databaseManager = new DatabaseManager(dbPath);
      await this.databaseManager.initialize();
      
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.log('[InstantViewer] Database initialized');
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      if (this.statusDisplay) {
        this.statusDisplay.addMessage(`!! Database init failed: ${error.message}`);
      }
      this.databaseManager = null;
    }
  }

  /**
   * Check and start monitor (blocking for initial setup)
   */
  async checkAndStartMonitor() {
    try {
      this.statusDisplay.addMessage(">> Checking monitor status...");
      
      // Initialize process manager
      this.processManager = new ProcessManager(this.config);
      const status = await this.processManager.getMonitorStatus();
      
      if (status.status === 'stopped') {
        this.statusDisplay.addMessage(">> Starting background monitor...");
        
        const monitorScript = path.join(__dirname, '../monitors/monitor-process.js');
        const pid = await this.processManager.startMonitor(monitorScript, {
          started_by: 'viewer'
        });
        
        this.statusDisplay.addMessage(`>> Background monitor started (PID: ${pid})`);
        
        // Wait for monitor initialization and initial file scan
        this.statusDisplay.addMessage(">> Waiting for initial file scan...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } else if (status.status === 'running') {
        this.statusDisplay.addMessage(`>> Background monitor already running (PID: ${status.pid})`);
        
      } else if (status.status === 'stale') {
        this.statusDisplay.addMessage(`!! Monitor: stale (PID: ${status.pid})`);
        this.statusDisplay.addMessage(">> Monitor not running - read-only mode");
        // Don't restart stale monitors automatically - let user decide
      }
      
      // Start periodic monitor status checking
      this.startMonitorStatusCheck();
      
    } catch (error) {
      this.statusDisplay.addMessage("!! Monitor start failed, running in read-only mode");
      console.error('Monitor start error:', error);
    }
  }


  /**
   * Load data progressively
   */
  async loadDataProgressively() {
    console.log('[InstantViewer] loadDataProgressively called');
    if (!this.databaseManager || !this.databaseManager.isInitialized) {
      this.statusDisplay.addMessage(">> Database not initialized - skipping load");
      return;
    }
    
    try {
      this.statusDisplay.updateMessage(">> Loading existing events...");
      
      // Initialize progressive loader
      // Pass the eventDisplayManager instead of cliDisplay
      this.progressiveLoader = new ProgressiveLoader(
        this.databaseManager,
        this.cliDisplay.eventDisplayManager,
        this.statusDisplay
      );
      
      // Load only recent events first for instant display
      // Use display.maxEvents from config as the limit
      const displayLimit = this.config.display?.maxEvents || 20;
      console.log(`[InstantViewer] Loading only ${displayLimit} recent events (display.maxEvents)`);
      const loadedCount = await this.progressiveLoader.loadRecentEventsFirst(displayLimit);
      
      // Get the last loaded event ID from recent events
      const lastEventId = this.progressiveLoader.getLastLoadedEventId();
      
      if (loadedCount > 0) {
        this.statusDisplay.addMessage(`>> Loaded ${loadedCount} recent events (limited to display.maxEvents)`);
        console.log(`[InstantViewer] Successfully loaded ${loadedCount} recent events`);
      } else {
        this.statusDisplay.addMessage(">> No events found");
      }
      
      this.statusDisplay.addMessage(">> Ready - Monitoring active");
      
      // Store for database watcher
      this.lastLoadedEventId = lastEventId;
      
      // Note: We don't load all events anymore - only recent ones
      // If user wants to see older events, they could scroll up or use a different mode
      
    } catch (error) {
      this.statusDisplay.addMessage(`!! Failed to load events: ${error.message}`);
      console.error('Progressive loading error:', error);
    }
  }

  /**
   * Start database watcher for real-time events
   */
  startDatabaseWatcher() {
    if (!this.databaseManager || !this.cliDisplay) {
      console.warn('[InstantViewer] Cannot start database watcher - dependencies not ready');
      return;
    }

    try {
      this.databaseWatcher = new DatabaseWatcher(this.databaseManager);
      
      // Set the starting point to the last loaded event ID
      if (this.lastLoadedEventId) {
        this.databaseWatcher.setLastEventId(this.lastLoadedEventId);
      }
      
      // Listen for new events
      this.databaseWatcher.on('event', (event) => {
        // Add event to display immediately
        if (this.cliDisplay && this.cliDisplay.addEvent) {
          this.cliDisplay.addEvent(event);
        }
      });

      // Start watching
      this.databaseWatcher.start();
      console.log('[InstantViewer] Database watcher started');
      
    } catch (error) {
      console.error('[InstantViewer] Failed to start database watcher:', error);
    }
  }

  /**
   * Start monitor status checking
   */
  startMonitorStatusCheck() {
    // Check monitor status every 30 seconds
    this.monitorCheckInterval = setInterval(async () => {
      if (!this.isRunning || !this.processManager) {
        return;
      }
      
      try {
        const status = await this.processManager.getMonitorStatus();
        
        if (status.status === 'stopped') {
          this.statusDisplay.addMessage('>> Monitor process stopped');
          // Don't automatically restart - let user decide
        } else if (status.status === 'stale') {
          // Already handled in checkAndStartMonitor, just log
          if (process.env.CCTOP_VERBOSE === 'true') {
            console.log('[InstantViewer] Monitor is stale but not restarting');
          }
        }
        
        // Update CLI display with monitor status
        if (this.cliDisplay) {
          this.cliDisplay.updateMonitorStatus(status);
        }
        
      } catch (error) {
        console.error('Monitor status check failed:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop instant viewer
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }
    
    
    try {
      this.isRunning = false;
      
      // Stop database watcher
      if (this.databaseWatcher) {
        this.databaseWatcher.stop();
        this.databaseWatcher = null;
      }
      
      // Stop monitor status checking
      if (this.monitorCheckInterval) {
        clearInterval(this.monitorCheckInterval);
        this.monitorCheckInterval = null;
      }
      
      // Handle monitor shutdown based on started_by
      if (this.processManager) {
        const status = await this.processManager.getMonitorStatus();
        
        if (status.running && status.started_by === 'viewer') {
          await this.processManager.stopMonitor();
          if (this.statusDisplay) {
            this.statusDisplay.addMessage(">> Monitor stopped (started by viewer)");
          }
        } else if (status.running && status.started_by === 'standalone') {
          if (this.statusDisplay) {
            this.statusDisplay.addMessage(">> Monitor continues running (standalone)");
          }
        } else {
        }
      }
      
      // Stop CLI display
      if (this.cliDisplay) {
        await this.cliDisplay.stop();
        this.cliDisplay = null;
      }
      
      // Close database connection
      if (this.databaseManager) {
        await this.databaseManager.close();
        this.databaseManager = null;
      }
      
    } catch (error) {
      console.error('Error stopping instant viewer:', error);
    }
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedMs() {
    const elapsed = process.hrtime.bigint() - this.startTime;
    return Number(elapsed / 1000000n);
  }

  /**
   * Get viewer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: process.pid,
      databaseConnected: this.databaseManager ? this.databaseManager.isInitialized : false,
      displayActive: this.cliDisplay ? this.cliDisplay.isRunning : false,
      startupTime: this.getElapsedMs()
    };
  }
}

module.exports = InstantViewer;
/**
 * Monitor Process (FUNC-003 compliant)
 * Independent background process for file monitoring
 */

const FileMonitor = require('./file-monitor');
const EventProcessor = require('./event-processor');
const DatabaseManager = require('../database/database-manager');
const ConfigManager = require('../config/config-manager');
const ProcessManager = require('./process-manager');

class MonitorProcess {
  constructor() {
    this.isRunning = false;
    this.fileMonitor = null;
    this.eventProcessor = null;
    this.databaseManager = null;
    this.processManager = null;
    this.config = null;
    this.heartbeatInterval = null;
    this.shutdownSignalReceived = false;
  }

  /**
   * Initialize and start monitor process
   */
  async start() {
    try {
      
      // Load configuration
      const configManager = new ConfigManager();
      this.config = await configManager.initialize();
      
      // Initialize process manager for logging
      this.processManager = new ProcessManager(this.config);
      await this.processManager.log('info', 'Monitor process starting...');
      
      // Initialize database with WAL mode for concurrent access
      const dbPath = this.config.database?.path;
      await this.processManager.log('info', `Database path from config: ${dbPath}`);
      this.databaseManager = new DatabaseManager(dbPath);
      await this.databaseManager.initialize();
      await this.databaseManager.enableWALMode();
      await this.processManager.log('info', 'Database initialized with WAL mode');
      
      // Initialize event processor
      this.eventProcessor = new EventProcessor(this.databaseManager, this.config);
      
      // Initialize file monitor
      await this.processManager.log('debug', `Config monitoring: ${JSON.stringify(this.config.monitoring)}`);
      this.fileMonitor = new FileMonitor(this.config.monitoring);
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Setup signal handlers for graceful shutdown
      this.setupSignalHandlers();
      
      // Start file monitoring
      this.fileMonitor.start();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.isRunning = true;
      await this.processManager.log('info', `Monitor process started successfully (PID: ${process.pid})`);
      
      // Keep process alive
      this.keepAlive();
      
    } catch (error) {
      console.error('[Monitor] Failed to start:', error);
      if (this.processManager) {
        await this.processManager.log('error', `Failed to start: ${error.message}`);
      }
      process.exit(1);
    }
  }

  /**
   * Setup event handlers for file monitoring
   */
  setupEventHandlers() {
    // Handle file events from monitor
    this.fileMonitor.on('fileEvent', async (event) => {
      try {
        await this.eventProcessor.processFileEvent(event);
        
        // Log high-frequency events only in verbose mode
        if (process.env.CCTOP_VERBOSE) {
          await this.processManager.log('debug', 
            `Processed ${event.type} event: ${event.path}`);
        }
      } catch (error) {
        await this.processManager.log('error', 
          `Failed to process event ${event.type} for ${event.path}: ${error.message}`);
      }
    });

    // Handle monitor ready event
    this.fileMonitor.on('ready', async () => {
      await this.processManager.log('info', 'Initial file scan completed');
    });

    // Handle monitor errors
    this.fileMonitor.on('error', async (error) => {
      await this.processManager.log('error', `File monitor error: ${error.message}`);
      
      // Try to restart monitor on error
      setTimeout(async () => {
        if (this.isRunning && !this.shutdownSignalReceived) {
          await this.restartFileMonitor();
        }
      }, 5000);
    });
  }

  /**
   * Setup signal handlers for graceful shutdown (consolidated version)
   */
  setupSignalHandlers() {
    // Normal termination signals
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    
    // Application-defined signals
    process.on('SIGUSR1', () => this.reloadConfig());
    process.on('SIGUSR2', () => this.dumpStatus());

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('[Monitor] Uncaught exception:', error);
      if (this.processManager) {
        await this.processManager.log('error', `Uncaught exception: ${error.message}`);
      }
      await this.stop();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('[Monitor] Unhandled rejection at:', promise, 'reason:', reason);
      if (this.processManager) {
        await this.processManager.log('error', `Unhandled rejection: ${reason}`);
      }
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Start heartbeat logging
   */
  startHeartbeat() {
    const heartbeatInterval = this.config.monitor?.heartbeatInterval || 30000; // 30 seconds
    
    this.heartbeatInterval = setInterval(async () => {
      if (this.isRunning) {
        const stats = this.fileMonitor.getStats();
        await this.processManager.log('info', 
          `Heartbeat: monitoring ${stats.watchedPaths.length} paths, ` +
          `${stats.ignored.length} ignore patterns`);
      }
    }, heartbeatInterval);
  }

  /**
   * Restart file monitor after error
   */
  async restartFileMonitor() {
    try {
      await this.processManager.log('info', 'Restarting file monitor...');
      
      if (this.fileMonitor) {
        await this.fileMonitor.stop();
      }
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.fileMonitor = new FileMonitor(this.config);
      this.setupEventHandlers();
      this.fileMonitor.start();
      
      await this.processManager.log('info', 'File monitor restarted successfully');
    } catch (error) {
      await this.processManager.log('error', `Failed to restart file monitor: ${error.message}`);
    }
  }

  /**
   * Stop monitor process
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Stop file monitor
      if (this.fileMonitor) {
        await this.fileMonitor.stop();
        this.fileMonitor = null;
      }

      // Close database
      if (this.databaseManager) {
        await this.databaseManager.close();
        this.databaseManager = null;
      }

      if (this.processManager) {
        await this.processManager.log('info', 'Monitor process stopped gracefully');
      }

    } catch (error) {
      console.error('[Monitor] Error during shutdown:', error);
      if (this.processManager) {
        await this.processManager.log('error', `Error during shutdown: ${error.message}`);
      }
    }
  }


  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown(signal) {
    if (this.shutdownSignalReceived) {
      return; // Prevent multiple shutdown attempts
    }
    this.shutdownSignalReceived = true;
    
    if (this.processManager) {
      await this.processManager.log('info', `Received ${signal}, shutting down gracefully...`);
    }
    
    try {
      // 1. Stop accepting new events
      if (this.fileMonitor) {
        await this.fileMonitor.close();
      }
      
      // 2. Flush pending events
      if (this.eventProcessor) {
        await this.flushPendingEvents();
      }
      
      // 3. Close database connection
      if (this.databaseManager) {
        await this.databaseManager.close();
      }
      
      // 4. Remove PID file
      if (this.processManager) {
        await this.processManager.removePidFile();
        await this.processManager.log('info', 'Monitor shutdown completed');
      }
      
      process.exit(0);
    } catch (error) {
      console.error('[Monitor] Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Flush pending events before shutdown
   */
  async flushPendingEvents() {
    if (!this.eventProcessor || !this.eventProcessor.eventQueue) {
      return;
    }
    
    const pendingCount = this.eventProcessor.eventQueue.length;
    if (pendingCount > 0) {
      
      // Wait for event queue to be processed
      const maxWait = 5000; // 5 seconds max
      const startTime = Date.now();
      
      while (this.eventProcessor.eventQueue.length > 0 && 
             (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const remaining = this.eventProcessor.eventQueue.length;
      if (remaining > 0) {
        console.warn(`[Monitor] Could not flush ${remaining} events within timeout`);
      }
    }
  }

  /**
   * Reload configuration (SIGUSR1 handler)
   */
  async reloadConfig() {
    try {
      const configManager = new ConfigManager();
      this.config = await configManager.initialize();
      
      if (this.processManager) {
        await this.processManager.log('info', 'Configuration reloaded');
      }
      
      // Apply new config to components if needed
      if (this.fileMonitor && this.config.monitoring) {
        // Note: Would need to implement hot-reload in FileMonitor
      }
    } catch (error) {
      console.error('[Monitor] Error reloading configuration:', error);
    }
  }

  /**
   * Dump status information (SIGUSR2 handler)
   */
  async dumpStatus() {
    try {
      const status = this.getStatus();
      
      if (this.processManager) {
        await this.processManager.log('info', `Status dump: ${JSON.stringify(status)}`);
      }
    } catch (error) {
      console.error('[Monitor] Error dumping status:', error);
    }
  }

  /**
   * Keep process alive
   */
  keepAlive() {
    // Use setInterval to keep the process running
    const keepAliveInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(keepAliveInterval);
      }
    }, 1000);
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: process.pid,
      fileMonitorStats: this.fileMonitor ? this.fileMonitor.getStats() : null,
      uptime: process.uptime()
    };
  }
}

// If this file is run directly, start the monitor process
if (require.main === module) {
  const monitor = new MonitorProcess();
  
  // Setup signal handlers for graceful shutdown
  monitor.setupSignalHandlers();
  
  monitor.start().catch(error => {
    console.error('[Monitor] Failed to start monitor process:', error);
    process.exit(1);
  });
}

module.exports = MonitorProcess;
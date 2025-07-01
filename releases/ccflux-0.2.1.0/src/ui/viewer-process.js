/**
 * Viewer Process (FUNC-003 compliant)
 * Foreground process for data display and monitor control
 */

const DatabaseManager = require('../database/database-manager');
const ConfigManager = require('../config/config-manager');
const ProcessManager = require('../monitors/process-manager');
const CLIDisplay = require('./cli-display');
const path = require('path');

class ViewerProcess {
  constructor(config = {}) {
    this.config = config;
    this.databaseManager = null;
    this.processManager = null;
    this.cliDisplay = null;
    this.isRunning = false;
    this.refreshInterval = null;
    this.monitorCheckInterval = null;
  }

  /**
   * Start viewer process
   */
  async start() {
    try {
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.log('Starting CCTOP Viewer...');
      }
      
      // Load configuration
      if (!this.config.baseDir) {
        const configManager = new ConfigManager();
        this.config = await configManager.initialize();
      }
      
      // Initialize process manager
      this.processManager = new ProcessManager(this.config);
      
      // Check and start monitor if needed
      await this.ensureMonitorRunning();
      
      // Initialize database (read-only access)
      this.databaseManager = new DatabaseManager(this.config.database?.path);
      await this.databaseManager.initialize();
      
      // Initialize CLI display
      this.cliDisplay = new CLIDisplay(this.databaseManager, {
        refreshRate: 60, // 60ms refresh for real-time display
        showMonitorStatus: true,
        mode: 'viewer' // Viewer mode (no file monitoring)
      });
      
      // Setup monitor status checking
      this.startMonitorStatusCheck();
      
      // Start CLI display
      await this.cliDisplay.start();
      
      this.isRunning = true;
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.log('CCTOP Viewer started successfully');
      }
      
    } catch (error) {
      console.error('Failed to start viewer:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Ensure monitor process is running
   */
  async ensureMonitorRunning() {
    try {
      const status = await this.processManager.getMonitorStatus();
      
      if (status.status === 'stopped') {
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log('Starting background monitor...');
        }
        
        // Get monitor script path
        const monitorScript = path.join(__dirname, '../monitors/monitor-process.js');
        
        // Start monitor process (started by viewer)
        const pid = await this.processManager.startMonitor(monitorScript, {
          started_by: 'viewer'
        });
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`Monitor started with PID: ${pid}`);
        }
        
        // Wait a bit for monitor to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } else if (status.status === 'running') {
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`Monitor already running (PID: ${status.pid})`);
        }
        
      } else if (status.status === 'stale') {
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log('Cleaning up stale monitor and restarting...');
        }
        
        // Clean up stale process
        await this.processManager.stopMonitor();
        
        // Start fresh monitor (started by viewer)
        const monitorScript = path.join(__dirname, '../monitors/monitor-process.js');
        const pid = await this.processManager.startMonitor(monitorScript, {
          started_by: 'viewer'
        });
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`Monitor restarted with PID: ${pid}`);
        }
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } else {
        console.warn(`Monitor status: ${status.status}`);
        if (status.error) {
          console.warn(`    Error: ${status.error}`);
        }
      }
      
    } catch (error) {
      console.error('Failed to ensure monitor running:', error);
      
      // Try to start monitor anyway
      try {
        const monitorScript = path.join(__dirname, '../monitors/monitor-process.js');
        const pid = await this.processManager.startMonitor(monitorScript, {
          started_by: 'viewer'
        });
        console.log(`Monitor started with PID: ${pid} (after error recovery)`);
      } catch (startError) {
        console.error('Failed to start monitor after error:', startError);
        throw error;
      }
    }
  }

  /**
   * Start monitor status checking
   */
  startMonitorStatusCheck() {
    // Check monitor status every 30 seconds
    this.monitorCheckInterval = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }
      
      try {
        const status = await this.processManager.getMonitorStatus();
        
        if (status.status === 'stopped' || status.status === 'stale') {
          console.log('Monitor process stopped, attempting restart...');
          await this.ensureMonitorRunning();
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
   * Stop viewer process
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }
    
    try {
      if (process.env.CCTOP_VERBOSE) {
        console.log('Stopping CCTOP Viewer...');
      }
      this.isRunning = false;
      
      // Stop monitor status checking
      if (this.monitorCheckInterval) {
        clearInterval(this.monitorCheckInterval);
        this.monitorCheckInterval = null;
      }
      
      // Handle monitor shutdown based on started_by (FUNC-003/206 compliant)
      if (this.processManager) {
        try {
          const status = await this.processManager.getMonitorStatus();
          
          if (status.running && status.started_by === 'viewer') {
            // Viewer started monitor should be stopped
            await this.processManager.stopMonitor();
            if (process.env.CCTOP_VERBOSE) {
              console.log('Monitor stopped (started by viewer)');
            }
          } else if (status.running && status.started_by === 'standalone') {
            // Standalone monitor continues running
            if (process.env.CCTOP_VERBOSE) {
              console.log('ℹ️  Monitor continues running (standalone)');
            }
          } else if (status.running && status.started_by === 'unknown') {
            // Unknown origin monitor continues (safe side)
            if (process.env.CCTOP_VERBOSE) {
              console.log('ℹ️  Monitor continues running (unknown origin)');
            }
          }
        } catch (error) {
          console.error('Error checking monitor status:', error);
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
      
      if (process.env.CCTOP_VERBOSE) {
        console.log('CCTOP Viewer stopped');
      }
      
    } catch (error) {
      console.error('Error stopping viewer:', error);
    }
  }

  /**
   * Stop monitor process (manual control)
   */
  async stopMonitor() {
    try {
      const result = await this.processManager.stopMonitor();
      if (result) {
        console.log('Monitor process stopped');
      } else {
        console.log('ℹ️  No monitor process to stop');
      }
      return result;
    } catch (error) {
      console.error('Failed to stop monitor:', error);
      throw error;
    }
  }

  /**
   * Get monitor status
   */
  async getMonitorStatus() {
    try {
      return await this.processManager.getMonitorStatus();
    } catch (error) {
      console.error('Failed to get monitor status:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get monitor logs
   */
  async getMonitorLogs(lines = 50) {
    try {
      return await this.processManager.getRecentLogs(lines);
    } catch (error) {
      console.error('Failed to get monitor logs:', error);
      return [];
    }
  }

  /**
   * Get viewer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: process.pid,
      databaseConnected: this.databaseManager ? this.databaseManager.isInitialized : false,
      displayActive: this.cliDisplay ? this.cliDisplay.isRunning : false
    };
  }
}

// If this file is run directly, start the viewer process
if (require.main === module) {
  const viewer = new ViewerProcess();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, stopping viewer...');
    await viewer.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, stopping viewer...');
    await viewer.stop();
    process.exit(0);
  });
  
  viewer.start().catch(error => {
    console.error('Failed to start viewer:', error);
    process.exit(1);
  });
}

module.exports = ViewerProcess;
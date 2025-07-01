/**
 * Feature 5 Event Processor - Test Setup Utilities
 * Common setup and teardown logic for integration tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const DatabaseManager = require('../../../dist/src/database/database-manager');
const FileMonitor = require('../../../dist/src/monitors/file-monitor');
const EventProcessor = require('../../../dist/src/monitors/event-processor');

class Feature5TestSetup {
  constructor() {
    this.testDir = null;
    this.dbManager = null;
    this.fileMonitor = null;
    this.eventProcessor = null;
    this.testDbPath = null;
  }

  async setUp() {
    // Test temporary directory and DB
    this.testDir = path.join(os.tmpdir(), `test-event-processor-${Date.now()}`);
    fs.mkdirSync(this.testDir, { recursive: true });
    
    this.testDbPath = path.join(os.tmpdir(), `test-event-processor-${Date.now()}.db`);
    
    // Database initialization
    this.dbManager = new DatabaseManager(this.testDbPath);
    await this.dbManager.initialize();
    
    // Event Processor initialization
    this.eventProcessor = new EventProcessor(this.dbManager);
  }

  async tearDown() {
    if (this.fileMonitor) {
      // Remove all event listeners
      this.fileMonitor.removeAllListeners();
      await this.fileMonitor.stop();
      this.fileMonitor = null;
    }
    
    if (this.eventProcessor) {
      this.eventProcessor.cleanup();
      this.eventProcessor = null;
    }
    
    if (this.dbManager) {
      await this.dbManager.close();
      this.dbManager = null;
    }
    
    // Test directory and DB cleanup
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    
    if (fs.existsSync(this.testDbPath)) {
      fs.unlinkSync(this.testDbPath);
    }
  }

  createFileMonitor(customConfig = {}) {
    const config = {
      watchPaths: [this.testDir],
      ignored: [],
      depth: 10,
      ...customConfig
    };

    this.fileMonitor = new FileMonitor(config);
    return this.fileMonitor;
  }

  async waitForReady(monitor = this.fileMonitor) {
    return new Promise((resolve) => {
      monitor.once('ready', resolve);
    });
  }

  async createTestFile(fileName, content = 'Test content') {
    const filePath = path.join(this.testDir, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  async waitAndGetEvents(timeoutMs = 1000, limit = 10) {
    await new Promise(resolve => setTimeout(resolve, timeoutMs));
    return await this.dbManager.getRecentEvents(limit);
  }
}

module.exports = Feature5TestSetup;
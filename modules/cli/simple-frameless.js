#!/usr/bin/env node

/**
 * Simple Frameless UI Demo (using built dist files)
 */

const { BlessedFramelessUI } = require('./dist/ui/blessed-frameless-ui.js');

// Mock database adapter for demo
class MockDatabaseAdapter {
  constructor() {
    this.testData = this.generateTestData();
  }

  generateTestData() {
    const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
    const files = [
      'index.ts', 'app.js', 'config.json', 'main.py', 'utils.cpp',
      'component.tsx', 'style.css', 'README.md', 'package.json', 'test.spec.js'
    ];
    const dirs = ['src', 'test', 'docs', 'config', 'utils', 'components'];
    
    const events = [];
    for (let i = 0; i < 30; i++) {
      const file = files[Math.floor(Math.random() * files.length)];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      events.push({
        id: i + 1,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        filename: file,
        directory: dir,
        event_type: eventType,
        size: Math.floor(Math.random() * 10000),
        lines: Math.floor(Math.random() * 500),
        blocks: Math.floor(Math.random() * 50),
        inode: Math.floor(Math.random() * 100000),
        elapsed_ms: Math.floor(Math.random() * 100)
      });
    }
    
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async getLatestEvents(limit = 100) {
    return this.testData.slice(0, limit);
  }
}

async function runFramelessDemo() {
  console.log('Starting Frameless UI Demo...');
  
  try {
    // Create mock database adapter
    const mockDb = new MockDatabaseAdapter();
    
    // Create UI instance with database adapter
    const ui = new BlessedFramelessUI(mockDb);
    
    // Start UI (it will automatically fetch data via mockDb)
    await ui.start();
    
  } catch (error) {
    console.error('Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runFramelessDemo();
#!/usr/bin/env node

/**
 * Demo for Panel-based CCTOP UI
 * Shows multi-panel layout with event list, statistics, and details
 */

const path = require('path');

// TypeScript compilation and execution
const { execSync } = require('child_process');

// Compile TypeScript files
try {
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'modules/cli'),
    stdio: 'inherit' 
  });
} catch (error) {
  console.error('Failed to compile TypeScript:', error.message);
  process.exit(1);
}

// Import the compiled JavaScript
const { BlessedPanelUI } = require('./modules/cli/dist/ui/blessed-panel-ui.js');
const { DatabaseAdapter } = require('./modules/cli/dist/database/database-adapter.js');

// Mock database adapter for demo
class MockDatabaseAdapter {
  constructor() {
    this.eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
    this.directories = ['src/', 'test/', 'docs/', 'lib/', 'config/'];
    this.filenames = [
      'index.js', 'app.ts', 'config.json', 'README.md', 'test.spec.js',
      'component.tsx', 'utils.js', 'style.css', 'package.json', 'main.py'
    ];
  }

  async getLatestEvents(limit = 25) {
    const events = [];
    const now = Date.now();
    
    for (let i = 0; i < limit; i++) {
      const event = {
        id: i + 1,
        timestamp: new Date(now - (Math.random() * 3600000)).toISOString(), // Random time within last hour
        event_type: this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)],
        filename: this.filenames[Math.floor(Math.random() * this.filenames.length)],
        directory: this.directories[Math.floor(Math.random() * this.directories.length)],
        size: Math.floor(Math.random() * 10000) + 100,
        lines: Math.floor(Math.random() * 500) + 10,
        blocks: Math.floor(Math.random() * 50) + 1,
        inode: Math.floor(Math.random() * 1000000) + 100000
      };
      events.push(event);
    }
    
    // Sort by timestamp (newest first)
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

async function runDemo() {
  console.log('Starting CCTOP Panel UI Demo...');
  console.log('Press q to quit, ↑↓ to navigate, Enter to select, Space to pause');
  console.log('');

  // Create mock database
  const db = new MockDatabaseAdapter();
  
  // Configure UI with custom colors
  const config = {
    refreshInterval: 2000, // 2 seconds for demo
    maxRows: 30,
    colors: {
      header: 'cyan',
      status: 'green',
      find: 'cyan',
      create: 'green',
      modify: 'yellow',
      delete: 'red',
      move: 'magenta',
      restore: 'blue',
      border: 'white'
    }
  };

  // Create and start UI
  const ui = new BlessedPanelUI(db, config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    ui.stop();
    console.log('\nDemo stopped.');
    process.exit(0);
  });

  try {
    await ui.start();
  } catch (error) {
    console.error('Error running panel UI demo:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };
#!/usr/bin/env node

/**
 * Demo for Frameless CCTOP UI
 * Independent header panel with borderless columns
 */

const path = require('path');
const { execSync } = require('child_process');

async function runFramelessDemo() {
  console.log('Building Frameless UI...');
  
  try {
    // Compile TypeScript files
    execSync('npm run build', { 
      cwd: path.join(__dirname, 'modules/cli'),
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('Failed to compile TypeScript:', error.message);
    process.exit(1);
  }

  // Import the compiled JavaScript
  const { BlessedFramelessUI } = require('./modules/cli/dist/ui/blessed-frameless-ui.js');

  // Mock database adapter for demo
  class MockDatabaseAdapter {
    constructor() {
      this.eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
      this.directories = ['src/', 'test/', 'docs/', 'lib/', 'config/', 'assets/', 'scripts/'];
      this.filenames = [
        'index.js', 'app.ts', 'config.json', 'README.md', 'test.spec.js',
        'component.tsx', 'utils.js', 'style.css', 'package.json', 'main.py',
        'header.vue', 'service.go', 'model.rs', 'api.php', 'worker.rb',
        'settings.json', 'middleware.js', 'database.sql', 'router.ts'
      ];
    }

    async getLatestEvents(limit = 25) {
      const events = [];
      const now = Date.now();
      
      for (let i = 0; i < limit; i++) {
        const event = {
          id: i + 1,
          timestamp: new Date(now - (Math.random() * 7200000)).toISOString(), // Random time within last 2 hours
          event_type: this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)],
          filename: this.filenames[Math.floor(Math.random() * this.filenames.length)],
          directory: this.directories[Math.floor(Math.random() * this.directories.length)],
          size: Math.floor(Math.random() * 50000) + 100,
          lines: Math.floor(Math.random() * 1000) + 10,
          blocks: Math.floor(Math.random() * 100) + 1,
          inode: Math.floor(Math.random() * 2000000) + 100000
        };
        events.push(event);
      }
      
      // Sort by timestamp (newest first)
      return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  }

  console.log('Starting CCTOP Frameless UI Demo...');
  console.log('Layout: Independent header panel + borderless columns');
  console.log('Controls: ↑↓ Navigate (synchronized), Enter Details, Space Pause, q Quit');
  console.log('');

  // Create mock database
  const db = new MockDatabaseAdapter();
  
  // Configure UI with custom column widths and colors
  const config = {
    refreshInterval: 3000, // 3 seconds for demo
    maxRows: 30,
    columnWidths: {
      timestamp: 20,   // Timestamp column width
      elapsed: 10,     // Elapsed time column width  
      filename: 25,    // File name column width
      event: 10,       // Event type column width
      lines: 8,        // Lines count column width
      blocks: 8,       // Blocks count column width
      directory: 20    // Directory column width
    },
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
  const ui = new BlessedFramelessUI(db, config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    ui.stop();
    console.log('\nFrameless UI Demo stopped.');
    process.exit(0);
  });

  try {
    await ui.start();
  } catch (error) {
    console.error('Error running frameless UI demo:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  runFramelessDemo().catch(console.error);
}

module.exports = { runFramelessDemo };
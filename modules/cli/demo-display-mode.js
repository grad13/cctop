#!/usr/bin/env node

/**
 * Demo script for Display Mode Selector
 * Tests all/unique mode switching functionality
 */

const { BlessedFramelessUISimple } = require('./dist/ui/blessed-frameless-ui-simple');
const { DatabaseAdapter } = require('./dist/database/database-adapter');

async function startDemo() {
  console.log('Starting Display Mode Selector Demo...');
  console.log('Press [a] for All Events, [u] for Unique Files');
  console.log('Watch the header for current mode display');
  
  // Create database adapter (will use demo mode)
  const db = new DatabaseAdapter('./.cctop/data/activity.db');
  await db.connect();
  
  // Create UI with default 'all' mode
  const ui = new BlessedFramelessUISimple(db, {
    displayMode: 'all',
    refreshInterval: 1000,
    maxRows: 25
  });
  
  // Start the UI
  await ui.start();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down demo...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down demo...');
  process.exit(0);
});

// Start the demo
startDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
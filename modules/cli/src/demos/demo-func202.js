#!/usr/bin/env node

/**
 * FUNC-202 Compliant Demo
 * Demonstrates the working UI with proper Japanese support
 */

const { BlessedFramelessUISimple } = require('../../dist/ui/blessed-frameless-ui-simple.js');
const { DatabaseAdapter } = require('../../dist/database/database-adapter.js');

async function runDemo() {
  console.log('Starting FUNC-202 Compliant Demo...');
  console.log('');
  console.log('Features:');
  console.log('- [f] Filter Mode');
  console.log('- [/] Search Mode');
  console.log('- [a] All Activities');
  console.log('- [u] Unique Files');
  console.log('- [space] Pause/Resume');
  console.log('- [q] Exit');
  console.log('');
  
  try {
    // Create database adapter (will use demo mode)
    const db = new DatabaseAdapter('./demo.db');
    await db.connect();
    
    // Create UI instance
    const ui = new BlessedFramelessUISimple(db, {
      displayMode: 'all',
      refreshInterval: 100
    });
    
    // Start UI
    await ui.start();
    
    // Cleanup on exit
    process.on('exit', async () => {
      await db.disconnect();
    });
    
  } catch (error) {
    console.error('Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runDemo();
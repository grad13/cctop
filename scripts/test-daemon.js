#!/usr/bin/env node

// Quick test script to verify daemon functionality
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting daemon test...');

// Start daemon
const daemon = spawn('node', ['bin/cctop-daemon'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

daemon.stdout.on('data', (data) => {
  console.log(`[DAEMON]: ${data.toString().trim()}`);
});

daemon.stderr.on('data', (data) => {
  console.error(`[DAEMON ERROR]: ${data.toString().trim()}`);
});

// Wait for daemon to initialize
setTimeout(() => {
  console.log('Creating test files...');
  
  // Create test files
  const testDir = 'test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  // Create multiple files
  for (let i = 1; i <= 5; i++) {
    const filePath = path.join(testDir, `test-${i}.txt`);
    fs.writeFileSync(filePath, `Test file ${i} content`);
    console.log(`Created: ${filePath}`);
  }
  
  // Check database after a delay
  setTimeout(() => {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('.cctop/data/activity.db');
    
    db.all('SELECT * FROM file_events ORDER BY timestamp DESC LIMIT 10', (err, rows) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.log(`\nFound ${rows.length} events in database:`);
        rows.forEach(row => {
          console.log(`- ${row.event_type}: ${row.filename}`);
        });
      }
      
      // Cleanup
      console.log('\nCleaning up...');
      daemon.kill('SIGINT');
      
      setTimeout(() => {
        // Remove test files
        const files = fs.readdirSync(testDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(testDir, file));
        });
        fs.rmdirSync(testDir);
        console.log('Test completed.');
        process.exit(0);
      }, 1000);
    });
    
    db.close();
  }, 2000);
}, 2000);
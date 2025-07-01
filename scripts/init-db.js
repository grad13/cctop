#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join('.cctop', 'data', 'activity.db');
const dbDir = path.dirname(dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Enable WAL mode
  db.run('PRAGMA journal_mode=WAL');
  
  // Create events table
  db.run(`
    CREATE TABLE IF NOT EXISTS file_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      directory TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      inode_number INTEGER NOT NULL
    )
  `);
  
  console.log('Database initialized at:', dbPath);
});

db.close();
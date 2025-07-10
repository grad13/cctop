#!/usr/bin/env node

import * as sqlite3 from 'sqlite3';

console.log('Creating test cctop.db with FUNC-000 schema...');

const db = new sqlite3.Database('./cctop.db');

db.serialize(() => {
  // Create files table (FUNC-000 schema)
  db.run(`CREATE TABLE IF NOT EXISTS files (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_path TEXT UNIQUE NOT NULL,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create events table (FUNC-000 schema)
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    size INTEGER,
    lines INTEGER,
    blocks INTEGER,
    inode INTEGER,
    FOREIGN KEY (file_id) REFERENCES files(file_id)
  )`);

  // Insert test data
  const files = [
    { name: 'README.md', path: '/projects/cctop/README.md' },
    { name: 'index.js', path: '/projects/cctop/src/index.js' },
    { name: 'package.json', path: '/projects/cctop/package.json' },
    { name: 'test.spec.js', path: '/projects/cctop/test/test.spec.js' },
    { name: 'config.json', path: '/projects/config/config.json' }
  ];

  const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];

  files.forEach((file) => {
    db.run(`INSERT INTO files (file_name, file_path) VALUES (?, ?)`, 
      [file.name, file.path], function(err) {
        if (err) return;
        
        const fileId = this.lastID;
        
        // Generate 3-5 events per file
        const eventCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < eventCount; i++) {
          const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          const timestamp = new Date(Date.now() - Math.random() * 3600000).toISOString();
          const size = Math.floor(Math.random() * 100000);
          const lines = Math.floor(Math.random() * 1000);
          const blocks = Math.ceil(size / 4096);
          const inode = 1000000 + Math.floor(Math.random() * 1000000);
          
          db.run(`INSERT INTO events (timestamp, file_id, event_type, size, lines, blocks, inode) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [timestamp, fileId, eventType, size, lines, blocks, inode]);
        }
      });
  });
});

setTimeout(() => {
  db.close(() => {
    console.log('Test database created successfully!');
    console.log('Run npm run demo:ui to test the UI');
  });
}, 1000);
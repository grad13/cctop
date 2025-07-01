/**
 * cctop Daemon - File monitoring service
 */

import chokidar from 'chokidar';
import { Database, FileEvent } from '@cctop/shared';
import * as path from 'path';
import * as fs from 'fs/promises';

const DB_PATH = '.cctop/data/activity.db';
const WATCH_PATH = process.cwd();

async function main() {
  console.log('Starting cctop daemon...');
  
  // Initialize database
  const db = new Database(DB_PATH);
  await db.connect();
  console.log('Database connected');

  // Initialize file watcher
  const watcher = chokidar.watch(WATCH_PATH, {
    persistent: true,
    ignoreInitial: false,
    ignored: /(^|[\/\\])\../, // ignore dotfiles
  });

  // Handle file events
  watcher
    .on('add', async (filePath) => {
      const stats = await fs.stat(filePath);
      const event: FileEvent = {
        eventType: 'create',
        filePath,
        directory: path.dirname(filePath),
        filename: path.basename(filePath),
        fileSize: stats.size,
        timestamp: new Date(),
        inodeNumber: stats.ino
      };
      await db.insertEvent(event);
      console.log(`File added: ${filePath}`);
    })
    .on('change', async (filePath) => {
      console.log(`File changed: ${filePath}`);
    })
    .on('unlink', async (filePath) => {
      console.log(`File removed: ${filePath}`);
    });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\nShutting down daemon...');
    await watcher.close();
    await db.close();
    process.exit(0);
  });

  console.log('Daemon started successfully');
}

main().catch(console.error);
#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs/promises';
import { DatabaseReader } from './database/reader';
import { TerminalUI } from './ui/terminal';
import { loadConfiguration } from './config/loader';

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  let ui: TerminalUI | null = null;
  let reader: DatabaseReader | null = null;

  try {
    // Check if .cctop directory exists
    const cctopDir = '.cctop';
    const configDir = path.join(cctopDir, 'config');
    
    if (!await checkFileExists(cctopDir)) {
      console.error('Error: .cctop directory not found.');
      console.error('Please ensure the daemon is running or run initialization first.');
      process.exit(1);
    }

    // Load configuration
    const config = await loadConfiguration(configDir);

    // Check if database exists
    const dbPath = config.shared.database.path;
    if (!await checkFileExists(dbPath)) {
      console.error(`Error: Database not found at ${dbPath}`);
      console.error('Please ensure the daemon is running.');
      process.exit(1);
    }

    // Initialize database reader
    reader = new DatabaseReader(dbPath, {
      pollingInterval: config.cli.polling.interval
    });

    await reader.connect();

    // Initialize terminal UI
    ui = new TerminalUI({
      refreshRate: config.cli.display.refreshRate,
      maxRows: config.cli.display.maxRows,
      colorEnabled: config.cli.display.colorEnabled
    });

    // Connect reader events to UI
    reader.on('events', (events) => {
      ui!.addEvents(events);
    });

    reader.on('error', (error) => {
      ui!.showError(`Database error: ${error.message}`);
    });

    // Load initial data
    const recentEvents = await reader.getRecentEvents(100);
    ui.addEvents(recentEvents);

    // Load and display stats
    const stats = await reader.getProjectStats(config.shared.project.rootPath);
    ui.updateStats(stats);

    // Start polling for new events
    reader.startPolling();

    // Initial render
    ui.render();

    // Update stats periodically
    setInterval(async () => {
      try {
        const stats = await reader!.getProjectStats(config.shared.project.rootPath);
        ui!.updateStats(stats);
      } catch (error) {
        // Ignore stats update errors
      }
    }, 5000);

    // Handle process termination
    process.on('SIGINT', async () => {
      if (reader) {
        await reader.disconnect();
      }
      if (ui) {
        ui.destroy();
      }
      process.exit(0);
    });

  } catch (error: any) {
    if (ui) {
      ui.destroy();
    }
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
/**
 * CCTOP CLI Main Entry Point
 * Blessed.js Terminal UI Implementation
 */

import { BlessedTerminalUI } from './ui/blessed-terminal-ui';
import { DatabaseAdapter } from './database/database-adapter';
import * as path from 'path';
import * as fs from 'fs';

interface CLIConfig {
  databasePath?: string;
  refreshInterval?: number;
  maxRows?: number;
}

class CCTOPCli {
  private ui?: BlessedTerminalUI;
  private db?: DatabaseAdapter;
  private config: CLIConfig;

  constructor(config: CLIConfig = {}) {
    this.config = {
      databasePath: config.databasePath || this.findDatabasePath(),
      refreshInterval: config.refreshInterval || 1000,
      maxRows: config.maxRows || 25
    };
  }

  private findDatabasePath(): string {
    // Default paths to search for database
    const possiblePaths = [
      './.cctop/data/activity.db',
      path.join(process.cwd(), '.cctop', 'data', 'activity.db'),
      path.join(process.env.HOME || '', '.cctop', 'data', 'activity.db')
    ];

    for (const dbPath of possiblePaths) {
      if (fs.existsSync(dbPath)) {
        return dbPath;
      }
    }

    // Default fallback
    return './.cctop/data/activity.db';
  }

  public async start(): Promise<void> {
    try {
      console.log('Starting CCTOP CLI...');
      console.log(`Database path: ${this.config.databasePath}`);

      // Initialize database adapter
      this.db = new DatabaseAdapter(this.config.databasePath!);
      await this.db.connect();

      // Initialize UI
      this.ui = new BlessedTerminalUI(this.db, {
        refreshInterval: this.config.refreshInterval,
        maxRows: this.config.maxRows,
        colors: {
          header: 'white',
          status: 'green',
          find: 'cyan',
          create: 'green',
          modify: 'yellow',
          delete: 'red',
          move: 'magenta',
          restore: 'blue'
        }
      });

      // Start UI
      await this.ui.start();

      console.log('CCTOP CLI started successfully');
    } catch (error) {
      console.error('Failed to start CCTOP CLI:', error);
      process.exit(1);
    }
  }

  public stop(): void {
    if (this.ui) {
      this.ui.stop();
    }
    if (this.db) {
      this.db.disconnect();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

// Start CLI if this file is run directly
if (require.main === module) {
  const cli = new CCTOPCli();
  cli.start().catch((error) => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  });
}

export { CCTOPCli };
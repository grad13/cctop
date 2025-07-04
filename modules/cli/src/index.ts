/**
 * CCTOP CLI Main Entry Point
 * Blessed.js Terminal UI Implementation
 */

import { BlessedFramelessUISimple } from './ui/blessed-frameless-ui-simple';
import { DatabaseAdapter } from './database/database-adapter';
import * as path from 'path';
import * as fs from 'fs';

interface CLIConfig {
  databasePath?: string;
  refreshInterval?: number;
  maxRows?: number;
}

class CCTOPCli {
  private ui?: BlessedFramelessUISimple;
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
      // Initialize database adapter
      this.db = new DatabaseAdapter(this.config.databasePath!);
      await this.db.connect();

      // Initialize UI
      this.ui = new BlessedFramelessUISimple(this.db, {
        refreshInterval: this.config.refreshInterval,
        maxRows: this.config.maxRows,
        displayMode: 'all'
      });

      // Start UI
      await this.ui.start();
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

// Suppress terminal errors globally from the very beginning
const originalStderr = process.stderr.write.bind(process.stderr);
(process.stderr as any).write = function(chunk: any, encoding?: any, callback?: any): boolean {
  const str = chunk.toString();
  // Suppress all terminal-related errors
  if (str.includes('Error on xterm') || 
      str.includes('Setulc') || 
      str.includes('\\u001b[58') ||
      str.includes('var v,') ||
      str.includes('stack = []') ||
      str.includes('out = [')) {
    return true;
  }
  return originalStderr(chunk, encoding, callback);
};

// Start CLI if this file is run directly
if (require.main === module) {
  const cli = new CCTOPCli();
  cli.start().catch((error) => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  });
}

export { CCTOPCli };
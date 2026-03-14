/**
 * CCTOP CLI Main Entry Point
 * Blessed.js Terminal UI Implementation
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import { BlessedFramelessUISimple } from './ui/BlessedFramelessUI';
import { FileEventReader } from './database/FileEventReader';
import { parseArguments, showHelp, CLIArguments } from './cli/argument-parser';
import * as path from 'path';
import * as fs from 'fs';

class CCTOPCli {
  private ui?: BlessedFramelessUISimple;
  private db?: FileEventReader;
  private databasePath: string;
  private args: CLIArguments;

  constructor(args: CLIArguments = {}) {
    this.args = args;
    this.databasePath = this.findDatabasePath(args.directory);
  }

  private findDatabasePath(directory?: string): string {
    // Use specified directory or current working directory
    const targetDir = directory ? path.resolve(directory) : process.cwd();
    const cctopDir = path.join(targetDir, '.cctop');
    const dbPath = path.join(cctopDir, 'data', 'activity.db');
    
    // In view mode, only read existing data without initialization
    if (this.args.view) {
      if (!fs.existsSync(dbPath)) {
        throw new Error(`No existing database found at ${dbPath}. Use 'cctop' without --view to start monitoring.`);
      }
    } else {
      // Initialize .cctop structure if it doesn't exist (normal mode)
      if (!fs.existsSync(cctopDir)) {
        this.initializeCctopStructure(cctopDir);
      }
    }
    
    return dbPath;
  }

  private initializeCctopStructure(cctopDir: string): void {
    // Create directory structure
    const dirs = [
      path.join(cctopDir, 'config'),
      path.join(cctopDir, 'themes'),
      path.join(cctopDir, 'data'),
      path.join(cctopDir, 'logs'),
      path.join(cctopDir, 'runtime'),
      path.join(cctopDir, 'temp')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  public async start(): Promise<void> {
    try {

      // Initialize database adapter
      this.db = new FileEventReader(this.databasePath);
      await this.db.connect();

      // Initialize UI - let it load config from files
      this.ui = new BlessedFramelessUISimple(this.db, {
        displayMode: 'all'
      });

      // Start UI
      await this.ui.start();
    } catch (error) {
      console.error('Failed to start CCTOP CLI:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    if (this.ui) {
      await this.ui.stop();
    }
    if (this.db) {
      await this.db.disconnect();
    }
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Main CLI entry point
async function main(): Promise<void> {
  // Parse command line arguments (skip 'node' and script name)
  const args = parseArguments(process.argv.slice(2));
  
  // Handle help option
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  try {
    // Start CLI with parsed arguments
    const cli = new CCTOPCli(args);
    await cli.start();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error("Try 'cctop --help' for more information.");
    process.exit(1);
  }
}

// Start CLI when this module is loaded
main().catch((error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});

export { CCTOPCli };
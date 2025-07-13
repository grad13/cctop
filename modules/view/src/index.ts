/**
 * CCTOP CLI Main Entry Point
 * Blessed.js Terminal UI Implementation
 * Command-line argument processing
 */

import { BlessedFramelessUISimple } from './ui/BlessedFramelessUI';
import { FileEventReader } from './database/FileEventReader';
import * as path from 'path';
import * as fs from 'fs';

interface CLIArguments {
  view?: boolean;
  help?: boolean;
  verbose?: boolean;
  directory?: string;
  timeout?: number;
}

// Parse command-line arguments
function parseArguments(args: string[]): CLIArguments {
  const result: CLIArguments = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--view':
        result.view = true;
        break;
      case '-h':
      case '--help':
        result.help = true;
        break;
      case '--verbose':
        result.verbose = true;
        break;
      case '--timeout':
        if (i + 1 < args.length) {
          result.timeout = parseInt(args[++i], 10);
        }
        break;
      default:
        // Position argument: directory
        if (!arg.startsWith('-') && !result.directory) {
          result.directory = arg;
        }
        break;
    }
  }
  
  return result;
}

// Display help message
function showHelp(): void {
  console.log(`cctop - Code Change Top (File Watching Tool)

Usage: cctop [options] [directory]

Options:
  Watching:
    --timeout <sec>       Timeout in seconds
    --daemon --start      Start background daemon
    --daemon --stop       Stop background daemon
    --daemon --status     Check background daemon status

  Display:
    --view                View existing data only (no daemon)

  Output:
    --verbose             Enable verbose output

  System:
    --check-limits        Check file watch limits

  Help:
    -h, --help            Show this help message

Interactive Controls:
  Display modes:
    a - All events       u - Unique files      q - Quit

  Event filters:
    f - Find  c - Create  m - Modify  d - Delete  v - Move  r - Restore

Examples:
  cctop                    # Full auto: init + daemon + cli (recommended)
  cctop src/               # Watch src directory with full auto
  cctop --daemon --start   # Start background daemon only
  cctop --daemon --status  # Check daemon status
  cctop --view             # View existing data only
  cctop --check-limits     # Check system limits`);
}

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
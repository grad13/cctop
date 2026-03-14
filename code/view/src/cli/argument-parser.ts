/**
 * CLI Argument Parser
 * Handles command-line argument parsing and help display
 */

export interface CLIArguments {
  view?: boolean;
  help?: boolean;
  verbose?: boolean;
  directory?: string;
  timeout?: number;
}

export function parseArguments(args: string[]): CLIArguments {
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

export function showHelp(): void {
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

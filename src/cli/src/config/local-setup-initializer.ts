/**
 * Local Setup Initializer
 * Handles automatic creation of .cctop/ directory structure and initial configuration
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SetupResult {
  success: boolean;
  created: boolean;
  configPath: string;
  message: string;
}

export interface LocalSetupConfig {
  targetDirectory?: string;
  dryRun?: boolean;
}

export class LocalSetupInitializer {
  private readonly DEFAULT_DIRECTORY = '.cctop';
  
  /**
   * Initialize local setup with .cctop/ directory structure
   */
  async initialize(options: LocalSetupConfig = {}): Promise<SetupResult> {
    const targetDir = options.targetDirectory || process.cwd();
    const configPath = path.join(targetDir, this.DEFAULT_DIRECTORY);
    
    // Check if already exists
    if (fs.existsSync(configPath)) {
      return {
        success: true,
        created: false,
        configPath,
        message: `Configuration already exists at ${configPath}`
      };
    }
    
    if (options.dryRun) {
      return {
        success: true,
        created: false,
        configPath,
        message: this.generateDryRunMessage(configPath)
      };
    }
    
    try {
      await this.createDirectoryStructure(configPath);
      await this.createConfigurationFiles(configPath);
      await this.createGitIgnore(configPath);
      
      return {
        success: true,
        created: true,
        configPath,
        message: this.generateSuccessMessage(configPath)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize configuration: ${errorMessage}`);
    }
  }
  
  /**
   * Create .cctop/ directory structure
   */
  private async createDirectoryStructure(configPath: string): Promise<void> {
    const directories = [
      '',                    // .cctop/
      'config',             // config files
      'themes',             // color themes
      'themes/custom',      // user custom themes
      'data',               // database files
      'logs',               // log files
      'cache',              // cache files
      'runtime',            // runtime files (PID, socket)
      'temp'                // temporary files
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(configPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true, mode: 0o755 });
      }
    }
  }
  
  /**
   * Create initial configuration files (3-layer architecture)
   */
  private async createConfigurationFiles(configPath: string): Promise<void> {
    const configDir = path.join(configPath, 'config');
    const themesDir = path.join(configPath, 'themes');
    
    // shared-config.json
    const sharedConfig = {
      version: "0.3.0.0",
      projectName: path.basename(process.cwd()),
      watchPaths: ["."],
      excludePatterns: [
        "node_modules/**",
        ".git/**",
        ".cctop/**",
        "*.log"
      ],
      createdAt: new Date().toISOString()
    };
    
    // daemon-config.json
    const daemonConfig = {
      version: "0.3.0.0",
      daemon: {
        enabled: true,
        autoStart: true,
        pidFile: "./runtime/daemon.pid",
        logFile: "./logs/daemon.log",
        socketPath: "./runtime/daemon.sock"
      },
      monitoring: {
        interval: 100,
        bufferSize: 1000,
        maxEvents: 10000
      }
    };
    
    // cli-config.json
    const cliConfig = {
      version: "0.3.0.0",
      display: {
        maxRows: 20,
        refreshInterval: 100,
        showTimestamps: true,
        dateFormat: "HH:mm:ss",
        columnWidths: {
          time: 8,
          event: 6,
          size: 8,
          path: -1
        }
      },
      interaction: {
        enableMouse: true,
        enableKeyboard: true,
        scrollSpeed: 3
      },
      logFile: "./logs/cli.log"
    };
    
    // default.json theme
    const defaultTheme = {
      name: "default",
      colors: {
        background: "black",
        foreground: "white",
        border: "gray",
        highlight: "cyan",
        event: {
          create: "green",
          modify: "yellow", 
          delete: "red",
          move: "blue"
        },
        ui: {
          statusBar: "blue",
          searchBox: "cyan",
          selection: "white"
        }
      }
    };
    
    // high-contrast.json theme
    const highContrastTheme = {
      name: "high-contrast",
      colors: {
        background: "black",
        foreground: "white",
        border: "white",
        highlight: "yellow",
        event: {
          create: "bright-green",
          modify: "bright-yellow",
          delete: "bright-red", 
          move: "bright-blue"
        },
        ui: {
          statusBar: "bright-blue",
          searchBox: "bright-cyan",
          selection: "bright-white"
        }
      }
    };
    
    // Write configuration files
    const configs = [
      { file: path.join(configDir, 'shared-config.json'), data: sharedConfig },
      { file: path.join(configDir, 'daemon-config.json'), data: daemonConfig },
      { file: path.join(configDir, 'cli-config.json'), data: cliConfig },
      { file: path.join(themesDir, 'default.json'), data: defaultTheme },
      { file: path.join(themesDir, 'high-contrast.json'), data: highContrastTheme },
      { file: path.join(themesDir, 'current-theme.json'), data: defaultTheme }
    ];
    
    for (const config of configs) {
      if (!fs.existsSync(config.file)) {
        fs.writeFileSync(config.file, JSON.stringify(config.data, null, 2), { mode: 0o644 });
      }
    }
  }
  
  /**
   * Create .gitignore file for .cctop/ directory
   */
  private async createGitIgnore(configPath: string): Promise<void> {
    const gitignorePath = path.join(configPath, '.gitignore');
    const gitignoreContent = `# cctop monitoring data
data/
logs/
cache/
runtime/
temp/

# User customizations
themes/custom/
`;
    
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignoreContent, { mode: 0o644 });
    }
  }
  
  /**
   * Generate success message
   */
  private generateSuccessMessage(configPath: string): string {
    return `Created configuration in ${configPath}/
Configuration files:
  - ${configPath}/config/shared-config.json (common settings)
  - ${configPath}/config/daemon-config.json (daemon settings)  
  - ${configPath}/config/cli-config.json (display settings)
  - ${configPath}/themes/current-theme.json (color theme)
Starting monitoring...`;
  }
  
  /**
   * Generate dry-run message
   */
  private generateDryRunMessage(configPath: string): string {
    return `Would create configuration structure at ${configPath}/
Directories: config/, themes/, data/, logs/, runtime/, temp/
Files: shared-config.json, daemon-config.json, cli-config.json, themes, .gitignore`;
  }
  
  /**
   * Check if .cctop/ directory exists and is valid
   */
  isInitialized(targetDirectory?: string): boolean {
    const targetDir = targetDirectory || process.cwd();
    const configPath = path.join(targetDir, this.DEFAULT_DIRECTORY);
    const configDir = path.join(configPath, 'config');
    const requiredFiles = [
      'shared-config.json',
      'daemon-config.json', 
      'cli-config.json'
    ];
    
    if (!fs.existsSync(configPath) || !fs.existsSync(configDir)) {
      return false;
    }
    
    return requiredFiles.every(file => 
      fs.existsSync(path.join(configDir, file))
    );
  }
}
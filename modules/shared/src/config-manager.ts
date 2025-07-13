/**
 * Configuration Manager for .cctop directory initialization
 * Unified configuration management
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CctopConfig {
  daemon: {
    pidFile: string;
    logFile: string;
    heartbeatInterval: number;
  };
  database: {
    path: string;
    walMode: boolean;
    timeout: number;
  };
  monitoring: {
    watchPaths: string[];
    excludePatterns: string[];
    maxDepth: number;
    moveThresholdMs: number;
  };
  ui: {
    refreshInterval: number;
    maxRows: number;
    theme: string;
  };
}

export class ConfigManager {
  private static readonly DEFAULT_CONFIG: CctopConfig = {
    daemon: {
      pidFile: '.cctop/runtime/daemon.pid',
      logFile: '.cctop/logs/daemon.log',
      heartbeatInterval: 30000
    },
    database: {
      path: '.cctop/data/activity.db',
      walMode: true,
      timeout: 10000
    },
    monitoring: {
      watchPaths: ['.'],
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.cctop/**',
        '**/dist/**',
        '**/build/**'
      ],
      maxDepth: 10,
      moveThresholdMs: 100
    },
    ui: {
      refreshInterval: 100,
      maxRows: 100,
      theme: 'default'
    }
  };

  constructor(private workingDirectory: string = process.cwd()) {}

  /**
   * Initialize .cctop directory structure and configuration
   * Standard compliant directory structure
   */
  async initializeCctopStructure(): Promise<void> {
    const cctopDir = path.join(this.workingDirectory, '.cctop');
    
    // Create directory structure
    const directories = [
      'config',
      'themes', 
      'themes/custom',
      'data',
      'logs',
      'runtime',
      'temp'
    ];

    for (const dir of directories) {
      const dirPath = path.join(cctopDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create default configuration files if they don't exist
    await this.ensureConfigFiles();
    
    // Create theme files
    await this.ensureThemeFiles();
    
    // Create .gitignore for runtime files
    await this.createGitignore(cctopDir);
  }

  /**
   * Ensure all required configuration files exist
   */
  private async ensureConfigFiles(): Promise<void> {
    const configDir = path.join(this.workingDirectory, '.cctop', 'config');
    
    // Create main config file
    const mainConfigPath = path.join(configDir, 'cctop.json');
    if (!fs.existsSync(mainConfigPath)) {
      fs.writeFileSync(mainConfigPath, JSON.stringify(ConfigManager.DEFAULT_CONFIG, null, 2));
    }

    // Create daemon-specific config
    const daemonConfigPath = path.join(configDir, 'daemon-config.json');
    if (!fs.existsSync(daemonConfigPath)) {
      const daemonConfig = {
        daemon: ConfigManager.DEFAULT_CONFIG.daemon,
        database: ConfigManager.DEFAULT_CONFIG.database,
        monitoring: ConfigManager.DEFAULT_CONFIG.monitoring
      };
      fs.writeFileSync(daemonConfigPath, JSON.stringify(daemonConfig, null, 2));
    }

    // Create CLI-specific config
    const cliConfigPath = path.join(configDir, 'cli-config.json');
    if (!fs.existsSync(cliConfigPath)) {
      const cliConfig = {
        database: ConfigManager.DEFAULT_CONFIG.database,
        ui: ConfigManager.DEFAULT_CONFIG.ui
      };
      fs.writeFileSync(cliConfigPath, JSON.stringify(cliConfig, null, 2));
    }
  }

  /**
   * Ensure all required theme files exist
   */
  private async ensureThemeFiles(): Promise<void> {
    const themesDir = path.join(this.workingDirectory, '.cctop', 'themes');
    
    // Default theme
    const defaultThemePath = path.join(themesDir, 'default.json');
    if (!fs.existsSync(defaultThemePath)) {
      const defaultTheme = {
        name: 'default',
        colors: {
          primary: '#ffffff',
          secondary: '#cccccc',
          accent: '#00ff00',
          background: '#000000',
          text: '#ffffff',
          error: '#ff0000',
          warning: '#ffff00',
          info: '#00ffff'
        }
      };
      fs.writeFileSync(defaultThemePath, JSON.stringify(defaultTheme, null, 2));
    }

    // High contrast theme
    const highContrastThemePath = path.join(themesDir, 'high-contrast.json');
    if (!fs.existsSync(highContrastThemePath)) {
      const highContrastTheme = {
        name: 'high-contrast',
        colors: {
          primary: '#ffffff',
          secondary: '#ffffff',
          accent: '#ffff00',
          background: '#000000',
          text: '#ffffff',
          error: '#ff0000',
          warning: '#ffff00',
          info: '#ffffff'
        }
      };
      fs.writeFileSync(highContrastThemePath, JSON.stringify(highContrastTheme, null, 2));
    }

    // Current theme (points to default initially)
    const currentThemePath = path.join(themesDir, 'current-theme.json');
    if (!fs.existsSync(currentThemePath)) {
      const currentTheme = {
        active: 'default',
        path: './default.json'
      };
      fs.writeFileSync(currentThemePath, JSON.stringify(currentTheme, null, 2));
    }
  }

  /**
   * Create .gitignore for runtime files
   */
  private async createGitignore(cctopDir: string): Promise<void> {
    const gitignorePath = path.join(cctopDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreContent = `# cctop monitoring data
data/
logs/
runtime/
temp/

# User customizations
themes/custom/
`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
    }
  }

  /**
   * Load configuration from file
   */
  loadConfig(): CctopConfig {
    const configPath = path.join(this.workingDirectory, '.cctop', 'config', 'cctop.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent) as CctopConfig;
        
        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(config);
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
      }
    }
    
    return ConfigManager.DEFAULT_CONFIG;
  }

  /**
   * Save configuration to file
   */
  saveConfig(config: CctopConfig): void {
    const configPath = path.join(this.workingDirectory, '.cctop', 'config', 'cctop.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get database path (absolute)
   */
  getDatabasePath(): string {
    const config = this.loadConfig();
    return path.resolve(this.workingDirectory, config.database.path);
  }

  /**
   * Get PID file path (absolute)
   */
  getPidFilePath(): string {
    const config = this.loadConfig();
    return path.resolve(this.workingDirectory, config.daemon.pidFile);
  }

  /**
   * Get log file path (absolute)
   */
  getLogFilePath(): string {
    const config = this.loadConfig();
    return path.resolve(this.workingDirectory, config.daemon.logFile);
  }

  /**
   * Check if .cctop directory is initialized
   */
  isInitialized(): boolean {
    const cctopDir = path.join(this.workingDirectory, '.cctop');
    const configPath = path.join(cctopDir, 'config', 'cctop.json');
    
    return fs.existsSync(cctopDir) && fs.existsSync(configPath);
  }

  /**
   * Merge user config with defaults
   */
  private mergeWithDefaults(userConfig: Partial<CctopConfig>): CctopConfig {
    return {
      daemon: { ...ConfigManager.DEFAULT_CONFIG.daemon, ...userConfig.daemon },
      database: { ...ConfigManager.DEFAULT_CONFIG.database, ...userConfig.database },
      monitoring: { ...ConfigManager.DEFAULT_CONFIG.monitoring, ...userConfig.monitoring },
      ui: { ...ConfigManager.DEFAULT_CONFIG.ui, ...userConfig.ui }
    };
  }
}
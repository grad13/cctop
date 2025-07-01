/**
 * Configuration Loader
 * Handles loading and parsing configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  FullConfig, 
  ConfigError, 
  ConfigErrorType,
  DEFAULT_CONFIG 
} from '../types/ConfigTypes';

export class ConfigLoader {
  private configPath: string;
  private encoding: BufferEncoding = 'utf8';
  private verbose: boolean;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.verbose = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<FullConfig | null> {
    try {
      // Check if config file exists
      const exists = await this.configFileExists();
      if (!exists) {
        if (this.verbose) {
          console.log(`[ConfigLoader] Config file not found: ${this.configPath}`);
        }
        return null;
      }

      // Read config file content
      const content = await this.readConfigFile();
      if (!content) {
        console.warn('[ConfigLoader] Empty config file');
        return null;
      }

      // Parse JSON content
      const config = await this.parseConfigContent(content);
      
      // Force local database path (FUNC-105 compliant)
      if (config.database && config.database.path) {
        config.database.path = path.join(process.cwd(), '.cctop', 'activity.db');
      }

      if (this.verbose) {
        console.log('[ConfigLoader] Config loaded successfully');
      }

      return config;
    } catch (error: any) {
      console.error('[ConfigLoader] Failed to load config:', error.message);
      throw error;
    }
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<FullConfig | null> {
    if (this.verbose) {
      console.log('[ConfigLoader] Reloading config from:', this.configPath);
    }
    return await this.loadConfig();
  }

  /**
   * Check if config file exists
   */
  private async configFileExists(): Promise<boolean> {
    try {
      await fs.promises.access(this.configPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read config file content
   */
  private async readConfigFile(): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(this.configPath, this.encoding);
      
      if (this.verbose) {
        console.log(`[ConfigLoader] Read ${content.length} characters from config`);
      }
      
      return content.trim() || null;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ConfigError(
          ConfigErrorType.FILE_NOT_FOUND,
          `Config file not found: ${this.configPath}`
        );
      }
      throw new ConfigError(
        ConfigErrorType.SAVE_FAILED,
        `Failed to read config file: ${error.message}`,
        error
      );
    }
  }

  /**
   * Parse JSON config content
   */
  private async parseConfigContent(content: string): Promise<FullConfig> {
    try {
      const parsed = JSON.parse(content);
      
      if (typeof parsed !== 'object' || parsed === null) {
        throw new ConfigError(
          ConfigErrorType.INVALID_JSON,
          'Config must be a JSON object'
        );
      }

      if (this.verbose) {
        console.log('[ConfigLoader] Successfully parsed config with keys:', 
          Object.keys(parsed));
      }

      return parsed as FullConfig;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new ConfigError(
          ConfigErrorType.INVALID_JSON,
          `Invalid JSON in config file: ${error.message}`,
          { line: this.findErrorLine(content, error.message) }
        );
      }
      throw error;
    }
  }

  /**
   * Create default config file
   */
  async createDefaultConfig(): Promise<void> {
    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      await fs.promises.mkdir(configDir, { recursive: true });

      // Create default config with local paths
      const defaultConfig = { ...DEFAULT_CONFIG };
      defaultConfig.database.path = path.join(process.cwd(), '.cctop', 'activity.db');
      defaultConfig.monitoring.watchPaths = [process.cwd()];

      // Write config file
      const content = JSON.stringify(defaultConfig, null, 2);
      await fs.promises.writeFile(this.configPath, content, this.encoding);

      // Create .gitignore
      await this.createGitignore(configDir);

      if (this.verbose) {
        console.log('[ConfigLoader] Created default config file:', this.configPath);
      }
    } catch (error: any) {
      throw new ConfigError(
        ConfigErrorType.SAVE_FAILED,
        `Failed to create default config: ${error.message}`,
        error
      );
    }
  }

  /**
   * Create .gitignore file
   */
  private async createGitignore(configDir: string): Promise<void> {
    const gitignorePath = path.join(configDir, '.gitignore');
    
    try {
      // Check if already exists
      await fs.promises.access(gitignorePath);
    } catch {
      // Create .gitignore
      const gitignoreContent = `# cctop monitoring data
activity.db
activity.db-*
cache/
logs/
`;
      await fs.promises.writeFile(gitignorePath, gitignoreContent, this.encoding);
    }
  }

  /**
   * Find error line in JSON
   */
  private findErrorLine(content: string, errorMessage: string): number | undefined {
    const match = errorMessage.match(/position (\d+)/);
    if (!match) return undefined;

    const position = parseInt(match[1], 10);
    const lines = content.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if config exists
   */
  async exists(): Promise<boolean> {
    return await this.configFileExists();
  }
}
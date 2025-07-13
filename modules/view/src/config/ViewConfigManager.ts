/**
 * View Configuration Manager
 * Handles loading and management of view-config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { ViewConfig, defaultViewConfig } from './ViewConfig';

export class ViewConfigManager {
  private viewConfig: ViewConfig;
  private configPath: string;
  private configFilePath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.configFilePath = path.join(configPath, 'config', 'view-config.json');
    this.viewConfig = defaultViewConfig;
  }

  /**
   * Load view configuration from file
   */
  async loadViewConfig(): Promise<ViewConfig> {
    try {
      if (!fs.existsSync(this.configFilePath)) {
        // Create default view-config.json if it doesn't exist
        await this.createDefaultConfig();
        return this.viewConfig;
      }

      const content = fs.readFileSync(this.configFilePath, 'utf8');
      const loadedConfig = JSON.parse(content);
      
      // Deep merge with defaults to ensure all required fields
      this.viewConfig = this.deepMerge(defaultViewConfig, loadedConfig);
      
      return this.viewConfig;
    } catch (error) {
      console.warn(`Failed to load view configuration: ${error}. Using defaults.`);
      return defaultViewConfig;
    }
  }

  /**
   * Create default view-config.json file
   */
  private async createDefaultConfig(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configFilePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Create config with current directory in directoryMutePaths
      const currentDir = process.cwd();
      const currentDirWithSlash = currentDir.endsWith('/') ? currentDir : currentDir + '/';
      
      const initialConfig = {
        ...defaultViewConfig,
        display: {
          ...defaultViewConfig.display,
          directoryMutePaths: [currentDirWithSlash] // Add current working directory with trailing slash
        }
      };

      // Write default configuration
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(initialConfig, null, 2),
        'utf8'
      );
      
      // Update in-memory config as well
      this.viewConfig = initialConfig;
    } catch (error) {
      console.warn(`Failed to create default view configuration: ${error}`);
    }
  }

  /**
   * Get current view configuration
   */
  getViewConfig(): ViewConfig {
    return this.viewConfig;
  }

  /**
   * Update view configuration (in memory only)
   */
  updateViewConfig(updates: Partial<ViewConfig>): void {
    this.viewConfig = this.deepMerge(this.viewConfig, updates);
  }

  /**
   * Save current configuration to file
   */
  async saveViewConfig(): Promise<void> {
    try {
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(this.viewConfig, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new Error(`Failed to save view configuration: ${error}`);
    }
  }

  /**
   * Deep merge two objects, preserving nested structures
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          // Recursively merge objects
          result[key] = this.deepMerge(result[key] as any, sourceValue as any);
        } else {
          // For primitives, arrays, and null values, replace directly
          result[key] = sourceValue as any;
        }
      }
    }
    
    return result;
  }

  /**
   * Convert from legacy CLIConfig format to ViewConfig
   */
  static fromCLIConfig(cliConfig: any): ViewConfig {
    return {
      version: cliConfig.version || defaultViewConfig.version,
      display: cliConfig.display || defaultViewConfig.display,
      colors: cliConfig.colors || defaultViewConfig.colors,
      interactive: cliConfig.interactive || defaultViewConfig.interactive,
      locale: cliConfig.locale || defaultViewConfig.locale
    };
  }
}
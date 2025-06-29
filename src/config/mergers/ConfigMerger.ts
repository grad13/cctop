/**
 * Configuration Merger
 * Handles merging user config with defaults and CLI overrides
 */

import * as path from 'path';
import {
  FullConfig,
  CLIArgs,
  DEFAULT_CONFIG
} from '../types/ConfigTypes';

export class ConfigMerger {
  private verbose: boolean;

  constructor() {
    this.verbose = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): FullConfig {
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    // Set current directory as default watch path
    config.monitoring.watchPaths = [process.cwd()];
    
    // Set local database path
    config.database.path = path.join(process.cwd(), '.cctop', 'activity.db');
    
    return config;
  }

  /**
   * Merge user config with defaults
   */
  mergeWithDefaults(userConfig: Partial<FullConfig> | null): FullConfig {
    if (!userConfig) {
      return this.getDefaultConfig();
    }

    const merged = this.deepMerge(this.getDefaultConfig(), userConfig);
    
    if (this.verbose) {
      console.log('[ConfigMerger] Merged user config with defaults');
    }

    return merged;
  }

  /**
   * Apply CLI argument overrides
   */
  applyCLIOverrides(config: FullConfig, cliArgs: CLIArgs): FullConfig {
    const overridden = JSON.parse(JSON.stringify(config));

    // Override watch paths
    if (cliArgs.watchPath) {
      overridden.monitoring.watchPaths = Array.isArray(cliArgs.watchPath)
        ? cliArgs.watchPath.map(p => path.resolve(p))
        : [path.resolve(cliArgs.watchPath)];
      
      if (this.verbose) {
        console.log('[ConfigMerger] Overriding watch paths from CLI');
      }
    }

    // Override database path
    if (cliArgs.dbPath) {
      overridden.database.path = path.resolve(cliArgs.dbPath);
      
      if (this.verbose) {
        console.log('[ConfigMerger] Overriding database path from CLI');
      }
    }

    // Override max lines
    if (cliArgs.maxLines !== undefined) {
      const maxLines = typeof cliArgs.maxLines === 'string'
        ? parseInt(cliArgs.maxLines, 10)
        : cliArgs.maxLines;
      
      if (!isNaN(maxLines) && maxLines > 0) {
        overridden.display.maxEvents = maxLines;
        
        if (this.verbose) {
          console.log('[ConfigMerger] Overriding maxEvents from CLI');
        }
      }
    }

    return overridden;
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvironmentOverrides(config: FullConfig): FullConfig {
    const overridden = JSON.parse(JSON.stringify(config));

    // Database path
    if (process.env.CCTOP_DB_PATH) {
      overridden.database.path = path.resolve(process.env.CCTOP_DB_PATH);
      
      if (this.verbose) {
        console.log('[ConfigMerger] Overriding database path from env');
      }
    }

    // Log level
    if (process.env.CCTOP_LOG_LEVEL) {
      overridden.monitoring.backgroundMonitor.logLevel = process.env.CCTOP_LOG_LEVEL;
      
      if (this.verbose) {
        console.log('[ConfigMerger] Overriding log level from env');
      }
    }

    // Max events
    if (process.env.CCTOP_MAX_EVENTS) {
      const maxEvents = parseInt(process.env.CCTOP_MAX_EVENTS, 10);
      if (!isNaN(maxEvents) && maxEvents > 0) {
        overridden.display.maxEvents = maxEvents;
        
        if (this.verbose) {
          console.log('[ConfigMerger] Overriding maxEvents from env');
        }
      }
    }

    return overridden;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined) {
        continue;
      }

      if (this.isObject(source[key]) && this.isObject(target[key])) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Create minimal config for testing
   */
  createMinimalConfig(): FullConfig {
    return {
      version: "0.1.0",
      monitoring: {
        watchPaths: ['.'],
        excludePatterns: ["**/node_modules/**"],
        debounceMs: 100,
        maxDepth: 5,
        eventFilters: {
          find: true,
          create: true,
          modify: true,
          delete: true,
          move: true,
          restore: true
        },
        inotify: {
          requiredMaxUserWatches: 524288,
          checkOnStartup: false,
          warnIfInsufficient: false,
          recommendedValue: 524288
        },
        backgroundMonitor: {
          enabled: false,
          logLevel: "error",
          heartbeatInterval: 60000
        }
      },
      database: {
        path: "./.cctop/test.db",
        mode: "WAL"
      },
      display: {
        maxEvents: 10,
        refreshRateMs: 1000,
        statusArea: {
          maxLines: 1,
          enabled: false,
          scrollSpeed: 1000,
          updateInterval: 10000
        }
      }
    };
  }
}
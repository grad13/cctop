/**
 * Directory Handler for Configuration
 * Manages watch directory additions and prompts
 */

import * as path from 'path';
import { CLIArgs, FullConfig } from '../types/ConfigTypes';

interface CLIInterface {
  promptAddDirectory(dirPath: string, timeout: number): Promise<boolean>;
  success(message: string): void;
  info(message: string): void;
}

export class DirectoryHandler {
  private cliInterface: CLIInterface;
  private promptHandler: (dirPath: string) => Promise<boolean>;
  private interactive: boolean;

  constructor(
    cliInterface: CLIInterface,
    interactive: boolean = true,
    promptHandler?: (dirPath: string) => Promise<boolean>
  ) {
    this.cliInterface = cliInterface;
    this.interactive = interactive;
    this.promptHandler = promptHandler || this.defaultPromptHandler.bind(this);
  }

  /**
   * Default prompt handler
   */
  private async defaultPromptHandler(dirPath: string): Promise<boolean> {
    if (!this.interactive) {
      return false;
    }
    
    return this.cliInterface.promptAddDirectory(dirPath, 30000);
  }

  /**
   * Check and add current directory to watch paths
   */
  async checkAndAddCurrentDirectory(
    config: FullConfig,
    cliArgs: CLIArgs = {},
    onSave: () => Promise<void>
  ): Promise<void> {
    const targetDir = this.determineTargetDirectory(cliArgs);
    const absoluteTargetDir = path.resolve(targetDir);
    
    // Ensure monitoring config exists
    this.ensureMonitoringConfig(config);
    
    // Normalize paths to absolute
    this.normalizePaths(config);
    
    const isAlreadyWatched = config.monitoring.watchPaths.includes(absoluteTargetDir);
    
    if (!isAlreadyWatched) {
      const shouldAdd = await this.promptHandler(absoluteTargetDir);
      if (shouldAdd) {
        config.monitoring.watchPaths.push(absoluteTargetDir);
        await onSave();
        this.cliInterface.success(`Added to monitor: ${absoluteTargetDir}`);
      } else {
        this.cliInterface.info('Monitoring with current config only');
      }
    }
  }

  /**
   * Determine target directory from CLI args
   */
  private determineTargetDirectory(cliArgs: CLIArgs): string {
    if (Array.isArray(cliArgs.watchPath)) {
      return cliArgs.watchPath[0];
    }
    return cliArgs.watchPath || process.cwd();
  }

  /**
   * Ensure monitoring configuration exists
   */
  private ensureMonitoringConfig(config: FullConfig): void {
    if (!config.monitoring) {
      config.monitoring = {} as any;
    }
    if (!Array.isArray(config.monitoring.watchPaths)) {
      config.monitoring.watchPaths = [];
    }
  }

  /**
   * Normalize watch paths to absolute paths
   */
  private normalizePaths(config: FullConfig): void {
    if (config.monitoring && Array.isArray(config.monitoring.watchPaths)) {
      config.monitoring.watchPaths = config.monitoring.watchPaths.map(
        watchPath => path.resolve(watchPath)
      );
    }
  }

  /**
   * Add directory to watch paths
   */
  async addDirectory(
    config: FullConfig,
    dirPath: string,
    onSave: () => Promise<void>
  ): Promise<boolean> {
    const absolutePath = path.resolve(dirPath);
    
    this.ensureMonitoringConfig(config);
    this.normalizePaths(config);
    
    if (config.monitoring.watchPaths.includes(absolutePath)) {
      this.cliInterface.info(`Directory already monitored: ${absolutePath}`);
      return false;
    }
    
    config.monitoring.watchPaths.push(absolutePath);
    await onSave();
    this.cliInterface.success(`Added to monitor: ${absolutePath}`);
    return true;
  }

  /**
   * Remove directory from watch paths
   */
  async removeDirectory(
    config: FullConfig,
    dirPath: string,
    onSave: () => Promise<void>
  ): Promise<boolean> {
    const absolutePath = path.resolve(dirPath);
    
    if (!config.monitoring || !Array.isArray(config.monitoring.watchPaths)) {
      return false;
    }
    
    const index = config.monitoring.watchPaths.indexOf(absolutePath);
    if (index === -1) {
      this.cliInterface.info(`Directory not monitored: ${absolutePath}`);
      return false;
    }
    
    config.monitoring.watchPaths.splice(index, 1);
    await onSave();
    this.cliInterface.success(`Removed from monitor: ${absolutePath}`);
    return true;
  }

  /**
   * List all watched directories
   */
  listWatchedDirectories(config: FullConfig): string[] {
    if (!config.monitoring || !Array.isArray(config.monitoring.watchPaths)) {
      return [];
    }
    
    return config.monitoring.watchPaths.map(p => path.resolve(p));
  }
}
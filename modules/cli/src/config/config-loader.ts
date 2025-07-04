/**
 * Configuration Loader
 */

import { CLIConfig, defaultCLIConfig } from './cli-config';

export interface MergedConfig {
  cli: CLIConfig;
  shared: any;
}

export class ConfigLoader {
  async loadConfiguration(): Promise<MergedConfig> {
    // For now, just return default config
    return {
      cli: defaultCLIConfig,
      shared: {}
    };
  }

  async ensureDirectories(config: any): Promise<void> {
    // No-op for now
  }
}
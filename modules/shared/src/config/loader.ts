/**
 * Configuration loader
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  SharedConfig, 
  DaemonConfig, 
  CliConfig, 
  CompleteConfig,
  ConfigLoadOptions 
} from '../types';
import { deepMerge, applyCliArgs } from './merger';
import { validateShared, validateDaemon, validateCli } from './validator';

/**
 * Default shared configuration
 */
const defaultSharedConfig: SharedConfig = {
  version: '0.3.0.0',
  project: {
    name: 'cctop',
    description: 'Code Change Top - Real-time file monitoring tool'
  },
  database: {
    path: '.cctop/data/activity.db',
    maxSize: 104857600  // 100MB
  },
  directories: {
    config: '.cctop',
    logs: '.cctop/logs',
    temp: '.cctop/temp'
  },
  logging: {
    maxFileSize: 10485760,  // 10MB
    maxFiles: 5,
    datePattern: 'YYYY-MM-DD'
  }
};

/**
 * Default daemon configuration
 */
const defaultDaemonConfig: DaemonConfig = {
  watch: {
    enabled: true,
    paths: ['.'],
    ignore: ['node_modules', '.git', '.cctop', 'dist', 'coverage'],
    followSymlinks: false,
    depth: 10
  },
  polling: {
    interval: 100,
    usePolling: false
  },
  process: {
    autoRestart: true,
    restartDelay: 5000,
    maxRestarts: 5
  }
};

/**
 * Default CLI configuration
 */
const defaultCliConfig: CliConfig = {
  display: {
    refreshRate: 100,
    maxRows: 50,
    showHidden: false
  },
  polling: {
    interval: 100
  },
  colors: {
    theme: 'default'
  }
};

/**
 * Load configuration
 */
export async function loadConfiguration(
  options: ConfigLoadOptions = {}
): Promise<CompleteConfig> {
  const configDir = options.configDir || '.cctop';
  
  // Load shared config
  const sharedConfig = await loadSharedConfig(configDir);
  
  // Load process-specific config
  let processConfig: DaemonConfig | CliConfig | undefined;
  if (options.processType === 'daemon') {
    processConfig = await loadDaemonConfig(configDir);
  } else if (options.processType === 'cli') {
    processConfig = await loadCliConfig(configDir);
  }

  // Build complete config
  const config: CompleteConfig = {
    shared: sharedConfig,
    ...(options.processType === 'daemon' && { daemon: processConfig as DaemonConfig }),
    ...(options.processType === 'cli' && { cli: processConfig as CliConfig })
  };

  return config;
}

/**
 * Load shared configuration
 */
async function loadSharedConfig(configDir: string): Promise<SharedConfig> {
  const configPath = join(configDir, 'shared-config.json');
  
  let config = defaultSharedConfig;
  
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf8');
      const loaded = JSON.parse(content);
      config = deepMerge(defaultSharedConfig, loaded);
    } catch (error) {
      throw new Error(`Failed to load shared config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate
  const validation = validateShared(config);
  if (!validation.valid) {
    throw new Error(`Invalid shared config: ${validation.errors?.join(', ')}`);
  }

  return config;
}

/**
 * Load daemon configuration
 */
async function loadDaemonConfig(configDir: string): Promise<DaemonConfig> {
  const configPath = join(configDir, 'daemon-config.json');
  
  let config = defaultDaemonConfig;
  
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf8');
      const loaded = JSON.parse(content);
      config = deepMerge(defaultDaemonConfig, loaded);
    } catch (error) {
      throw new Error(`Failed to load daemon config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate
  const validation = validateDaemon(config);
  if (!validation.valid) {
    throw new Error(`Invalid daemon config: ${validation.errors?.join(', ')}`);
  }

  return config;
}

/**
 * Load CLI configuration
 */
async function loadCliConfig(configDir: string): Promise<CliConfig> {
  const configPath = join(configDir, 'cli-config.json');
  
  let config = defaultCliConfig;
  
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf8');
      const loaded = JSON.parse(content);
      config = deepMerge(defaultCliConfig, loaded);
    } catch (error) {
      throw new Error(`Failed to load CLI config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate
  const validation = validateCli(config);
  if (!validation.valid) {
    throw new Error(`Invalid CLI config: ${validation.errors?.join(', ')}`);
  }

  return config;
}

/**
 * Apply CLI arguments to configuration
 */
export function applyCliOverrides<T extends CompleteConfig>(
  config: T,
  cliArgs: Record<string, any>
): T {
  return applyCliArgs(config, cliArgs);
}
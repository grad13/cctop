import * as fs from 'fs/promises';
import * as path from 'path';
import { SharedConfig, DaemonConfig } from '@cctop/shared';
import { logger } from '../utils/logger';

export interface DaemonConfiguration {
  shared: SharedConfig;
  daemon: DaemonConfig;
}

export async function loadConfiguration(configDir: string): Promise<DaemonConfiguration> {
  const sharedConfigPath = path.join(configDir, 'shared-config.json');
  const daemonConfigPath = path.join(configDir, 'daemon-config.json');

  try {
    // Load shared configuration
    const sharedConfigContent = await fs.readFile(sharedConfigPath, 'utf-8');
    const sharedConfig: SharedConfig = JSON.parse(sharedConfigContent);

    // Load daemon configuration
    const daemonConfigContent = await fs.readFile(daemonConfigPath, 'utf-8');
    const daemonConfig: DaemonConfig = JSON.parse(daemonConfigContent);

    logger.info('Configuration loaded successfully');
    return { shared: sharedConfig, daemon: daemonConfig };
  } catch (error) {
    logger.error('Failed to load configuration', error);
    throw new Error(`Configuration loading failed: ${error}`);
  }
}

export async function createDefaultConfiguration(configDir: string): Promise<void> {
  await fs.mkdir(configDir, { recursive: true });

  const defaultSharedConfig: SharedConfig = {
    version: '0.3.0',
    database: {
      path: '.cctop/data/activity.db',
      walMode: true
    },
    directories: {
      configDir: '.cctop/config',
      dataDir: '.cctop/data',
      logsDir: '.cctop/logs',
      runtimeDir: '.cctop/runtime',
      tempDir: '.cctop/temp',
      themesDir: '.cctop/themes'
    },
    project: {
      name: path.basename(process.cwd()),
      rootPath: process.cwd()
    },
    logging: {
      level: 'info',
      maxFileSize: 10485760, // 10MB
      maxFiles: 5
    }
  };

  const defaultDaemonConfig: DaemonConfig = {
    process: {
      pidFile: '.cctop/runtime/daemon.pid',
      socketFile: '.cctop/runtime/daemon.sock'
    },
    monitoring: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/.cctop/**'],
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    },
    events: {
      batchSize: 100,
      flushInterval: 1000
    }
  };

  await fs.writeFile(
    path.join(configDir, 'shared-config.json'),
    JSON.stringify(defaultSharedConfig, null, 2)
  );

  await fs.writeFile(
    path.join(configDir, 'daemon-config.json'),
    JSON.stringify(defaultDaemonConfig, null, 2)
  );

  logger.info('Default configuration created');
}
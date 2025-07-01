#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs/promises';
import { DatabaseConnection, FileEventRepository } from '@cctop/shared';
import { FileWatcher } from './file-monitor/watcher';
import { EventProcessor } from './event-processor/processor';
import { ProcessManager } from './process-manager/manager';
import { loadConfiguration, createDefaultConfiguration } from './config/loader';
import { logger, configureLogger } from './utils/logger';

async function checkDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectories(config: any): Promise<void> {
  const dirs = [
    config.shared.directories.dataDir,
    config.shared.directories.logsDir,
    config.shared.directories.runtimeDir,
    config.shared.directories.tempDir
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function main(): Promise<void> {
  try {
    // Check if .cctop directory exists
    const cctopDir = '.cctop';
    const configDir = path.join(cctopDir, 'config');
    
    if (!await checkDirectoryExists(cctopDir)) {
      logger.error('.cctop directory not found. Please run initialization first.');
      process.exit(1);
    }

    // Load or create configuration
    let config;
    try {
      config = await loadConfiguration(configDir);
    } catch {
      logger.info('Creating default configuration...');
      await createDefaultConfiguration(configDir);
      config = await loadConfiguration(configDir);
    }

    // Configure file logger
    configureLogger(
      config.shared.directories.logsDir,
      config.shared.logging.maxFileSize,
      config.shared.logging.maxFiles
    );

    // Ensure all required directories exist
    await ensureDirectories(config);

    // Initialize process manager
    const processManager = new ProcessManager(
      config.daemon.process.pidFile,
      config.daemon.process.socketFile
    );
    await processManager.start();

    // Initialize database connection
    const dbConnection = new DatabaseConnection(config.shared.database.path);
    await dbConnection.connect();
    const repository = new FileEventRepository(dbConnection);

    // Initialize event processor
    const eventProcessor = new EventProcessor(repository, {
      batchSize: config.daemon.events.batchSize,
      flushInterval: config.daemon.events.flushInterval
    });
    eventProcessor.start();

    // Initialize file watcher
    const fileWatcher = new FileWatcher(config.shared.project.rootPath, {
      ignored: config.daemon.monitoring.ignored,
      followSymlinks: config.daemon.monitoring.followSymlinks,
      awaitWriteFinish: config.daemon.monitoring.awaitWriteFinish
    });

    // Connect watcher to processor
    fileWatcher.on('fileEvent', async (event) => {
      try {
        await eventProcessor.addEvent(event);
      } catch (error) {
        logger.error('Failed to process file event', error);
      }
    });

    fileWatcher.on('ready', () => {
      logger.info('File monitoring started successfully');
    });

    fileWatcher.on('error', (error) => {
      logger.error('File watcher error', error);
    });

    // Start watching
    await fileWatcher.start();

    // Graceful shutdown handler
    const shutdown = async () => {
      logger.info('Shutting down daemon...');
      
      await fileWatcher.stop();
      eventProcessor.stop();
      await dbConnection.close();
      await processManager.stop();
      
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep process alive
    process.stdin.resume();

  } catch (error) {
    logger.error('Fatal error in daemon', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled error', error);
    process.exit(1);
  });
}
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export class ProcessManager {
  private pidFile: string;
  private socketFile: string;

  constructor(pidFile: string, socketFile: string) {
    this.pidFile = pidFile;
    this.socketFile = socketFile;
  }

  async start(): Promise<void> {
    // Check if daemon is already running
    const isRunning = await this.isRunning();
    if (isRunning) {
      throw new Error('Daemon is already running');
    }

    // Write PID file
    await this.writePidFile();

    // Set up signal handlers
    this.setupSignalHandlers();

    logger.info(`Daemon started with PID ${process.pid}`);
  }

  async stop(): Promise<void> {
    await this.cleanup();
    logger.info('Daemon stopped');
  }

  private async isRunning(): Promise<boolean> {
    try {
      const pidContent = await fs.readFile(this.pidFile, 'utf-8');
      const pid = parseInt(pidContent.trim(), 10);

      // Check if process is running
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        // Process not running, clean up stale PID file
        await this.cleanup();
        return false;
      }
    } catch {
      // PID file doesn't exist
      return false;
    }
  }

  private async writePidFile(): Promise<void> {
    const dir = path.dirname(this.pidFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.pidFile, process.pid.toString());
  }

  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await this.cleanup();
        process.exit(0);
      });
    });

    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception', error);
      await this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      await this.cleanup();
      process.exit(1);
    });
  }

  private async cleanup(): Promise<void> {
    // Remove PID file
    try {
      await fs.unlink(this.pidFile);
    } catch (error) {
      logger.warn('Failed to remove PID file', error);
    }

    // Remove socket file if it exists
    try {
      await fs.unlink(this.socketFile);
    } catch (error) {
      // Socket file might not exist yet
    }
  }
}
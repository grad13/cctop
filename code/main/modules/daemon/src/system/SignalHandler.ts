/**
 * System Signal Handling
 */

import { LogManager } from '../logging/LogManager';

export class SignalHandler {
  private logger: LogManager;
  private shutdownCallback: (signal: string) => Promise<void>;

  constructor(
    logger: LogManager, 
    shutdownCallback: (signal: string) => Promise<void>
  ) {
    this.logger = logger;
    this.shutdownCallback = shutdownCallback;
  }

  setupSignalHandlers(): void {
    // Graceful shutdown signals
    process.on('SIGTERM', () => this.handleShutdownSignal('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdownSignal('SIGINT'));
    
    // Prevent default behavior for specific signals
    process.on('SIGQUIT', () => this.handleShutdownSignal('SIGQUIT'));
  }

  private handleShutdownSignal(signal: string): void {
    this.logger.log('info', `Received shutdown signal: ${signal}`);
    this.shutdownCallback(signal).catch(error => {
      this.logger.log('error', `Error during shutdown: ${error}`);
      process.exit(1);
    });
  }
}
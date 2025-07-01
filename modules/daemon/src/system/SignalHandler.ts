/**
 * System Signal Handling
 */

import { LogManager } from '../logging/LogManager';

export class SignalHandler {
  private logger: LogManager;
  private shutdownCallback: (signal: string) => Promise<void>;
  private sighupCallback?: () => Promise<void>;

  constructor(
    logger: LogManager, 
    shutdownCallback: (signal: string) => Promise<void>,
    sighupCallback?: () => Promise<void>
  ) {
    this.logger = logger;
    this.shutdownCallback = shutdownCallback;
    this.sighupCallback = sighupCallback;
  }

  setupSignalHandlers(): void {
    // Graceful shutdown signals
    process.on('SIGTERM', () => this.handleShutdownSignal('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdownSignal('SIGINT'));
    
    // Configuration reload signal
    process.on('SIGHUP', () => this.handleSighup());
    
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

  private handleSighup(): void {
    this.logger.log('info', 'Received SIGHUP signal');
    
    if (this.sighupCallback) {
      this.sighupCallback().catch(error => {
        this.logger.log('error', `Error handling SIGHUP: ${error}`);
      });
    } else {
      this.logger.log('warn', 'SIGHUP handler not implemented');
    }
  }
}
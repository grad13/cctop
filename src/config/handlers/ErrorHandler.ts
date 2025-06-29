/**
 * Configuration Error Handler
 * Handles validation errors and provides user feedback
 */

import { ConfigError, ConfigErrorType } from '../types/ConfigTypes';

export class ErrorHandler {
  private interactive: boolean;
  
  constructor(interactive: boolean = true) {
    this.interactive = interactive;
  }

  /**
   * Handle validation errors with appropriate user feedback
   */
  handleValidationErrors(errors: string[]): void {
    const errorMsg = `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    
    if (this.interactive) {
      console.error(`\nError: ${errorMsg}`);
      console.error('\nPlease check ./.cctop/config.json and fix the issues.\n');
      process.exit(1);
    } else {
      if (process.env.CCTOP_VERBOSE) {
        console.error(`Error: ${errorMsg}`);
      }
      throw new ConfigError(
        ConfigErrorType.VALIDATION_FAILED,
        `Validation failed: ${errors.join(', ')}`
      );
    }
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error: Error): void {
    const errorMsg = `Failed to initialize configuration: ${error.message}`;
    
    if (this.interactive) {
      console.error(`\n❌ ${errorMsg}`);
      console.error('\nPlease check your configuration and try again.\n');
      process.exit(1);
    } else {
      if (process.env.CCTOP_VERBOSE) {
        console.error(`Error: ${errorMsg}`);
      }
      throw new ConfigError(
        ConfigErrorType.INITIALIZATION_FAILED,
        error.message
      );
    }
  }

  /**
   * Handle file system errors
   */
  handleFileSystemError(error: Error, operation: string): void {
    const errorMsg = `File system error during ${operation}: ${error.message}`;
    
    if (this.interactive) {
      console.error(`\n❌ ${errorMsg}`);
      
      if (error.message.includes('EACCES')) {
        console.error('\nPermission denied. Please check file permissions.\n');
      } else if (error.message.includes('ENOENT')) {
        console.error('\nFile or directory not found.\n');
      }
      
      process.exit(1);
    } else {
      if (process.env.CCTOP_VERBOSE) {
        console.error(`Error: ${errorMsg}`);
      }
      throw new ConfigError(
        ConfigErrorType.FILE_SYSTEM_ERROR,
        `${operation} failed: ${error.message}`
      );
    }
  }

  /**
   * Handle configuration conflicts
   */
  handleConfigConflict(message: string): void {
    if (this.interactive) {
      console.error(`\n⚠️  Configuration conflict: ${message}`);
      console.error('\nPlease resolve the conflict and try again.\n');
    } else {
      console.warn(`Configuration conflict: ${message}`);
    }
  }

  /**
   * Log warning messages
   */
  logWarning(message: string): void {
    if (this.interactive || process.env.CCTOP_VERBOSE) {
      console.warn(`⚠️  ${message}`);
    }
  }

  /**
   * Log info messages  
   */
  logInfo(message: string): void {
    if (this.interactive || process.env.CCTOP_VERBOSE) {
      console.log(`ℹ️  ${message}`);
    }
  }

  /**
   * Log success messages
   */
  logSuccess(message: string): void {
    if (this.interactive) {
      console.log(`✅ ${message}`);
    }
  }

  /**
   * Check if should throw or exit
   */
  shouldThrow(): boolean {
    return !this.interactive;
  }
}
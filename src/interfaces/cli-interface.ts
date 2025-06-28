/**
 * CLI Interface Layer (REP-0098 Architecture Improvement)
 * Dedicated layer for user interaction
 * 
 * Responsibilities:
 * - User input processing
 * - Prompt display
 * - readline operations
 * 
 * Design principles:
 * - Single Responsibility Principle: UI interactions only
 * - Testability: Dependency injection support
 * - Environment independent: Eliminate NODE_ENV conditional branching
 */

import readline = require('readline');
import { CLIInterfaceOptions } from '../types/common';

class CLIInterface {
  private input: NodeJS.ReadableStream;
  private output: NodeJS.WritableStream;

  constructor({ input = process.stdin, output = process.stdout }: CLIInterfaceOptions = {}) {
    this.input = input;
    this.output = output;
  }

  /**
   * Directory addition confirmation prompt
   * @param dirPath - Target directory path to add
   * @param timeout - Timeout duration (milliseconds)
   * @returns User's choice (true: add, false: skip)
   */
  async promptAddDirectory(dirPath: string, timeout: number = 30000): Promise<boolean> {
    const rl = readline.createInterface({
      input: this.input,
      output: this.output
    });

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        rl.close();
        this.output.write('\nTimeout - continuing with current config\n');
        resolve(false); // Safe side default
      }, timeout);

      rl.question(
        `Add ${dirPath} to monitoring targets? (y/n): `,
        (answer: string) => {
          clearTimeout(timer);
          rl.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        }
      );
    });
  }

  /**
   * Wait for user confirmation
   * @param message - Display message
   */
  async waitForUserConfirmation(message: string = 'Press Enter to exit...'): Promise<void> {
    const rl = readline.createInterface({
      input: this.input,
      output: this.output
    });

    return new Promise<void>((resolve) => {
      rl.question(message, () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * Output information message
   * @param message - Message
   */
  info(message: string): void {
    this.output.write(`ℹ️  ${message}\n`);
  }

  /**
   * Output success message
   * @param message - Message
   */
  success(message: string): void {
    this.output.write(`${message}\n`);
  }

  /**
   * Output error message
   * @param message - Message
   */
  error(message: string): void {
    this.output.write(`${message}\n`);
  }

  /**
   * Mockable prompt handler for testing
   * @param dirPath - Directory path
   */
  async mockablePrompt(dirPath: string): Promise<boolean> {
    // This function is mocked during testing
    return this.promptAddDirectory(dirPath);
  }
}

export = CLIInterface;
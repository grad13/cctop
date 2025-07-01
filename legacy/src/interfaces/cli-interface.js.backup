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

const readline = require('readline');

class CLIInterface {
  constructor({ input = process.stdin, output = process.stdout } = {}) {
    this.input = input;
    this.output = output;
  }

  /**
   * Directory addition confirmation prompt
   * @param {string} dirPath - Target directory path to add
   * @param {number} timeout - Timeout duration (milliseconds)
   * @returns {Promise<boolean>} - User's choice (true: add, false: skip)
   */
  async promptAddDirectory(dirPath, timeout = 30000) {
    const rl = readline.createInterface({
      input: this.input,
      output: this.output
    });

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        rl.close();
        this.output.write('\nTimeout - continuing with current config\n');
        resolve(false); // Safe side default
      }, timeout);

      rl.question(
        `Add ${dirPath} to monitoring targets? (y/n): `,
        (answer) => {
          clearTimeout(timer);
          rl.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        }
      );
    });
  }

  /**
   * Wait for user confirmation
   * @param {string} message - Display message
   * @returns {Promise<void>}
   */
  async waitForUserConfirmation(message = 'Press Enter to exit...') {
    const rl = readline.createInterface({
      input: this.input,
      output: this.output
    });

    return new Promise((resolve) => {
      rl.question(message, () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * Output information message
   * @param {string} message - Message
   */
  info(message) {
    this.output.write(`ℹ️  ${message}\n`);
  }

  /**
   * Output success message
   * @param {string} message - Message
   */
  success(message) {
    this.output.write(`${message}\n`);
  }

  /**
   * Output error message
   * @param {string} message - Message
   */
  error(message) {
    this.output.write(`${message}\n`);
  }

  /**
   * Mockable prompt handler for testing
   * @param {string} dirPath - Directory path
   * @returns {Promise<boolean>}
   */
  async mockablePrompt(dirPath) {
    // This function is mocked during testing
    return this.promptAddDirectory(dirPath);
  }
}

module.exports = CLIInterface;
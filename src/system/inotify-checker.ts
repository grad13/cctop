/**
 * Inotify Limit Checker (FUNC-019)
 * inotify.max_user_watches limit management in Linux environments
 */

import { promises as fs } from 'fs';

interface CheckResult {
  status: 'sufficient' | 'insufficient' | 'unknown';
  canCheck: boolean;
  current?: number;
  required?: number;
  shortage?: number;
  message: string;
}

class InotifyChecker {
  /**
   * Get current inotify limit value
   * @returns {Promise<number|null>} Limit value or null (if unable to retrieve)
   */
  static async getCurrentLimit(): Promise<number | null> {
    // Return null for non-Linux environments
    if (process.platform !== 'linux') {
      return null;
    }
    
    try {
      const limitPath = '/proc/sys/fs/inotify/max_user_watches';
      const content = await fs.readFile(limitPath, 'utf8');
      const limit = parseInt(content.trim(), 10);
      
      // Validity check
      if (isNaN(limit) || limit < 0) {
        return null;
      }
      
      return limit;
    } catch (error) {
      // File read failure (insufficient permissions, file not found, etc.)
      return null;
    }
  }
  
  /**
   * Check limit sufficiency
   * @param {number|null} current - Current limit value
   * @param {number} required - Required limit value
   * @returns {Object} Check result
   */
  static checkLimitSufficiency(current: number | null, required: number): CheckResult {
    // When current value cannot be retrieved
    if (current === null) {
      return {
        status: 'unknown',
        canCheck: false,
        message: 'Unable to determine current inotify limit'
      };
    }
    
    // When sufficient
    if (current >= required) {
      return {
        status: 'sufficient',
        canCheck: true,
        current,
        required,
        message: `Current limit (${current}) meets requirements (${required})`
      };
    }
    
    // When insufficient
    return {
      status: 'insufficient',
      canCheck: true,
      current,
      required,
      shortage: required - current,
      message: `Current limit (${current}) is below required (${required})`
    };
  }
  
  /**
   * Generate warning message
   * @param {number} current - Current limit value
   * @param {number} required - Required limit value
   * @returns {string} Warning message
   */
  static generateWarningMessage(current: number, required: number): string {
    const shortage = required - current;
    
    return `WARNING: inotify limit may be insufficient
   Current: ${current.toLocaleString()} watches
   Required: ${required.toLocaleString()} watches (configured)
   Shortage: ${shortage.toLocaleString()} watches
   
   Large projects may encounter "ENOSPC: System limit for number of file watchers reached" errors.
   
   To increase the limit permanently:
   echo fs.inotify.max_user_watches=${required} | sudo tee /etc/sysctl.d/40-max-user-watches.conf
   sudo sysctl --system
   
   To increase temporarily (until reboot):
   sudo sysctl fs.inotify.max_user_watches=${required}`;
  }
  
  /**
   * Generate platform-specific message
   * @returns {string|null} Platform-specific message
   */
  static getPlatformMessage(): string | null {
    switch (process.platform) {
      case 'darwin':
        return 'inotify limit checks are not applicable on macOS (using FSEvents).\nYour system supports unlimited file watching.';
      case 'win32':
        return 'inotify limit checks are not applicable on Windows.\nFile watching limits depend on system resources.';
      case 'linux':
        return null; // Execute normal checks on Linux
      default:
        return `inotify limit checks are not supported on ${process.platform}.`;
    }
  }
  
  /**
   * Determine if inotify check is needed
   * @returns {boolean} True if check is needed
   */
  static shouldCheckLimits(): boolean {
    return process.platform === 'linux';
  }
  
  /**
   * Format for detailed information display in CLI
   * @param {Object} checkResult - Result of checkLimitSufficiency
   * @returns {string} Formatted string
   */
  static formatCheckResult(checkResult: CheckResult): string {
    if (!checkResult.canCheck) {
      const platformMsg = this.getPlatformMessage();
      if (platformMsg) {
        return platformMsg;
      }
      return checkResult.message;
    }
    
    const lines = [
      `Current inotify limit: ${checkResult.current!.toLocaleString()}`,
      `Required limit: ${checkResult.required!.toLocaleString()} (configured)`,
      `Status: ${checkResult.status.toUpperCase()}`
    ];
    
    if (checkResult.status === 'sufficient') {
      lines.push('');
      lines.push('✓ Your system is properly configured for large-scale file monitoring.');
    } else if (checkResult.status === 'insufficient') {
      lines.push('');
      lines.push(this.generateWarningMessage(checkResult.current!, checkResult.required!));
    }
    
    return lines.join('\n');
  }
  
  /**
   * Recommended setting value
   */
  static get RECOMMENDED_LIMIT(): number {
    return 524288; // 512K watches
  }
  
  /**
   * Default setting value
   */
  static get DEFAULT_LIMIT(): number {
    return 524288; // 512K watches
  }
}

export = InotifyChecker;
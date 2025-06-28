/**
 * Inotify Limit Checker (FUNC-019)
 * inotify.max_user_watches limit management in Linux environments
 */

import { promises as fs } from 'fs';
import { InotifyLimitResult } from '../types/common';

class InotifyChecker {
  /**
   * Get current inotify limit value
   * @returns Promise of limit value or null (if unable to retrieve)
   */
  static async getCurrentLimit(): Promise<number | null> {
    // Return null for non-Linux environments
    if (process.platform !== 'linux') {
      return null;
    }
    
    try {
      const limitPath: string = '/proc/sys/fs/inotify/max_user_watches';
      const content: string = await fs.readFile(limitPath, 'utf8');
      const limit: number = parseInt(content.trim(), 10);
      
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
   * @param current - Current limit value
   * @param required - Required limit value
   * @returns Check result
   */
  static checkLimitSufficiency(current: number | null, required: number): InotifyLimitResult {
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
   * @param current - Current limit value
   * @param required - Required limit value
   * @returns Warning message
   */
  static generateWarningMessage(current: number, required: number): string {
    const shortage: number = required - current;
    
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
   * @returns Platform-specific message
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
   * @returns True if check is needed
   */
  static shouldCheckLimits(): boolean {
    return process.platform === 'linux';
  }
  
  /**
   * Format for detailed information display in CLI
   * @param checkResult - Result of checkLimitSufficiency
   * @returns Formatted string
   */
  static formatCheckResult(checkResult: InotifyLimitResult): string {
    if (!checkResult.canCheck) {
      const platformMsg: string | null = this.getPlatformMessage();
      if (platformMsg) {
        return platformMsg;
      }
      return checkResult.message;
    }
    
    const lines: string[] = [
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
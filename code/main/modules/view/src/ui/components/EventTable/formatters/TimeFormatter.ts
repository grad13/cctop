/**
 * Time formatting utilities for EventTable
 */

export class TimeFormatter {
  /**
   * Format timestamp to YYYY-MM-DD HH:MM:SS format
   */
  static formatTimestamp(timestamp: string | number): string {
    // Handle both Unix timestamp (number) and ISO string
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format elapsed time with staged display strategy
   */
  static formatElapsed(timestamp: string | number): string {
    const now = Date.now();
    // Handle both Unix timestamp (number) and ISO string
    const eventTime = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - eventTime) / 1000));
    
    // Staged elapsed time display
    const MINUTE = 60;
    const HOUR = 3600;
    const DAY = 86400;
    const MONTH = 30 * DAY; // 30 days = 1 month
    
    if (diffSeconds < 60 * MINUTE) {
      // 0-60 minutes: Show as mm:ss
      const minutes = Math.floor(diffSeconds / MINUTE);
      const seconds = diffSeconds % MINUTE;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else if (diffSeconds < 72 * HOUR) {
      // 60 minutes to 72 hours: Show as hh:mm:ss
      const hours = Math.floor(diffSeconds / HOUR);
      const minutes = Math.floor((diffSeconds % HOUR) / MINUTE);
      const seconds = diffSeconds % MINUTE;
      // Remove leading zero for hours under 10 (e.g., "6:18:47" instead of "06:18:47")
      const hoursStr = hours < 10 ? String(hours) : String(hours).padStart(2, '0');
      return `${hoursStr}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else if (diffSeconds < 90 * DAY) {
      // 72 hours to 90 days: Show as "n days"
      const days = Math.floor(diffSeconds / DAY);
      return `${days} days`;
    } else {
      // 90 days or more: Show as "n months"
      const months = Math.floor(diffSeconds / MONTH);
      return `${months} months`;
    }
  }
}
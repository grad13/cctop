/**
 * File size formatting for EventTable
 * Extracted from UIDataFormatter
 */

export class FileSizeFormatter {
  /**
   * Dynamic file size formatting
   * Returns formatted string with appropriate unit (B, K, M, G)
   */
  static format(bytes: number): string {
    if (bytes === 0) return '0B';
    
    if (bytes < 1024) {
      // 0-1023 bytes: show as bytes
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      // 1KB-1023KB: show as K with 1 decimal
      const kb = bytes / 1024;
      return `${kb.toFixed(1)}K`;
    } else if (bytes < 1024 * 1024 * 1024) {
      // 1MB-1023MB: show as M with 1 decimal
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(1)}M`;
    } else {
      // 1GB+: show as G with 1 decimal
      const gb = bytes / (1024 * 1024 * 1024);
      return `${gb.toFixed(1)}G`;
    }
  }
}
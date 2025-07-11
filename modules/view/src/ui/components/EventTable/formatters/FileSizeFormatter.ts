/**
 * File size formatting for EventTable
 */

export class FileSizeFormatter {
  /**
   * Dynamic file size formatting
   * Returns formatted string with appropriate unit (B, K, M, G)
   */
  static format(bytes: number): string {
    if (bytes === 0) return '0B';
    
    const sign = bytes < 0 ? '-' : '';
    const absBytes = Math.abs(bytes);
    
    if (absBytes < 1024) {
      // 0-1023 bytes: show as bytes
      return `${sign}${absBytes}B`;
    } else if (absBytes < 1024 * 1024) {
      // 1KB-1023KB: show as K with 1 decimal
      const kb = absBytes / 1024;
      return `${sign}${kb.toFixed(1)}K`;
    } else if (absBytes < 1024 * 1024 * 1024) {
      // 1MB-1023MB: show as M with 1 decimal
      const mb = absBytes / (1024 * 1024);
      return `${sign}${mb.toFixed(1)}M`;
    } else {
      // 1GB+: show as G with 1 decimal
      const gb = absBytes / (1024 * 1024 * 1024);
      return `${sign}${gb.toFixed(1)}G`;
    }
  }
}
/**
 * Format Helpers Tests
 * Tests for formatting utility functions
 */

import { describe, it, expect } from 'vitest';

describe('Format Helpers', () => {
  describe('formatElapsedTime', () => {
    const formatElapsedTime = (ms: number): string => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
      if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
      return `${Math.floor(ms / 3600000)}h`;
    };

    it('should format milliseconds', () => {
      expect(formatElapsedTime(0)).toBe('0ms');
      expect(formatElapsedTime(100)).toBe('100ms');
      expect(formatElapsedTime(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatElapsedTime(1000)).toBe('1s');
      expect(formatElapsedTime(5000)).toBe('5s');
      expect(formatElapsedTime(59999)).toBe('59s');
    });

    it('should format minutes', () => {
      expect(formatElapsedTime(60000)).toBe('1m');
      expect(formatElapsedTime(120000)).toBe('2m');
      expect(formatElapsedTime(3599999)).toBe('59m');
    });

    it('should format hours', () => {
      expect(formatElapsedTime(3600000)).toBe('1h');
      expect(formatElapsedTime(7200000)).toBe('2h');
      expect(formatElapsedTime(86400000)).toBe('24h');
    });
  });

  describe('truncateFileName', () => {
    const truncateFileName = (fileName: string, maxLength: number): string => {
      if (fileName.length <= maxLength) return fileName;
      
      const extension = fileName.match(/\.[^.]+$/)?.[0] || '';
      const nameWithoutExt = fileName.slice(0, fileName.length - extension.length);
      const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 3) + '...';
      
      return truncatedName + extension;
    };

    it('should not truncate short filenames', () => {
      expect(truncateFileName('file.txt', 20)).toBe('file.txt');
      expect(truncateFileName('short.js', 10)).toBe('short.js');
    });

    it('should truncate long filenames preserving extension', () => {
      expect(truncateFileName('very-long-filename.txt', 15)).toBe('very-lon....txt');
      expect(truncateFileName('another-long-name.js', 12)).toBe('anothe....js');
    });

    it('should handle files without extension', () => {
      expect(truncateFileName('README', 10)).toBe('README');
      expect(truncateFileName('very-long-filename', 10)).toBe('very-lo...');
    });
  });

  describe('formatFileSize', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0B';
      
      const units = ['B', 'KB', 'MB', 'GB'];
      const index = Math.floor(Math.log(bytes) / Math.log(1024));
      const size = bytes / Math.pow(1024, index);
      
      return size.toFixed(index === 0 ? 0 : 1) + units[index];
    };

    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0B');
      expect(formatFileSize(100)).toBe('100B');
      expect(formatFileSize(1023)).toBe('1023B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0KB');
      expect(formatFileSize(1536)).toBe('1.5KB');
      expect(formatFileSize(10240)).toBe('10.0KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0MB');
      expect(formatFileSize(5242880)).toBe('5.0MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0GB');
      expect(formatFileSize(2147483648)).toBe('2.0GB');
    });
  });

  describe('formatTimestamp', () => {
    const formatTimestamp = (timestamp: number | string): string => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    it('should format timestamps correctly', () => {
      const timestamp = new Date('2025-01-01T10:30:45').getTime();
      expect(formatTimestamp(timestamp)).toBe('2025-01-01 10:30:45');
    });

    it('should handle string timestamps', () => {
      expect(formatTimestamp('2025-01-01T15:45:30')).toBe('2025-01-01 15:45:30');
    });

    it('should pad single digits', () => {
      const timestamp = new Date('2025-01-05T09:05:03').getTime();
      expect(formatTimestamp(timestamp)).toBe('2025-01-05 09:05:03');
    });
  });
});
/**
 * FileSizeFormatter Tests
 * 
 * Tests for file size formatting with dynamic units
 */

import { describe, it, expect } from 'vitest';
import { FileSizeFormatter } from '../../../../../../src/ui/components/EventTable/formatters/FileSizeFormatter';

describe('FileSizeFormatter', () => {
  describe('format', () => {
    it('should format zero bytes', () => {
      expect(FileSizeFormatter.format(0)).toBe('0B');
    });

    it('should format bytes (0-1023B)', () => {
      const testCases = [
        { bytes: 1, expected: '1B' },
        { bytes: 100, expected: '100B' },
        { bytes: 512, expected: '512B' },
        { bytes: 1023, expected: '1023B' }
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(FileSizeFormatter.format(bytes)).toBe(expected);
      });
    });

    it('should format kilobytes (1KB-1023KB)', () => {
      const testCases = [
        { bytes: 1024, expected: '1.0K' },
        { bytes: 1536, expected: '1.5K' },
        { bytes: 2048, expected: '2.0K' },
        { bytes: 10240, expected: '10.0K' },
        { bytes: 102400, expected: '100.0K' },
        { bytes: 1048575, expected: '1024.0K' } // 1MB - 1 byte
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(FileSizeFormatter.format(bytes)).toBe(expected);
      });
    });

    it('should format megabytes (1MB-1023MB)', () => {
      const testCases = [
        { bytes: 1024 * 1024, expected: '1.0M' },
        { bytes: 1.5 * 1024 * 1024, expected: '1.5M' },
        { bytes: 10 * 1024 * 1024, expected: '10.0M' },
        { bytes: 100 * 1024 * 1024, expected: '100.0M' },
        { bytes: 1073741823, expected: '1024.0M' } // 1GB - 1 byte
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(FileSizeFormatter.format(bytes)).toBe(expected);
      });
    });

    it('should format gigabytes (1GB+)', () => {
      const testCases = [
        { bytes: 1024 * 1024 * 1024, expected: '1.0G' },
        { bytes: 1.5 * 1024 * 1024 * 1024, expected: '1.5G' },
        { bytes: 10 * 1024 * 1024 * 1024, expected: '10.0G' },
        { bytes: 100 * 1024 * 1024 * 1024, expected: '100.0G' },
        { bytes: 1024 * 1024 * 1024 * 1024, expected: '1024.0G' } // 1TB
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(FileSizeFormatter.format(bytes)).toBe(expected);
      });
    });

    it('should round to 1 decimal place correctly', () => {
      const testCases = [
        { bytes: 1126, expected: '1.1K' },         // 1.099... KB -> 1.1K
        { bytes: 1229, expected: '1.2K' },         // 1.200... KB -> 1.2K
        { bytes: 1844, expected: '1.8K' },         // 1.800... KB -> 1.8K
        { bytes: 1945, expected: '1.9K' },         // 1.899... KB -> 1.9K
        { bytes: 2099200, expected: '2.0M' },      // 2.001... MB -> 2.0M
        { bytes: 2202010, expected: '2.1M' }       // 2.100... MB -> 2.1M
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(FileSizeFormatter.format(bytes)).toBe(expected);
      });
    });

    it('should handle edge cases at unit boundaries', () => {
      const testCases = [
        { bytes: 1023, expected: '1023B' },        // Just under 1KB
        { bytes: 1024, expected: '1.0K' },         // Exactly 1KB
        { bytes: 1025, expected: '1.0K' },         // Just over 1KB
        { bytes: 1048575, expected: '1024.0K' },   // Just under 1MB
        { bytes: 1048576, expected: '1.0M' },      // Exactly 1MB
        { bytes: 1048577, expected: '1.0M' },      // Just over 1MB
        { bytes: 1073741823, expected: '1024.0M' },// Just under 1GB
        { bytes: 1073741824, expected: '1.0G' },   // Exactly 1GB
        { bytes: 1073741825, expected: '1.0G' }    // Just over 1GB
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(FileSizeFormatter.format(bytes)).toBe(expected);
      });
    });

    it('should handle negative values gracefully', () => {
      // Negative values shouldn't occur in practice, but handle them
      expect(FileSizeFormatter.format(-100)).toBe('-100B');
      expect(FileSizeFormatter.format(-2048)).toBe('-2.0K');
    });
  });
});
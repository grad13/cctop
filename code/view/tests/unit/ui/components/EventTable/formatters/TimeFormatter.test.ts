/**
 * TimeFormatter Tests
 * 
 * Tests for time formatting utilities
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeFormatter } from '../../../../../../src/ui/components/EventTable/formatters/TimeFormatter';

describe('TimeFormatter', () => {
  describe('formatTimestamp', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-01-11T10:30:45Z');
      const result = TimeFormatter.formatTimestamp(date);
      
      // Should format as YYYY-MM-DD HH:MM:SS in local time
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format ISO string correctly', () => {
      const isoString = '2025-01-11T10:30:45Z';
      const result = TimeFormatter.formatTimestamp(isoString);
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format Unix timestamp correctly', () => {
      // Unix timestamp for 2025-01-11T10:30:45Z
      const unixTimestamp = 1736593845;
      const result = TimeFormatter.formatTimestamp(unixTimestamp);
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should pad single digit values', () => {
      const date = new Date('2025-01-01T01:01:01Z');
      const result = TimeFormatter.formatTimestamp(date);
      
      // All single digits should be padded with zero
      expect(result).toMatch(/2025-01-01 \d{2}:01:01/);
    });
  });

  describe('formatElapsed', () => {
    let originalDateNow: () => number;
    
    beforeEach(() => {
      // Mock Date.now()
      originalDateNow = Date.now;
    });

    afterEach(() => {
      // Restore Date.now()
      Date.now = originalDateNow;
    });

    it('should format elapsed time under 60 minutes as mm:ss', () => {
      const now = new Date('2025-01-11T10:30:00Z').getTime();
      Date.now = vi.fn().mockReturnValue(now);

      // Test different elapsed times
      const testCases = [
        { timestamp: new Date('2025-01-11T10:29:30Z'), expected: '00:30' }, // 30 seconds
        { timestamp: new Date('2025-01-11T10:25:00Z'), expected: '05:00' }, // 5 minutes
        { timestamp: new Date('2025-01-11T09:45:00Z'), expected: '45:00' }, // 45 minutes
        { timestamp: new Date('2025-01-11T09:31:00Z'), expected: '59:00' }  // 59 minutes
      ];

      testCases.forEach(({ timestamp, expected }) => {
        const result = TimeFormatter.formatElapsed(timestamp);
        expect(result).toBe(expected);
      });
    });

    it('should format elapsed time 60 minutes to 72 hours as h:mm:ss or hh:mm:ss', () => {
      const now = new Date('2025-01-11T10:00:00Z').getTime();
      Date.now = vi.fn().mockReturnValue(now);

      const testCases = [
        { timestamp: new Date('2025-01-11T09:00:00Z'), expected: '1:00:00' },   // 1 hour (no leading zero)
        { timestamp: new Date('2025-01-11T00:00:00Z'), expected: '10:00:00' }, // 10 hours
        { timestamp: new Date('2025-01-10T10:00:00Z'), expected: '24:00:00' }, // 24 hours
        { timestamp: new Date('2025-01-09T14:00:00Z'), expected: '44:00:00' }  // 44 hours
      ];

      testCases.forEach(({ timestamp, expected }) => {
        const result = TimeFormatter.formatElapsed(timestamp);
        expect(result).toBe(expected);
      });
    });

    it('should format elapsed time 72 hours to 90 days as "n days"', () => {
      const now = new Date('2025-01-11T10:00:00Z').getTime();
      Date.now = vi.fn().mockReturnValue(now);

      const testCases = [
        { timestamp: new Date('2025-01-08T09:00:00Z'), expected: '3 days' },   // 3 days + 1 hour
        { timestamp: new Date('2025-01-01T10:00:00Z'), expected: '10 days' },  // 10 days
        { timestamp: new Date('2024-12-01T10:00:00Z'), expected: '41 days' },  // 41 days
        { timestamp: new Date('2024-10-14T10:00:00Z'), expected: '89 days' }   // 89 days
      ];

      testCases.forEach(({ timestamp, expected }) => {
        const result = TimeFormatter.formatElapsed(timestamp);
        expect(result).toBe(expected);
      });
    });

    it('should format elapsed time over 90 days as "n months"', () => {
      const now = new Date('2025-01-11T10:00:00Z').getTime();
      Date.now = vi.fn().mockReturnValue(now);

      const testCases = [
        { timestamp: new Date('2024-10-11T10:00:00Z'), expected: '3 months' },  // ~3 months
        { timestamp: new Date('2024-07-11T10:00:00Z'), expected: '6 months' },  // ~6 months
        { timestamp: new Date('2024-01-11T10:00:00Z'), expected: '12 months' }  // ~12 months
      ];

      testCases.forEach(({ timestamp, expected }) => {
        const result = TimeFormatter.formatElapsed(timestamp);
        expect(result).toBe(expected);
      });
    });

    it('should handle Unix timestamps', () => {
      const now = new Date('2025-01-11T10:00:00Z').getTime();
      Date.now = vi.fn().mockReturnValue(now);

      // Unix timestamp for 2025-01-11T09:30:00Z (30 minutes ago)
      const unixTimestamp = 1736587800;
      const result = TimeFormatter.formatElapsed(unixTimestamp);
      
      expect(result).toBe('30:00');
    });
  });
});
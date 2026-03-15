/**
 * ColumnFormatter Tests
 * Tests for abstract base class formatting behavior
 * Based on: documents/spec/view/supplement-column-formatter.md (SPEC-V-SUP-018)
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { ColumnFormatter } from '../../../src/ui/components/EventTable/formatters/ColumnFormatter';
import { ColumnConfig } from '../../../src/ui/components/EventTable/types';
import { EventRow } from '../../../src/types/event-row';

/**
 * Concrete subclass for testing abstract ColumnFormatter
 */
class TestFormatter extends ColumnFormatter {
  format(event: EventRow, width?: number): string {
    return this.formatColumn(event.filename, width);
  }
}

function createColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    name: 'test',
    width: 10,
    align: 'left',
    ...overrides,
  };
}

function createEventRow(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 1,
    timestamp: '2026-03-14T00:00:00',
    filename: 'test.ts',
    directory: '/src',
    event_type: 'modify',
    size: 1024,
    lines: 50,
    blocks: 8,
    inode: 12345,
    elapsed_ms: 100,
    ...overrides,
  };
}

describe('ColumnFormatter', () => {
  describe('constructor', () => {
    it('should accept a ColumnConfig', () => {
      const config = createColumnConfig();
      const formatter = new TestFormatter(config);
      expect(formatter).toBeInstanceOf(ColumnFormatter);
    });
  });

  describe('formatColumn', () => {
    describe('align: left (default)', () => {
      it('should pad short values with spaces to target width', () => {
        const config = createColumnConfig({ align: 'left', width: 10 });
        const formatter = new TestFormatter(config);
        const result = formatter.formatColumn('abc');

        // padOrTruncate pads to target width
        expect(result.length).toBeGreaterThanOrEqual(10);
      });

      it('should truncate long values to target width', () => {
        const config = createColumnConfig({ align: 'left', width: 5 });
        const formatter = new TestFormatter(config);
        const result = formatter.formatColumn('abcdefghijklmnop');

        // padOrTruncate truncates with ellipsis
        expect(result.length).toBeLessThanOrEqual(6); // may include ellipsis chars
      });

      it('should use width parameter over config width when provided', () => {
        const config = createColumnConfig({ align: 'left', width: 10 });
        const formatter = new TestFormatter(config);
        const result = formatter.formatColumn('abc', 20);

        // Should use the provided width (20), not config width (10)
        expect(result.length).toBeGreaterThanOrEqual(20);
      });
    });

    describe('align: right', () => {
      it('should right-align with padLeft', () => {
        const config = createColumnConfig({ align: 'right', width: 10 });
        const formatter = new TestFormatter(config);
        const result = formatter.formatColumn('abc');

        // padLeft pads on the left side
        expect(result).toMatch(/^\s+abc/);
      });
    });

    describe('align: center', () => {
      it('should distribute padding evenly on both sides', () => {
        const config = createColumnConfig({ align: 'center', width: 10 });
        const formatter = new TestFormatter(config);
        const result = formatter.formatColumn('ab');

        // 10 - 2 = 8 padding total, leftPad = 4, rightPad = 4
        expect(result.length).toBe(10);
        expect(result.trim()).toBe('ab');
      });

      it('should handle odd padding by giving extra to right', () => {
        const config = createColumnConfig({ align: 'center', width: 9 });
        const formatter = new TestFormatter(config);
        const result = formatter.formatColumn('ab');

        // 9 - 2 = 7 padding, leftPad = 3, rightPad = 4
        expect(result.length).toBe(9);
        const leftSpaces = result.length - result.trimStart().length;
        const rightSpaces = result.length - result.trimEnd().length;
        expect(leftSpaces).toBe(3);
        expect(rightSpaces).toBe(4);
      });
    });

    describe('align: left + directory + head truncate', () => {
      it('should use truncateDirectoryPath for directory column with head truncate', () => {
        const config = createColumnConfig({
          align: 'left',
          name: 'directory',
          truncate: 'head',
          width: 15,
        });
        const formatter = new TestFormatter(config);
        const longPath = '/very/long/path/to/some/directory';
        const result = formatter.formatColumn(longPath);

        // truncateDirectoryPath truncates from the head for long paths
        expect(result.length).toBeLessThanOrEqual(16); // allow small variance for ellipsis
      });
    });
  });

  describe('format (abstract)', () => {
    it('should be implemented by subclass to extract and format event data', () => {
      const config = createColumnConfig({ align: 'left', width: 15 });
      const formatter = new TestFormatter(config);
      const event = createEventRow({ filename: 'hello.ts' });
      const result = formatter.format(event);

      expect(result).toContain('hello.ts');
    });
  });
});

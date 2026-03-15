/**
 * Column Config Utilities Tests
 * Tests for generateHeaderLine and generateSeparatorLine
 * Based on: documents/spec/view/supplement-column-config.md (SPEC-V-SUP-022)
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { generateHeaderLine, generateSeparatorLine } from '../../../src/ui/components/EventTable/utils/columnConfig';
import { ViewConfig } from '../../../src/config/ViewConfig';

/**
 * Create a minimal ViewConfig stub for testing
 */
function createViewConfig(overrides: {
  columnsOrder?: string[];
  columns?: Record<string, { visible: boolean; width: number | 'auto'; align?: string }>;
} = {}): ViewConfig {
  const defaultColumns: Record<string, any> = {
    timestamp: { visible: true, width: 19, align: 'left' },
    elapsed: { visible: true, width: 8, align: 'right' },
    fileName: { visible: true, width: 20, align: 'left' },
    event: { visible: true, width: 6, align: 'left' },
    lines: { visible: true, width: 5, align: 'right' },
    blocks: { visible: true, width: 4, align: 'right' },
    size: { visible: true, width: 8, align: 'right' },
    directory: { visible: true, width: 'auto', align: 'left' },
  };

  return {
    display: {
      'columns-order': overrides.columnsOrder || ['timestamp', 'elapsed', 'fileName', 'event', 'lines', 'blocks', 'size'],
      columns: overrides.columns || defaultColumns,
    },
    colors: {},
  } as unknown as ViewConfig;
}

describe('Column Config Utilities', () => {
  describe('generateHeaderLine', () => {
    it('should generate header text for each visible column in columns-order', () => {
      const config = createViewConfig();
      const result = generateHeaderLine(config);

      expect(result).toContain('Event Timestamp');
      expect(result).toContain('Elapsed');
      expect(result).toContain('File Name');
      expect(result).toContain('Event');
      expect(result).toContain('Lines');
      expect(result).toContain('Blks');
      expect(result).toContain('Size');
    });

    it('should append directory column at the end if visible', () => {
      const config = createViewConfig();
      const result = generateHeaderLine(config);

      expect(result).toContain('Directory');
      // Directory should appear after other columns
      const directoryIndex = result.lastIndexOf('Directory');
      const sizeIndex = result.indexOf('Size');
      expect(directoryIndex).toBeGreaterThan(sizeIndex);
    });

    it('should not include directory column if not visible', () => {
      const columns: Record<string, any> = {
        timestamp: { visible: true, width: 19, align: 'left' },
        directory: { visible: false, width: 'auto', align: 'left' },
      };
      const config = createViewConfig({
        columnsOrder: ['timestamp'],
        columns,
      });
      const result = generateHeaderLine(config);

      expect(result).not.toContain('Directory');
    });

    it('should skip hidden columns from columns-order', () => {
      const columns: Record<string, any> = {
        timestamp: { visible: true, width: 19, align: 'left' },
        elapsed: { visible: false, width: 8, align: 'right' },
        fileName: { visible: true, width: 20, align: 'left' },
        directory: { visible: false, width: 'auto', align: 'left' },
      };
      const config = createViewConfig({
        columnsOrder: ['timestamp', 'elapsed', 'fileName'],
        columns,
      });
      const result = generateHeaderLine(config);

      expect(result).toContain('Event Timestamp');
      expect(result).not.toContain('Elapsed');
      expect(result).toContain('File Name');
    });

    it('should map column names to correct header text', () => {
      // Spec: Header Text Mapping
      const expectedMapping: Record<string, string> = {
        timestamp: 'Event Timestamp',
        elapsed: 'Elapsed',
        fileName: 'File Name',
        event: 'Event',
        lines: 'Lines',
        blocks: 'Blks',
        size: 'Size',
        directory: 'Directory',
      };

      for (const [columnName, headerText] of Object.entries(expectedMapping)) {
        const columns: Record<string, any> = {
          [columnName]: { visible: true, width: 20, align: 'left' },
        };
        // directory is added separately, not via columns-order
        if (columnName === 'directory') {
          const config = createViewConfig({ columnsOrder: [], columns });
          const result = generateHeaderLine(config);
          expect(result).toContain(headerText);
        } else {
          const config = createViewConfig({
            columnsOrder: [columnName],
            columns: { ...columns, directory: { visible: false, width: 'auto', align: 'left' } },
          });
          const result = generateHeaderLine(config);
          expect(result).toContain(headerText);
        }
      }
    });

    it('should use normalizeColumn for formatting each header', () => {
      // Result should be space-separated parts with proper widths
      const config = createViewConfig();
      const result = generateHeaderLine(config);

      // Should be a single string (parts joined by space)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateSeparatorLine', () => {
    it('should return U+2500 repeated to given width', () => {
      const result = generateSeparatorLine(10);
      expect(result).toBe('\u2500'.repeat(10));
    });

    it('should use 180 as fallback when width is 0', () => {
      const result = generateSeparatorLine(0);
      expect(result).toBe('\u2500'.repeat(180));
    });

    it('should generate separator with exact character count', () => {
      const width = 50;
      const result = generateSeparatorLine(width);
      expect(result.length).toBe(width);
    });

    it('should use Box Drawings Light Horizontal character', () => {
      const result = generateSeparatorLine(5);
      // U+2500 = '─'
      for (const char of result) {
        expect(char).toBe('\u2500');
      }
    });
  });
});

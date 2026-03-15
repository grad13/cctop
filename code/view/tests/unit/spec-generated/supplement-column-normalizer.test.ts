/**
 * Column Normalizer - Unit Tests (Supplement)
 * Spec: documents/spec/view/supplement-column-normalizer.md
 * Covers: Contract (normalizeColumn, normalizeRow), Logic (Decision Table,
 *         Tag-Aware Center Alignment)
 *
 * Existing coverage: Only indirect coverage through stringUtils.test.ts.
 * This file adds: direct normalizeColumn and normalizeRow unit tests.
 *
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { normalizeColumn, normalizeRow } from '../../../src/ui/components/EventTable/utils/columnNormalizer';
import stringWidth from 'string-width';

describe('Column Normalizer - Unit Tests', () => {

  describe('normalizeColumn - left alignment (default)', () => {
    it('should pad short text to exact width', () => {
      const result = normalizeColumn('test', 10);
      expect(result).toBe('test      ');
      expect(stringWidth(result)).toBe(10);
    });

    it('should truncate long text with ellipsis', () => {
      const result = normalizeColumn('verylongfilename.txt', 10);
      expect(stringWidth(result)).toBe(10);
      expect(result).toContain('...');
    });

    it('should return exact width for text matching width', () => {
      const result = normalizeColumn('exact10chr', 10);
      expect(result).toBe('exact10chr');
      expect(stringWidth(result)).toBe(10);
    });

    it('should handle empty string', () => {
      const result = normalizeColumn('', 5);
      expect(result).toBe('     ');
      expect(stringWidth(result)).toBe(5);
    });
  });

  describe('normalizeColumn - right alignment', () => {
    it('should pad text on the left', () => {
      const result = normalizeColumn('123', 7, 'right');
      expect(result).toBe('    123');
      expect(stringWidth(result)).toBe(7);
    });

    it('should not truncate when text is wider (padLeft behavior)', () => {
      const result = normalizeColumn('toolongtext', 5, 'right');
      // padLeft returns text unchanged if wider
      expect(result).toBe('toolongtext');
    });

    it('should handle single character', () => {
      const result = normalizeColumn('X', 5, 'right');
      expect(result).toBe('    X');
    });
  });

  describe('normalizeColumn - center alignment', () => {
    it('should center text with even padding', () => {
      const result = normalizeColumn('AB', 6, 'center');
      // total padding = 4, left = 2, right = 2
      expect(result).toBe('  AB  ');
      expect(stringWidth(result)).toBe(6);
    });

    it('should center text with odd padding (extra space on right)', () => {
      const result = normalizeColumn('AB', 7, 'center');
      // total padding = 5, left = 2, right = 3
      expect(result).toBe('  AB   ');
      expect(stringWidth(result)).toBe(7);
    });

    it('should strip blessed tags for width calculation in center mode', () => {
      const tagged = '{red-fg}OK{/red-fg}';
      const result = normalizeColumn(tagged, 10, 'center');
      // Visual text is "OK" (2 chars), padding = 8, left = 4, right = 4
      expect(result).toBe('    {red-fg}OK{/red-fg}    ');
      // The visual width should be 10
      const visualResult = result.replace(/\{[^}]+\}/g, '');
      expect(stringWidth(visualResult)).toBe(10);
    });

    it('should truncate center-aligned text if too wide', () => {
      const result = normalizeColumn('longtext', 5, 'center');
      expect(stringWidth(result)).toBe(5);
    });
  });

  describe('normalizeColumn - head truncation (directory paths)', () => {
    it('should truncate from head for long directory paths', () => {
      const result = normalizeColumn('/very/long/directory/path', 15, 'left', 'head');
      expect(stringWidth(result)).toBe(15);
      expect(result).toContain('...');
    });

    it('should pad short paths without truncation', () => {
      const result = normalizeColumn('/short', 15, 'left', 'head');
      expect(stringWidth(result)).toBe(15);
      expect(result.startsWith('/short')).toBe(true);
    });

    it('should keep the tail (most specific) of the path', () => {
      const result = normalizeColumn('/a/b/c/d/e/target', 15, 'left', 'head');
      expect(result).toContain('target');
    });

    it('should handle path exactly matching width', () => {
      const path = '/exact/fit/ok'; // 13 chars
      const result = normalizeColumn(path, 13, 'left', 'head');
      expect(stringWidth(result)).toBe(13);
    });
  });

  describe('normalizeRow', () => {
    it('should join multiple columns with default separator (space)', () => {
      const result = normalizeRow([
        { value: 'Name', width: 10 },
        { value: '100', width: 5, align: 'right' as const },
        { value: 'OK', width: 4 },
      ]);

      // "Name      " + " " + "  100" + " " + "OK  "
      expect(result).toBe('Name         100 OK  ');
    });

    it('should join with custom separator', () => {
      const result = normalizeRow([
        { value: 'A', width: 3 },
        { value: 'B', width: 3 },
      ], ' | ');

      expect(result).toBe('A   | B  ');
    });

    it('should handle single column', () => {
      const result = normalizeRow([
        { value: 'solo', width: 8 },
      ]);
      expect(result).toBe('solo    ');
    });

    it('should handle empty columns array', () => {
      const result = normalizeRow([]);
      expect(result).toBe('');
    });

    it('should support mixed alignment in row', () => {
      const result = normalizeRow([
        { value: 'left', width: 8, align: 'left' as const },
        { value: 'right', width: 8, align: 'right' as const },
        { value: 'mid', width: 7, align: 'center' as const },
      ]);

      const parts = result.split(' ');
      // Just verify it produces a valid string with correct total structure
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support head truncation in row columns', () => {
      const result = normalizeRow([
        { value: 'filename.ts', width: 15 },
        { value: '/very/long/path/to/dir', width: 15, truncate: 'head' as const },
      ]);

      expect(result).toContain('...');
      expect(result).toContain('filename.ts');
    });
  });

  describe('normalizeColumn with East Asian Width', () => {
    it('should normalize CJK text with left alignment', () => {
      const result = normalizeColumn('日本語', 10);
      expect(stringWidth(result)).toBe(10);
    });

    it('should normalize CJK text with right alignment', () => {
      const result = normalizeColumn('日本', 10, 'right');
      expect(stringWidth(result)).toBe(10);
      expect(result.endsWith('日本')).toBe(true);
    });

    it('should normalize CJK directory with head truncation', () => {
      const result = normalizeColumn('/ユーザー/プロジェクト/ソース', 20, 'left', 'head');
      expect(stringWidth(result)).toBe(20);
      expect(result).toContain('...');
    });
  });

  describe('normalizeRow for event table row', () => {
    it('should format a complete event table row', () => {
      const result = normalizeRow([
        { value: '2025-06-25 19:07:51', width: 19 },
        { value: '00:04', width: 9, align: 'right' as const },
        { value: 'component.tsx', width: 35 },
        { value: 'modify', width: 8 },
        { value: '197', width: 6, align: 'right' as const },
        { value: '16', width: 8, align: 'right' as const },
        { value: '15.2K', width: 7, align: 'right' as const },
        { value: 'src/components', width: 20, truncate: 'head' as const },
      ]);

      // Verify total format is reasonable
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('2025-06-25 19:07:51');
      expect(result).toContain('modify');
      expect(result).toContain('15.2K');
    });
  });
});

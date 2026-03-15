/**
 * East Asian Width Display - Integration Tests (Supplement)
 * Tests for full-width character truncation integration
 * Spec: documents/spec/view/east-asian-width-display.md
 * Covers: Section 3 (truncate with full-width chars), Section 5 (Validation)
 *
 * Existing coverage: stringUtils.test.ts covers individual function unit tests.
 * This file adds integration-level truncation tests for full-width characters.
 *
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { padOrTruncate, truncateWithEllipsis, padLeft, truncateDirectoryPath } from '../../../src/ui/components/EventTable/utils/stringUtils';
import stringWidth from 'string-width';

describe('East Asian Width Display - Full-Width Truncate Integration', () => {

  describe('padOrTruncate with full-width boundary cases', () => {
    it('should truncate full-width string at exact boundary', () => {
      // 5 full-width chars = 10 display width, target 10 => no truncation needed
      const fiveChars = 'あいうえお';
      const result = padOrTruncate(fiveChars, 10);
      expect(stringWidth(result)).toBe(10);
      expect(result).toBe('あいうえお');
    });

    it('should truncate full-width string that exceeds target by 1 char', () => {
      // 6 full-width chars = 12 display width, target 10
      const sixChars = 'あいうえおか';
      const result = padOrTruncate(sixChars, 10);
      expect(stringWidth(result)).toBe(10);
      expect(result).toContain('...');
    });

    it('should pad full-width string shorter than target', () => {
      // 2 full-width chars = 4 display width, target 10
      const twoChars = '日本';
      const result = padOrTruncate(twoChars, 10);
      expect(stringWidth(result)).toBe(10);
      expect(result.startsWith('日本')).toBe(true);
    });

    it('should handle mixed half-width and full-width at truncation boundary', () => {
      // "abcあいう" = 3 + 6 = 9 width, target 8
      const mixed = 'abcあいう';
      const result = padOrTruncate(mixed, 8);
      expect(stringWidth(result)).toBe(8);
      expect(result).toContain('...');
    });

    it('should produce exact target width for mixed content truncation', () => {
      // "test界隈data.txt" mixed content
      const mixed = 'test界隈data.txt';
      const result = padOrTruncate(mixed, 15);
      expect(stringWidth(result)).toBe(15);
    });
  });

  describe('truncateWithEllipsis full-width integration', () => {
    it('should not split a full-width character when truncating', () => {
      // Each full-width char is 2 width; truncation should never produce partial chars
      const text = 'あいうえおかきくけこ'; // 20 width
      const result = truncateWithEllipsis(text, 11);
      // result should be valid characters + "..."
      // Available for chars: 11 - 3 = 8 width = 4 full-width chars
      expect(stringWidth(result)).toBe(11);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle odd target width with full-width chars (padding needed)', () => {
      // full-width chars are 2-width each; with odd remaining space, 1 space pad expected
      const text = 'あいうえお'; // 10 width
      const result = truncateWithEllipsis(text, 8);
      // Available: 8 - 3 = 5, but full-width chars are 2 each, so max 4 width (2 chars)
      // result: "あい" (4) + "..." (3) = 7, pad 1 space = 8
      expect(stringWidth(result)).toBe(8);
    });

    it('should handle Chinese characters correctly', () => {
      const chinese = '中文测试数据文件名称';
      const result = truncateWithEllipsis(chinese, 12);
      expect(stringWidth(result)).toBe(12);
      expect(result).toContain('...');
    });

    it('should handle Korean characters correctly', () => {
      const korean = '한글파일이름테스트';
      const result = truncateWithEllipsis(korean, 12);
      expect(stringWidth(result)).toBe(12);
      expect(result).toContain('...');
    });

    it('should handle CJK mixed with path separators', () => {
      const path = 'プロジェクト/ソース/コンポーネント.tsx';
      const result = truncateWithEllipsis(path, 20);
      expect(stringWidth(result)).toBe(20);
      expect(result).toContain('...');
    });
  });

  describe('padLeft with full-width characters', () => {
    it('should pad left correctly for full-width content', () => {
      const text = '日本語'; // 6 width
      const result = padLeft(text, 10);
      expect(stringWidth(result)).toBe(10);
      expect(result.endsWith('日本語')).toBe(true);
      expect(result.startsWith('    ')).toBe(true); // 4 spaces
    });
  });

  describe('truncateDirectoryPath with full-width characters', () => {
    it('should truncate CJK directory paths from head', () => {
      const path = '/ユーザー/プロジェクト/ソース/コンポーネント';
      const result = truncateDirectoryPath(path, 20);
      expect(stringWidth(result)).toBeLessThanOrEqual(20);
      expect(result.startsWith('...')).toBe(true);
    });

    it('should keep the tail (most specific) part of CJK path', () => {
      const path = '/深層/中間/末端';
      const result = truncateDirectoryPath(path, 12);
      expect(result.startsWith('...')).toBe(true);
      // Should keep the end of the path
      expect(result).toContain('末端');
    });
  });

  describe('Column alignment consistency with mixed content', () => {
    it('should produce consistent column widths across ASCII and CJK rows', () => {
      const targetWidth = 35;

      const asciiResult = padOrTruncate('simple-file.ts', targetWidth);
      const japaneseResult = padOrTruncate('日本語ファイル.ts', targetWidth);
      const mixedResult = padOrTruncate('test界隈.txt', targetWidth);

      expect(stringWidth(asciiResult)).toBe(targetWidth);
      expect(stringWidth(japaneseResult)).toBe(targetWidth);
      expect(stringWidth(mixedResult)).toBe(targetWidth);
    });

    it('should align size column correctly with padLeft across content types', () => {
      const targetWidth = 7;

      const ascii = padLeft('15.2K', targetWidth);
      const cjk = padLeft('1.3M', targetWidth);

      expect(stringWidth(ascii)).toBe(targetWidth);
      expect(stringWidth(cjk)).toBe(targetWidth);
    });
  });
});

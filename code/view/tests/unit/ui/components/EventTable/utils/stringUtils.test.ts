/**
 * String Utils Tests
 * 
 * Tests for string manipulation utilities with East Asian Width support
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

import { describe, it, expect } from 'vitest';
import { 
  padOrTruncate, 
  truncateWithEllipsis, 
  padLeft, 
  truncateDirectoryPath,
  stripTags 
} from '../../../../../../src/ui/components/EventTable/utils/stringUtils';

describe('stringUtils', () => {
  describe('padOrTruncate', () => {
    it('should pad short text to target width', () => {
      expect(padOrTruncate('test', 10)).toBe('test      ');
      expect(padOrTruncate('hello', 10)).toBe('hello     ');
    });

    it('should return text unchanged if exact width', () => {
      expect(padOrTruncate('exact10chr', 10)).toBe('exact10chr');
    });

    it('should truncate long text with ellipsis', () => {
      expect(padOrTruncate('verylongfilename.txt', 10)).toBe('verylon...');
    });

    it('should handle blessed tags correctly', () => {
      const taggedText = '{green-fg}test{/green-fg}';
      const result = padOrTruncate(taggedText, 10);
      // Should pad based on visible text width (4), not tag length
      expect(result).toBe('{green-fg}test{/green-fg}      ');
    });

    it('should handle East Asian characters', () => {
      // Each Japanese character is typically 2 width
      expect(padOrTruncate('日本', 10)).toBe('日本      '); // 4 width + 6 spaces
      expect(padOrTruncate('日本語テスト', 10)).toBe('日本語... '); // Truncated
    });

    it('should handle empty string', () => {
      expect(padOrTruncate('', 10)).toBe('          ');
    });
  });

  describe('truncateWithEllipsis', () => {
    it('should truncate text with ellipsis', () => {
      expect(truncateWithEllipsis('verylongtext', 10)).toBe('verylon...');
      expect(truncateWithEllipsis('short', 10)).toBe('short');
    });

    it('should handle width smaller than ellipsis', () => {
      expect(truncateWithEllipsis('test', 1)).toBe('.');
      expect(truncateWithEllipsis('test', 2)).toBe('..');
      expect(truncateWithEllipsis('test', 3)).toBe('...');
    });

    it('should handle East Asian characters correctly', () => {
      // Each character is 2 width
      expect(truncateWithEllipsis('日本語テスト', 10)).toBe('日本語... ');
      expect(truncateWithEllipsis('あいうえお', 8)).toBe('あい... ');
    });

    it('should not truncate if text fits', () => {
      expect(truncateWithEllipsis('fits', 10)).toBe('fits');
    });
  });

  describe('padLeft', () => {
    it('should pad text on the left', () => {
      expect(padLeft('123', 5)).toBe('  123');
      expect(padLeft('test', 10)).toBe('      test');
    });

    it('should return text unchanged if already wider', () => {
      expect(padLeft('toolong', 5)).toBe('toolong');
    });

    it('should handle East Asian characters', () => {
      expect(padLeft('日本', 10)).toBe('      日本'); // 6 spaces + 4 width
    });

    it('should handle empty string', () => {
      expect(padLeft('', 5)).toBe('     ');
    });
  });

  describe('truncateDirectoryPath', () => {
    it('should return path unchanged if it fits', () => {
      const shortPath = '/short/path';
      expect(truncateDirectoryPath(shortPath, 20)).toBe(shortPath);
    });

    it('should truncate from the beginning for long paths', () => {
      const longPath = '/very/long/directory/path/to/file';
      expect(truncateDirectoryPath(longPath, 20)).toBe('...tory/path/to/file');
    });

    it('should keep the most important part (end) of the path', () => {
      const projectPath = '/Users/username/projects/myproject/src/components';
      expect(truncateDirectoryPath(projectPath, 30)).toBe('...ts/myproject/src/components');
    });

    it('should handle paths with East Asian characters', () => {
      const japanesePath = '/ユーザー/プロジェクト/ソース';
      const result = truncateDirectoryPath(japanesePath, 20);
      expect(result).toContain('...');
      expect(result).toContain('ソース'); // Should keep the end
    });

    it('should handle edge cases', () => {
      expect(truncateDirectoryPath('/', 5)).toBe('/');
      expect(truncateDirectoryPath('/a', 5)).toBe('/a');
      expect(truncateDirectoryPath('/abc', 3)).toBe('...');
    });
  });

  describe('stripTags', () => {
    it('should remove blessed color tags', () => {
      expect(stripTags('{green-fg}text{/green-fg}')).toBe('text');
      expect(stripTags('{blue-bg}hello{/blue-bg} {red-fg}world{/red-fg}')).toBe('hello world');
    });

    it('should handle nested tags', () => {
      expect(stripTags('{blue-bg}{bold}text{/bold}{/blue-bg}')).toBe('text');
    });

    it('should handle text without tags', () => {
      expect(stripTags('plain text')).toBe('plain text');
    });

    it('should handle empty string', () => {
      expect(stripTags('')).toBe('');
    });

    it('should handle malformed tags', () => {
      expect(stripTags('text {incomplete')).toBe('text {incomplete');
      expect(stripTags('text }incomplete{')).toBe('text }incomplete{');
    });

    it('should remove multiple tag types', () => {
      const complexText = '{bold}{cyan-fg}Event{/cyan-fg}{/bold} {green-fg}timestamp{/green-fg}';
      expect(stripTags(complexText)).toBe('Event timestamp');
    });
  });
});
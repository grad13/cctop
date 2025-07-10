/**
 * Unit tests for TextNormalizer
 */

import { TextNormalizer } from '../../../src/search/TextNormalizer';

describe('TextNormalizer', () => {
  describe('normalizeSearchText', () => {
    it('should remove newline characters', () => {
      expect(TextNormalizer.normalizeSearchText('test\n')).toBe('test');
      expect(TextNormalizer.normalizeSearchText('test\r\n')).toBe('test');
    });

    it('should replace tab characters with space', () => {
      expect(TextNormalizer.normalizeSearchText('hello\tworld')).toBe('hello world');
    });

    it('should trim leading and trailing spaces', () => {
      expect(TextNormalizer.normalizeSearchText('  test  ')).toBe('test');
      expect(TextNormalizer.normalizeSearchText('\t\ttest\t\t')).toBe('test');
    });

    it('should replace multiple consecutive spaces with single space', () => {
      expect(TextNormalizer.normalizeSearchText('test   debug')).toBe('test debug');
      expect(TextNormalizer.normalizeSearchText('  test   debug  ')).toBe('test debug');
    });

    it('should handle full-width spaces', () => {
      expect(TextNormalizer.normalizeSearchText('日本語　テスト')).toBe('日本語 テスト');
    });

    it('should handle mixed control characters', () => {
      expect(TextNormalizer.normalizeSearchText('test\n\t\rdebug')).toBe('test debug');
    });

    it('should return empty string for empty input', () => {
      expect(TextNormalizer.normalizeSearchText('')).toBe('');
      expect(TextNormalizer.normalizeSearchText('\n\t\r')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(TextNormalizer.normalizeSearchText(null as any)).toBe('');
      expect(TextNormalizer.normalizeSearchText(undefined as any)).toBe('');
    });

    it('should preserve emoji and special characters', () => {
      expect(TextNormalizer.normalizeSearchText('🔍 search')).toBe('🔍 search');
      expect(TextNormalizer.normalizeSearchText('file@#$.md')).toBe('file@#$.md');
    });

    it('should handle all ASCII control characters', () => {
      let input = '';
      for (let i = 0; i <= 31; i++) {
        input += String.fromCharCode(i) + 'test';
      }
      input += String.fromCharCode(127) + 'test';
      
      const result = TextNormalizer.normalizeSearchText(input);
      expect(result).not.toContain(String.fromCharCode(0));
      expect(result).toBe('test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test');
    });
  });

  describe('parseKeywords', () => {
    it('should split by space', () => {
      expect(TextNormalizer.parseKeywords('test debug')).toEqual(['test', 'debug']);
    });

    it('should filter out empty strings', () => {
      expect(TextNormalizer.parseKeywords('test  debug')).toEqual(['test', 'debug']);
      expect(TextNormalizer.parseKeywords(' test debug ')).toEqual(['test', 'debug']);
    });

    it('should handle single keyword', () => {
      expect(TextNormalizer.parseKeywords('test')).toEqual(['test']);
    });

    it('should return empty array for empty string', () => {
      expect(TextNormalizer.parseKeywords('')).toEqual([]);
    });

    it('should handle multi-language keywords', () => {
      expect(TextNormalizer.parseKeywords('日本語 テスト test')).toEqual(['日本語', 'テスト', 'test']);
    });
  });

  describe('hasControlCharacters', () => {
    it('should detect newline characters', () => {
      expect(TextNormalizer.hasControlCharacters('test\n')).toBe(true);
    });

    it('should detect tab characters', () => {
      expect(TextNormalizer.hasControlCharacters('test\t')).toBe(true);
    });

    it('should return false for normal text', () => {
      expect(TextNormalizer.hasControlCharacters('test debug')).toBe(false);
      expect(TextNormalizer.hasControlCharacters('日本語テスト')).toBe(false);
    });
  });

  describe('getDisplaySafeText', () => {
    it('should make control characters visible', () => {
      expect(TextNormalizer.getDisplaySafeText('test\n')).toBe('test\\n');
      expect(TextNormalizer.getDisplaySafeText('hello\tworld')).toBe('hello\\tworld');
      expect(TextNormalizer.getDisplaySafeText('test\r\n')).toBe('test\\r\\n');
    });

    it('should convert other control characters to hex', () => {
      expect(TextNormalizer.getDisplaySafeText('test\x00')).toBe('test\\x00');
      expect(TextNormalizer.getDisplaySafeText('test\x1F')).toBe('test\\x1f');
    });

    it('should preserve normal text', () => {
      expect(TextNormalizer.getDisplaySafeText('normal text')).toBe('normal text');
    });
  });
});
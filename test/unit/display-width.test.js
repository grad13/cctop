const { padEndWithWidth, padStartWithWidth, truncateWithEllipsis } = require('../../src/utils/display-width');
const stringWidth = require('string-width');

describe('East Asian Width Support', () => {
  describe('stringWidth calculations', () => {
    it('should calculate correct width for ASCII characters', () => {
      expect(stringWidth('hello')).toBe(5);
      expect(stringWidth('test123')).toBe(7);
      expect(stringWidth('')).toBe(0);
    });

    it('should calculate correct width for Japanese characters', () => {
      expect(stringWidth('こんにちは')).toBe(10); // 5 characters * 2 width
      expect(stringWidth('テスト')).toBe(6); // 3 characters * 2 width
      expect(stringWidth('日本語')).toBe(6); // 3 characters * 2 width
    });

    it('should calculate correct width for Chinese characters', () => {
      expect(stringWidth('你好')).toBe(4); // 2 characters * 2 width
      expect(stringWidth('测试文件')).toBe(8); // 4 characters * 2 width
    });

    it('should calculate correct width for Korean characters', () => {
      expect(stringWidth('안녕하세요')).toBe(10); // 5 characters * 2 width
      expect(stringWidth('테스트')).toBe(6); // 3 characters * 2 width
    });

    it('should calculate correct width for mixed content', () => {
      expect(stringWidth('test界隈')).toBe(8); // 4 + 2*2
      expect(stringWidth('hello世界')).toBe(9); // 5 + 2*2
      expect(stringWidth('test_テスト_file')).toBe(16); // 5 + 6 + 5
    });

    it('should handle emojis correctly', () => {
      expect(stringWidth('\u{1F389}')).toBe(2); // Single emoji (party popper)
      expect(stringWidth('\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}')).toBe(2); // Family emoji (combined)
      expect(stringWidth('test\u{1F389}file')).toBe(10); // 4 + 2 + 4
    });

    it('should handle zero-width characters', () => {
      expect(stringWidth('test\u200Bword')).toBe(9); // Zero-width space (not truly zero in string-width)
      expect(stringWidth('a\u0300')).toBe(1); // Combining character
    });
  });

  describe('padEndWithWidth', () => {
    it('should pad ASCII strings correctly', () => {
      const result = padEndWithWidth('hello', 10);
      expect(stringWidth(result)).toBe(10);
      expect(result).toBe('hello     ');
    });

    it('should pad Japanese strings correctly', () => {
      const result = padEndWithWidth('こんにちは', 20);
      expect(stringWidth(result)).toBe(20);
      expect(result).toBe('こんにちは          '); // 10 spaces
    });

    it('should pad mixed strings correctly', () => {
      const result = padEndWithWidth('test界隈', 20);
      expect(stringWidth(result)).toBe(20);
      expect(result).toBe('test界隈            '); // 12 spaces
    });

    it('should truncate strings that exceed target width', () => {
      const result = padEndWithWidth('これは非常に長い日本語の文字列です', 20);
      expect(stringWidth(result)).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });

    it('should handle exact width strings', () => {
      const result = padEndWithWidth('hello', 5);
      expect(result).toBe('hello');
      expect(stringWidth(result)).toBe(5);
    });

    it('should handle empty strings', () => {
      const result = padEndWithWidth('', 10);
      expect(result).toBe('          ');
      expect(stringWidth(result)).toBe(10);
    });
  });

  describe('padStartWithWidth', () => {
    it('should pad ASCII strings on the left', () => {
      const result = padStartWithWidth('123', 5);
      expect(stringWidth(result)).toBe(5);
      expect(result).toBe('  123');
    });

    it('should pad Japanese strings on the left', () => {
      const result = padStartWithWidth('テスト', 10);
      expect(stringWidth(result)).toBe(10);
      expect(result).toBe('    テスト'); // 4 spaces
    });

    it('should pad mixed strings on the left', () => {
      const result = padStartWithWidth('123個', 10);
      expect(stringWidth(result)).toBe(10);
      expect(result).toBe('     123個'); // 5 spaces
    });

    it('should truncate strings that exceed target width', () => {
      const result = padStartWithWidth('これは非常に長い日本語の文字列です', 10);
      expect(stringWidth(result)).toBeLessThanOrEqual(10);
      expect(result).toContain('...');
    });
  });

  describe('truncateWithEllipsis', () => {
    it('should not truncate strings within width', () => {
      expect(truncateWithEllipsis('hello', 10)).toBe('hello');
      expect(truncateWithEllipsis('テスト', 10)).toBe('テスト');
    });

    it('should truncate long ASCII strings', () => {
      const result = truncateWithEllipsis('this is a very long string that needs truncation', 20);
      expect(stringWidth(result)).toBeLessThanOrEqual(20);
      expect(result.endsWith('...')).toBe(true);
      expect(result).toBe('this is a very lo...');
    });

    it('should truncate long Japanese strings', () => {
      const result = truncateWithEllipsis('これは非常に長い日本語の文字列です', 20);
      expect(stringWidth(result)).toBeLessThanOrEqual(20);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate mixed strings correctly', () => {
      const result = truncateWithEllipsis('test_テスト_very_long_filename.txt', 20);
      expect(stringWidth(result)).toBeLessThanOrEqual(20);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle edge case where ellipsis equals max width', () => {
      const result = truncateWithEllipsis('test', 3);
      expect(stringWidth(result)).toBeLessThanOrEqual(3);
      expect(result).toBe('...');
    });

    it('should handle strings with emojis', () => {
      const result = truncateWithEllipsis('\u{1F389}\u{1F38A}\u{1F388}\u{1F381}\u{1F380}', 8);
      expect(stringWidth(result)).toBeLessThanOrEqual(8);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should preserve character boundaries for multi-width chars', () => {
      const result = truncateWithEllipsis('あいうえお', 9); // 10 width total, truncate to 9
      expect(stringWidth(result)).toBeLessThanOrEqual(9);
      expect(result).toBe('あいう...'); // Should not split characters
    });
  });

  describe('edge cases', () => {
    it('should handle control characters', () => {
      expect(stringWidth('\t')).toBe(0);
      expect(stringWidth('\n')).toBe(0);
      expect(stringWidth('\r')).toBe(0);
      const result = padEndWithWidth('test\ttab', 10);
      expect(result).toBeDefined();
    });

    it('should handle RTL characters', () => {
      const arabic = 'مرحبا';
      expect(stringWidth(arabic)).toBeGreaterThan(0);
      const result = padEndWithWidth(arabic, 20);
      expect(result).toBeDefined();
    });

    it('should handle very long strings efficiently', () => {
      const longString = 'あ'.repeat(1000);
      const start = Date.now();
      const result = truncateWithEllipsis(longString, 50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete within 100ms
      expect(stringWidth(result)).toBeLessThanOrEqual(50);
    });
  });
});
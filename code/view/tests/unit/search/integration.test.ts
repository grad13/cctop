/**
 * integration.test
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-13
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import { TextNormalizer } from '../../../src/search/TextNormalizer';

describe('FUNC-209 Integration Test - Control Character Handling', () => {
  let uiState: UIState;

  beforeEach(() => {
    uiState = new UIState();
  });

  describe('Control Character Input Simulation', () => {
    it('should handle Enter key (\\n) in search text', () => {
      // Simulate user typing 'test' then pressing Enter
      // enterSearchMode no longer exists in UIState API
      uiState.appendToSearchPattern('t');
      uiState.appendToSearchPattern('e');
      uiState.appendToSearchPattern('s');
      uiState.appendToSearchPattern('t');
      uiState.appendToSearchPattern('\n'); // Enter key
      
      const searchText = uiState.getSearchText();
      console.log('Raw search text:', JSON.stringify(searchText));
      console.log('Display safe:', TextNormalizer.getDisplaySafeText(searchText));
      
      // The current implementation would have 'test\n'
      expect(searchText).toBe('test\n');
      expect(TextNormalizer.hasControlCharacters(searchText)).toBe(true);
      
      // After normalization
      const normalized = TextNormalizer.normalizeSearchText(searchText);
      expect(normalized).toBe('test');
      expect(TextNormalizer.hasControlCharacters(normalized)).toBe(false);
    });

    it('should handle Tab key (\\t) in search text', () => {
      // enterSearchMode no longer exists in UIState API
      uiState.appendToSearchPattern('hello');
      uiState.appendToSearchPattern('\t'); // Tab key
      uiState.appendToSearchPattern('world');
      
      const searchText = uiState.getSearchText();
      expect(searchText).toBe('hello\tworld');
      
      // After normalization
      const normalized = TextNormalizer.normalizeSearchText(searchText);
      expect(normalized).toBe('hello world');
    });

    it('should handle multiple control characters', () => {
      // enterSearchMode no longer exists in UIState API
      uiState.appendToSearchPattern('line1');
      uiState.appendToSearchPattern('\n');
      uiState.appendToSearchPattern('\t');
      uiState.appendToSearchPattern('line2');
      uiState.appendToSearchPattern('\r');
      
      const searchText = uiState.getSearchText();
      expect(searchText).toBe('line1\n\tline2\r');
      
      const normalized = TextNormalizer.normalizeSearchText(searchText);
      expect(normalized).toBe('line1 line2');
    });
  });

  describe('Multiple Keyword Search', () => {
    it('should parse multiple keywords from normalized text', () => {
      const text = 'test debug file';
      const keywords = TextNormalizer.parseKeywords(text);
      expect(keywords).toEqual(['test', 'debug', 'file']);
    });

    it('should handle control characters in multi-keyword search', () => {
      const text = 'test\ndebug\tfile';
      const normalized = TextNormalizer.normalizeSearchText(text);
      const keywords = TextNormalizer.parseKeywords(normalized);
      expect(keywords).toEqual(['test', 'debug', 'file']);
    });
  });
});
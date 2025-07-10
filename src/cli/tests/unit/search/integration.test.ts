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
      uiState.enterSearchMode();
      uiState.appendToSearchText('t');
      uiState.appendToSearchText('e');
      uiState.appendToSearchText('s');
      uiState.appendToSearchText('t');
      uiState.appendToSearchText('\n'); // Enter key
      
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
      uiState.enterSearchMode();
      uiState.appendToSearchText('hello');
      uiState.appendToSearchText('\t'); // Tab key
      uiState.appendToSearchText('world');
      
      const searchText = uiState.getSearchText();
      expect(searchText).toBe('hello\tworld');
      
      // After normalization
      const normalized = TextNormalizer.normalizeSearchText(searchText);
      expect(normalized).toBe('hello world');
    });

    it('should handle multiple control characters', () => {
      uiState.enterSearchMode();
      uiState.appendToSearchText('line1');
      uiState.appendToSearchText('\n');
      uiState.appendToSearchText('\t');
      uiState.appendToSearchText('line2');
      uiState.appendToSearchText('\r');
      
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
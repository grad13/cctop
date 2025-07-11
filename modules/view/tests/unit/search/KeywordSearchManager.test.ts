/**
 * Unit tests for KeywordSearchManager
 */

import { KeywordSearchManager } from '../../../src/search/KeywordSearchManager';
import { EventRow } from '../../../src/types/event-row';

describe('KeywordSearchManager', () => {
  // Sample test data
  const mockEvents: EventRow[] = [
    {
      event_timestamp: '2025-07-09 10:00:00',
      elapsed: '00:01',
      filename: 'test.ts',
      event_type: 'modify',
      line_count: 100,
      block_count: 10,
      file_size: 1024,
      directory: '/src/components',
      full_path: '/src/components/test.ts',
      is_selected: false
    },
    {
      event_timestamp: '2025-07-09 10:01:00',
      elapsed: '00:02',
      filename: 'debug.log',
      event_type: 'create',
      line_count: 50,
      block_count: 5,
      file_size: 512,
      directory: '/logs',
      full_path: '/logs/debug.log',
      is_selected: false
    }
  ];

  describe('processSearchInput', () => {
    it('should normalize and parse keywords', () => {
      expect(KeywordSearchManager.processSearchInput('test\n')).toEqual(['test']);
      expect(KeywordSearchManager.processSearchInput('  test   debug  ')).toEqual(['test', 'debug']);
      expect(KeywordSearchManager.processSearchInput('hello\tworld')).toEqual(['hello', 'world']);
    });

    it('should handle empty input', () => {
      expect(KeywordSearchManager.processSearchInput('')).toEqual([]);
      expect(KeywordSearchManager.processSearchInput('\n\t\r')).toEqual([]);
    });

    it('should handle multi-language input', () => {
      expect(KeywordSearchManager.processSearchInput('日本語　テスト')).toEqual(['日本語', 'テスト']);
    });
  });

  describe('performLocalSearch', () => {
    it('should search with normalized input', () => {
      const results = KeywordSearchManager.performLocalSearch(mockEvents, 'test\n');
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('test.ts');
    });

    it('should perform AND search with multiple keywords', () => {
      const results = KeywordSearchManager.performLocalSearch(mockEvents, 'test  ts');
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('test.ts');
    });

    it('should return empty array for no matches', () => {
      const results = KeywordSearchManager.performLocalSearch(mockEvents, 'nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should handle control characters in input', () => {
      const results = KeywordSearchManager.performLocalSearch(mockEvents, 'test\t\r\n');
      expect(results).toHaveLength(1);
    });
  });

  describe('getDisplayText', () => {
    it('should return normalized text for display', () => {
      expect(KeywordSearchManager.getDisplayText('test\n')).toBe('test');
      expect(KeywordSearchManager.getDisplayText('  test   debug  ')).toBe('test debug');
      expect(KeywordSearchManager.getDisplayText('hello\tworld')).toBe('hello world');
    });
  });

  describe('buildDatabaseSearchParams', () => {
    it('should build search parameters for database', () => {
      const params = KeywordSearchManager.buildDatabaseSearchParams('test  debug\n');
      
      expect(params.keywords).toEqual(['test', 'debug']);
      expect(params.normalizedText).toBe('test debug');
      expect(params.whereClause).toBe("(f.file_name LIKE '%test%' OR f.file_path LIKE '%test%') AND (f.file_name LIKE '%debug%' OR f.file_path LIKE '%debug%')");
    });

    it('should handle single keyword', () => {
      const params = KeywordSearchManager.buildDatabaseSearchParams('test');
      
      expect(params.keywords).toEqual(['test']);
      expect(params.whereClause).toBe("(f.file_name LIKE '%test%' OR f.file_path LIKE '%test%')");
    });

    it('should handle empty input', () => {
      const params = KeywordSearchManager.buildDatabaseSearchParams('');
      
      expect(params.keywords).toEqual([]);
      expect(params.normalizedText).toBe('');
      expect(params.whereClause).toBe('1=1');
    });

    it('should escape SQL special characters', () => {
      const params = KeywordSearchManager.buildDatabaseSearchParams("test's file");
      
      expect(params.keywords).toEqual(["test's", 'file']);
      expect(params.whereClause).toContain("test''s");
    });
  });

  describe('isValidSearchInput', () => {
    it('should return true for valid input', () => {
      expect(KeywordSearchManager.isValidSearchInput('test')).toBe(true);
      expect(KeywordSearchManager.isValidSearchInput('test debug')).toBe(true);
    });

    it('should return false for empty or whitespace only', () => {
      expect(KeywordSearchManager.isValidSearchInput('')).toBe(false);
      expect(KeywordSearchManager.isValidSearchInput('   ')).toBe(false);
      expect(KeywordSearchManager.isValidSearchInput('\n\t\r')).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    it('should provide comprehensive debug information', () => {
      const debug = KeywordSearchManager.getDebugInfo('test\ndebug');
      
      expect(debug.rawInput).toBe('test\ndebug');
      expect(debug.displaySafe).toBe('test\\ndebug');
      expect(debug.normalized).toBe('test debug');
      expect(debug.keywords).toEqual(['test', 'debug']);
      expect(debug.hasControlChars).toBe(true);
    });

    it('should detect no control characters', () => {
      const debug = KeywordSearchManager.getDebugInfo('test debug');
      
      expect(debug.hasControlChars).toBe(false);
    });
  });
});
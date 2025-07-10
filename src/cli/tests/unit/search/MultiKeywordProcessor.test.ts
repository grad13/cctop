/**
 * Unit tests for MultiKeywordProcessor
 */

import { MultiKeywordProcessor } from '../../../src/search/MultiKeywordProcessor';
import { EventRow } from '../../../src/types/event-row';

describe('MultiKeywordProcessor', () => {
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
    },
    {
      event_timestamp: '2025-07-09 10:02:00',
      elapsed: '00:03',
      filename: 'index.test.ts',
      event_type: 'modify',
      line_count: 200,
      block_count: 20,
      file_size: 2048,
      directory: '/tests',
      full_path: '/tests/index.test.ts',
      is_selected: false
    }
  ];

  describe('searchWithMultipleKeywords', () => {
    it('should find events with single keyword', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(mockEvents, ['test']);
      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('test.ts');
      expect(results[1].filename).toBe('index.test.ts');
    });

    it('should find events with multiple keywords (AND search)', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(mockEvents, ['test', 'ts']);
      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('test.ts');
      expect(results[1].filename).toBe('index.test.ts');
    });

    it('should return empty array when no matches', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(mockEvents, ['nonexistent']);
      expect(results).toHaveLength(0);
    });

    it('should search in both filename and directory', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(mockEvents, ['components']);
      expect(results).toHaveLength(1);
      expect(results[0].directory).toBe('/src/components');
    });

    it('should be case insensitive', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(mockEvents, ['TEST', 'TS']);
      expect(results).toHaveLength(2);
    });

    it('should return all events when no keywords', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(mockEvents, []);
      expect(results).toHaveLength(3);
    });

    it('should handle empty events array', () => {
      const results = MultiKeywordProcessor.searchWithMultipleKeywords([], ['test']);
      expect(results).toHaveLength(0);
    });

    it('should handle null/undefined values', () => {
      const eventsWithNull: EventRow[] = [{
        ...mockEvents[0],
        filename: null as any,
        directory: null as any
      }];
      
      const results = MultiKeywordProcessor.searchWithMultipleKeywords(eventsWithNull, ['test']);
      expect(results).toHaveLength(0);
    });
  });

  describe('eventMatchesAllKeywords', () => {
    it('should return true when event matches all keywords', () => {
      expect(MultiKeywordProcessor.eventMatchesAllKeywords(mockEvents[0], ['test', 'ts'])).toBe(true);
    });

    it('should return false when event does not match all keywords', () => {
      expect(MultiKeywordProcessor.eventMatchesAllKeywords(mockEvents[0], ['test', 'log'])).toBe(false);
    });

    it('should return true when no keywords', () => {
      expect(MultiKeywordProcessor.eventMatchesAllKeywords(mockEvents[0], [])).toBe(true);
    });
  });

  describe('buildSqlWhereClause', () => {
    it('should build WHERE clause for single keyword', () => {
      const clause = MultiKeywordProcessor.buildSqlWhereClause(['test']);
      expect(clause).toBe("(file_name LIKE '%test%' OR file_path LIKE '%test%')");
    });

    it('should build WHERE clause for multiple keywords with AND', () => {
      const clause = MultiKeywordProcessor.buildSqlWhereClause(['test', 'debug']);
      expect(clause).toBe("(file_name LIKE '%test%' OR file_path LIKE '%test%') AND (file_name LIKE '%debug%' OR file_path LIKE '%debug%')");
    });

    it('should escape single quotes', () => {
      const clause = MultiKeywordProcessor.buildSqlWhereClause(["test's"]);
      expect(clause).toBe("(file_name LIKE '%test''s%' OR file_path LIKE '%test''s%')");
    });

    it('should return 1=1 for empty keywords', () => {
      const clause = MultiKeywordProcessor.buildSqlWhereClause([]);
      expect(clause).toBe('1=1');
    });

    it('should use custom column names', () => {
      const clause = MultiKeywordProcessor.buildSqlWhereClause(['test'], 'f.name', 'f.path');
      expect(clause).toBe("(f.name LIKE '%test%' OR f.path LIKE '%test%')");
    });
  });

  describe('getSearchStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = MultiKeywordProcessor.getSearchStatistics(mockEvents, ['test']);
      expect(stats.totalEvents).toBe(3);
      expect(stats.matchingEvents).toBe(2);
      expect(stats.keywords).toEqual(['test']);
      expect(stats.matchPercentage).toBeCloseTo(66.67, 1);
    });

    it('should handle empty results', () => {
      const stats = MultiKeywordProcessor.getSearchStatistics(mockEvents, ['nonexistent']);
      expect(stats.totalEvents).toBe(3);
      expect(stats.matchingEvents).toBe(0);
      expect(stats.matchPercentage).toBe(0);
    });

    it('should handle empty events', () => {
      const stats = MultiKeywordProcessor.getSearchStatistics([], ['test']);
      expect(stats.totalEvents).toBe(0);
      expect(stats.matchingEvents).toBe(0);
      expect(stats.matchPercentage).toBe(0);
    });
  });
});
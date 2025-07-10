import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseAdapterFunc000 } from '../../../src/database/database-adapter-func000';
import { UIState } from '../../../src/ui/UIState';
import { SearchResultCache } from '../../../src/ui/SearchResultCache';
import { EventRow } from '../../../src/types/event-row';

describe('FUNC-202 v0.3.4.0 Search Functionality', () => {
  let db: DatabaseAdapterFunc000;
  let uiState: UIState;
  
  const mockEvents: EventRow[] = [
    {
      id: 1,
      timestamp: 1719899271,
      filename: 'test.ts',
      directory: '/src',
      event_type: 'modify',
      size: 1024,
      lines: 50,
      blocks: 2,
      inode: 12345,
      elapsed_ms: 5000
    },
    {
      id: 2,
      timestamp: 1719899281,
      filename: 'index.js',
      directory: '/lib',
      event_type: 'create',
      size: 2048,
      lines: 100,
      blocks: 4,
      inode: 12346,
      elapsed_ms: 3000
    },
    {
      id: 3,
      timestamp: 1719899291,
      filename: 'readme.md',
      directory: '/docs',
      event_type: 'modify',
      size: 512,
      lines: 25,
      blocks: 1,
      inode: 12347,
      elapsed_ms: 1000
    }
  ];

  beforeEach(() => {
    db = new DatabaseAdapterFunc000(':memory:');
    uiState = new UIState();
  });

  describe('Local Search (Phase 1)', () => {
    it('should filter events locally in real-time', () => {
      uiState.setEvents(mockEvents);
      uiState.setSearchText('test');
      
      const filtered = uiState.applyFilters(mockEvents);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].filename).toBe('test.ts');
    });

    it('should search in both filename and directory', () => {
      uiState.setEvents(mockEvents);
      uiState.setSearchText('lib');
      
      const filtered = uiState.applyFilters(mockEvents);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].directory).toBe('/lib');
    });

    it('should be case-insensitive', () => {
      uiState.setEvents(mockEvents);
      uiState.setSearchText('TEST');
      
      const filtered = uiState.applyFilters(mockEvents);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].filename).toBe('test.ts');
    });
  });

  describe('DB Search (Phase 2)', () => {
    it('should mark search as applied when Enter is pressed', () => {
      uiState.enterSearchMode();
      uiState.setSearchText('test');
      uiState.applySearch();
      
      expect(uiState.isDbSearchApplied()).toBe(true);
    });

    it('should bypass local filtering when DB search is applied', () => {
      uiState.setSearchText('test');
      uiState.applySearch();
      
      // When DB search is applied, local filtering should not happen
      const filtered = uiState.applyFilters(mockEvents);
      expect(filtered).toHaveLength(3); // All events returned
    });
  });

  describe('Search Result Cache', () => {
    let cache: SearchResultCache;

    beforeEach(() => {
      cache = new SearchResultCache(2); // Max 2 entries
    });

    it('should cache search results', () => {
      cache.set('test', mockEvents);
      const cached = cache.get('test');
      
      expect(cached).toEqual(mockEvents);
    });

    it('should implement LRU eviction', () => {
      cache.set('query1', [mockEvents[0]]);
      cache.set('query2', [mockEvents[1]]);
      cache.set('query3', [mockEvents[2]]); // Should evict query1
      
      expect(cache.get('query1')).toBeNull();
      expect(cache.get('query2')).toBeTruthy();
      expect(cache.get('query3')).toBeTruthy();
    });

    it('should invalidate cache on mode switch', () => {
      const uiCache = uiState.getSearchCache();
      uiCache.set('test', mockEvents);
      
      uiState.setDisplayMode('unique'); // Switch mode
      
      expect(uiCache.get('test')).toBeNull();
    });

    it('should invalidate cache on ESC', () => {
      const uiCache = uiState.getSearchCache();
      uiCache.set('test', mockEvents);
      
      uiState.exitSpecialMode(); // ESC key
      
      expect(uiCache.get('test')).toBeNull();
    });
  });

  describe('Filter Integration', () => {
    it('should combine event type filters with search', () => {
      uiState.setEvents(mockEvents);
      uiState.setSearchText('.');
      uiState.toggleEventFilter('create'); // Disable create filter
      
      const filtered = uiState.applyFilters(mockEvents);
      expect(filtered).toHaveLength(2); // Only modify events
      expect(filtered.every(e => e.event_type === 'modify')).toBe(true);
    });
  });
});
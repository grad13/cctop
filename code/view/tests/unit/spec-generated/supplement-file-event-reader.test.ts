/**
 * FileEventReader Unit Tests (from spec: supplement-file-event-reader.md)
 * Tests FileEventReader contract methods not covered by existing database/* tests
 * Existing tests cover DatabaseAdapter; these test FileEventReader directly
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileEventReader } from '../../../src/database/FileEventReader';

// Mock sqlite3 to avoid real database connections
vi.mock('sqlite3', () => {
  const mockDb = {
    all: vi.fn(),
    close: vi.fn((cb: Function) => cb(null)),
  };
  return {
    default: {
      Database: vi.fn((_path: string, _mode: number, cb: Function) => {
        cb(null);
        return mockDb;
      }),
      OPEN_READONLY: 1,
    },
  };
});

// Mock QueryBuilder to isolate FileEventReader logic
vi.mock('../../../src/database/QueryBuilder', () => ({
  QueryBuilder: {
    selectColumns: vi.fn((alias?: string) => `${alias || 'e'}.id, ${alias || 'e'}.file_name`),
    joins: vi.fn((alias?: string) => `JOIN event_types et ON ${alias || 'e'}.event_type_id = et.id`),
    uniqueCTE: vi.fn((where: string) => `WITH latest_events AS (SELECT *, ROW_NUMBER() OVER() as rn FROM events e ${where})`),
    filterCondition: vi.fn((filters?: string[]) => {
      if (!filters || filters.length === 0) return '';
      return `et.name IN (${filters.map(f => `'${f}'`).join(',')})`;
    }),
  },
}));

describe('FileEventReader', () => {
  let reader: FileEventReader;

  beforeEach(() => {
    vi.clearAllMocks();
    reader = new FileEventReader('/test/path/activity.db');
  });

  describe('constructor', () => {
    it('should accept a database path', () => {
      const r = new FileEventReader('/some/db/path.db');
      expect(r).toBeInstanceOf(FileEventReader);
    });
  });

  describe('connect', () => {
    it('should open a read-only connection', async () => {
      await expect(reader.connect()).resolves.toBeUndefined();
    });

    it('should reject when database open fails', async () => {
      const sqlite3 = await import('sqlite3');
      (sqlite3.default.Database as any).mockImplementationOnce(
        (_path: string, _mode: number, cb: Function) => {
          cb(new Error('Cannot open database'));
          return {};
        }
      );

      const failReader = new FileEventReader('/invalid/path.db');
      await expect(failReader.connect()).rejects.toThrow('Cannot open database');
    });
  });

  describe('disconnect', () => {
    it('should resolve when no connection exists', async () => {
      // reader.db is null before connect
      await expect(reader.disconnect()).resolves.toBeUndefined();
    });

    it('should close an existing connection', async () => {
      await reader.connect();
      await expect(reader.disconnect()).resolves.toBeUndefined();
    });

    it('should reject when close fails', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.close.mockImplementationOnce((cb: Function) => cb(new Error('Close failed')));

      await expect(reader.disconnect()).rejects.toThrow('Close failed');
    });
  });

  describe('getLatestEvents', () => {
    it('should reject when not connected', async () => {
      await expect(reader.getLatestEvents()).rejects.toThrow('Database not connected');
    });

    it('should use default parameters (limit=50, mode=all, offset=0)', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, []));

      await reader.getLatestEvents();
      expect(db.all).toHaveBeenCalledWith(
        expect.any(String),
        [50, 0],
        expect.any(Function)
      );
    });

    it('should pass custom limit and offset', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, []));

      await reader.getLatestEvents(100, 'all', 50);
      expect(db.all).toHaveBeenCalledWith(
        expect.any(String),
        [100, 50],
        expect.any(Function)
      );
    });

    it('should return empty array when no rows found', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, null));

      const result = await reader.getLatestEvents();
      expect(result).toEqual([]);
    });

    it('should reject on query error', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) =>
        cb(new Error('Query failed'))
      );

      await expect(reader.getLatestEvents()).rejects.toThrow('Query failed');
    });

    it('should use unique CTE query when mode is unique', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, []));

      const { QueryBuilder } = await import('../../../src/database/QueryBuilder');

      await reader.getLatestEvents(50, 'unique');
      expect(QueryBuilder.uniqueCTE).toHaveBeenCalled();
    });

    it('should apply filter condition for all mode with filters', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, []));

      const { QueryBuilder } = await import('../../../src/database/QueryBuilder');

      await reader.getLatestEvents(50, 'all', 0, ['Create', 'Modify']);
      expect(QueryBuilder.filterCondition).toHaveBeenCalledWith(['Create', 'Modify']);
    });
  });

  describe('searchEvents', () => {
    it('should reject when not connected', async () => {
      await expect(reader.searchEvents({ keyword: 'test' })).rejects.toThrow(
        'Database not connected'
      );
    });

    it('should search with LIKE pattern on file_name and directory', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, params: any[], cb: Function) => {
        // params should include search patterns: %keyword%, %keyword%, limit, offset
        expect(params[0]).toBe('%test%');
        expect(params[1]).toBe('%test%');
        cb(null, []);
      });

      await reader.searchEvents({ keyword: 'test' });
    });

    it('should use default filters when none provided', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, []));

      await reader.searchEvents({ keyword: 'test' });
      // Default filters include all 6 event types
      const query = db.all.mock.calls[0][0];
      expect(query).toContain("'find'");
      expect(query).toContain("'create'");
      expect(query).toContain("'modify'");
      expect(query).toContain("'delete'");
      expect(query).toContain("'move'");
      expect(query).toContain("'restore'");
    });

    it('should support unique mode search', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, []));

      const { QueryBuilder } = await import('../../../src/database/QueryBuilder');

      await reader.searchEvents({ keyword: 'test', mode: 'unique' });
      expect(QueryBuilder.uniqueCTE).toHaveBeenCalled();
    });

    it('should return empty array on null result', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, null));

      const result = await reader.searchEvents({ keyword: 'test' });
      expect(result).toEqual([]);
    });
  });

  describe('getEventsAfterId', () => {
    it('should reject when not connected', async () => {
      await expect(reader.getEventsAfterId(0)).rejects.toThrow('Database not connected');
    });

    it('should query events with id > lastEventId ordered ASC', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, params: any[], cb: Function) => {
        expect(params[0]).toBe(42);
        expect(params[1]).toBe(100); // default limit
        cb(null, [{ id: 43 }, { id: 44 }]);
      });

      const result = await reader.getEventsAfterId(42);
      expect(result).toEqual([{ id: 43 }, { id: 44 }]);
    });

    it('should use custom limit', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, params: any[], cb: Function) => {
        expect(params[1]).toBe(10);
        cb(null, []);
      });

      await reader.getEventsAfterId(0, 10);
    });

    it('should return empty array when no new events', async () => {
      await reader.connect();
      const db = (reader as any).db;
      db.all.mockImplementation((_q: string, _p: any[], cb: Function) => cb(null, null));

      const result = await reader.getEventsAfterId(999);
      expect(result).toEqual([]);
    });
  });
});

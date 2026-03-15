/**
 * Tests for SQL Query Builder
 * Based on: documents/spec/view/query-builder.md
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../../../src/database/QueryBuilder';

describe('QueryBuilder', () => {
  describe('selectColumns', () => {
    it('should return SQL fragment with default alias "e"', () => {
      const result = QueryBuilder.selectColumns();
      expect(result).toContain('e.id');
      expect(result).toContain('e.timestamp');
      expect(result).toContain('e.file_name as filename');
      expect(result).toContain('e.directory');
    });

    it('should include et.name as event_type from JOIN', () => {
      const result = QueryBuilder.selectColumns();
      expect(result).toContain('et.name as event_type');
    });

    it('should include COALESCE(m.file_size, 0) as size', () => {
      const result = QueryBuilder.selectColumns();
      expect(result).toContain('COALESCE(m.file_size, 0) as size');
    });

    it('should include nullable measurement columns (lines, blocks)', () => {
      const result = QueryBuilder.selectColumns();
      expect(result).toContain('m.line_count as lines');
      expect(result).toContain('m.block_count as blocks');
    });

    it('should include COALESCE(m.inode, 0) as inode', () => {
      const result = QueryBuilder.selectColumns();
      expect(result).toContain('COALESCE(m.inode, 0) as inode');
    });

    it('should include hardcoded 0 as elapsed_ms placeholder', () => {
      const result = QueryBuilder.selectColumns();
      expect(result).toContain('0 as elapsed_ms');
    });

    it('should replace "e." prefix with provided alias using regex', () => {
      const result = QueryBuilder.selectColumns('le');
      expect(result).toContain('le.id');
      expect(result).toContain('le.timestamp');
      expect(result).toContain('le.file_name as filename');
      expect(result).toContain('le.directory');
      expect(result).not.toMatch(/\be\.id/);
    });

    it('should not replace "et." or "m." prefixes when alias is provided', () => {
      const result = QueryBuilder.selectColumns('le');
      expect(result).toContain('et.name as event_type');
      expect(result).toContain('m.file_size');
      expect(result).toContain('m.line_count');
    });
  });

  describe('joins', () => {
    it('should return JOIN clauses with default alias "e"', () => {
      const result = QueryBuilder.joins();
      expect(result).toContain('JOIN event_types et ON e.event_type_id = et.id');
      expect(result).toContain('LEFT JOIN measurements m ON e.id = m.event_id');
    });

    it('should replace "e." prefix with provided alias', () => {
      const result = QueryBuilder.joins('le');
      expect(result).toContain('le.event_type_id');
      expect(result).toContain('le.id');
    });
  });

  describe('uniqueCTE', () => {
    it('should generate WITH latest_events AS CTE', () => {
      const result = QueryBuilder.uniqueCTE();
      expect(result).toContain('WITH latest_events AS');
    });

    it('should use ROW_NUMBER() OVER PARTITION BY file_name, directory', () => {
      const result = QueryBuilder.uniqueCTE();
      expect(result).toContain('ROW_NUMBER() OVER (PARTITION BY e.file_name, e.directory ORDER BY e.timestamp DESC)');
    });

    it('should include rn alias for row number', () => {
      const result = QueryBuilder.uniqueCTE();
      expect(result).toContain('as rn');
    });

    it('should include optional WHERE clause when provided', () => {
      const result = QueryBuilder.uniqueCTE('WHERE e.file_name LIKE ?');
      expect(result).toContain('WHERE e.file_name LIKE ?');
    });

    it('should generate valid CTE without WHERE clause', () => {
      const result = QueryBuilder.uniqueCTE();
      expect(result).toContain('FROM events e');
      expect(result).not.toContain('WHERE');
    });
  });

  describe('filterCondition', () => {
    it('should return empty string when filters is undefined', () => {
      expect(QueryBuilder.filterCondition(undefined)).toBe('');
    });

    it('should return empty string when filters is empty array', () => {
      expect(QueryBuilder.filterCondition([])).toBe('');
    });

    it('should return empty string when all 6 types are selected', () => {
      const allTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
      expect(QueryBuilder.filterCondition(allTypes)).toBe('');
    });

    it('should return empty string when 6 or more filters provided', () => {
      const sevenTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore', 'extra'];
      expect(QueryBuilder.filterCondition(sevenTypes)).toBe('');
    });

    it('should return IN condition for subset of filters', () => {
      const result = QueryBuilder.filterCondition(['find', 'create']);
      expect(result).toBe("et.name IN ('find','create')");
    });

    it('should handle single filter', () => {
      const result = QueryBuilder.filterCondition(['modify']);
      expect(result).toBe("et.name IN ('modify')");
    });
  });

  describe('side effects', () => {
    it('should be pure SQL string generation with no state', () => {
      // Calling the same method multiple times should produce identical results
      const result1 = QueryBuilder.selectColumns();
      const result2 = QueryBuilder.selectColumns();
      expect(result1).toBe(result2);
    });

    it('should produce consistent filterCondition results', () => {
      const result1 = QueryBuilder.filterCondition(['find']);
      const result2 = QueryBuilder.filterCondition(['find']);
      expect(result1).toBe(result2);
    });
  });
});

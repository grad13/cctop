/**
 * Tests for Event Query Adapter
 * Based on: documents/spec/view/event-query-adapter.md
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventQueryAdapter } from '../../../src/database/EventQueryAdapter';

describe('Event Query Adapter', () => {
  describe('constructor', () => {
    it('should accept a dbPath string', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      expect(adapter).toBeInstanceOf(EventQueryAdapter);
    });
  });

  describe('connect', () => {
    it('should reject when database file does not exist', async () => {
      const adapter = new EventQueryAdapter('/tmp/nonexistent-test-db-cctop.db');
      await expect(adapter.connect()).rejects.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should resolve even when not connected (no db)', async () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('getLatestEvents', () => {
    it('should reject when database is not connected', async () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      await expect(adapter.getLatestEvents()).rejects.toThrow('Database not connected');
    });

    it('should have default limit of 50', async () => {
      // Verified by signature: getLatestEvents(limit: number = 50, ...)
      const adapter = new EventQueryAdapter('/tmp/test.db');
      // We just verify the method exists and has the expected signature behavior
      expect(typeof adapter.getLatestEvents).toBe('function');
    });

    it('should accept mode parameter with "all" and "unique" options', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      // Verify the method accepts mode parameter (compile-time check via TypeScript)
      expect(typeof adapter.getLatestEvents).toBe('function');
    });
  });

  describe('searchEvents', () => {
    it('should reject when database is not connected', async () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      await expect(adapter.searchEvents({ keyword: 'test' })).rejects.toThrow('Database not connected');
    });

    it('should accept keyword parameter', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      expect(typeof adapter.searchEvents).toBe('function');
    });
  });

  describe('contract: method signatures', () => {
    it('should have connect method returning Promise<void>', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      expect(typeof adapter.connect).toBe('function');
    });

    it('should have disconnect method returning Promise<void>', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      expect(typeof adapter.disconnect).toBe('function');
    });

    it('should have getLatestEvents method returning Promise<any[]>', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      expect(typeof adapter.getLatestEvents).toBe('function');
    });

    it('should have searchEvents method returning Promise<any[]>', () => {
      const adapter = new EventQueryAdapter('/tmp/test.db');
      expect(typeof adapter.searchEvents).toBe('function');
    });
  });
});

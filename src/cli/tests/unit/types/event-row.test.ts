/**
 * EventRow Type Tests
 * Tests for event row type definitions and utilities
 */

import { describe, it, expect } from 'vitest';
import { EventRow } from '../../src/types/event-row';

describe('EventRow Type', () => {
  describe('Type Structure', () => {
    it('should have all required properties', () => {
      const event: EventRow = {
        id: 1,
        event_type: 'create',
        file_path: '/test/file.txt',
        directory_path: '/test',
        timestamp: '2025-01-01 10:00:00',
        size: 1024,
        inode: 12345,
        elapsed_ms: 100
      };

      expect(event.id).toBe(1);
      expect(event.event_type).toBe('create');
      expect(event.file_path).toBe('/test/file.txt');
      expect(event.directory_path).toBe('/test');
      expect(event.timestamp).toBe('2025-01-01 10:00:00');
      expect(event.size).toBe(1024);
      expect(event.inode).toBe(12345);
      expect(event.elapsed_ms).toBe(100);
    });

    it('should accept all valid event types', () => {
      const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
      
      eventTypes.forEach(type => {
        const event: EventRow = {
          id: 1,
          event_type: type,
          file_path: '/test/file.txt',
          directory_path: '/test',
          timestamp: '2025-01-01 10:00:00',
          size: 0,
          inode: 0,
          elapsed_ms: 0
        };
        
        expect(event.event_type).toBe(type);
      });
    });
  });

  describe('Event Creation Helper', () => {
    it('should create a valid event with defaults', () => {
      const createEvent = (overrides: Partial<EventRow> = {}): EventRow => {
        return {
          id: 1,
          event_type: 'create',
          file_path: '/default/file.txt',
          directory_path: '/default',
          timestamp: new Date().toISOString(),
          size: 0,
          inode: 0,
          elapsed_ms: 0,
          ...overrides
        };
      };

      const event = createEvent({ event_type: 'modify', size: 2048 });
      
      expect(event.event_type).toBe('modify');
      expect(event.size).toBe(2048);
      expect(event.file_path).toBe('/default/file.txt');
    });
  });

  describe('Event Validation', () => {
    it('should validate event type', () => {
      const isValidEventType = (type: string): boolean => {
        const validTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
        return validTypes.includes(type);
      };

      expect(isValidEventType('create')).toBe(true);
      expect(isValidEventType('modify')).toBe(true);
      expect(isValidEventType('invalid')).toBe(false);
    });

    it('should validate file path', () => {
      const isValidPath = (path: string): boolean => {
        return path.startsWith('/') && path.length > 1;
      };

      expect(isValidPath('/test/file.txt')).toBe(true);
      expect(isValidPath('relative/path.txt')).toBe(false);
      expect(isValidPath('/')).toBe(false);
    });
  });
});
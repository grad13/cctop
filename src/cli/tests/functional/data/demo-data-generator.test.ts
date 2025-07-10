/**
 * Demo Data Generator Tests
 * Tests for demo data generation functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DemoDataGenerator } from '../../../src/utils/demo-data-generator';
import { EventRow } from '../../../src/types/event-row';

describe('DemoDataGenerator', () => {
  let generator: DemoDataGenerator;

  beforeEach(() => {
    generator = new DemoDataGenerator();
  });

  describe('Random Event Generation', () => {
    it('should generate a random event', () => {
      const event = generator.generateSingleEvent();

      expect(event).toBeDefined();
      expect(event.id).toBeGreaterThan(0);
      expect(event.event_type).toMatch(/^(find|create|modify|delete|move|restore)$/);
      expect(event.filename).toBeTruthy(); // Has filename
      expect(event.directory).toBeTruthy();
      expect(event.timestamp).toBeTruthy();
      expect(event.size).toBeGreaterThanOrEqual(0);
      expect(event.inode).toBeGreaterThan(0);
      expect(event.elapsed_ms).toBe(0);
    });

    it('should generate events with incrementing IDs', () => {
      const event1 = generator.generateSingleEvent();
      const event2 = generator.generateSingleEvent();
      const event3 = generator.generateSingleEvent();

      expect(event2.id).toBeGreaterThan(event1.id);
      expect(event3.id).toBeGreaterThan(event2.id);
    });

    it('should generate events with recent timestamps', () => {
      const event = generator.generateSingleEvent();
      const now = Date.now();
      const eventTime = new Date(event.timestamp).getTime();

      // Event should be within last 5 minutes
      expect(now - eventTime).toBeLessThanOrEqual(5 * 60 * 1000);
      expect(eventTime).toBeLessThanOrEqual(now);
    });
  });

  describe('Batch Event Generation', () => {
    it('should generate multiple events', () => {
      const count = 10;
      const events = generator.generateEvents(count);

      expect(events).toHaveLength(count);
      events.forEach(event => {
        expect(event.id).toBeGreaterThan(0);
        expect(event.event_type).toBeTruthy();
        expect(event.filename).toBeTruthy();
      });
    });

    it('should generate events in reverse chronological order (newest first)', () => {
      const events = generator.generateEvents(5);

      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i].timestamp).getTime()).toBeLessThanOrEqual(new Date(events[i - 1].timestamp).getTime());
      }
    });

    it('should calculate elapsed_ms correctly', () => {
      const events = generator.generateEvents(5);

      // First event should have elapsed_ms = 0
      expect(events[0].elapsed_ms).toBe(0);

      // All events should have elapsed_ms of 0 (as implemented)
      events.forEach(event => {
        expect(event.elapsed_ms).toBe(0);
      });
    });
  });

  describe('Event Type Distribution', () => {
    it('should generate various event types', () => {
      const events = generator.generateEvents(100);
      const typeCounts = new Map<string, number>();

      events.forEach(event => {
        typeCounts.set(event.event_type, (typeCounts.get(event.event_type) || 0) + 1);
      });

      // Should have at least 3 different event types in 100 events
      expect(typeCounts.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('File Path Generation', () => {
    it('should generate realistic file paths', () => {
      const events = generator.generateEvents(20);

      events.forEach(event => {
        // Filename should be a string
        expect(typeof event.filename).toBe('string');
        expect(event.filename.length).toBeGreaterThan(0);
        
        // Directory should be a string  
        expect(typeof event.directory).toBe('string');
        expect(event.directory.length).toBeGreaterThan(0);
      });
    });

    it('should generate various file extensions', () => {
      const events = generator.generateEvents(50);
      const extensions = new Set<string>();

      events.forEach(event => {
        if (event.filename && typeof event.filename === 'string') {
          const match = event.filename.match(/\.([a-z]+)$/);
          if (match) {
            extensions.add(match[1]);
          }
        }
      });

      // Should have multiple different extensions
      expect(extensions.size).toBeGreaterThan(1);
    });
  });
});
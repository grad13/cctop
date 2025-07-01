/**
 * Event Display Manager Test Suite (FUNC-202 compliant)
 * Tests event data management and display control functionality
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
const EventDisplayManager = require('../../dist/src/ui/managers/event-display-manager');
const chalk = require('chalk');

describe('Event Display Manager (FUNC-202 Compliance)', () => {
  let eventDisplayManager;
  let mockDatabase;
  let mockFilterManager;

  beforeEach(() => {
    eventDisplayManager = new EventDisplayManager({
      maxEvents: 10,
      mode: 'all'
    });

    // Mock database
    mockDatabase = {
      getRecentEvents: vi.fn()
    };

    // Mock filter manager
    mockFilterManager = {
      filterEvents: vi.fn(events => events) // Pass through by default
    };
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
      const manager = new EventDisplayManager();
      
      expect(manager.maxLines).toBe(20);
      expect(manager.displayMode).toBe('all');
      expect(manager.events).toEqual([]);
      expect(manager.uniqueEvents).toBeInstanceOf(Map);
      expect(manager.filterManager).toBeNull();
      expect(manager.db).toBeNull();
    });

    test('should initialize with provided configuration', () => {
      expect(eventDisplayManager.maxLines).toBe(10);
      expect(eventDisplayManager.displayMode).toBe('all');
    });

    test('should set dependencies correctly', () => {
      eventDisplayManager.setDatabase(mockDatabase);
      eventDisplayManager.setFilterManager(mockFilterManager);

      expect(eventDisplayManager.db).toBe(mockDatabase);
      expect(eventDisplayManager.filterManager).toBe(mockFilterManager);
    });
  });

  describe('Event Management', () => {
    test('should add single event correctly', () => {
      const eventData = {
        id: 1,
        event_type: 'modify',
        file_name: 'test.js',
        timestamp: Date.now()
      };

      eventDisplayManager.addEvent(eventData);

      expect(eventDisplayManager.events).toHaveLength(1);
      expect(eventDisplayManager.events[0]).toBe(eventData);
      expect(eventDisplayManager.uniqueEvents.get('test.js')).toBe(eventData);
    });

    test('should add events in chronological order (newest first)', () => {
      const event1 = { id: 1, file_name: 'file1.js', timestamp: 1000 };
      const event2 = { id: 2, file_name: 'file2.js', timestamp: 2000 };
      const event3 = { id: 3, file_name: 'file3.js', timestamp: 3000 };

      eventDisplayManager.addEvent(event1);
      eventDisplayManager.addEvent(event2);
      eventDisplayManager.addEvent(event3);

      expect(eventDisplayManager.events).toEqual([event3, event2, event1]);
    });

    test('should maintain unique events map correctly', () => {
      const event1 = { id: 1, file_name: 'test.js', timestamp: 1000 };
      const event2 = { id: 2, file_name: 'test.js', timestamp: 2000 }; // Same file, newer
      const event3 = { id: 3, file_name: 'other.js', timestamp: 1500 };

      eventDisplayManager.addEvent(event1);
      eventDisplayManager.addEvent(event2);
      eventDisplayManager.addEvent(event3);

      expect(eventDisplayManager.uniqueEvents.get('test.js')).toBe(event2);
      expect(eventDisplayManager.uniqueEvents.get('other.js')).toBe(event3);
      expect(eventDisplayManager.uniqueEvents.size).toBe(2);
    });

    test('should trim events when exceeding max capacity', () => {
      eventDisplayManager.maxLines = 3;
      
      // Add events beyond maxLines
      for (let i = 1; i <= 8; i++) {
        eventDisplayManager.addEvent({
          id: i,
          file_name: `file${i}.js`,
          timestamp: i * 1000
        });
      }

      expect(eventDisplayManager.events).toHaveLength(3); // maxLines
      expect(eventDisplayManager.events[0].id).toBe(8); // Newest event
      expect(eventDisplayManager.events[2].id).toBe(6); // Oldest kept event
    });

    test('should clear all events and unique map', () => {
      eventDisplayManager.addEvent({ id: 1, file_name: 'test.js' });
      eventDisplayManager.addEvent({ id: 2, file_name: 'other.js' });

      eventDisplayManager.clear();

      expect(eventDisplayManager.events).toHaveLength(0);
      expect(eventDisplayManager.uniqueEvents.size).toBe(0);
    });
  });

  describe('FUNC-202: Display Mode Management', () => {
    beforeEach(() => {
      // Add test events
      eventDisplayManager.addEvent({ id: 1, file_name: 'file1.js', timestamp: 1000 });
      eventDisplayManager.addEvent({ id: 2, file_name: 'file2.js', timestamp: 2000 });
      eventDisplayManager.addEvent({ id: 3, file_name: 'file1.js', timestamp: 3000 }); // Newer event for file1.js
    });

    test('should return all events in "all" mode', () => {
      eventDisplayManager.setDisplayMode('all');
      
      const events = eventDisplayManager.getEventsToDisplay();

      expect(events).toHaveLength(3);
      expect(events[0].id).toBe(3); // Newest first
      expect(events[1].id).toBe(2);
      expect(events[2].id).toBe(1);
    });

    test('should return unique events in "unique" mode', () => {
      eventDisplayManager.setDisplayMode('unique');
      
      const events = eventDisplayManager.getEventsToDisplay();

      expect(events).toHaveLength(2); // Only unique files
      expect(events.find(e => e.file_name === 'file1.js').id).toBe(3); // Latest for file1.js
      expect(events.find(e => e.file_name === 'file2.js').id).toBe(2);
    });

    test('should sort unique events by timestamp (newest first)', () => {
      eventDisplayManager.setDisplayMode('unique');
      
      const events = eventDisplayManager.getEventsToDisplay();

      expect(events[0].timestamp).toBeGreaterThan(events[1].timestamp);
    });

    test('should switch display mode with console message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      eventDisplayManager.setDisplayMode('unique');

      expect(eventDisplayManager.getDisplayMode()).toBe('unique');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Switched to UNIQUE mode'));
      
      consoleSpy.mockRestore();
    });

    test('should not log when switching to same mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      eventDisplayManager.setDisplayMode('all'); // Already in 'all' mode

      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should apply filtering when filter manager is available', () => {
      eventDisplayManager.setFilterManager(mockFilterManager);
      mockFilterManager.filterEvents.mockReturnValue([{ id: 1, file_name: 'filtered.js' }]);

      const events = eventDisplayManager.getEventsToDisplay();

      expect(mockFilterManager.filterEvents).toHaveBeenCalledWith(eventDisplayManager.events);
      expect(events).toEqual([{ id: 1, file_name: 'filtered.js' }]);
    });

    test('should return unfiltered events when no filter manager', () => {
      const events = eventDisplayManager.getEventsToDisplay();

      expect(events).toEqual(eventDisplayManager.events);
    });
  });

  describe('Database Integration', () => {
    test('should load initial events from database', async () => {
      const mockEvents = [
        { id: 1, file_name: 'file1.js', timestamp: 1000 },
        { id: 2, file_name: 'file2.js', timestamp: 2000 },
        { id: 3, file_name: 'file1.js', timestamp: 3000 }
      ];
      mockDatabase.getRecentEvents.mockResolvedValue(mockEvents);
      eventDisplayManager.setDatabase(mockDatabase);

      await eventDisplayManager.loadInitialEvents();

      expect(mockDatabase.getRecentEvents).toHaveBeenCalledWith(10);
      expect(eventDisplayManager.events).toEqual(mockEvents);
      expect(eventDisplayManager.uniqueEvents.get('file1.js').id).toBe(3);
      expect(eventDisplayManager.uniqueEvents.get('file2.js').id).toBe(2);
    });

    test('should handle database loading errors gracefully', async () => {
      mockDatabase.getRecentEvents.mockRejectedValue(new Error('Database error'));
      eventDisplayManager.setDatabase(mockDatabase);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await eventDisplayManager.loadInitialEvents();

      expect(consoleSpy).toHaveBeenCalledWith('[EventDisplayManager] Error loading initial events:', expect.any(Error));
      expect(eventDisplayManager.events).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    test('should skip loading when database not set', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await eventDisplayManager.loadInitialEvents();

      expect(consoleSpy).toHaveBeenCalledWith('[EventDisplayManager] Database not set, skipping initial load');
      
      consoleSpy.mockRestore();
    });

    test('should log successful loading in verbose mode', async () => {
      process.env.CCTOP_VERBOSE = 'true';
      
      const mockEvents = [{ id: 1, file_name: 'test.js' }];
      mockDatabase.getRecentEvents.mockResolvedValue(mockEvents);
      eventDisplayManager.setDatabase(mockDatabase);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await eventDisplayManager.loadInitialEvents();

      expect(consoleSpy).toHaveBeenCalledWith('[EventDisplayManager] Loaded 1 initial events');
      
      consoleSpy.mockRestore();
      delete process.env.CCTOP_VERBOSE;
    });
  });

  describe('Statistics and Status', () => {
    beforeEach(() => {
      eventDisplayManager.addEvent({ id: 1, file_name: 'file1.js' });
      eventDisplayManager.addEvent({ id: 2, file_name: 'file2.js' });
      eventDisplayManager.addEvent({ id: 3, file_name: 'file1.js' }); // Duplicate file
    });

    test('should provide correct statistics for "all" mode', () => {
      eventDisplayManager.setDisplayMode('all');
      
      const stats = eventDisplayManager.getStats();

      expect(stats).toEqual({
        modeIndicator: 'All Activities',
        totalEvents: 3,
        uniqueFiles: 2,
        stats: 'All Activities  (3/10)',
        displayText: 'All Activities  (3/10)'
      });
    });

    test('should provide correct statistics for "unique" mode', () => {
      eventDisplayManager.setDisplayMode('unique');
      
      const stats = eventDisplayManager.getStats();

      expect(stats).toEqual({
        modeIndicator: 'Unique Files',
        totalEvents: 3,
        uniqueFiles: 2,
        stats: 'Unique Files  (2/10)',
        displayText: 'Unique Files  (2/10)'
      });
    });

    test('should provide comprehensive status information', () => {
      const status = eventDisplayManager.getStatus();

      expect(status).toEqual({
        displayMode: 'all',
        totalEvents: 3,
        uniqueFiles: 2,
        maxLines: 10
      });
    });

    test('should return raw events array', () => {
      const rawEvents = eventDisplayManager.getRawEvents();

      expect(rawEvents).toBe(eventDisplayManager.events);
      expect(rawEvents).toHaveLength(3);
    });

    test('should return unique events map', () => {
      const uniqueEvents = eventDisplayManager.getUniqueEvents();

      expect(uniqueEvents).toBe(eventDisplayManager.uniqueEvents);
      expect(uniqueEvents.size).toBe(2);
    });
  });

  describe('Configuration Management', () => {
    test('should update max lines configuration', () => {
      eventDisplayManager.setMaxLines(5);

      expect(eventDisplayManager.maxLines).toBe(5);
    });

    test('should trim events when reducing max lines', () => {
      // Add 15 events
      for (let i = 1; i <= 15; i++) {
        eventDisplayManager.addEvent({
          id: i,
          file_name: `file${i}.js`,
          timestamp: i * 1000
        });
      }

      // Reduce max lines to 3 (should keep 6 events max)
      eventDisplayManager.setMaxLines(3);

      expect(eventDisplayManager.events).toHaveLength(6); // 2 * maxLines
      expect(eventDisplayManager.events[0].id).toBe(15); // Newest
      expect(eventDisplayManager.events[5].id).toBe(10); // Oldest kept
    });

    test('should not trim events when increasing max lines', () => {
      // Add 5 events
      for (let i = 1; i <= 5; i++) {
        eventDisplayManager.addEvent({
          id: i,
          file_name: `file${i}.js`
        });
      }

      eventDisplayManager.setMaxLines(20);

      expect(eventDisplayManager.events).toHaveLength(5); // No trimming
    });
  });

  describe('Verbose Logging', () => {
    test('should log event addition in verbose mode', () => {
      process.env.CCTOP_VERBOSE = 'true';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const eventData = {
        event_type: 'modify',
        file_name: 'test.js'
      };

      eventDisplayManager.addEvent(eventData);

      expect(consoleSpy).toHaveBeenCalledWith('[EventDisplayManager] Adding event:', 'modify', 'for', 'test.js');
      
      consoleSpy.mockRestore();
      delete process.env.CCTOP_VERBOSE;
    });

    test('should log event addition in test mode', () => {
      process.env.NODE_ENV = 'test';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const eventData = {
        event_type: 'create',
        file_name: 'new.js'
      };

      eventDisplayManager.addEvent(eventData);

      expect(consoleSpy).toHaveBeenCalledWith('[EventDisplayManager] Adding event:', 'create', 'for', 'new.js');
      
      consoleSpy.mockRestore();
      delete process.env.NODE_ENV;
    });

    test('should not log in normal mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const eventData = {
        event_type: 'delete',
        file_name: 'removed.js'
      };

      eventDisplayManager.addEvent(eventData);

      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle events with missing file_name', () => {
      const eventData = {
        id: 1,
        event_type: 'modify',
        timestamp: Date.now()
      };

      expect(() => {
        eventDisplayManager.addEvent(eventData);
      }).not.toThrow();

      expect(eventDisplayManager.events).toHaveLength(1);
      expect(eventDisplayManager.uniqueEvents.get(undefined)).toBe(eventData);
    });

    test('should handle empty events array gracefully', () => {
      const events = eventDisplayManager.getEventsToDisplay();

      expect(events).toEqual([]);
    });

    test('should handle filter manager that returns null/undefined', () => {
      eventDisplayManager.setFilterManager({
        filterEvents: vi.fn(() => null)
      });

      const events = eventDisplayManager.getEventsToDisplay();

      expect(events).toBeNull();
    });

    test('should handle very large number of events efficiently', () => {
      const startTime = Date.now();
      
      // Add 1000 events
      for (let i = 1; i <= 1000; i++) {
        eventDisplayManager.addEvent({
          id: i,
          file_name: `file${i % 100}.js`, // 100 unique files
          timestamp: i * 1000
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(eventDisplayManager.uniqueEvents.size).toBe(100);
      expect(eventDisplayManager.events.length).toBeLessThanOrEqual(40); // 2 * maxLines
    });

    test('should maintain data integrity after multiple operations', () => {
      // Complex sequence of operations
      eventDisplayManager.addEvent({ id: 1, file_name: 'file1.js', timestamp: 1000 });
      eventDisplayManager.setDisplayMode('unique');
      eventDisplayManager.addEvent({ id: 2, file_name: 'file1.js', timestamp: 2000 });
      eventDisplayManager.setMaxLines(5);
      eventDisplayManager.clear();
      eventDisplayManager.addEvent({ id: 3, file_name: 'file2.js', timestamp: 3000 });

      const events = eventDisplayManager.getEventsToDisplay();
      const stats = eventDisplayManager.getStats();

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(3);
      expect(stats.totalEvents).toBe(1);
      expect(stats.uniqueFiles).toBe(1);
    });
  });
});
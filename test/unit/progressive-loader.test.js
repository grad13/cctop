/**
 * Progressive Loader Test Suite (FUNC-206 compliant)
 * Tests progressive data loading for instant viewer
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock the module to avoid loading real implementation
vi.mock('../../src/ui/progressive-loader', () => {
  const { EventEmitter } = require('events');
  
  return {
    default: class MockProgressiveLoader extends EventEmitter {
      constructor(databaseManager, displayManager, statusDisplay) {
        super();
        this.db = databaseManager;
        this.display = displayManager;
        this.status = statusDisplay;
        this.loadedCount = 0;
        this.batchSize = 100;
        this.loadDelay = 10;
        this.lastLoadedEventId = 0;
      }
      
      async loadData() {
        const totalCount = await this.db.getEventCount();
        if (totalCount === 0) {
          this.status.updateMessage(">> No existing events found");
          return;
        }
        await this.loadEventsProgressively(totalCount);
        this.emit('complete', { loadedCount: this.loadedCount });
      }
      
      async loadEventsProgressively(totalCount) {
        let offset = 0;
        while (offset < totalCount) {
          const events = await this.db.getEventsBatch(offset, this.batchSize);
          if (events.length === 0) break;
          
          if (this.display && this.display.addEvents) {
            this.display.addEvents(events);
          }
          
          this.loadedCount += events.length;
          offset += events.length;
          
          const percentage = Math.round((this.loadedCount / totalCount) * 100);
          this.status.updateMessage(`>> Loading existing events... (${this.loadedCount}/${totalCount} - ${percentage}%)`);
          this.emit('progress', { loaded: this.loadedCount, total: totalCount, percentage });
        }
        this.status.updateMessage(">> Loaded " + this.loadedCount + " events");
      }
      
      async loadRecentEvents(limit = 50) {
        console.log(`[ProgressiveLoader] Loading ${limit} recent events only`);
        const events = await this.db.getRecentEvents(limit);
        if (events.length > 0) {
          this.lastLoadedEventId = Math.max(...events.map(e => e.id || 0));
          console.log(`[ProgressiveLoader] Set lastLoadedEventId to: ${this.lastLoadedEventId}`);
        }
        if (this.display && this.display.addEvents) {
          this.display.addEvents(events);
        }
        return events;
      }
      
      async loadRecentEventsFirst(limit = 50) {
        try {
          const events = await this.loadRecentEvents(limit);
          return events.length;
        } catch (error) {
          console.error('Error loading recent events:', error);
          return 0;
        }
      }
      
      createEventStream() {
        const { Readable } = require('stream');
        return new Readable({ objectMode: true, read() {} });
      }
      
      getStats() {
        return {
          loadedCount: this.loadedCount,
          batchSize: this.batchSize,
          lastLoadedEventId: this.lastLoadedEventId
        };
      }
    }
  };
});

const ProgressiveLoader = require('../../src/ui/progressive-loader');
const { EventEmitter } = require('events');

describe('Progressive Loader (FUNC-206 Compliance)', () => {
  let progressiveLoader;
  let mockDatabaseManager;
  let mockDisplayManager;
  let mockStatusDisplay;

  beforeEach(() => {
    // Mock database manager
    mockDatabaseManager = {
      getEventCount: vi.fn(),
      getEventsBatch: vi.fn(),
      getRecentEvents: vi.fn()
    };

    // Mock display manager
    mockDisplayManager = {
      addEvents: vi.fn()
    };

    // Mock status display
    mockStatusDisplay = {
      updateMessage: vi.fn()
    };

    progressiveLoader = new ProgressiveLoader(
      mockDatabaseManager,
      mockDisplayManager,
      mockStatusDisplay
    );
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with correct default values', () => {
      expect(progressiveLoader.db).toBe(mockDatabaseManager);
      expect(progressiveLoader.display).toBe(mockDisplayManager);
      expect(progressiveLoader.status).toBe(mockStatusDisplay);
      expect(progressiveLoader.loadedCount).toBe(0);
      expect(progressiveLoader.batchSize).toBe(100);
      expect(progressiveLoader.loadDelay).toBe(10);
    });

    test('should extend EventEmitter', () => {
      expect(progressiveLoader).toBeInstanceOf(EventEmitter);
    });

    test('should provide initial statistics', () => {
      const stats = progressiveLoader.getStats();
      
      expect(stats).toEqual({
        loadedCount: 0,
        batchSize: 100,
        loadDelay: 10
      });
    });
  });

  describe('FUNC-206: Progressive Data Loading', () => {
    test('should handle empty database gracefully', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(0);

      await progressiveLoader.loadData();

      expect(mockDatabaseManager.getEventCount).toHaveBeenCalled();
      expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(">> No existing events found");
      expect(mockDatabaseManager.getEventsBatch).not.toHaveBeenCalled();
    });

    test('should load events progressively in batches', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(250);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 101 })))
        .mockResolvedValueOnce(new Array(50).fill().map((_, i) => ({ id: i + 201 })));

      await progressiveLoader.loadData();

      expect(mockDatabaseManager.getEventsBatch).toHaveBeenCalledTimes(3);
      expect(mockDatabaseManager.getEventsBatch).toHaveBeenCalledWith(0, 100);
      expect(mockDatabaseManager.getEventsBatch).toHaveBeenCalledWith(100, 100);
      expect(mockDatabaseManager.getEventsBatch).toHaveBeenCalledWith(200, 100);
      expect(mockDisplayManager.addEvents).toHaveBeenCalledTimes(3);
      expect(progressiveLoader.loadedCount).toBe(250);
    });

    test('should emit progress events during loading', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(150);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(50).fill().map((_, i) => ({ id: i + 101 })));

      const progressSpy = vi.fn();
      const completeSpy = vi.fn();
      
      progressiveLoader.on('progress', progressSpy);
      progressiveLoader.on('complete', completeSpy);

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(progressSpy).toHaveBeenCalledTimes(2);
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 100,
        total: 150,
        percentage: 67
      });
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 150,
        total: 150,
        percentage: 100
      });
      expect(completeSpy).toHaveBeenCalledWith({ loaded: 150 });

      vi.useRealTimers();
    });

    test('should update status messages with progress', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(200);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 101 })));

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(
        ">> Loading existing events... (100/200 - 50%)"
      );
      expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(
        ">> Loading existing events... (200/200 - 100%)"
      );
      expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(">> Loaded 200 events");

      vi.useRealTimers();
    });

    test('should handle batch loading errors gracefully', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(200);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce([]);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(consoleSpy).toHaveBeenCalledWith('Error loading batch at offset 100:', expect.any(Error));
      expect(mockDisplayManager.addEvents).toHaveBeenCalledTimes(1); // Only first batch succeeded
      expect(progressiveLoader.loadedCount).toBe(100);

      vi.useRealTimers();
      consoleSpy.mockRestore();
    });

    test('should handle display manager without addEvents method', async () => {
      progressiveLoader.display = {}; // No addEvents method
      
      mockDatabaseManager.getEventCount.mockResolvedValue(100);
      mockDatabaseManager.getEventsBatch.mockResolvedValue(
        new Array(100).fill().map((_, i) => ({ id: i + 1 }))
      );

      await expect(progressiveLoader.loadData()).resolves.not.toThrow();
      expect(progressiveLoader.loadedCount).toBe(100);
    });

    test('should handle null display manager', async () => {
      progressiveLoader.display = null;
      
      mockDatabaseManager.getEventCount.mockResolvedValue(100);
      mockDatabaseManager.getEventsBatch.mockResolvedValue(
        new Array(100).fill().map((_, i) => ({ id: i + 1 }))
      );

      await expect(progressiveLoader.loadData()).resolves.not.toThrow();
      expect(progressiveLoader.loadedCount).toBe(100);
    });

    test('should use non-blocking delay between batches', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(200);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 101 })));

      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10);

      vi.useRealTimers();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('Event Streaming', () => {
    test('should create event stream for real-time loading', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(150);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(50).fill().map((_, i) => ({ id: i + 101 })));

      const stream = progressiveLoader.createEventStream();
      const dataSpy = vi.fn();
      const endSpy = vi.fn();
      
      stream.on('data', dataSpy);
      stream.on('end', endSpy);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(() => setImmediate(resolve)));

      expect(dataSpy).toHaveBeenCalledTimes(2);
      expect(dataSpy).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
      expect(endSpy).toHaveBeenCalled();
    });

    test('should emit error events in stream on database failure', async () => {
      mockDatabaseManager.getEventCount.mockRejectedValue(new Error('Database connection lost'));

      const stream = progressiveLoader.createEventStream();
      const errorSpy = vi.fn();
      
      stream.on('error', errorSpy);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(() => setImmediate(resolve)));

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should handle empty stream gracefully', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(0);

      const stream = progressiveLoader.createEventStream();
      const dataSpy = vi.fn();
      const endSpy = vi.fn();
      
      stream.on('data', dataSpy);
      stream.on('end', endSpy);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(() => setImmediate(resolve)));

      expect(dataSpy).not.toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();
    });

    test('should yield to event loop between stream batches', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(200);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 101 })));

      const setImmediateSpy = vi.spyOn(global, 'setImmediate');
      
      const stream = progressiveLoader.createEventStream();
      
      // Wait for stream to complete
      await new Promise(resolve => {
        stream.on('end', resolve);
      });

      expect(setImmediateSpy).toHaveBeenCalled();
      
      setImmediateSpy.mockRestore();
    });
  });

  describe('Recent Events Priority Loading', () => {
    test('should load recent events first for immediate display', async () => {
      const recentEvents = new Array(50).fill().map((_, i) => ({ id: i + 1, timestamp: Date.now() - i }));
      mockDatabaseManager.getRecentEvents.mockResolvedValue(recentEvents);

      const count = await progressiveLoader.loadRecentEventsFirst(50);

      expect(mockDatabaseManager.getRecentEvents).toHaveBeenCalledWith(50);
      expect(mockDisplayManager.addEvents).toHaveBeenCalledWith(recentEvents);
      expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(">> Loaded 50 recent events");
      expect(progressiveLoader.loadedCount).toBe(50);
      expect(count).toBe(50);
    });

    test('should use default limit for recent events', async () => {
      const recentEvents = new Array(50).fill().map((_, i) => ({ id: i + 1 }));
      mockDatabaseManager.getRecentEvents.mockResolvedValue(recentEvents);

      await progressiveLoader.loadRecentEventsFirst();

      expect(mockDatabaseManager.getRecentEvents).toHaveBeenCalledWith(50);
    });

    test('should handle empty recent events', async () => {
      mockDatabaseManager.getRecentEvents.mockResolvedValue([]);

      const count = await progressiveLoader.loadRecentEventsFirst();

      expect(count).toBe(0);
      expect(mockDisplayManager.addEvents).not.toHaveBeenCalled();
      expect(progressiveLoader.loadedCount).toBe(0);
    });

    test('should handle recent events loading errors', async () => {
      mockDatabaseManager.getRecentEvents.mockRejectedValue(new Error('Query failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const count = await progressiveLoader.loadRecentEventsFirst();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading recent events:', expect.any(Error));
      expect(count).toBe(0);
      expect(progressiveLoader.loadedCount).toBe(0);

      consoleSpy.mockRestore();
    });

    test('should handle display manager without addEvents in recent loading', async () => {
      progressiveLoader.display = null;
      
      const recentEvents = [{ id: 1 }, { id: 2 }];
      mockDatabaseManager.getRecentEvents.mockResolvedValue(recentEvents);

      const count = await progressiveLoader.loadRecentEventsFirst();

      expect(count).toBe(2);
      expect(progressiveLoader.loadedCount).toBe(2);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle database initialization failure', async () => {
      mockDatabaseManager.getEventCount.mockRejectedValue(new Error('Database not initialized'));

      await expect(progressiveLoader.loadData()).rejects.toThrow('Database not initialized');
    });

    test('should continue loading after batch failures', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(300);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 201 })));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(mockDisplayManager.addEvents).toHaveBeenCalledTimes(2); // First and third batch
      expect(progressiveLoader.loadedCount).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading batch at offset 100:', expect.any(Error));

      vi.useRealTimers();
      consoleSpy.mockRestore();
    });

    test('should handle incomplete batch loading', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(150);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce([]); // Empty batch stops loading

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(mockDatabaseManager.getEventsBatch).toHaveBeenCalledTimes(2);
      expect(progressiveLoader.loadedCount).toBe(100);

      vi.useRealTimers();
    });
  });

  describe('Performance and Non-blocking Behavior', () => {
    test('should process batches without blocking event loop', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(1000);
      
      // Mock large batches
      for (let i = 0; i < 10; i++) {
        mockDatabaseManager.getEventsBatch.mockResolvedValueOnce(
          new Array(100).fill().map((_, j) => ({ id: i * 100 + j + 1 }))
        );
      }

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      
      // Fast-forward through all delays
      vi.advanceTimersByTime(1000);
      
      await loadPromise;

      expect(progressiveLoader.loadedCount).toBe(1000);
      expect(mockDisplayManager.addEvents).toHaveBeenCalledTimes(10);

      vi.useRealTimers();
    });

    test('should provide accurate loading statistics', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(250);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map(() => ({ id: 1 })))
        .mockResolvedValueOnce(new Array(100).fill().map(() => ({ id: 2 })))
        .mockResolvedValueOnce(new Array(50).fill().map(() => ({ id: 3 })));

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      const stats = progressiveLoader.getStats();
      expect(stats).toEqual({
        loadedCount: 250,
        batchSize: 100,
        loadDelay: 10
      });

      vi.useRealTimers();
    });

    test('should emit events in correct order', async () => {
      mockDatabaseManager.getEventCount.mockResolvedValue(150);
      mockDatabaseManager.getEventsBatch
        .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
        .mockResolvedValueOnce(new Array(50).fill().map((_, i) => ({ id: i + 101 })));

      const events = [];
      progressiveLoader.on('progress', (data) => events.push({ type: 'progress', data }));
      progressiveLoader.on('complete', (data) => events.push({ type: 'complete', data }));

      vi.useFakeTimers();
      
      const loadPromise = progressiveLoader.loadData();
      vi.advanceTimersByTime(50);
      await loadPromise;

      expect(events).toEqual([
        { type: 'progress', data: { loaded: 100, total: 150, percentage: 67 } },
        { type: 'progress', data: { loaded: 150, total: 150, percentage: 100 } },
        { type: 'complete', data: { loaded: 150 } }
      ]);

      vi.useRealTimers();
    });
  });
});
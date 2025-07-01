/**
 * Progressive Loader - Recent Events Priority Loading Tests
 * Tests for immediate loading of recent events for better UX
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createMockSetup } from '../mocks/testMocks.js';

const ProgressiveLoader = require('../../../dist/src/ui/progressive-loader');

describe('Progressive Loader - Recent Events Priority Loading', () => {
  let progressiveLoader;
  let mockDatabaseManager;
  let mockDisplayManager;
  let mockStatusDisplay;

  beforeEach(() => {
    const mockSetup = createMockSetup();
    mockDatabaseManager = mockSetup.mockDatabaseManager;
    mockDisplayManager = mockSetup.mockDisplayManager;
    mockStatusDisplay = mockSetup.mockStatusDisplay;

    progressiveLoader = new ProgressiveLoader(
      mockDatabaseManager,
      mockDisplayManager,
      mockStatusDisplay
    );
  });

  test('should load recent events first for immediate display', async () => {
    const recentEvents = new Array(50).fill().map((_, i) => ({ 
      id: i + 1, 
      timestamp: Date.now() - i 
    }));
    mockDatabaseManager.getRecentEvents.mockResolvedValue(recentEvents);

    const result = await progressiveLoader.loadRecentEvents(50);

    expect(mockDatabaseManager.getRecentEvents).toHaveBeenCalledWith(50);
    expect(mockDisplayManager.addEvents).toHaveBeenCalledWith(recentEvents);
    expect(result).toEqual(recentEvents);
    expect(progressiveLoader.lastLoadedEventId).toBe(50);
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
  });

  test('should handle recent events loading errors', async () => {
    mockDatabaseManager.getRecentEvents.mockRejectedValue(new Error('Query failed'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const count = await progressiveLoader.loadRecentEventsFirst();

    expect(consoleSpy).toHaveBeenCalledWith('Error loading recent events:', expect.any(Error));
    expect(count).toBe(0);

    consoleSpy.mockRestore();
  });

  test('should handle display manager without addEvents in recent loading', async () => {
    progressiveLoader.display = null;
    
    const recentEvents = [{ id: 1 }, { id: 2 }];
    mockDatabaseManager.getRecentEvents.mockResolvedValue(recentEvents);

    const count = await progressiveLoader.loadRecentEventsFirst();

    expect(count).toBe(2);
  });
});
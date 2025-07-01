/**
 * Progressive Loader - Data Loading Tests
 * Tests for FUNC-206 progressive data loading functionality
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createMockSetup } from '../mocks/testMocks.js';

const ProgressiveLoader = require('../../../dist/src/ui/progressive-loader');

describe('Progressive Loader - FUNC-206: Progressive Data Loading', () => {
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

    await progressiveLoader.loadData();

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
    expect(completeSpy).toHaveBeenCalledWith({ loadedCount: 150 });
  });

  test('should update status messages with progress', async () => {
    mockDatabaseManager.getEventCount.mockResolvedValue(200);
    mockDatabaseManager.getEventsBatch
      .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
      .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 101 })));

    await progressiveLoader.loadData();

    expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(
      ">> Loading existing events... (100/200 - 50%)"
    );
    expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(
      ">> Loading existing events... (200/200 - 100%)"
    );
    expect(mockStatusDisplay.updateMessage).toHaveBeenCalledWith(">> Loaded 200 events");
  });
});
/**
 * Progressive Loader - Error Handling Tests
 * Tests for error scenarios and edge cases
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createMockSetup } from '../mocks/testMocks.js';

const ProgressiveLoader = require('../../../dist/src/ui/progressive-loader');

describe('Progressive Loader - Error Handling', () => {
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

  test('should handle database errors during batch loading', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockDatabaseManager.getEventCount.mockResolvedValue(200);
    mockDatabaseManager.getEventsBatch
      .mockResolvedValueOnce(new Array(100).fill().map((_, i) => ({ id: i + 1 })))
      .mockRejectedValueOnce(new Error('Database timeout'));

    await progressiveLoader.loadData();

    expect(consoleSpy).toHaveBeenCalledWith('Error loading batch at offset 100:', expect.any(Error));
    expect(mockDisplayManager.addEvents).toHaveBeenCalledTimes(1); // Only first batch succeeded
    expect(progressiveLoader.loadedCount).toBe(100);

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
});
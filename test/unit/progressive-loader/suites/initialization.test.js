/**
 * Progressive Loader - Initialization Tests
 * Tests for basic initialization and configuration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { createMockSetup } from '../mocks/testMocks.js';

const ProgressiveLoader = require('../../../dist/src/ui/progressive-loader');

describe('Progressive Loader - Initialization and Configuration', () => {
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
      lastLoadedEventId: 0
    });
  });
});
/**
 * Progressive Loader - Event Streaming Tests
 * Tests for real-time event streaming functionality
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createMockSetup } from '../mocks/testMocks.js';

const ProgressiveLoader = require('../../../dist/src/ui/progressive-loader');

describe('Progressive Loader - Event Streaming', () => {
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
});
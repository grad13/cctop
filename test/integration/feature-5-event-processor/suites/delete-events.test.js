/**
 * Feature 5 Event Processor - Delete Events Tests
 * Tests for file deletion detection and processing
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const Feature5TestSetup = require('../helpers/TestSetup');

describe('Feature 5 Event Processor - Delete Events', () => {
  let testSetup;

  beforeEach(async () => {
    testSetup = new Feature5TestSetup();
    await testSetup.setUp();
  });

  afterEach(async () => {
    await testSetup.tearDown();
  });

  test('Should process delete events and record to database', async () => {
    // Create file beforehand
    const testFile = await testSetup.createTestFile('delete-test.txt', 'Content to be deleted');

    const fileMonitor = testSetup.createFileMonitor();
    
    // Connect file monitoring events to Event Processor
    fileMonitor.on('fileEvent', async (event) => {
      if (testSetup.eventProcessor) {
        await testSetup.eventProcessor.processFileEvent(event);
      }
    });
    
    fileMonitor.on('ready', () => {
      if (testSetup.eventProcessor) {
        testSetup.eventProcessor.onInitialScanComplete();
      }
    });

    fileMonitor.start();
    
    // Wait for initial scan completion
    await testSetup.waitForReady(fileMonitor);

    // Delete file
    fs.unlinkSync(testFile);

    // Wait for delete event processing completion
    await new Promise((resolve) => {
      const handler = (result) => {
        if (result.eventType === 'delete' && result.original.path === path.resolve(testFile)) {
          testSetup.eventProcessor.off('eventProcessed', handler);
          resolve(result);
        }
      };
      testSetup.eventProcessor.on('eventProcessed', handler);
      
      // Set timeout (5 seconds)
      setTimeout(() => {
        testSetup.eventProcessor.off('eventProcessed', handler);
        resolve(null); // Allow test to continue even if event not captured
      }, 5000);
    });

    // Verify delete event was recorded in database
    const events = await testSetup.dbManager.getRecentEvents(10);
    const deleteEvent = events.find(e => e.event_type === 'delete' && e.file_name === 'delete-test.txt');
    
    expect(deleteEvent).toBeDefined();
    expect(deleteEvent.file_path).toBe(path.resolve(testFile));
    expect(deleteEvent.timestamp).toBeDefined();
    expect(typeof deleteEvent.timestamp).toBe('number');
  });

  test('Should handle deletion of non-existent files gracefully', async () => {
    const fileMonitor = testSetup.createFileMonitor();
    
    fileMonitor.on('fileEvent', async (event) => {
      await testSetup.eventProcessor.processFileEvent(event);
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    // Try to trigger delete event for non-existent file
    const nonExistentFile = path.join(testSetup.testDir, 'non-existent.txt');
    
    // This should not throw an error
    await expect(async () => {
      // Simulate a delete event that might come from the file monitor
      const mockDeleteEvent = {
        type: 'delete',
        path: nonExistentFile
      };
      await testSetup.eventProcessor.processFileEvent(mockDeleteEvent);
    }).not.toThrow();
  });
});
/**
 * Feature 5 Event Processor - Modify Events Tests
 * Tests for file modification detection and processing
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const Feature5TestSetup = require('../helpers/TestSetup');

describe('Feature 5 Event Processor - Modify Events', () => {
  let testSetup;

  beforeEach(async () => {
    testSetup = new Feature5TestSetup();
    await testSetup.setUp();
  });

  afterEach(async () => {
    await testSetup.tearDown();
  });

  test('Should process modify events and record to database', async () => {
    // Create file beforehand
    const testFile = await testSetup.createTestFile('modify-test.txt', 'Initial content');

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

    // Set up modify event processing completion wait
    const modifyEventPromise = new Promise((resolve, reject) => {
      const handler = (result) => {
        if (result.eventType === 'modify' && result.original.path === path.resolve(testFile)) {
          if (testSetup.eventProcessor) {
            testSetup.eventProcessor.off('eventProcessed', handler);
          }
          resolve(result);
        }
      };
      testSetup.eventProcessor.on('eventProcessed', handler);
      
      // Set timeout (8 seconds)
      setTimeout(() => {
        if (testSetup.eventProcessor) {
          testSetup.eventProcessor.off('eventProcessed', handler);
        }
        reject(new Error('Modify event timeout'));
      }, 8000);
    });

    // Modify file
    fs.writeFileSync(testFile, 'Modified content - much longer');

    // Wait for modify event processing completion
    await modifyEventPromise;

    // Verify modify event was recorded in database
    const events = await testSetup.dbManager.getRecentEvents(10);
    const modifyEvent = events.find(e => e.event_type === 'modify' && e.file_name === 'modify-test.txt');
    
    expect(modifyEvent).toBeDefined();
    expect(modifyEvent.file_path).toBe(path.resolve(testFile));
    expect(modifyEvent.file_size).toBeGreaterThan(15); // "Modified content - much longer"
    expect(modifyEvent.line_count).toBe(1);
    expect(modifyEvent.block_count).toBeDefined();
    expect(modifyEvent.timestamp).toBeDefined();
    expect(typeof modifyEvent.timestamp).toBe('number');
  });

  test('Should handle multiple file modifications', async () => {
    // Create multiple test files
    const testFile1 = await testSetup.createTestFile('modify1.txt', 'Content 1');
    const testFile2 = await testSetup.createTestFile('modify2.txt', 'Content 2');

    const fileMonitor = testSetup.createFileMonitor();
    
    fileMonitor.on('fileEvent', async (event) => {
      await testSetup.eventProcessor.processFileEvent(event);
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    // Modify both files
    fs.writeFileSync(testFile1, 'Modified content 1');
    fs.writeFileSync(testFile2, 'Modified content 2');

    const events = await testSetup.waitAndGetEvents(2000);
    const modifyEvents = events.filter(e => e.event_type === 'modify');
    
    expect(modifyEvents.length).toBeGreaterThanOrEqual(2);
    
    const modify1 = modifyEvents.find(e => e.file_name === 'modify1.txt');
    const modify2 = modifyEvents.find(e => e.file_name === 'modify2.txt');
    
    expect(modify1).toBeDefined();
    expect(modify2).toBeDefined();
  }, 15000);
});
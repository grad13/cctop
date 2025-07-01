/**
 * Feature 5 Event Processor - Find Events Tests
 * Tests for initial file discovery and scanning functionality
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const Feature5TestSetup = require('../helpers/TestSetup');

describe('Feature 5 Event Processor - Find Events', () => {
  let testSetup;

  beforeEach(async () => {
    testSetup = new Feature5TestSetup();
    await testSetup.setUp();
  });

  afterEach(async () => {
    await testSetup.tearDown();
  });

  test('Should process find events and record to database', async () => {
    // Create file beforehand
    const testFile = await testSetup.createTestFile('scan-test.txt', 'Test content for scanning');
    
    const fileMonitor = testSetup.createFileMonitor();
    
    let processedScanEvents = [];
    
    // Connect file monitoring events to Event Processor
    fileMonitor.on('fileEvent', async (event) => {
      if (testSetup.eventProcessor) {
        await testSetup.eventProcessor.processFileEvent(event);
      }
    });
    
    // Monitor find event processing
    testSetup.eventProcessor.on('eventProcessed', (result) => {
      if (result.eventType === 'find') {
        processedScanEvents.push(result);
      }
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    
    // Wait for initial scan completion
    await testSetup.waitForReady(fileMonitor);

    // Wait for event processing completion
    const events = await testSetup.waitAndGetEvents(100);
    
    expect(events.length).toBeGreaterThanOrEqual(1);
    
    const findEvent = events.find(e => e.event_type === 'find' && e.file_name === 'scan-test.txt');
    expect(findEvent).toBeDefined();
    expect(findEvent.file_path).toBe(path.resolve(testFile));
    expect(findEvent.file_size).toBeGreaterThan(0);
    expect(findEvent.line_count).toBe(1);
    expect(findEvent.block_count).toBeDefined();
    expect(findEvent.timestamp).toBeDefined();
    expect(typeof findEvent.timestamp).toBe('number');
  });

  test('Should handle multiple files during initial scan', async () => {
    // Create multiple test files
    await testSetup.createTestFile('file1.txt', 'Content 1');
    await testSetup.createTestFile('file2.txt', 'Content 2\nLine 2');
    await testSetup.createTestFile('file3.js', 'console.log("test");');

    const fileMonitor = testSetup.createFileMonitor();
    
    fileMonitor.on('fileEvent', async (event) => {
      await testSetup.eventProcessor.processFileEvent(event);
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    const events = await testSetup.waitAndGetEvents(200);
    const findEvents = events.filter(e => e.event_type === 'find');
    
    expect(findEvents.length).toBeGreaterThanOrEqual(3);
    
    const fileNames = findEvents.map(e => e.file_name).sort();
    expect(fileNames).toContain('file1.txt');
    expect(fileNames).toContain('file2.txt');
    expect(fileNames).toContain('file3.js');
  });
});
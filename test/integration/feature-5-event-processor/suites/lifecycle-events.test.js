/**
 * Feature 5 Event Processor - File Lifecycle Events Tests
 * Tests for complete file lifecycle: create → modify → delete
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const Feature5TestSetup = require('../helpers/TestSetup');

describe('Feature 5 Event Processor - File Lifecycle Events', () => {
  let testSetup;

  beforeEach(async () => {
    testSetup = new Feature5TestSetup();
    await testSetup.setUp();
  });

  afterEach(async () => {
    await testSetup.tearDown();
  });

  test('Should handle complete file lifecycle: create → modify → delete', async () => {
    const fileMonitor = testSetup.createFileMonitor();
    
    let processedEvents = [];
    
    // Connect file monitoring events to Event Processor
    fileMonitor.on('fileEvent', async (event) => {
      const result = await testSetup.eventProcessor.processFileEvent(event);
      if (result) {
        processedEvents.push(result);
      }
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    const testFile = path.join(testSetup.testDir, 'lifecycle-test.txt');

    // Step 1: Create file
    fs.writeFileSync(testFile, 'Initial content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Modify file
    fs.writeFileSync(testFile, 'Modified content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Delete file
    fs.unlinkSync(testFile);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Filter events for this specific file
    const fileEvents = processedEvents.filter(e => 
      e.original && e.original.path === path.resolve(testFile)
    );

    expect(fileEvents.length).toBeGreaterThanOrEqual(3);

    // Sort by timestamp
    fileEvents.sort((a, b) => a.timestamp - b.timestamp);

    expect(fileEvents[0].eventType).toBe('create');
    expect(fileEvents[1].eventType).toBe('modify');
    expect(fileEvents[2].eventType).toBe('delete');

    // Verify timestamp ordering
    expect(fileEvents[0].timestamp).toBeLessThanOrEqual(fileEvents[1].timestamp);
    expect(fileEvents[1].timestamp).toBeLessThanOrEqual(fileEvents[2].timestamp);

    // Verify database records
    const events = await testSetup.dbManager.getRecentEvents(50);
    const lifecycleEvents = events.filter(e => e.file_name === 'lifecycle-test.txt')
                                 .sort((a, b) => a.timestamp - b.timestamp);
    
    expect(lifecycleEvents.length).toBe(3);
    expect(lifecycleEvents[0].event_type).toBe('create');
    expect(lifecycleEvents[1].event_type).toBe('modify');
    expect(lifecycleEvents[2].event_type).toBe('delete');
  });

  test('Should distinguish find from create events in database', async () => {
    // Create existing file before monitoring
    const existingFile = await testSetup.createTestFile('existing.txt', 'Existing content');
    
    const fileMonitor = testSetup.createFileMonitor();
    
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
    await testSetup.waitForReady(fileMonitor);

    // Create new file during monitoring
    const newFile = path.join(testSetup.testDir, 'new.txt');
    fs.writeFileSync(newFile, 'New content');
    
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify database events
    const events = await testSetup.dbManager.getRecentEvents(50);
    
    // Debug output if needed
    if (process.env.DEBUG_TEST) {
      console.log('All events:', events.map(e => ({ 
        file_name: e.file_name, 
        event_type: e.event_type,
        timestamp: e.timestamp 
      })));
    }
    
    // Get events for existing file (should be 'find')
    const existingEvents = events.filter(e => e.file_name === 'existing.txt')
                                .sort((a, b) => a.timestamp - b.timestamp);
    const newEvent = events.find(e => e.file_name === 'new.txt');
    
    expect(existingEvents.length).toBeGreaterThan(0);
    expect(existingEvents[0].event_type).toBe('find'); // First event should be 'find'
    expect(newEvent).toBeDefined();
    expect(newEvent.event_type).toBe('create');
  });
});
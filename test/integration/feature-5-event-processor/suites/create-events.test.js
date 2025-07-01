/**
 * Feature 5 Event Processor - Create Events Tests
 * Tests for file creation detection and processing
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const Feature5TestSetup = require('../helpers/TestSetup');

describe('Feature 5 Event Processor - Create Events', () => {
  let testSetup;

  beforeEach(async () => {
    testSetup = new Feature5TestSetup();
    await testSetup.setUp();
  });

  afterEach(async () => {
    await testSetup.tearDown();
  });

  test('Should process create events and record to database', async () => {
    const fileMonitor = testSetup.createFileMonitor();
    
    let processedEvents = [];
    
    // Connect file monitoring events to Event Processor
    fileMonitor.on('fileEvent', async (event) => {
      const result = await testSetup.eventProcessor.processFileEvent(event);
      if (result) {
        processedEvents.push(result);
      }
    });
    
    // Monitor processing completion events
    testSetup.eventProcessor.on('eventProcessed', (result) => {
      // Add only if not already added
      if (!processedEvents.some(p => p.recorded.id === result.recorded.id)) {
        processedEvents.push(result);
      }
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    
    // Wait for initial scan completion
    await testSetup.waitForReady(fileMonitor);

    // Create file after monitoring starts
    const newFile = path.join(testSetup.testDir, 'create-test.txt');
    fs.writeFileSync(newFile, 'New file content');

    // Wait for file monitoring event to occur
    const events = await testSetup.waitAndGetEvents(1000);
    
    // Check for processed events
    const createResult = processedEvents.find(
      result => result.eventType === 'create' && 
                result.original.path === path.resolve(newFile)
    );
    
    expect(createResult).toBeDefined();

    // Verify create event was recorded in database
    const createEvent = events.find(e => e.event_type === 'create' && e.file_name === 'create-test.txt');
    
    expect(createEvent).toBeDefined();
    expect(createEvent.file_path).toBe(path.resolve(newFile));
    expect(createEvent.file_size).toBeGreaterThan(0);
    expect(createEvent.line_count).toBe(1);
    expect(createEvent.block_count).toBeDefined();
    expect(createEvent.timestamp).toBeDefined();
    expect(typeof createEvent.timestamp).toBe('number');
  }, 12000); // 12 second timeout

  test('Should handle rapid file creation', async () => {
    const fileMonitor = testSetup.createFileMonitor();
    
    fileMonitor.on('fileEvent', async (event) => {
      await testSetup.eventProcessor.processFileEvent(event);
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    // Create multiple files in rapid succession
    const fileNames = ['rapid1.txt', 'rapid2.txt', 'rapid3.txt'];
    for (const fileName of fileNames) {
      const filePath = path.join(testSetup.testDir, fileName);
      fs.writeFileSync(filePath, `Content for ${fileName}`);
    }

    const events = await testSetup.waitAndGetEvents(1500);
    const createEvents = events.filter(e => e.event_type === 'create');
    
    expect(createEvents.length).toBeGreaterThanOrEqual(fileNames.length);
    
    for (const fileName of fileNames) {
      const createEvent = createEvents.find(e => e.file_name === fileName);
      expect(createEvent).toBeDefined();
    }
  }, 15000);
});
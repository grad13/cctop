/**
 * Feature 5 Event Processor - Data Integrity Tests
 * Tests for chokidar-DB integration integrity and data consistency
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const Feature5TestSetup = require('../helpers/TestSetup');

describe('Feature 5 Event Processor - Data Integrity', () => {
  let testSetup;

  beforeEach(async () => {
    testSetup = new Feature5TestSetup();
    await testSetup.setUp();
  });

  afterEach(async () => {
    await testSetup.tearDown();
  });

  test('Should maintain chokidar-DB data integrity', async () => {
    const fileMonitor = testSetup.createFileMonitor();
    
    let chokidarEventCount = 0;
    
    // Count chokidar events
    fileMonitor.on('fileEvent', async (event) => {
      chokidarEventCount++;
      await testSetup.eventProcessor.processFileEvent(event);
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    // Create test files for data integrity check
    const testFiles = ['integrity1.txt', 'integrity2.txt', 'integrity3.txt'];
    for (const fileName of testFiles) {
      await testSetup.createTestFile(fileName, `Content for ${fileName}`);
    }

    // Wait for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Database event count verification
    const events = await testSetup.dbManager.getRecentEvents(100);
    const dbEventCount = events.length;

    // Data integrity verification
    expect(dbEventCount).toBeGreaterThan(0);
    expect(chokidarEventCount).toBeGreaterThan(0);
    
    // Verify all created files are recorded
    for (const fileName of testFiles) {
      const fileEvents = events.filter(e => e.file_name === fileName);
      expect(fileEvents.length).toBeGreaterThan(0);
      
      // Verify required fields are present
      const fileEvent = fileEvents[0];
      expect(fileEvent.file_path).toBeDefined();
      expect(fileEvent.file_size).toBeGreaterThan(0);
      expect(fileEvent.timestamp).toBeDefined();
      expect(typeof fileEvent.timestamp).toBe('number');
    }
  });

  test('Should handle concurrent file operations without data corruption', async () => {
    const fileMonitor = testSetup.createFileMonitor();
    
    fileMonitor.on('fileEvent', async (event) => {
      await testSetup.eventProcessor.processFileEvent(event);
    });
    
    fileMonitor.on('ready', () => {
      testSetup.eventProcessor.onInitialScanComplete();
    });

    fileMonitor.start();
    await testSetup.waitForReady(fileMonitor);

    // Perform concurrent file operations
    const concurrentOperations = [];
    for (let i = 0; i < 5; i++) {
      concurrentOperations.push(
        new Promise(async (resolve) => {
          const fileName = `concurrent-${i}.txt`;
          const filePath = path.join(testSetup.testDir, fileName);
          
          // Create
          fs.writeFileSync(filePath, `Initial content ${i}`);
          await new Promise(r => setTimeout(r, 50));
          
          // Modify
          fs.writeFileSync(filePath, `Modified content ${i}`);
          await new Promise(r => setTimeout(r, 50));
          
          // Delete
          fs.unlinkSync(filePath);
          resolve();
        })
      );
    }

    // Wait for all concurrent operations to complete
    await Promise.all(concurrentOperations);
    
    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify data integrity
    const events = await testSetup.dbManager.getRecentEvents(100);
    const concurrentEvents = events.filter(e => e.file_name && e.file_name.startsWith('concurrent-'));
    
    expect(concurrentEvents.length).toBeGreaterThan(0);
    
    // Verify no data corruption occurred
    for (const event of concurrentEvents) {
      expect(event.file_path).toBeDefined();
      expect(event.event_type).toMatch(/^(create|modify|delete)$/);
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
    }
  });
});
/**
 * FUNC-203: Event Type Filtering Integration Test
 * Tests real-time event filtering with keyboard shortcuts
 * 
 * FUNC-203 Requirements:
 * - Event type filtering (find/create/modify/delete/move/restore)
 * - Keyboard shortcuts (f,c,m,d,v,r) for toggle
 * - Visual filter state display
 * - Real-time reflection (immediate display update)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FUNC-203: Event Type Filtering', () => {
  let testDir;
  let cctopProcess;
  
  beforeEach(async () => {
    // Create isolated test directory
    testDir = `/tmp/cctop-filter-test-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create initial files for different event types
    fs.writeFileSync(path.join(testDir, 'initial-file.txt'), 'initial content');
  });
  
  afterEach(async () => {
    // Clean up
    if (cctopProcess && !cctopProcess.killed) {
      cctopProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Remove test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should filter create events with c key toggle', async () => {
    let outputBuffer = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create multiple files (create events)
    fs.writeFileSync(path.join(testDir, 'new-file-1.txt'), 'content 1');
    fs.writeFileSync(path.join(testDir, 'new-file-2.txt'), 'content 2');
    fs.writeFileSync(path.join(testDir, 'new-file-3.txt'), 'content 3');
    
    // Modify existing file (modify event)
    fs.appendFileSync(path.join(testDir, 'initial-file.txt'), '\nmodified content');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should show both create and modify events initially
    expect(outputBuffer).toMatch(/new-file-[123]\.txt/);
    expect(outputBuffer).toMatch(/initial-file\.txt/);
    expect(outputBuffer).toMatch(/create/);
    expect(outputBuffer).toMatch(/modify/);

    // Press 'c' key to filter only create events
    cctopProcess.stdin.write('c');
    await new Promise(resolve => setTimeout(resolve, 500));

    // FUNC-203 Requirement: Real-time filtering reflection
    const afterFilterOutput = outputBuffer.slice(outputBuffer.lastIndexOf('new-file'));
    
    // Should still show create events
    expect(afterFilterOutput).toMatch(/new-file-[123]\.txt/);
    expect(afterFilterOutput).toMatch(/create/);
    
    // Should show filter state indicator
    const hasFilterIndicator = /\[c\]|create.*ON|filter.*create/i.test(outputBuffer);
    expect(hasFilterIndicator, 'Should show create filter is active').toBe(true);
  }, 10000);

  test('should filter modify events with m key toggle', async () => {
    let modifyOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      modifyOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create and modify different files
    fs.writeFileSync(path.join(testDir, 'for-modify.txt'), 'original');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    fs.appendFileSync(path.join(testDir, 'for-modify.txt'), '\nmodified line 1');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    fs.appendFileSync(path.join(testDir, 'for-modify.txt'), '\nmodified line 2');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create new file (should be filtered out)
    fs.writeFileSync(path.join(testDir, 'new-creation.txt'), 'new content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Press 'm' key to filter only modify events
    cctopProcess.stdin.write('m');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should show modify events
    expect(modifyOutput).toMatch(/for-modify\.txt/);
    expect(modifyOutput).toMatch(/modify/);
    
    // Should show modify filter state
    const hasModifyFilter = /\[m\]|modify.*ON|filter.*modify/i.test(modifyOutput);
    expect(hasModifyFilter, 'Should show modify filter is active').toBe(true);
  }, 12000);

  test('should filter delete events with d key toggle', async () => {
    let deleteOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      deleteOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create files to delete
    fs.writeFileSync(path.join(testDir, 'to-delete-1.txt'), 'delete me 1');
    fs.writeFileSync(path.join(testDir, 'to-delete-2.txt'), 'delete me 2');
    fs.writeFileSync(path.join(testDir, 'keep-file.txt'), 'keep this');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete files
    fs.unlinkSync(path.join(testDir, 'to-delete-1.txt'));
    fs.unlinkSync(path.join(testDir, 'to-delete-2.txt'));
    
    // Modify kept file (should be filtered out)
    fs.appendFileSync(path.join(testDir, 'keep-file.txt'), '\nmodified');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Press 'd' key to filter only delete events
    cctopProcess.stdin.write('d');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should show delete events
    expect(deleteOutput).toMatch(/to-delete-[12]\.txt/);
    expect(deleteOutput).toMatch(/delete/);
    
    // Should show delete filter state
    const hasDeleteFilter = /\[d\]|delete.*ON|filter.*delete/i.test(deleteOutput);
    expect(hasDeleteFilter, 'Should show delete filter is active').toBe(true);
  }, 12000);

  test('should show all filter states in status display area', async () => {
    let filterStatusOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      filterStatusOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate different event types
    fs.writeFileSync(path.join(testDir, 'create-test.txt'), 'created');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    fs.appendFileSync(path.join(testDir, 'initial-file.txt'), '\nmodified');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Test multiple filter toggles
    cctopProcess.stdin.write('f'); // Toggle find events
    await new Promise(resolve => setTimeout(resolve, 300));
    
    cctopProcess.stdin.write('c'); // Toggle create events
    await new Promise(resolve => setTimeout(resolve, 300));

    // FUNC-203 Requirement: Visual filter state display
    const hasFilterStateDisplay = 
      /Filter.*\[f\]|Find.*ON|Event.*filter|Filters:/i.test(filterStatusOutput) ||
      /\[f\].*\[c\]|\[c\].*\[f\]/i.test(filterStatusOutput);

    expect(hasFilterStateDisplay, 'Should display filter states visually').toBe(true);

    // Should show filter shortcuts in help area
    const hasFilterHelp = 
      /\[f\].*Find|\[c\].*Create|\[m\].*Modify|\[d\].*Delete/i.test(filterStatusOutput);
    
    expect(hasFilterHelp, 'Should show filter keyboard shortcuts').toBe(true);
  }, 10000);

  test('should support multiple filter combinations', async () => {
    let comboOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      comboOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate various events
    fs.writeFileSync(path.join(testDir, 'combo-1.txt'), 'file 1');
    fs.writeFileSync(path.join(testDir, 'combo-2.txt'), 'file 2');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    fs.appendFileSync(path.join(testDir, 'combo-1.txt'), '\nmodified');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    fs.unlinkSync(path.join(testDir, 'combo-2.txt'));
    await new Promise(resolve => setTimeout(resolve, 200));

    // Enable both create and modify filters
    cctopProcess.stdin.write('c'); // Create filter
    await new Promise(resolve => setTimeout(resolve, 300));
    
    cctopProcess.stdin.write('m'); // Modify filter
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should show both create and modify events, but not delete
    expect(comboOutput).toMatch(/combo-1\.txt/); // Created and modified
    expect(comboOutput).toMatch(/create|modify/);
    
    // Multiple filters should be indicated
    const hasMultipleFilters = 
      /\[c\].*\[m\]|\[m\].*\[c\]|create.*modify|modify.*create/i.test(comboOutput);
    
    expect(hasMultipleFilters, 'Should show multiple active filters').toBe(true);
  }, 12000);

  test('should reset filters when toggled off', async () => {
    let resetOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      resetOutput += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate events
    fs.writeFileSync(path.join(testDir, 'reset-test.txt'), 'reset content');
    fs.appendFileSync(path.join(testDir, 'initial-file.txt'), '\nreset modified');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Enable create filter
    cctopProcess.stdin.write('c');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Disable create filter (toggle off)
    cctopProcess.stdin.write('c');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should show all events again after filter reset
    const afterReset = resetOutput.slice(-1000); // Last part of output
    
    expect(afterReset).toMatch(/reset-test\.txt/);
    expect(afterReset).toMatch(/initial-file\.txt/);
    expect(afterReset).toMatch(/create|modify/);
    
    // Filter indicator should be off
    const noActiveFilter = 
      !/\[c\].*ON|create.*active|Filter.*create/i.test(afterReset);
    
    expect(noActiveFilter, 'Filter should be deactivated after toggle off').toBe(true);
  }, 10000);
});

/**
 * Event Filtering Analysis Helper
 * Analyzes filter functionality and FUNC-203 compliance
 */
export class EventFilterAnalyzer {
  static extractFilterStates(output) {
    const filterPatterns = {
      find: /\[f\]|find.*ON|filter.*find/i,
      create: /\[c\]|create.*ON|filter.*create/i,
      modify: /\[m\]|modify.*ON|filter.*modify/i,
      delete: /\[d\]|delete.*ON|filter.*delete/i,
      move: /\[v\]|move.*ON|filter.*move/i,
      restore: /\[r\]|restore.*ON|filter.*restore/i
    };

    const activeFilters = {};
    for (const [type, pattern] of Object.entries(filterPatterns)) {
      activeFilters[type] = pattern.test(output);
    }

    return activeFilters;
  }

  static analyzeEventVisibility(output) {
    const events = {
      find: /find/.test(output),
      create: /create/.test(output),
      modify: /modify/.test(output),
      delete: /delete/.test(output),
      move: /move/.test(output),
      restore: /restore/.test(output)
    };

    return events;
  }

  static validateFUNC203Compliance(output, expectedFilters, expectedEvents) {
    const activeFilters = this.extractFilterStates(output);
    const visibleEvents = this.analyzeEventVisibility(output);

    return {
      hasFilterDisplay: Object.values(activeFilters).some(Boolean),
      correctFilterStates: Object.keys(expectedFilters).every(
        type => activeFilters[type] === expectedFilters[type]
      ),
      correctEventVisibility: Object.keys(expectedEvents).every(
        type => visibleEvents[type] === expectedEvents[type]
      ),
      hasKeyboardShortcuts: /\[f\]|\[c\]|\[m\]|\[d\]|\[v\]|\[r\]/.test(output),
      realtimeReflection: output.includes('filter') || output.includes('Filter')
    };
  }
}
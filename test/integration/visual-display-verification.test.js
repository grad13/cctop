/**
 * Visual Display Verification Test
 * Tests actual screen output to prevent 90% blank screen bugs
 * 
 * This test should have caught the critical display bug where:
 * - Unit tests passed (125/125)
 * - But actual screen was 90% blank
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Visual Display System Integration', () => {
  let testDir;
  let cctopProcess;
  
  beforeEach(async () => {
    // Create isolated test directory
    testDir = `/tmp/cctop-visual-test-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create test files to generate events
    fs.writeFileSync(path.join(testDir, 'test1.txt'), 'initial content');
    fs.writeFileSync(path.join(testDir, 'test2.txt'), 'initial content');
  });
  
  afterEach(async () => {
    // Clean up
    if (cctopProcess && !cctopProcess.killed) {
      cctopProcess.kill('SIGTERM');
    }
    
    // Remove test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should display multiple events on screen (not 90% blank)', async () => {
    // Launch cctop in test directory
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let output = '';
    cctopProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Wait for initial startup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate multiple file events
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(testDir, `dynamic-${i}.txt`), `content ${i}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Modify existing files
    fs.appendFileSync(path.join(testDir, 'test1.txt'), '\nmodified content');
    fs.appendFileSync(path.join(testDir, 'test2.txt'), '\nmodified content');

    // Wait for events to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture final screen state
    const finalOutput = output;

    // Critical validations that would have caught the 90% blank bug
    
    // 1. Should show multiple events (not just 1)
    const eventLines = finalOutput.split('\n').filter(line => 
      line.includes('create') || line.includes('modify') || line.includes('delete')
    );
    expect(eventLines.length, 'Should display multiple events, not just 1').toBeGreaterThan(3);

    // 2. Should have content density (not 90% blank)
    const nonEmptyLines = finalOutput.split('\n').filter(line => line.trim().length > 0);
    const totalLines = finalOutput.split('\n').length;
    const contentRatio = nonEmptyLines.length / totalLines;
    expect(contentRatio, 'Screen should not be 90% blank').toBeGreaterThan(0.3);

    // 3. Should show file names from our test directory
    expect(finalOutput).toMatch(/dynamic-\d+\.txt/);
    expect(finalOutput).toMatch(/test[12]\.txt/);

    // 4. Should show event types
    expect(finalOutput).toMatch(/create|modify/);

    // 5. Should show header with columns
    expect(finalOutput).toMatch(/Event Timestamp.*Elapsed.*File Name.*Event/);

    // 6. Should show footer with statistics
    expect(finalOutput).toMatch(/Unique Files.*files/);
    expect(finalOutput).toMatch(/Monitor.*running/);
  }, 10000);

  test('should handle terminal resize without blank screen', async () => {
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', COLUMNS: '120', LINES: '30' }
    });

    let output = '';
    cctopProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate events
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(path.join(testDir, `resize-test-${i}.txt`), `content ${i}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Simulate terminal resize (send SIGWINCH)
    cctopProcess.kill('SIGWINCH');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate more events after resize
    for (let i = 3; i < 6; i++) {
      fs.writeFileSync(path.join(testDir, `post-resize-${i}.txt`), `content ${i}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalOutput = output;

    // After resize, should still show content (not blank)
    const eventLines = finalOutput.split('\n').filter(line => 
      line.includes('resize-test') || line.includes('post-resize')
    );
    expect(eventLines.length, 'Should show events before and after resize').toBeGreaterThan(4);

    // Should not be predominantly blank after resize
    const nonEmptyLines = finalOutput.split('\n').filter(line => line.trim().length > 0);
    expect(nonEmptyLines.length, 'Should maintain content density after resize').toBeGreaterThan(10);
  }, 15000);

  test('should maintain display quality with high event volume', async () => {
    cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let output = '';
    let screenCaptures = [];
    
    cctopProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Capture screen state periodically
      if (output.split('\n').length > 20) {
        screenCaptures.push(output);
        output = ''; // Reset for next capture
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate high volume of events
    for (let i = 0; i < 20; i++) {
      fs.writeFileSync(path.join(testDir, `volume-test-${i}.txt`), `content ${i}`);
      if (i % 3 === 0) {
        fs.appendFileSync(path.join(testDir, 'test1.txt'), `\nupdate ${i}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Validate that display remained functional under load
    expect(screenCaptures.length, 'Should have captured multiple screen states').toBeGreaterThan(2);

    for (const capture of screenCaptures) {
      const eventLines = capture.split('\n').filter(line => 
        line.includes('volume-test') || line.includes('create') || line.includes('modify')
      );
      expect(eventLines.length, 'Each screen capture should show events').toBeGreaterThan(1);
    }
  }, 20000);
});

/**
 * Test Helper: Screen Content Analysis
 * These utilities help analyze actual screen output
 */
export class ScreenContentAnalyzer {
  static analyzeContentDensity(output) {
    const lines = output.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    return nonEmptyLines.length / lines.length;
  }

  static extractEventLines(output) {
    return output.split('\n').filter(line => 
      line.includes('create') || 
      line.includes('modify') || 
      line.includes('delete') || 
      line.includes('move')
    );
  }

  static validateHeaderFooter(output) {
    const hasHeader = /Event Timestamp.*Elapsed.*File Name.*Event/.test(output);
    const hasFooter = /Unique Files.*Monitor/.test(output);
    return { hasHeader, hasFooter };
  }
}
/**
 * FUNC-205: Status Display Area Integration Test
 * Tests status area functionality for progress, statistics, and error display
 * 
 * FUNC-205 Requirements:
 * - Initial scan progress display
 * - Period-based activity statistics (10min/1hour/today)
 * - System status and warning display
 * - Error message priority display
 * - Color-coded status display
 * - Long message horizontal scrolling
 * - Multi-line stream display
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FUNC-205: Status Display Area', () => {
  let testDir;
  let cctopProcess;
  
  beforeEach(async () => {
    // Create isolated test directory
    testDir = `/tmp/cctop-status-test-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create initial files for testing
    fs.writeFileSync(path.join(testDir, 'test-file.txt'), 'test content');
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

  test('should display initialization status during startup', async () => {
    let outputBuffer = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    // Wait for startup sequence
    await new Promise(resolve => setTimeout(resolve, 2000));

    // FUNC-205 Requirement: Initialization progress display
    const hasInitializationStatus = 
      /Initializing|Starting|Loading|Setting up/i.test(outputBuffer) ||
      /Monitor.*starting|Database.*loading/i.test(outputBuffer);
    
    expect(hasInitializationStatus, 
      'Should show initialization status during startup').toBe(true);
    
    // Should show status area (separate from main content)
    const hasStatusArea = outputBuffer.includes('Monitor') || 
                         outputBuffer.includes('Status') ||
                         outputBuffer.includes('>>');
    
    expect(hasStatusArea, 'Should have dedicated status display area').toBe(true);
  }, 8000);

  test('should display monitor status and process information', async () => {
    let fullOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      fullOutput += data.toString();
    });

    // Wait for monitor to start and stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // FUNC-205 Requirement: System status display
    const hasMonitorStatus = /Monitor.*running|PID.*\d+|Status.*active/i.test(fullOutput);
    expect(hasMonitorStatus, 'Should display monitor running status').toBe(true);
    
    // Should show process information
    const hasProcessInfo = /PID:\s*\d+|running.*\(\d+\)/i.test(fullOutput);
    expect(hasProcessInfo, 'Should display process information').toBe(true);
  }, 10000);

  test('should display activity statistics in status area', async () => {
    let outputCapture = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      outputCapture += data.toString();
    });

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create files to generate statistics
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(testDir, `stats-file-${i}.txt`), `content ${i}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Wait for statistics to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // FUNC-205 Requirement: Activity statistics display
    const hasFileCount = /\d+\s+files|files:\s*\d+/i.test(outputCapture);
    const hasEventCount = /\d+\s+events|events:\s*\d+/i.test(outputCapture);
    const hasActivityStats = /Last.*\d+.*min|changes.*\d+/i.test(outputCapture);
    
    expect(hasFileCount || hasEventCount, 
      'Should display file/event statistics').toBe(true);
    
    // Check for database statistics
    const hasDatabaseStats = /Database.*\d+.*events|events.*\d+.*active/i.test(outputCapture);
    expect(hasDatabaseStats, 'Should show database activity statistics').toBe(true);
  }, 12000);

  test('should display error messages with priority in status area', async () => {
    // Create invalid configuration to trigger errors
    const invalidConfigDir = path.join(testDir, '.cctop');
    fs.mkdirSync(invalidConfigDir, { recursive: true });
    fs.writeFileSync(path.join(invalidConfigDir, 'config.json'), 'invalid json content{');
    
    let errorOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    cctopProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Wait for error processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // FUNC-205 Requirement: Error message priority display
    const hasErrorMessage = /Error|Failed|Warning|Invalid/i.test(errorOutput);
    expect(hasErrorMessage, 'Should display error messages in status area').toBe(true);
    
    // Should maintain status area structure even with errors
    const maintainsStructure = /Monitor|Status|>>/i.test(errorOutput);
    expect(maintainsStructure, 'Should maintain status area structure during errors').toBe(true);
  }, 10000);

  test('should show real-time status updates during file operations', async () => {
    let statusUpdates = [];
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // Capture status-related outputs
      if (output.match(/Monitor|Status|>>|Last.*min|Database/i)) {
        statusUpdates.push({
          timestamp: Date.now(),
          content: output
        });
      }
    });

    // Wait for initial startup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Perform file operations to trigger status updates
    fs.writeFileSync(path.join(testDir, 'realtime-test.txt'), 'initial');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    fs.appendFileSync(path.join(testDir, 'realtime-test.txt'), '\nmodified');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    fs.unlinkSync(path.join(testDir, 'realtime-test.txt'));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should have captured multiple status updates
    expect(statusUpdates.length, 'Should have multiple status updates').toBeGreaterThan(2);
    
    // Status updates should show activity
    const hasActivityUpdates = statusUpdates.some(update => 
      /changes|events|Database.*\d+/i.test(update.content)
    );
    expect(hasActivityUpdates, 'Status should reflect file activity').toBe(true);
  }, 15000);

  test('should display status area separate from main content area', async () => {
    let fullCapture = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      fullCapture += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Should have clear separation between main content and status
    const lines = fullCapture.split('\n');
    
    // Look for main content area (file events)
    const hasMainContent = lines.some(line => 
      /Event Timestamp.*Elapsed.*File Name.*Event/.test(line) ||
      /test-file\.txt.*create|find/.test(line)
    );
    
    // Look for status area (system information)
    const hasStatusContent = lines.some(line => 
      /Monitor.*running|Database.*events|>>/i.test(line)
    );
    
    expect(hasMainContent, 'Should have main content area').toBe(true);
    expect(hasStatusContent, 'Should have separate status area').toBe(true);
    
    // Status and main content should be visually separated
    const hasSeparation = /───|═══|>>/.test(fullCapture);
    expect(hasSeparation, 'Should have visual separation between areas').toBe(true);
  }, 10000);
});

/**
 * FUNC-205 Status Analysis Helper
 * Analyzes status display components and their compliance
 */
export class StatusDisplayAnalyzer {
  static extractStatusMessages(output) {
    const lines = output.split('\n');
    return lines.filter(line => 
      /Monitor|Status|Database|Last.*min|>>/i.test(line)
    );
  }

  static analyzeStatusComponents(output) {
    return {
      hasInitialization: /Initializing|Starting|Loading/i.test(output),
      hasMonitorStatus: /Monitor.*running|PID.*\d+/i.test(output),
      hasStatistics: /\d+.*events|\d+.*files|Database.*\d+/i.test(output),
      hasErrorHandling: /Error|Warning|Failed/i.test(output),
      hasVisuafSeparation: /───|═══|>>/.test(output)
    };
  }

  static validateFUNC205Compliance(output) {
    const components = this.analyzeStatusComponents(output);
    const statusMessages = this.extractStatusMessages(output);
    
    return {
      initializationDisplay: components.hasInitialization,
      monitorStatusDisplay: components.hasMonitorStatus,
      statisticsDisplay: components.hasStatistics,
      errorPriorityDisplay: components.hasErrorHandling,
      visualSeparation: components.hasVisuafSeparation,
      statusMessageCount: statusMessages.length,
      overallCompliance: Object.values(components).filter(Boolean).length >= 3
    };
  }
}
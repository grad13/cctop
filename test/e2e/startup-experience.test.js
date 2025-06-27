/**
 * Startup Experience End-to-End Test (FUNC-206 Compliance)
 * Tests instant display and progressive loading for optimal user experience
 * 
 * FUNC-206 Requirements:
 * - Viewer instant startup (within 0.1 seconds)
 * - Progressive content loading
 * - Status area real-time updates
 * - Error state maintenance
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FUNC-206: Instant View & Progressive Loading', () => {
  let testDir;
  let cctopProcess;
  let startTime;
  
  beforeEach(async () => {
    // Create isolated test directory
    testDir = `/tmp/cctop-startup-test-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create some initial files for testing
    fs.writeFileSync(path.join(testDir, 'initial-file.txt'), 'test content');
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

  test('should display viewer within 0.1 seconds (FUNC-206 Core Requirement)', async () => {
    startTime = Date.now();
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let firstOutput = '';
    let firstOutputTime = null;
    
    cctopProcess.stdout.once('data', (data) => {
      firstOutputTime = Date.now();
      firstOutput = data.toString();
    });

    // Wait for first output
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('No output received within 1 second'));
      }, 1000);
      
      cctopProcess.stdout.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // FUNC-206 Critical Requirement: 0.1 second startup
    const startupTime = firstOutputTime - startTime;
    expect(startupTime, 'Viewer should start within 0.1 seconds').toBeLessThan(100);

    // Should show initial screen elements immediately
    expect(firstOutput).toMatch(/Modified|Elapsed|File Name|Event/); // Header
    
    // Status area should show initialization message
    // (FUNC-205 status area integration)
    expect(firstOutput).toMatch(/Initializing|Starting|Loading/);
  }, 5000);

  test('should show progressive loading states (FUNC-206 State Transitions)', async () => {
    const outputStates = [];
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Capture output states with timestamps
    cctopProcess.stdout.on('data', (data) => {
      outputStates.push({
        timestamp: Date.now(),
        content: data.toString()
      });
    });

    // Wait for progressive loading to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Should have multiple states showing progression
    expect(outputStates.length, 'Should have multiple progressive states').toBeGreaterThan(3);

    // Verify FUNC-206 state transitions
    const combinedOutput = outputStates.map(s => s.content).join('');
    
    // Should show initialization phase
    expect(combinedOutput).toMatch(/Initializing|Starting/);
    
    // Should show monitor starting phase
    expect(combinedOutput).toMatch(/Starting.*monitor|Monitor.*starting/i);
    
    // Should show data loading phase
    expect(combinedOutput).toMatch(/Loading.*events|Data.*loading/i);
    
    // Should eventually reach live mode (show actual file events)
    expect(combinedOutput).toMatch(/initial-file\.txt|create|find/);
  }, 10000);

  test('should maintain display during monitor startup errors', async () => {
    // Create invalid config to trigger monitor startup issues
    const invalidConfigDir = path.join(testDir, '.cctop');
    fs.mkdirSync(invalidConfigDir, { recursive: true });
    fs.writeFileSync(path.join(invalidConfigDir, 'config.json'), 'invalid json{');
    
    let outputCapture = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      outputCapture += data.toString();
    });

    cctopProcess.stderr.on('data', (data) => {
      outputCapture += data.toString();
    });

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 2000));

    // FUNC-206 Requirement: Screen should remain visible even with errors
    expect(outputCapture).toMatch(/Modified|Elapsed|File Name|Event/); // Header maintained
    
    // Should show error in status area, not crash the display
    expect(outputCapture).toMatch(/Error|Failed|Retry/i);
    
    // Process should still be running (not crashed)
    expect(cctopProcess.killed, 'Process should not crash on errors').toBe(false);
  }, 8000);

  test('should show real-time file events after startup (Progressive Data)', async () => {
    let fullOutput = '';
    
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    cctopProcess.stdout.on('data', (data) => {
      fullOutput += data.toString();
    });

    // Wait for startup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create new files during runtime to test progressive data flow
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(path.join(testDir, `runtime-file-${i}.txt`), `content ${i}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Wait for events to be processed and displayed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should show both initial and new files
    expect(fullOutput).toMatch(/initial-file\.txt/);
    expect(fullOutput).toMatch(/runtime-file-[012]\.txt/);
    
    // Should show create events for new files
    expect(fullOutput).toMatch(/create/);
    
    // Should maintain consistent display format
    expect(fullOutput).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/); // Timestamp format
  }, 12000);

  test('should handle terminal resize during startup gracefully', async () => {
    cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test', COLUMNS: '80', LINES: '24' }
    });

    let outputCapture = '';
    cctopProcess.stdout.on('data', (data) => {
      outputCapture += data.toString();
    });

    // Wait for initial startup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate terminal resize during startup
    cctopProcess.kill('SIGWINCH');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create file to test display after resize
    fs.writeFileSync(path.join(testDir, 'post-resize-file.txt'), 'test content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Display should remain functional after resize
    expect(outputCapture).toMatch(/Modified|Elapsed|File Name|Event/);
    expect(outputCapture).toMatch(/post-resize-file\.txt/);
    
    // Process should not crash
    expect(cctopProcess.killed).toBe(false);
  }, 8000);
});

/**
 * FUNC-206 Performance Metrics Helper
 * Measures actual startup performance against specifications
 */
export class StartupPerformanceAnalyzer {
  static measureStartupTime(outputStates) {
    if (outputStates.length < 2) return null;
    
    const firstOutput = outputStates[0].timestamp;
    const fullyLoaded = outputStates.find(state => 
      state.content.includes('Monitor') && state.content.includes('running')
    );
    
    return fullyLoaded ? fullyLoaded.timestamp - firstOutput : null;
  }

  static analyzeProgressiveStates(outputStates) {
    const states = {
      initializing: false,
      monitorStarting: false,
      dataLoading: false,
      liveMode: false
    };

    for (const state of outputStates) {
      if (state.content.match(/Initializing/i)) states.initializing = true;
      if (state.content.match(/Starting.*monitor/i)) states.monitorStarting = true;
      if (state.content.match(/Loading.*events/i)) states.dataLoading = true;
      if (state.content.match(/running.*PID/i)) states.liveMode = true;
    }

    return states;
  }

  static validateFUNC206Compliance(outputStates, startTime) {
    const firstOutputTime = outputStates[0]?.timestamp;
    const startupTime = firstOutputTime - startTime;
    
    return {
      instantStartup: startupTime < 100, // 0.1 second requirement
      hasProgressiveStates: outputStates.length > 3,
      maintainsDisplay: outputStates.every(s => s.content.includes('Modified')),
      reachesLiveMode: outputStates.some(s => s.content.includes('running'))
    };
  }
}
/**
 * Elapsed Time Accuracy Test
 * Validates that displayed elapsed time matches actual runtime
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Elapsed Time Accuracy', () => {
  let testDir;
  let cctopProcess;
  let processStartTime;

  beforeEach(() => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `elapsed-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    // Clean up .cctop directory to ensure fresh start
    const cctopDir = path.join(os.homedir(), '.cctop');
    if (fs.existsSync(cctopDir)) {
      fs.rmSync(cctopDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    // Kill process
    if (cctopProcess && !cctopProcess.killed) {
      cctopProcess.kill('SIGINT');
      await new Promise(resolve => {
        cctopProcess.on('exit', resolve);
        setTimeout(resolve, 1000);
      });
    }

    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Should display accurate elapsed time on initial startup', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Test timeout - exceeded 10 seconds'));
      }, 10000);
      
      // Record exact start time
      processStartTime = Date.now();
      
      cctopProcess = spawn('node', [cctopPath, testDir], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      let firstElapsedCapture = null;
      
      cctopProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Debug output
        if (!firstElapsedCapture) {
          console.log('=== DEBUG: Received chunk ===');
          console.log(chunk.substring(0, 500));
          console.log('=== END DEBUG ===');
        }
        
        // Parse elapsed time from output
        // Based on actual output format: "Event Timestamp      Elapsed  File Name"
        // The elapsed time appears in the format "MM:SS" in the second column
        const lines = chunk.split('\n');
        for (const line of lines) {
          // Look for data lines with timestamp and elapsed time
          // Format: "2025-06-27 04:24:58     03:47  cctop..."
          const dataLineMatch = line.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(\d{2}):(\d{2})\s+/);
          if (dataLineMatch && !firstElapsedCapture) {
            const minutes = parseInt(dataLineMatch[1]);
            const seconds = parseInt(dataLineMatch[2]);
            firstElapsedCapture = {
              captureTime: Date.now(),
              displayedValue: `${dataLineMatch[1]}:${dataLineMatch[2]}`,
              seconds: minutes * 60 + seconds
            };
            break;
          }
        }
        
        // Wait for initial display before parsing elapsed time
        if (!firstElapsedCapture && chunk.includes('Event Timestamp') && chunk.includes('Elapsed') && chunk.includes('File Name')) {
          console.log('=== Found header, looking for data lines ===');
        }
        
        // If we captured elapsed time, validate it
        if (firstElapsedCapture) {
          const actualElapsed = (firstElapsedCapture.captureTime - processStartTime) / 1000;
          const displayedElapsed = firstElapsedCapture.seconds;
          
          // Allow 2 second tolerance for process startup overhead
          const tolerance = 2;
          const difference = Math.abs(actualElapsed - displayedElapsed);
          
          console.log('=== Elapsed Time Validation ===');
          console.log('Process start time:', new Date(processStartTime).toISOString());
          console.log('Capture time:', new Date(firstElapsedCapture.captureTime).toISOString());
          console.log('Actual elapsed:', actualElapsed.toFixed(2), 'seconds');
          console.log('Displayed elapsed:', displayedElapsed, 'seconds');
          console.log('Difference:', difference.toFixed(2), 'seconds');
          console.log('Displayed text:', firstElapsedCapture.displayedValue);
          
          expect(difference).toBeLessThanOrEqual(tolerance);
          clearTimeout(timeoutId);
          resolve();
        }
      });
      
      cctopProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }, 15000);

  test('Should update elapsed time accurately during runtime', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Test timeout - exceeded 15 seconds'));
      }, 15000);
      
      processStartTime = Date.now();
      
      cctopProcess = spawn('node', [cctopPath, testDir], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let elapsedCaptures = [];
      
      cctopProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        
        // Capture elapsed time values from table format
        const lines = chunk.split('\n');
        for (const line of lines) {
          const dataLineMatch = line.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(\d{2}):(\d{2})\s+/);
          if (dataLineMatch) {
            const minutes = parseInt(dataLineMatch[1]);
            const seconds = parseInt(dataLineMatch[2]);
            elapsedCaptures.push({
              captureTime: Date.now(),
              displayedValue: `${dataLineMatch[1]}:${dataLineMatch[2]}`,
              seconds: minutes * 60 + seconds
            });
            break;
          }
        }
        
        // After 5 seconds, check if elapsed time is updating correctly
        if (Date.now() - processStartTime > 5000 && elapsedCaptures.length >= 2) {
          // Compare first and last captures
          const firstCapture = elapsedCaptures[0];
          const lastCapture = elapsedCaptures[elapsedCaptures.length - 1];
          
          const timeDiff = (lastCapture.captureTime - firstCapture.captureTime) / 1000;
          const elapsedDiff = lastCapture.seconds - firstCapture.seconds;
          
          console.log('=== Elapsed Time Update Validation ===');
          console.log('First capture:', firstCapture.seconds, 'seconds at', new Date(firstCapture.captureTime).toISOString());
          console.log('Last capture:', lastCapture.seconds, 'seconds at', new Date(lastCapture.captureTime).toISOString());
          console.log('Time difference:', timeDiff.toFixed(2), 'seconds');
          console.log('Elapsed difference:', elapsedDiff, 'seconds');
          
          // Allow 2 second tolerance
          expect(Math.abs(timeDiff - elapsedDiff)).toBeLessThanOrEqual(2);
          clearTimeout(timeoutId);
          resolve();
        }
      });
      
      cctopProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }, 15000);

  test('Should reset elapsed time after restart', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    // First run
    await new Promise((resolve, reject) => {
      processStartTime = Date.now();
      
      cctopProcess = spawn('node', [cctopPath, testDir], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let startupComplete = false;
      
      cctopProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        if (!startupComplete && output.includes('Starting real-time file activity monitor')) {
          startupComplete = true;
          // Wait a bit then kill
          setTimeout(() => {
            cctopProcess.kill('SIGINT');
          }, 2000);
        }
      });
      
      cctopProcess.on('exit', () => {
        resolve();
      });
      
      cctopProcess.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('First run timeout'));
      }, 10000);
    });
    
    // Wait a moment before restart
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second run - check if elapsed time starts from 0
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Second run timeout'));
      }, 10000);
      
      processStartTime = Date.now();
      
      cctopProcess = spawn('node', [cctopPath, testDir], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let firstElapsedCapture = null;
      
      cctopProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          const dataLineMatch = line.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(\d{2}):(\d{2})\s+/);
          if (dataLineMatch && !firstElapsedCapture) {
            const minutes = parseInt(dataLineMatch[1]);
            const seconds = parseInt(dataLineMatch[2]);
            firstElapsedCapture = {
              captureTime: Date.now(),
              displayedValue: `${dataLineMatch[1]}:${dataLineMatch[2]}`,
              seconds: minutes * 60 + seconds
            };
            
            const actualElapsed = (firstElapsedCapture.captureTime - processStartTime) / 1000;
            
            console.log('=== Restart Elapsed Time Validation ===');
            console.log('Displayed elapsed after restart:', firstElapsedCapture.seconds, 'seconds');
            console.log('Actual elapsed since restart:', actualElapsed.toFixed(2), 'seconds');
            
            // After restart, elapsed time should be close to actual time since restart
            // NOT continuing from previous run
            expect(Math.abs(actualElapsed - firstElapsedCapture.seconds)).toBeLessThanOrEqual(2);
            clearTimeout(timeoutId);
            resolve();
            break;
          }
        }
      });
      
      cctopProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }, 25000);
});


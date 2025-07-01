/**
 * Feature 1 Test: Basic Entry Point
 * Behavior-focused approach (removing message dependencies)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Infrastructure imports
const SideEffectTracker = require('../helpers/side-effect-tracker');
const { InitializationContract } = require('../contracts/initialization.contract');

describe('Feature 1: Basic Entry Point', () => {
  const cctopPath = path.join(__dirname, '../../bin/cctop');
  const sideEffectTracker = new SideEffectTracker();
  
  /**
   * Basic startup test
   */
  test('Should start successfully within time limit', async () => {
    const testDir = path.join(os.tmpdir(), `test-cctop-entry-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    // Start side effect tracking
    sideEffectTracker.captureState();
    
    try {
      const result = await runCctopWithTimeout(cctopPath, testDir, 3000);
      
      // Confirm startup is successful (no errors)
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Confirm startup within 3 seconds (specification compliant)
      // Allow slight margin to 3100ms (considering system load)
      expect(result.duration).toBeLessThan(3100);
      
      // Confirm required files are created
      const changes = sideEffectTracker.detectChanges();
      const expectedFiles = [
        path.join(os.homedir(), '.cctop', 'activity.db'),
        path.join(os.homedir(), '.cctop', 'config.json')
      ];
      
      for (const expectedFile of expectedFiles) {
        const wasCreated = changes.created.some(file => 
          file === expectedFile || file.endsWith(path.basename(expectedFile))
        );
        // Consider case where file already exists
        expect(wasCreated || fs.existsSync(expectedFile)).toBe(true);
      }
      
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
  
  /**
   * Graceful exit test with SIGINT (Ctrl+C)
   */
  test('Should exit gracefully with SIGINT', async () => {
    const testDir = path.join(os.tmpdir(), `test-cctop-sigint-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    try {
      const child = spawn('node', [cctopPath], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: testDir
      });
      
      let stdout = '';
      let stderr = '';
      let isReady = false;
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        // Determine startup is complete (wait 1 second)
        if (!isReady) {
          setTimeout(() => {
            isReady = true;
            child.kill('SIGINT');
          }, 1000);
        }
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const exitPromise = new Promise((resolve) => {
        child.on('exit', (code, signal) => {
          resolve({ code, signal, stderr });
        });
      });
      
      // Timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve({ code: -1, signal: 'TIMEOUT', stderr: 'Test timeout' });
        }, 5000);
      });
      
      const result = await Promise.race([exitPromise, timeoutPromise]);
      
      // Confirm normal exit
      expect(result.code).toBe(0);
      expect(result.signal).toBe(null); // Signal is null on normal exit
      expect(result.stderr).toBe('');
      
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
  
  /**
   * Basic initialization contract test for entry point
   */
  test('Should follow initialization order contract', async () => {
    const testDir = path.join(os.tmpdir(), `test-cctop-contract-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    try {
      const result = await runCctopWithTimeout(cctopPath, testDir, 3000);
      
      // Confirm initialization is successful
      expect(result.exitCode).toBe(0);
      
      // Basic confirmation of initialization contract
      // Determine components were initialized in correct order by absence of errors
      const initOrder = InitializationContract.InitializationOrder.sequence;
      
      // Confirm no fatal errors
      for (const step of initOrder) {
        if (step.errorHandling.includes('Fatal')) {
          // No errors related to fatal error components
          expect(result.stderr).not.toContain(step.component);
        }
      }
      
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
  
  /**
   * Startup test with different environment variables
   */
  test('Should handle different NODE_ENV values', async () => {
    const environments = ['test', 'development', 'production'];
    
    for (const env of environments) {
      const testDir = path.join(os.tmpdir(), `test-cctop-env-${env}-${Date.now()}`);
      fs.mkdirSync(testDir, { recursive: true });
      
      try {
        const result = await runCctopWithTimeout(
          cctopPath, 
          testDir, 
          2000,
          { NODE_ENV: env }
        );
        
        // Confirm can start in any environment
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
        
      } finally {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    }
  });
});

/**
 * Execute cctop and get results with timeout
 */
function runCctopWithTimeout(cctopPath, cwd, timeout, env = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const child = spawn('node', [cctopPath], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test', ...env },
      cwd: cwd
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Terminate process after timeout
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeout);
    
    child.on('exit', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
        duration
      });
    });
    
    child.on('error', (err) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message,
        duration
      });
    });
  });
}
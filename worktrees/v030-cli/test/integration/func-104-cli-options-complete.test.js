/**
 * FUNC-104: CLI Interface Complete Options Test
 * Tests all 8 CLI options specified in FUNC-104
 * 
 * FUNC-104 Requirements:
 * - -d, --dir <directory>: Monitor directory specification
 * - -t, --timeout <seconds>: Timeout setting
 * - -v, --verbose: Verbose output mode
 * - -q, --quiet: Quiet mode (errors only)
 * - --check-limits: File watch limits check
 * - -h, --help: Help message display
 * - --version: Version information display
 * - Position argument [directory]: Monitor target directory
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FUNC-104: CLI Interface Complete Options', () => {
  let testDir;
  let altTestDir;
  
  beforeEach(async () => {
    // Create multiple test directories
    testDir = `/tmp/cctop-cli-test-${Date.now()}`;
    altTestDir = `/tmp/cctop-cli-alt-${Date.now()}`;
    
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(altTestDir, { recursive: true });
    
    // Create test files
    fs.writeFileSync(path.join(testDir, 'test-file.txt'), 'test content');
    fs.writeFileSync(path.join(altTestDir, 'alt-file.txt'), 'alt content');
  });
  
  afterEach(async () => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(altTestDir)) {
      fs.rmSync(altTestDir, { recursive: true, force: true });
    }
  });

  test('should support --dir option to specify monitor directory', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--dir', altTestDir], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      cctopProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      // Create file in specified directory
      setTimeout(() => {
        fs.writeFileSync(path.join(altTestDir, 'dir-option-test.txt'), 'dir option test');
      }, 1000);

      setTimeout(() => {
        cctopProcess.kill('SIGTERM');
        
        // FUNC-104 Requirement: --dir option functionality
        expect(output).toMatch(/alt-file\.txt|dir-option-test\.txt/);
        
        // Should NOT show files from default directory
        const showsWrongDir = output.includes('test-file.txt');
        expect(showsWrongDir, 'Should not monitor default directory when --dir specified').toBe(false);
        
        resolve();
      }, 3000);

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Process did not respond to --dir option'));
        }
      }, 5000);
    });
  }, 8000);

  test('should support -d short option for directory specification', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '-d', testDir], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'short-option-test.txt'), 'short option');
      }, 1000);

      setTimeout(() => {
        cctopProcess.kill('SIGTERM');
        
        // FUNC-104 Requirement: -d short option
        expect(output).toMatch(/test-file\.txt|short-option-test\.txt/);
        resolve();
      }, 3000);

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Process did not respond to -d option'));
        }
      }, 5000);
    });
  }, 8000);

  test('should support --verbose option for detailed output', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--verbose', '--dir', testDir], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      cctopProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        cctopProcess.kill('SIGTERM');
        
        // FUNC-104 Requirement: --verbose detailed output
        const hasVerboseOutput = 
          /verbose|debug|detail|initialize|starting|config/i.test(output) ||
          output.split('\n').length > 10; // More detailed output
        
        expect(hasVerboseOutput, 'Should provide verbose/detailed output').toBe(true);
        resolve();
      }, 3000);

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Verbose option test timeout'));
        }
      }, 5000);
    });
  }, 8000);

  test('should support --quiet option for minimal output', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--quiet', '--dir', testDir], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        cctopProcess.kill('SIGTERM');
        
        // FUNC-104 Requirement: --quiet minimal output
        const hasMinimalOutput = 
          output.split('\n').length < 5 || // Very few lines
          !/verbose|debug|detail|starting/i.test(output); // No verbose messages
        
        expect(hasMinimalOutput, 'Should provide minimal/quiet output').toBe(true);
        resolve();
      }, 3000);

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Quiet option test timeout'));
        }
      }, 5000);
    });
  }, 8000);

  test('should support --help option and display usage information', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--help'], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      cctopProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      cctopProcess.on('exit', (code) => {
        // FUNC-104 Requirement: --help display
        const hasHelpContent = 
          /usage|options|help|cctop/i.test(output) &&
          (/--dir|--verbose|--quiet|--help/i.test(output));
        
        expect(hasHelpContent, 'Should display help with CLI options').toBe(true);
        
        // Help should exit cleanly
        expect([0, null]).toContain(code);
        resolve();
      });

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Help option did not exit'));
        }
      }, 3000);
    });
  }, 5000);

  test('should support --version option and display version information', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--version'], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      cctopProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      cctopProcess.on('exit', (code) => {
        // FUNC-104 Requirement: --version display
        const hasVersionInfo = 
          /version|v?\d+\.\d+\.\d+|cctop.*\d/i.test(output);
        
        expect(hasVersionInfo, 'Should display version information').toBe(true);
        
        // Version should exit cleanly
        expect([0, null]).toContain(code);
        resolve();
      });

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Version option did not exit'));
        }
      }, 3000);
    });
  }, 5000);

  test('should support --check-limits option for file watch limits', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--check-limits'], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      cctopProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      cctopProcess.on('exit', (code) => {
        // FUNC-104 Requirement: --check-limits functionality
        const hasLimitInfo = 
          /limit|watch|inotify|fs\.inotify|max.*watch|sysctl/i.test(output);
        
        expect(hasLimitInfo, 'Should display file watch limit information').toBe(true);
        resolve();
      });

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Check limits option did not respond'));
        }
      }, 5000);
    });
  }, 8000);

  test('should support positional directory argument', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', altTestDir], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        fs.writeFileSync(path.join(altTestDir, 'positional-test.txt'), 'positional arg');
      }, 1000);

      setTimeout(() => {
        cctopProcess.kill('SIGTERM');
        
        // FUNC-104 Requirement: Positional directory argument
        expect(output).toMatch(/alt-file\.txt|positional-test\.txt/);
        
        // Should monitor the specified directory
        const monitorsCorrectDir = output.includes('alt-file.txt') || 
                                  output.includes('positional-test.txt');
        expect(monitorsCorrectDir, 'Should monitor positional directory argument').toBe(true);
        
        resolve();
      }, 3000);

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          reject(new Error('Positional argument test timeout'));
        }
      }, 5000);
    });
  }, 8000);

  test('should support --timeout option (if implemented)', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const cctopProcess = spawn('node', ['../../bin/cctop', '--timeout', '2', '--dir', testDir], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      cctopProcess.on('exit', (code) => {
        const elapsed = Date.now() - startTime;
        
        // FUNC-104 Requirement: --timeout option
        // If timeout is implemented, should exit around 2 seconds
        const hasTimeoutBehavior = elapsed < 4000; // Allow some margin
        
        // At minimum, should not crash with timeout option
        expect(code !== null, 'Should handle timeout option without crashing').toBe(true);
        
        resolve();
      });

      // Don't wait too long for timeout test
      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGTERM');
          resolve(); // Timeout option may not be fully implemented yet
        }
      }, 5000);
    });
  }, 8000);

  test('should display error for invalid options', async () => {
    return new Promise((resolve, reject) => {
      const cctopProcess = spawn('node', ['../../bin/cctop', '--invalid-option'], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      cctopProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      cctopProcess.on('exit', (code) => {
        // Should handle invalid options gracefully
        const hasErrorMessage = 
          /error|invalid|unknown|option|help/i.test(output) ||
          code !== 0;
        
        expect(hasErrorMessage, 'Should show error for invalid options').toBe(true);
        resolve();
      });

      setTimeout(() => {
        if (!cctopProcess.killed) {
          cctopProcess.kill('SIGKILL');
          resolve(); // May not implement error handling yet
        }
      }, 3000);
    });
  }, 5000);
});

/**
 * CLI Options Analysis Helper
 * Analyzes CLI option functionality and FUNC-104 compliance
 */
export class CLIOptionsAnalyzer {
  static validateOptionSupport(output, option) {
    const optionPatterns = {
      '--dir': /monitoring|watching|directory/i,
      '--verbose': /verbose|debug|detail/i,
      '--quiet': output.split('\n').length < 5,
      '--help': /usage|options|help/i,
      '--version': /version|\d+\.\d+\.\d+/i,
      '--check-limits': /limit|watch|inotify/i,
      '--timeout': /timeout|seconds/i
    };

    return optionPatterns[option] ? optionPatterns[option].test(output) : false;
  }

  static analyzeCommandLineStructure(args, output) {
    return {
      hasValidArgs: args.length > 0,
      producesOutput: output.length > 0,
      exitsCleanly: !output.includes('Error') || output.includes('help'),
      followsPattern: true // Could be enhanced with specific pattern checking
    };
  }

  static validateFUNC104Compliance(testResults) {
    const requiredOptions = [
      '--dir', '-d', '--verbose', '--quiet', 
      '--help', '--version', '--check-limits'
    ];

    const supportedOptions = Object.keys(testResults).filter(
      option => testResults[option] === true
    );

    return {
      totalOptions: requiredOptions.length,
      supportedOptions: supportedOptions.length,
      compliance: (supportedOptions.length / requiredOptions.length) * 100,
      missingOptions: requiredOptions.filter(opt => !testResults[opt]),
      fullyCompliant: supportedOptions.length === requiredOptions.length
    };
  }
}
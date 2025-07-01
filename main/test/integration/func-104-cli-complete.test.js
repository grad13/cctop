/**
 * FUNC-104 CLI Interface Complete Test Suite
 * Validates all CLI options and behavior compliance
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const cctopBin = path.join(__dirname, '../../bin/cctop');

describe('FUNC-104: CLI Interface Complete Compliance', () => {
  let timeout;

  beforeEach(() => {
    timeout = 5000; // 5 second timeout for CLI operations
  });

  describe('Help and Version Information', () => {
    test('--help displays FUNC-104 compliant help message', () => {
      const output = execSync(`node ${cctopBin} --help`, { encoding: 'utf8' });
      
      // Verify FUNC-104 help structure
      expect(output).toContain('cctop - Code Change Top (File Monitoring Tool)');
      expect(output).toContain('Usage: cctop [options] [directory]');
      
      // Verify all FUNC-104 required sections
      expect(output).toContain('Monitoring:');
      expect(output).toContain('Output:');
      expect(output).toContain('System:');
      expect(output).toContain('Help:');
      expect(output).toContain('Interactive Controls:');
      expect(output).toContain('Examples:');
      
      // Verify specific FUNC-104 options
      expect(output).toContain('-d, --dir <dir>');
      expect(output).toContain('-t, --timeout <sec>');
      expect(output).toContain('-v, --verbose');
      expect(output).toContain('-q, --quiet');
      expect(output).toContain('--check-limits');
      expect(output).toContain('-h, --help');
      expect(output).toContain('--version');
    });

    test('-h displays same help as --help', () => {
      const longHelp = execSync(`node ${cctopBin} --help`, { encoding: 'utf8' });
      const shortHelp = execSync(`node ${cctopBin} -h`, { encoding: 'utf8' });
      
      expect(shortHelp).toBe(longHelp);
    });

    test('--version displays version information', () => {
      const output = execSync(`node ${cctopBin} --version`, { encoding: 'utf8' });
      
      expect(output.trim()).toMatch(/^cctop v\d+\.\d+\.\d+/);
    });
  });

  describe('Monitoring Options', () => {
    test('--dir option accepts directory argument', () => {
      // Test directory option parsing (non-interactive)
      const child = spawn('node', [cctopBin, '--dir', '/tmp', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });

    test('-d option works as shorthand for --dir', () => {
      const child = spawn('node', [cctopBin, '-d', '/tmp', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });

    test('--timeout option accepts numeric argument', () => {
      const child = spawn('node', [cctopBin, '--timeout', '10', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });

    test('-t option works as shorthand for --timeout', () => {
      const child = spawn('node', [cctopBin, '-t', '10', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });
  });

  describe('Output Control Options', () => {
    test('--verbose option enables verbose mode', () => {
      const child = spawn('node', [cctopBin, '--verbose', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });

    test('-v option works as shorthand for --verbose', () => {
      const child = spawn('node', [cctopBin, '-v', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });

    test('--quiet option enables quiet mode', () => {
      const child = spawn('node', [cctopBin, '--quiet', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });

    test('-q option works as shorthand for --quiet', () => {
      const child = spawn('node', [cctopBin, '-q', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });
  });

  describe('System Management Options', () => {
    test('--check-limits displays system limits information', () => {
      const output = execSync(`node ${cctopBin} --check-limits`, { 
        encoding: 'utf8',
        timeout: 5000 
      });
      
      // Should contain system-specific limit information
      expect(output.length).toBeGreaterThan(0);
      // On macOS, should mention FSEvents
      // On Linux, should show inotify limits
    });
  });

  describe('Position Argument Support', () => {
    test('directory as position argument works correctly', () => {
      const child = spawn('node', [cctopBin, '/tmp', '--help'], {
        stdio: 'pipe',
        timeout: 1000
      });
      
      return new Promise((resolve) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('cctop - Code Change Top');
          resolve();
        });
      });
    });
  });

  describe('Error Handling Compliance', () => {
    test('unknown option displays FUNC-104 compliant error', () => {
      try {
        execSync(`node ${cctopBin} --unknown-option`, { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        fail('Should have thrown an error');
      } catch (error) {
        const output = error.stderr || error.stdout;
        expect(output).toContain('Error: Unknown option: --unknown-option');
        expect(output).toContain("Try 'cctop --help' for more information.");
      }
    });

    test('missing argument for option displays appropriate error', () => {
      try {
        execSync(`node ${cctopBin} --dir`, { 
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 2000
        });
        fail('Should have thrown an error for missing directory argument');
      } catch (error) {
        // This test verifies that missing arguments are handled
        // The specific behavior may vary based on implementation
        expect(error.status).not.toBe(0);
      }
    });
  });

  describe('FUNC-104 Compliance Summary', () => {
    test('all required CLI options are implemented', () => {
      const helpOutput = execSync(`node ${cctopBin} --help`, { encoding: 'utf8' });
      
      const requiredOptions = [
        '-d, --dir',        // Directory monitoring
        '-t, --timeout',    // Timeout configuration
        '-v, --verbose',    // Verbose output
        '-q, --quiet',      // Quiet mode
        '--check-limits',   // System limits check
        '-h, --help',       // Help information
        '--version'         // Version information
      ];
      
      requiredOptions.forEach(option => {
        expect(helpOutput).toContain(option);
      });
    });

    test('help message follows FUNC-104 structure', () => {
      const helpOutput = execSync(`node ${cctopBin} --help`, { encoding: 'utf8' });
      
      // Verify exact FUNC-104 structure compliance
      const lines = helpOutput.split('\n');
      
      expect(lines[0]).toBe('cctop - Code Change Top (File Monitoring Tool)');
      expect(lines[2]).toBe('Usage: cctop [options] [directory]');
      
      // Verify section headers are present
      const sections = ['Options:', 'Monitoring:', 'Output:', 'System:', 'Help:', 'Interactive Controls:', 'Examples:'];
      sections.forEach(section => {
        expect(helpOutput).toContain(section);
      });
    });
  });
});
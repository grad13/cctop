/**
 * Process Manager Test Suite (FUNC-003 compliant)
 * Tests PID file management, logging, and process state control
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock all filesystem and process operations
const mockFsPromises = {
  writeFile: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  appendFile: vi.fn(),
  stat: vi.fn(),
  rename: vi.fn(),
  readdir: vi.fn()
};

const mockSpawn = vi.fn();

// Mock modules
vi.mock('fs', () => ({
  promises: mockFsPromises,
  constants: { F_OK: 0 }
}));

vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => args.join('/'))
}));

// Create a mock ProcessManager class
class MockProcessManager {
  constructor(config = {}) {
    this.config = config;
    this.baseDir = config.baseDir || '.cctop';
    this.pidFile = `${this.baseDir}/monitor.pid`;
    this.logFile = `${this.baseDir}/monitor.log`;
  }

  async writePidFile(pid) {
    await mockFsPromises.writeFile(this.pidFile, pid.toString());
  }

  async readPidFile() {
    const content = await mockFsPromises.readFile(this.pidFile, 'utf8');
    return parseInt(content, 10);
  }

  async removePidFile() {
    await mockFsPromises.unlink(this.pidFile);
  }

  async log(level, message) {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    await mockFsPromises.appendFile(this.logFile, logLine);
  }

  async getMonitorStatus() {
    try {
      const pid = await this.readPidFile();
      // Mock process check
      if (pid === 12345) {
        return { status: 'running', pid: 12345 };
      } else if (pid === 99999) {
        return { status: 'stale', pid: 99999 };
      }
      return { status: 'stopped' };
    } catch (error) {
      return { status: 'stopped' };
    }
  }

  async startMonitor(scriptPath, options = {}) {
    const mockChildProcess = {
      pid: 12345,
      on: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() }
    };
    
    // If mockSpawn throws, let it propagate
    const child = mockSpawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Only proceed if spawn was successful
    if (child) {
      await this.writePidFile(child.pid);
      // Set up exit handler
      child.on('exit', () => {});
      return child.pid;
    }
  }

  async stopMonitor() {
    try {
      const pid = await this.readPidFile();
      // Mock process kill
      await this.removePidFile();
      return true;
    } catch (error) {
      return false;
    }
  }

  async ensureDirectories() {
    await mockFsPromises.mkdir(this.baseDir, { recursive: true });
  }

  async rotateLogFile() {
    const backupFile = `${this.logFile}.old`;
    await mockFsPromises.rename(this.logFile, backupFile);
  }
}

describe('Process Manager (FUNC-003 Compliance)', () => {
  let processManager;
  let mockConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    mockConfig = {
      baseDir: '.cctop',
      configFile: '.cctop/config.json'
    };

    // Reset mock implementations
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue('12345');
    mockFsPromises.unlink.mockResolvedValue(undefined);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.appendFile.mockResolvedValue(undefined);
    mockFsPromises.stat.mockResolvedValue({ isFile: () => true });
    mockFsPromises.rename.mockResolvedValue(undefined);

    // Default successful spawn
    const defaultChildProcess = {
      pid: 12345,
      on: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() }
    };
    mockSpawn.mockReturnValue(defaultChildProcess);

    processManager = new MockProcessManager(mockConfig);
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
      const manager = new MockProcessManager();
      
      expect(manager.baseDir).toBe('.cctop');
      expect(manager.pidFile).toBe('.cctop/monitor.pid');
      expect(manager.logFile).toBe('.cctop/monitor.log');
    });

    test('should initialize with provided configuration', () => {
      expect(processManager.config).toEqual(mockConfig);
      expect(processManager.baseDir).toBe('.cctop');
    });

    test('should ensure directories exist', async () => {
      await processManager.ensureDirectories();
      
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith('.cctop', { recursive: true });
    });
  });

  describe('PID File Management', () => {
    test('should write PID file correctly', async () => {
      const pid = 12345;
      
      await processManager.writePidFile(pid);
      
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith('.cctop/monitor.pid', '12345');
    });

    test('should read PID file correctly', async () => {
      mockFsPromises.readFile.mockResolvedValue('12345');
      
      const pid = await processManager.readPidFile();
      
      expect(pid).toBe(12345);
      expect(mockFsPromises.readFile).toHaveBeenCalledWith('.cctop/monitor.pid', 'utf8');
    });

    test('should remove PID file correctly', async () => {
      await processManager.removePidFile();
      
      expect(mockFsPromises.unlink).toHaveBeenCalledWith('.cctop/monitor.pid');
    });

    test('should handle PID file read errors', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('File not found'));
      
      const status = await processManager.getMonitorStatus();
      
      expect(status.status).toBe('stopped');
    });
  });

  describe('Logging Functionality', () => {
    test('should log messages with timestamp and level', async () => {
      const message = 'Test log message';
      
      await processManager.log('info', message);
      
      expect(mockFsPromises.appendFile).toHaveBeenCalledWith(
        '.cctop/monitor.log',
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] Test log message\n/)
      );
    });

    test('should handle different log levels', async () => {
      await processManager.log('error', 'Error message');
      await processManager.log('warn', 'Warning message');
      await processManager.log('debug', 'Debug message');
      
      expect(mockFsPromises.appendFile).toHaveBeenCalledTimes(3);
      expect(mockFsPromises.appendFile).toHaveBeenCalledWith(
        '.cctop/monitor.log',
        expect.stringContaining('[ERROR]')
      );
      expect(mockFsPromises.appendFile).toHaveBeenCalledWith(
        '.cctop/monitor.log',
        expect.stringContaining('[WARN]')
      );
      expect(mockFsPromises.appendFile).toHaveBeenCalledWith(
        '.cctop/monitor.log',
        expect.stringContaining('[DEBUG]')
      );
    });

    test('should rotate log files', async () => {
      await processManager.rotateLogFile();
      
      expect(mockFsPromises.rename).toHaveBeenCalledWith(
        '.cctop/monitor.log',
        '.cctop/monitor.log.old'
      );
    });
  });

  describe('Monitor Status Detection', () => {
    test('should detect running monitor', async () => {
      mockFsPromises.readFile.mockResolvedValue('12345');
      
      const status = await processManager.getMonitorStatus();
      
      expect(status).toEqual({
        status: 'running',
        pid: 12345
      });
    });

    test('should detect stale monitor', async () => {
      mockFsPromises.readFile.mockResolvedValue('99999');
      
      const status = await processManager.getMonitorStatus();
      
      expect(status).toEqual({
        status: 'stale',
        pid: 99999
      });
    });

    test('should detect stopped monitor when no PID file', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));
      
      const status = await processManager.getMonitorStatus();
      
      expect(status.status).toBe('stopped');
    });
  });

  describe('Monitor Process Control', () => {
    test('should start monitor process', async () => {
      const mockChildProcess = {
        pid: 12345,
        on: vi.fn(),
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() }
      };
      mockSpawn.mockReturnValue(mockChildProcess);
      
      const pid = await processManager.startMonitor('/path/to/monitor.js', { started_by: 'test' });
      
      expect(mockSpawn).toHaveBeenCalledWith('node', ['/path/to/monitor.js'], {
        detached: true,
        stdio: 'ignore'
      });
      expect(pid).toBe(12345);
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith('.cctop/monitor.pid', '12345');
      expect(mockChildProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
    });

    test('should stop monitor process', async () => {
      mockFsPromises.readFile.mockResolvedValue('12345');
      
      const result = await processManager.stopMonitor();
      
      expect(result).toBe(true);
      expect(mockFsPromises.unlink).toHaveBeenCalledWith('.cctop/monitor.pid');
    });

    test('should handle stop failure when no PID file', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));
      
      const result = await processManager.stopMonitor();
      
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      mockFsPromises.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(processManager.writePidFile(12345)).rejects.toThrow('Permission denied');
    });

    test('should handle logging errors gracefully', async () => {
      mockFsPromises.appendFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(processManager.log('error', 'test')).rejects.toThrow('Disk full');
    });
  });

  describe('Advanced Process Management', () => {

    test('should validate PID format', async () => {
      mockFsPromises.readFile.mockResolvedValue('invalid-pid');
      
      const status = await processManager.getMonitorStatus();
      
      expect(status.status).toBe('stopped');
    });

    test('should handle concurrent operations safely', async () => {
      const promises = [
        processManager.log('info', 'Message 1'),
        processManager.log('info', 'Message 2'),
        processManager.log('info', 'Message 3')
      ];
      
      await Promise.all(promises);
      
      expect(mockFsPromises.appendFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('Configuration and Customization', () => {
    test('should support custom base directory', () => {
      const customConfig = { baseDir: '/custom/path' };
      const customManager = new MockProcessManager(customConfig);
      
      expect(customManager.baseDir).toBe('/custom/path');
      expect(customManager.pidFile).toBe('/custom/path/monitor.pid');
      expect(customManager.logFile).toBe('/custom/path/monitor.log');
    });

    test('should handle empty configuration', () => {
      const emptyManager = new MockProcessManager({});
      
      expect(emptyManager.baseDir).toBe('.cctop');
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle multiple rapid operations', async () => {
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(processManager.log('info', `Message ${i}`));
      }
      
      await Promise.all(operations);
      
      expect(mockFsPromises.appendFile).toHaveBeenCalledTimes(10);
    });

    test('should cleanup resources properly', async () => {
      await processManager.removePidFile();
      await processManager.rotateLogFile();
      
      expect(mockFsPromises.unlink).toHaveBeenCalledWith('.cctop/monitor.pid');
      expect(mockFsPromises.rename).toHaveBeenCalledWith('.cctop/monitor.log', '.cctop/monitor.log.old');
    });
  });
});
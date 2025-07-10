/**
 * Daemon Status Monitor Tests
 * Tests for daemon process monitoring functionality
 */

import { DaemonStatusMonitor } from '../../../src/utils/daemon-status-monitor.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('DaemonStatusMonitor', () => {
  let tempDir: string;
  let monitor: DaemonStatusMonitor;
  let pidFilePath: string;

  beforeEach(() => {
    // Create temporary .cctop directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-daemon-test-'));
    const cctopDir = path.join(tempDir, '.cctop');
    const runtimeDir = path.join(cctopDir, 'runtime');
    
    fs.mkdirSync(cctopDir, { recursive: true });
    fs.mkdirSync(runtimeDir, { recursive: true });
    
    pidFilePath = path.join(runtimeDir, 'daemon.pid');
    monitor = new DaemonStatusMonitor(cctopDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('checkStatus', () => {
    it('should return stopped status when PID file does not exist', async () => {
      const status = await monitor.checkStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.status).toBe('stopped');
      expect(status.pid).toBeUndefined();
    });

    it('should return unknown status when PID file contains invalid data', async () => {
      fs.writeFileSync(pidFilePath, 'invalid-pid');
      
      const status = await monitor.checkStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.status).toBe('unknown');
      expect(status.pid).toBeUndefined();
    });

    it('should return running status when PID file contains current process PID', async () => {
      // Use current process PID (guaranteed to be running)
      const currentPid = process.pid;
      fs.writeFileSync(pidFilePath, currentPid.toString());
      
      const status = await monitor.checkStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.status).toBe('running');
      expect(status.pid).toBe(currentPid);
    });

    it('should return stopped status when PID file contains non-existent process PID', async () => {
      // Use a very high PID that likely doesn't exist
      const nonExistentPid = 999999;
      fs.writeFileSync(pidFilePath, nonExistentPid.toString());
      
      const status = await monitor.checkStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.status).toBe('stopped');
      expect(status.pid).toBeUndefined();
    });
  });

  describe('getStatusString', () => {
    it('should return "stopped" when no PID file exists', async () => {
      const statusString = await monitor.getStatusString();
      expect(statusString).toBe('stopped');
    });

    it('should return "running (PID: X)" when process is running', async () => {
      const currentPid = process.pid;
      fs.writeFileSync(pidFilePath, currentPid.toString());
      
      const statusString = await monitor.getStatusString();
      expect(statusString).toBe(`running (PID: ${currentPid})`);
    });

    it('should return "unknown" when PID file contains invalid data', async () => {
      fs.writeFileSync(pidFilePath, 'invalid');
      
      const statusString = await monitor.getStatusString();
      expect(statusString).toBe('unknown');
    });
  });
});
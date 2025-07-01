/**
 * Test Helper Functions for Daemon Process Management
 * Provides comprehensive daemon lifecycle management for tests
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DaemonTestManager {
  private static activeDaemons: Set<ChildProcess> = new Set();
  private static processTracker: Set<number> = new Set();

  /**
   * Start a daemon process with automatic tracking
   */
  static async startDaemon(daemonPath: string, cwd: string, args: string[] = ['--standalone']): Promise<ChildProcess> {
    // Kill any existing daemon processes first
    await this.killAllDaemons();

    const daemon = spawn('node', [daemonPath, ...args], {
      stdio: 'pipe',
      cwd: cwd,
      detached: false // Ensure child process is tied to parent
    });

    // Track the daemon
    this.activeDaemons.add(daemon);
    
    // Track PID when available
    daemon.on('spawn', () => {
      if (daemon.pid) {
        this.processTracker.add(daemon.pid);
      }
    });

    // Remove from tracking when process exits
    daemon.on('exit', () => {
      this.activeDaemons.delete(daemon);
      if (daemon.pid) {
        this.processTracker.delete(daemon.pid);
      }
    });

    return daemon;
  }

  /**
   * Stop a specific daemon process
   */
  static async stopDaemon(daemon: ChildProcess): Promise<void> {
    if (!daemon || daemon.killed) {
      return;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown fails
        if (daemon && !daemon.killed) {
          daemon.kill('SIGKILL');
        }
        resolve();
      }, 3000);

      daemon.on('exit', () => {
        clearTimeout(timeout);
        this.activeDaemons.delete(daemon);
        if (daemon.pid) {
          this.processTracker.delete(daemon.pid);
        }
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      daemon.kill('SIGTERM');
    });
  }

  /**
   * Kill all daemon processes (both tracked and untracked)
   */
  static async killAllDaemons(): Promise<void> {
    // First, stop all tracked daemons
    const stopPromises = Array.from(this.activeDaemons).map(daemon => this.stopDaemon(daemon));
    await Promise.all(stopPromises);

    // Clear tracking sets
    this.activeDaemons.clear();
    this.processTracker.clear();

    // Then, kill any remaining daemon processes by pattern matching
    try {
      const result = execSync('pgrep -f "node.*daemon.*standalone"', { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      
      if (result.trim()) {
        const pids = result.trim().split('\n').filter(pid => pid.trim());
        for (const pid of pids) {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
          } catch (e) {
            // Process might already be dead
          }
        }
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      // No processes found or pgrep failed - this is expected when no daemons are running
    }

    // Final cleanup: check for any node processes that might be daemon-related
    try {
      const allNodeProcesses = execSync('pgrep -f "node"', { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      
      if (allNodeProcesses.trim()) {
        const pids = allNodeProcesses.trim().split('\n').filter(pid => pid.trim());
        for (const pid of pids) {
          try {
            // Check if this is a daemon process
            const cmdline = execSync(`ps -p ${pid} -o args=`, { 
              encoding: 'utf8', 
              stdio: 'pipe' 
            });
            
            if (cmdline.includes('daemon') && cmdline.includes('standalone')) {
              process.kill(parseInt(pid), 'SIGKILL');
            }
          } catch (e) {
            // Process might already be dead or not accessible
          }
        }
      }
    } catch (e) {
      // No node processes found - this is fine
    }
  }

  /**
   * Get count of active daemon processes
   */
  static getActiveDaemonCount(): number {
    return this.activeDaemons.size;
  }

  /**
   * Wait for daemon startup with timeout
   */
  static async waitForDaemonStartup(daemon: ChildProcess, timeout: number = 2000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Daemon startup timeout after ${timeout}ms`));
      }, timeout);

      // Look for startup indicators in stdout
      daemon.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Daemon started successfully')) {
          clearTimeout(timer);
          resolve();
        }
      });

      // Also resolve if daemon exits (failed startup)
      daemon.on('exit', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Daemon exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Clean up test directory
   */
  static async cleanupTestDirectory(testDir: string): Promise<void> {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean test directory ${testDir}:`, error);
    }
  }

  /**
   * Global cleanup - call this in test suite teardown
   */
  static async globalCleanup(): Promise<void> {
    await this.killAllDaemons();
    
    // Additional cleanup: remove any leftover PID files
    try {
      const result = execSync('find /tmp -name "daemon.pid" -type f 2>/dev/null || true', { 
        encoding: 'utf8' 
      });
      
      if (result.trim()) {
        const pidFiles = result.trim().split('\n').filter(file => file.trim());
        for (const file of pidFiles) {
          try {
            await fs.unlink(file);
          } catch (e) {
            // File might already be removed
          }
        }
      }
    } catch (e) {
      // Find command failed - not critical
    }
  }
}

/**
 * Setup and teardown helpers for individual tests
 */
export async function setupDaemonTest(testDir: string): Promise<void> {
  await fs.mkdir(testDir, { recursive: true });
  process.chdir(testDir);
}

export async function teardownDaemonTest(daemon: ChildProcess | null, testDir: string): Promise<void> {
  if (daemon) {
    await DaemonTestManager.stopDaemon(daemon);
  }
  
  // Additional safety cleanup
  await DaemonTestManager.killAllDaemons();
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Clean up test directory
  await DaemonTestManager.cleanupTestDirectory(testDir);
}
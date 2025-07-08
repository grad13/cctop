/**
 * Test Environment Setup and Management
 * Provides test directory setup and configuration
 */

import { ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DaemonTestManager } from './daemon-manager';

/**
 * Generate unique test directory path
 */
export function getUniqueTestDir(baseName: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `/tmp/${baseName}-${timestamp}-${random}`;
}

/**
 * Setup test directory with required .cctop structure
 */
export async function setupDaemonTest(testDir: string): Promise<void> {
  await fs.mkdir(testDir, { recursive: true });
  
  // Create .cctop directory structure
  await fs.mkdir(path.join(testDir, '.cctop/config'), { recursive: true });
  await fs.mkdir(path.join(testDir, '.cctop/data'), { recursive: true });
  await fs.mkdir(path.join(testDir, '.cctop/logs'), { recursive: true });
  await fs.mkdir(path.join(testDir, '.cctop/runtime'), { recursive: true });
  await fs.mkdir(path.join(testDir, '.cctop/temp'), { recursive: true });
  
  // Create daemon-config.json
  const daemonConfig = {
    monitoring: {
      watchPaths: ["."],
      excludePatterns: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.*",
        "**/.cctop/**",
        "**/dist/**",
        "**/coverage/**"
      ],
      debounceMs: 100,
      maxDepth: 10,
      moveThresholdMs: 100,
      systemLimits: {
        requiredLimit: 524288,
        checkOnStartup: true,
        warnIfInsufficient: true
      }
    },
    daemon: {
      pidFile: ".cctop/runtime/daemon.pid",
      logFile: ".cctop/logs/daemon.log",
      logLevel: "info",
      heartbeatInterval: 5000,  // Reduced for tests
      autoStart: true
    },
    database: {
      writeMode: "WAL",
      syncMode: "NORMAL",
      cacheSize: 65536,
      busyTimeout: 5000
    }
  };
  
  await fs.writeFile(
    path.join(testDir, '.cctop/config/daemon-config.json'),
    JSON.stringify(daemonConfig, null, 2)
  );
}

/**
 * Teardown test environment
 */
export async function teardownDaemonTest(daemon: ChildProcess | null, testDir: string): Promise<void> {
  if (daemon) {
    await DaemonTestManager.stopDaemon(daemon);
  }
  
  // Reduced wait time
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Clean up test directory
  await DaemonTestManager.cleanupTestDirectory(testDir);
}

/**
 * Test environment class for aggregates testing
 */
export class TestEnvironment {
  public testDir: string;
  public testDbPath: string;

  constructor() {
    this.testDir = '';
    this.testDbPath = '';
  }

  async setup(): Promise<void> {
    this.testDir = getUniqueTestDir('cctop-aggregates-test');
    this.testDbPath = path.join(this.testDir, '.cctop/data/activity.db');

    // Use the standard setupDaemonTest function
    await setupDaemonTest(this.testDir);
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }

  async createTestFile(name: string, content: string): Promise<void> {
    const filePath = path.join(this.testDir, name);
    
    // Ensure parent directory exists
    const fileDir = path.dirname(filePath);
    await fs.mkdir(fileDir, { recursive: true });
    
    await fs.writeFile(filePath, content);
  }

  async modifyTestFile(name: string, content: string): Promise<void> {
    const filePath = path.join(this.testDir, name);
    
    // Use appendFile to ensure a 'change' event instead of 'add'
    await fs.writeFile(filePath, content, { flag: 'w' });
  }

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
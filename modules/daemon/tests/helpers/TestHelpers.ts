/**
 * Test Helper Functions for Aggregates Statistics Tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface AggregateData {
  id: number;
  file_id: number;
  total_events: number;
  total_finds: number;
  total_creates: number;
  total_modifies: number;
  total_deletes: number;
  total_moves: number;
  total_restores: number;
  first_size: number;
  max_size: number;
  last_size: number;
  first_event_timestamp: number;
  last_event_timestamp: number;
  file_path: string;
  inode_number: number;
  is_active: boolean;
}

export interface GlobalStatistics {
  total_finds: number;
  total_creates: number;
  total_modifies: number;
  total_deletes: number;
  total_moves: number;
  total_restores: number;
  total_events: number;
  total_files: number;
  active_files: number;
  total_current_size: number;
  avg_file_size: number;
  largest_file_size: number;
  smallest_file_size: number;
  earliest_event: number;
  latest_event: number;
}

export class TestEnvironment {
  public testDir: string;
  public testDbPath: string;

  constructor() {
    this.testDir = '';
    this.testDbPath = '';
  }

  async setup(): Promise<void> {
    this.testDir = '/tmp/cctop-aggregates-test';
    this.testDbPath = path.join(this.testDir, '.cctop/data/activity.db');

    // Use the standard setupDaemonTest function
    const { setupDaemonTest } = await import('../test-helpers');
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

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class TestFileOperations {
  static async createFiles(files: Array<{name: string, content: string}>, testDir?: string): Promise<void> {
    for (const file of files) {
      const filePath = testDir ? path.join(testDir, file.name) : file.name;
      
      // Ensure parent directory exists
      if (testDir) {
        const fileDir = path.dirname(filePath);
        await fs.mkdir(fileDir, { recursive: true });
      }
      
      await fs.writeFile(filePath, file.content);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  static async performFileOperations(
    operations: Array<{file: string, operations: string[]}>,
    testDir?: string
  ): Promise<void> {
    for (const op of operations) {
      let content = `Initial content for ${op.file}`;
      const filePath = testDir ? path.join(testDir, op.file) : op.file;

      for (const operation of op.operations) {
        switch (operation) {
          case 'create':
            await fs.writeFile(filePath, content);
            break;
          case 'modify':
            content += '\nModified content';
            await fs.writeFile(filePath, content);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  static getSizeTestCases(): Array<{content: string, size: number}> {
    const testContent = {
      small: 'Hello',
      medium: 'This is a medium-sized file with more content',
      large: 'This is a large file with substantial content that spans multiple lines.\nLine 2\nLine 3\nLine 4\nLine 5'
    };

    return [
      { content: testContent.small, size: Buffer.from(testContent.small).length },
      { content: testContent.medium, size: Buffer.from(testContent.medium).length },
      { content: testContent.large, size: Buffer.from(testContent.large).length }
    ];
  }
}
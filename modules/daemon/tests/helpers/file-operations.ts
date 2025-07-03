/**
 * File Operation Utilities for Testing
 * Provides helper functions for file-based test scenarios
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { waitForFileEvent } from './wait-utilities';
import { DatabaseQueries } from './database-queries';

/**
 * Create a file and wait for it to be detected
 */
export async function createFileAndWaitForEvent(
  testDir: string,
  dbQueries: DatabaseQueries,
  filename: string,
  content: string = 'test content',
  eventType: string = 'create'
): Promise<void> {
  const filePath = path.join(testDir, filename);
  await fs.writeFile(filePath, content);
  await waitForFileEvent(dbQueries, filename, eventType);
}

/**
 * Delete a file and wait for the delete event
 */
export async function deleteFileAndWaitForEvent(
  testDir: string,
  dbQueries: DatabaseQueries,
  filename: string
): Promise<void> {
  const filePath = path.join(testDir, filename);
  await fs.unlink(filePath);
  await waitForFileEvent(dbQueries, filename, 'delete');
}

/**
 * Move a file and wait for the move event
 */
export async function moveFileAndWaitForEvent(
  testDir: string,
  dbQueries: DatabaseQueries,
  oldName: string,
  newName: string
): Promise<void> {
  const oldPath = path.join(testDir, oldName);
  const newPath = path.join(testDir, newName);
  await fs.rename(oldPath, newPath);
  await waitForFileEvent(dbQueries, newName, 'move');
}

/**
 * Test file operations helper class
 */
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
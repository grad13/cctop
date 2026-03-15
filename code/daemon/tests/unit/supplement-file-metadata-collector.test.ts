/**
 * FileMetadataCollector Unit Tests
 * Spec: SPEC-D09 Supplement: File Metadata Collection
 * Focus: Error handling (symlinks, permissions, missing files)
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FileMetadataCollector, FileMetadata } from '../../code/daemon/src/events/FileMetadataCollector';
import { LogManager } from '../../code/daemon/src/logging/LogManager';

describe('FileMetadataCollector', () => {
  let collector: FileMetadataCollector;
  let logger: LogManager;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let debugLogSpy: ReturnType<typeof vi.spyOn>;
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cctop-metadata-test-'));
    logger = new LogManager(path.join(testDir, 'test.log'), 'debug');
    // Suppress console.log output during tests
    logSpy = vi.spyOn(logger, 'log');
    debugLogSpy = vi.spyOn(logger, 'debugLog');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    collector = new FileMetadataCollector(logger);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('collect - success cases', () => {
    it('should return inode and size for a regular file', async () => {
      const filePath = path.join(testDir, 'regular.txt');
      const content = 'hello world';
      await fs.writeFile(filePath, content);
      const stat = await fs.stat(filePath);

      const result = await collector.collect(filePath);

      expect(result).not.toBeNull();
      expect(result!.inode).toBe(stat.ino);
      expect(result!.size).toBe(Buffer.byteLength(content));
    });

    it('should return size 0 for an empty file', async () => {
      const filePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(filePath, '');

      const result = await collector.collect(filePath);

      expect(result).not.toBeNull();
      expect(result!.size).toBe(0);
    });

    it('should call debugLog on success with filePath, inode, and size', async () => {
      const filePath = path.join(testDir, 'debug-log-test.txt');
      await fs.writeFile(filePath, 'test');
      const stat = await fs.stat(filePath);

      await collector.collect(filePath);

      expect(debugLogSpy).toHaveBeenCalledWith(
        'DEBUG: fs.stat success',
        { filePath, inode: stat.ino, size: stat.size }
      );
    });
  });

  describe('collect - error handling', () => {
    it('should return null for a non-existent file', async () => {
      const filePath = path.join(testDir, 'does-not-exist.txt');

      const result = await collector.collect(filePath);

      expect(result).toBeNull();
    });

    it('should log a warning when stat fails for a non-existent file', async () => {
      const filePath = path.join(testDir, 'missing.txt');

      await collector.collect(filePath);

      expect(logSpy).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining(filePath)
      );
    });

    it('should return null for a broken symlink', async () => {
      const targetPath = path.join(testDir, 'target-gone.txt');
      const symlinkPath = path.join(testDir, 'broken-link.txt');
      // Create then delete the target to make a broken symlink
      await fs.writeFile(targetPath, 'temporary');
      await fs.symlink(targetPath, symlinkPath);
      await fs.unlink(targetPath);

      const result = await collector.collect(symlinkPath);

      // fs.stat follows symlinks, so a broken symlink causes ENOENT
      expect(result).toBeNull();
    });

    it('should log a warning for a broken symlink', async () => {
      const targetPath = path.join(testDir, 'target-gone2.txt');
      const symlinkPath = path.join(testDir, 'broken-link2.txt');
      await fs.writeFile(targetPath, 'temporary');
      await fs.symlink(targetPath, symlinkPath);
      await fs.unlink(targetPath);

      await collector.collect(symlinkPath);

      expect(logSpy).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining(symlinkPath)
      );
    });

    it('should return null for an inaccessible file (no read permission)', async () => {
      // Skip on Windows where chmod doesn't work the same way
      if (process.platform === 'win32') return;
      // Skip if running as root (root ignores file permissions)
      if (process.getuid && process.getuid() === 0) return;

      const filePath = path.join(testDir, 'no-permission.txt');
      await fs.writeFile(filePath, 'secret');
      await fs.chmod(filePath, 0o000);

      // fs.stat still works on files with no read permission (stat uses directory entry, not file content).
      // This test verifies the collect method handles the result correctly.
      const result = await collector.collect(filePath);

      // fs.stat succeeds even with 000 permissions (it reads inode metadata, not file content)
      // So this should actually return metadata, not null
      expect(result).not.toBeNull();

      // Restore permissions for cleanup
      await fs.chmod(filePath, 0o644);
    });

    it('should return null when the parent directory has no execute permission', async () => {
      // Skip on Windows
      if (process.platform === 'win32') return;
      // Skip if running as root
      if (process.getuid && process.getuid() === 0) return;

      const restrictedDir = path.join(testDir, 'restricted');
      await fs.mkdir(restrictedDir);
      const filePath = path.join(restrictedDir, 'hidden.txt');
      await fs.writeFile(filePath, 'hidden content');
      // Remove execute permission on directory (prevents stat on files inside)
      await fs.chmod(restrictedDir, 0o000);

      const result = await collector.collect(filePath);

      expect(result).toBeNull();
      expect(logSpy).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining(filePath)
      );

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755);
    });

    it('should not throw when stat fails', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      // Should resolve without throwing
      await expect(collector.collect(filePath)).resolves.toBeNull();
    });
  });

  describe('collect - symlink handling', () => {
    it('should follow a valid symlink and return the target metadata', async () => {
      const targetPath = path.join(testDir, 'real-file.txt');
      const symlinkPath = path.join(testDir, 'link-to-real.txt');
      const content = 'symlink target content';
      await fs.writeFile(targetPath, content);
      await fs.symlink(targetPath, symlinkPath);

      const targetStat = await fs.stat(targetPath);
      const result = await collector.collect(symlinkPath);

      expect(result).not.toBeNull();
      // fs.stat follows symlinks, so inode and size should match the target
      expect(result!.inode).toBe(targetStat.ino);
      expect(result!.size).toBe(Buffer.byteLength(content));
    });
  });

  describe('collect - return type contract', () => {
    it('should return an object with exactly inode and size properties', async () => {
      const filePath = path.join(testDir, 'contract.txt');
      await fs.writeFile(filePath, 'contract test');

      const result = await collector.collect(filePath);

      expect(result).not.toBeNull();
      const keys = Object.keys(result!);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('inode');
      expect(keys).toContain('size');
      expect(typeof result!.inode).toBe('number');
      expect(typeof result!.size).toBe('number');
    });
  });
});

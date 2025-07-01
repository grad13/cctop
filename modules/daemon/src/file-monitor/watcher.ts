import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileEvent } from '@cctop/shared';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface WatcherOptions {
  ignored: string[];
  followSymlinks: boolean;
  awaitWriteFinish: {
    stabilityThreshold: number;
    pollInterval: number;
  };
}

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string;
  private options: WatcherOptions;
  private isInitialScan = true;

  constructor(projectPath: string, options: WatcherOptions) {
    super();
    this.projectPath = projectPath;
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('Watcher already started');
    }

    logger.info(`Starting file watcher for ${this.projectPath}`);

    this.watcher = chokidar.watch(this.projectPath, {
      ignored: this.options.ignored,
      persistent: true,
      followSymlinks: this.options.followSymlinks,
      awaitWriteFinish: this.options.awaitWriteFinish,
      ignoreInitial: false,
      alwaysStat: true,
      depth: undefined
    });

    this.watcher
      .on('add', (filePath, stats) => this.handleAdd(filePath, stats))
      .on('addDir', (dirPath, stats) => this.handleAddDir(dirPath, stats))
      .on('change', (filePath, stats) => this.handleChange(filePath, stats))
      .on('unlink', (filePath) => this.handleUnlink(filePath))
      .on('unlinkDir', (dirPath) => this.handleUnlinkDir(dirPath))
      .on('ready', () => {
        logger.info('Initial scan complete');
        this.isInitialScan = false;
        this.emit('ready');
      })
      .on('error', (error) => {
        logger.error('Watcher error', error);
        this.emit('error', error);
      });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      logger.info('File watcher stopped');
    }
  }

  private async createFileEvent(
    eventType: FileEvent['eventType'],
    filePath: string,
    stats?: fs.Stats,
    oldPath?: string
  ): Promise<FileEvent> {
    const fullPath = path.resolve(filePath);
    const relativePath = path.relative(this.projectPath, fullPath);
    const parentDir = path.dirname(fullPath);
    const extension = path.extname(filePath) || null;
    const depth = relativePath.split(path.sep).length - 1;

    let lineCount: number | null = null;
    if (stats && !stats.isDirectory() && this.isTextFile(filePath)) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        lineCount = content.split('\n').length;
      } catch (error) {
        logger.warn(`Failed to count lines for ${filePath}`, error);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      eventType,
      projectPath: this.projectPath,
      fullPath,
      relativePath,
      isDirectory: stats?.isDirectory() || false,
      size: stats?.size || 0,
      lineCount,
      extension,
      depth,
      inode: stats?.ino || null,
      parentDir,
      oldPath
    };
  }

  private isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.json',
      '.html', '.css', '.scss', '.sass', '.less',
      '.py', '.rb', '.go', '.java', '.c', '.cpp', '.h',
      '.sh', '.bash', '.zsh', '.yml', '.yaml', '.xml'
    ];
    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  private async handleAdd(filePath: string, stats?: fs.Stats): Promise<void> {
    const eventType = this.isInitialScan ? 'find' : 'create';
    const event = await this.createFileEvent(eventType, filePath, stats);
    this.emit('fileEvent', event);
  }

  private async handleAddDir(dirPath: string, stats?: fs.Stats): Promise<void> {
    const eventType = this.isInitialScan ? 'find' : 'create';
    const event = await this.createFileEvent(eventType, dirPath, stats);
    this.emit('fileEvent', event);
  }

  private async handleChange(filePath: string, stats?: fs.Stats): Promise<void> {
    const event = await this.createFileEvent('modify', filePath, stats);
    this.emit('fileEvent', event);
  }

  private async handleUnlink(filePath: string): Promise<void> {
    const event = await this.createFileEvent('delete', filePath);
    this.emit('fileEvent', event);
  }

  private async handleUnlinkDir(dirPath: string): Promise<void> {
    const event = await this.createFileEvent('delete', dirPath);
    this.emit('fileEvent', event);
  }
}
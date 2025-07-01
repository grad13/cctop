import { DatabaseConnection, FileEventRepository } from '../src/database';
import { FileEvent } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('DatabaseConnection', () => {
  const testDbPath = path.join(__dirname, 'test.db');
  let connection: DatabaseConnection;

  beforeEach(async () => {
    // Clean up test database
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(`${testDbPath}-wal`);
      await fs.unlink(`${testDbPath}-shm`);
    } catch {}
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
    // Clean up
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(`${testDbPath}-wal`);
      await fs.unlink(`${testDbPath}-shm`);
    } catch {}
  });

  it('should connect to database and initialize schema', async () => {
    connection = new DatabaseConnection(testDbPath);
    await expect(connection.connect()).resolves.not.toThrow();
    
    // Verify WAL mode is enabled
    const result = await connection.get<{ journal_mode: string }>('PRAGMA journal_mode');
    expect(result?.journal_mode).toBe('wal');
  });

  it('should throw error when connecting to non-existent database in read-only mode', async () => {
    connection = new DatabaseConnection(testDbPath, true);
    await expect(connection.connect()).rejects.toThrow('Database directory does not exist');
  });

  it('should prevent writes in read-only mode', async () => {
    // First create database
    connection = new DatabaseConnection(testDbPath);
    await connection.connect();
    await connection.close();

    // Then open in read-only mode
    connection = new DatabaseConnection(testDbPath, true);
    await connection.connect();

    await expect(connection.run('INSERT INTO file_events (timestamp) VALUES (?)', ['test']))
      .rejects.toThrow('Cannot write to read-only database');
  });
});

describe('FileEventRepository', () => {
  const testDbPath = path.join(__dirname, 'test-repo.db');
  let connection: DatabaseConnection;
  let repository: FileEventRepository;

  beforeEach(async () => {
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(`${testDbPath}-wal`);
      await fs.unlink(`${testDbPath}-shm`);
    } catch {}

    connection = new DatabaseConnection(testDbPath);
    await connection.connect();
    repository = new FileEventRepository(connection);
  });

  afterEach(async () => {
    await connection.close();
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(`${testDbPath}-wal`);
      await fs.unlink(`${testDbPath}-shm`);
    } catch {}
  });

  it('should insert and retrieve file events', async () => {
    const event: FileEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'create',
      projectPath: '/test/project',
      fullPath: '/test/project/file.ts',
      relativePath: 'file.ts',
      isDirectory: false,
      size: 1024,
      lineCount: 50,
      extension: '.ts',
      depth: 1,
      inode: 12345,
      parentDir: '/test/project'
    };

    await repository.insertEvent(event);

    const events = await repository.getRecentEvents(10);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: event.eventType,
      relativePath: event.relativePath,
      size: event.size
    });
  });

  it('should insert events in batch', async () => {
    const events: FileEvent[] = Array.from({ length: 5 }, (_, i) => ({
      timestamp: new Date().toISOString(),
      eventType: 'create' as const,
      projectPath: '/test/project',
      fullPath: `/test/project/file${i}.ts`,
      relativePath: `file${i}.ts`,
      isDirectory: false,
      size: 1024 * (i + 1),
      lineCount: 50 * (i + 1),
      extension: '.ts',
      depth: 1,
      inode: 12345 + i,
      parentDir: '/test/project'
    }));

    await repository.insertEventsBatch(events);

    const retrieved = await repository.getRecentEvents(10);
    expect(retrieved).toHaveLength(5);
  });

  it('should calculate project statistics', async () => {
    const projectPath = '/test/project';
    
    // Insert some test events
    const events: FileEvent[] = [
      {
        timestamp: new Date().toISOString(),
        eventType: 'create',
        projectPath,
        fullPath: `${projectPath}/src`,
        relativePath: 'src',
        isDirectory: true,
        size: 0,
        lineCount: null,
        extension: null,
        depth: 1,
        inode: 1000,
        parentDir: projectPath
      },
      {
        timestamp: new Date().toISOString(),
        eventType: 'create',
        projectPath,
        fullPath: `${projectPath}/src/index.ts`,
        relativePath: 'src/index.ts',
        isDirectory: false,
        size: 2048,
        lineCount: 100,
        extension: '.ts',
        depth: 2,
        inode: 1001,
        parentDir: `${projectPath}/src`
      },
      {
        timestamp: new Date().toISOString(),
        eventType: 'create',
        projectPath,
        fullPath: `${projectPath}/README.md`,
        relativePath: 'README.md',
        isDirectory: false,
        size: 1024,
        lineCount: 50,
        extension: '.md',
        depth: 1,
        inode: 1002,
        parentDir: projectPath
      }
    ];

    await repository.insertEventsBatch(events);

    const stats = await repository.getProjectStats(projectPath);
    expect(stats.totalFiles).toBe(2);
    expect(stats.totalDirectories).toBe(1);
    expect(stats.totalSize).toBe(3072);
  });
});
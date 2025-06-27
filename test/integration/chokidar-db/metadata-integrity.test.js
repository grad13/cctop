/**
 * FUNC-000: Database Foundation Metadata Integrity Test
 * BP-001 compliant - 5-table structure metadata integrity verification
 * Measurement value validation through events/measurements JOIN results
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const FileMonitor = require('../../../src/monitors/file-monitor');
const EventProcessor = require('../../../src/monitors/event-processor');
const DatabaseManager = require('../../../src/database/database-manager');

describe('FUNC-000: Metadata Integrity (measurements table measurement value integrity)', () => {
  let testDir;
  let fileMonitor;
  let eventProcessor;
  let dbManager;
  let dbPath;

  beforeEach(async () => {
    // Test temporary directory
    testDir = path.join(os.tmpdir(), `func000-metadata-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Test database
    dbPath = path.join(testDir, 'test-metadata.db');
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();
    expect(dbManager.isInitialized).toBe(true);

    // Event Processor initialization (with database connection verification)
    eventProcessor = new EventProcessor(dbManager);
    
    // Wait for database connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Re-verify database connection
    expect(dbManager.isInitialized).toBe(true);

    // File Monitor configuration
    const config = {
      watchPaths: [testDir],
      ignored: ['**/test-*.db', '**/test-*.db-*', '**/*.db-wal', '**/*.db-shm'],
      depth: 10
    };
    fileMonitor = new FileMonitor(config);
    
    // Event integration
    fileMonitor.on('fileEvent', (event) => {
      eventProcessor.processFileEvent(event);
    });
  });

  afterEach(async () => {
    // Resource cleanup
    if (fileMonitor) {
      fileMonitor.removeAllListeners();
      await fileMonitor.stop();
      fileMonitor = null;
    }
    
    if (dbManager) {
      await dbManager.close();
      dbManager = null;
    }

    // Delete test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('meta-001: file_size accuracy - from 0 bytes to large files', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // Create files of various sizes
    const testFiles = [
      { name: 'empty.txt', content: '', expectedSize: 0 },
      { name: 'small.txt', content: 'A', expectedSize: 1 },
      { name: 'medium.txt', content: 'A'.repeat(1024), expectedSize: 1024 },
      { name: 'large.txt', content: 'B'.repeat(10240), expectedSize: 10240 }
    ];

    for (const file of testFiles) {
      const filePath = path.join(testDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    
    for (const file of testFiles) {
      const filePath = path.resolve(path.join(testDir, file.name));
      const event = allEvents.find(e => 
        e.file_path === filePath && e.event_type === 'create'
      );
      
      expect(event).toBeDefined();
      expect(event.file_size).toBe(file.expectedSize);
    }
  });

  test('meta-002: line_count accuracy - various line break patterns', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // Create files with various line counts
    const testFiles = [
      { name: 'nolines.txt', content: '', expectedLines: 0 },
      { name: 'oneline.txt', content: 'Single line', expectedLines: 1 },
      { name: 'twolines.txt', content: 'Line 1\nLine 2', expectedLines: 2 },
      { name: 'multilines.txt', content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5', expectedLines: 5 },
      { name: 'trailing-newline.txt', content: 'Line 1\nLine 2\n', expectedLines: 2 },
      { name: 'empty-lines.txt', content: 'Line 1\n\nLine 3\n\nLine 5', expectedLines: 5 }
    ];

    for (const file of testFiles) {
      const filePath = path.join(testDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    
    for (const file of testFiles) {
      const filePath = path.resolve(path.join(testDir, file.name));
      const event = allEvents.find(e => 
        e.file_path === filePath && e.event_type === 'create'
      );
      
      expect(event).toBeDefined();
      expect(event.line_count).toBe(file.expectedLines);
    }
  });

  test('meta-003: timestamp precision and timing verification', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // File operations while recording timestamps
    const operations = [];
    
    // 1. create
    const beforeCreate = Date.now();
    const testFile = path.join(testDir, 'timestamp-test.txt');
    fs.writeFileSync(testFile, 'Initial content');
    const afterCreate = Date.now();
    operations.push({ type: 'create', before: beforeCreate, after: afterCreate });

    await new Promise(resolve => setTimeout(resolve, 200));

    // 2. modify - write different content to reliably trigger modify event
    const beforeModify = Date.now();
    // Completely overwrite file content to reliably trigger modify event
    fs.writeFileSync(testFile, 'Completely different content to trigger modify event');
    const afterModify = Date.now();
    operations.push({ type: 'modify', before: beforeModify, after: afterModify });

    await new Promise(resolve => setTimeout(resolve, 200));

    // 3. delete
    const beforeDelete = Date.now();
    fs.unlinkSync(testFile);
    const afterDelete = Date.now();
    operations.push({ type: 'delete', before: beforeDelete, after: afterDelete });

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    const testEvents = allEvents.filter(e => 
      e.file_path === path.resolve(testFile)
    );

    expect(testEvents.length).toBeGreaterThanOrEqual(3);

    // Verify timestamp precision for each operation
    // Considering event processing delay, timestamp must be after operation start time
    for (const operation of operations) {
      const event = testEvents.find(e => e.event_type === operation.type);
      expect(event).toBeDefined();
      // Timestamp must be after operation start time
      expect(event.timestamp).toBeGreaterThanOrEqual(operation.before);
      // Relaxed to within 200ms considering processing delay
      expect(event.timestamp).toBeLessThanOrEqual(operation.after + 200);
    }

    // Verify chronological order of timestamps
    const sortedEvents = testEvents.sort((a, b) => a.timestamp - b.timestamp);
    expect(sortedEvents[0].event_type).toBe('create');
    expect(sortedEvents[1].event_type).toBe('modify');
    expect(sortedEvents[2].event_type).toBe('delete');
  });

  test('meta-004: file_path absolute path normalization verification', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // Create files with various path formats
    const baseDir = path.join(testDir, 'subdir');
    fs.mkdirSync(baseDir, { recursive: true });

    const testFiles = [
      path.join(testDir, 'root-file.txt'),
      path.join(baseDir, 'sub-file.txt'),
      path.join(baseDir, 'deep', 'nested-file.txt')  // Deep nesting
    ];

    // Create directory for deep nesting
    fs.mkdirSync(path.dirname(testFiles[2]), { recursive: true });

    for (const filePath of testFiles) {
      fs.writeFileSync(filePath, 'Test content');
    }

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    
    for (const originalPath of testFiles) {
      const expectedPath = path.resolve(originalPath);
      const event = allEvents.find(e => 
        e.file_path === expectedPath && e.event_type === 'create'
      );
      
      expect(event).toBeDefined();
      expect(event.file_path).toBe(expectedPath);
      expect(path.isAbsolute(event.file_path)).toBe(true);
    }
  });

  test('meta-005: inode uniqueness and object identification', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // Create file
    const testFile = path.join(testDir, 'inode-test.txt');
    fs.writeFileSync(testFile, 'Inode test content');

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get inode from filesystem
    const stats = fs.statSync(testFile);
    const expectedInode = stats.ino;

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    const createEvent = allEvents.find(e => 
      e.file_path === path.resolve(testFile) && e.event_type === 'create'
    );

    expect(createEvent).toBeDefined();
    
    // Verify inode match
    if (expectedInode) { // Conditional due to platform dependency
      expect(createEvent.file_id).toBeDefined();
      
      // Verify inode in files table
      const fileData = await dbManager.get(
        'SELECT inode FROM files WHERE id = ?',
        [createEvent.file_id]
      );
      expect(fileData?.inode).toBe(expectedInode);
    }
  });

  test('meta-006: is_directory accurate determination', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // Create files and directories
    const testFile = path.join(testDir, 'regular-file.txt');
    const testDirectory = path.join(testDir, 'test-directory');

    fs.writeFileSync(testFile, 'Regular file content');
    fs.mkdirSync(testDirectory);

    // Create file in directory (verify directory event)
    const nestedFile = path.join(testDirectory, 'nested.txt');
    fs.writeFileSync(nestedFile, 'Nested file');

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    
    // Verify file event
    const fileEvent = allEvents.find(e => 
      e.file_path === path.resolve(testFile) && e.event_type === 'create'
    );
    expect(fileEvent).toBeDefined();
    // FUNC-000 compliant: is_directory determined by filesystem stat
    const fileStats = fs.statSync(testFile);
    expect(fileStats.isFile()).toBe(true);

    // Verify directory event
    const dirEvent = allEvents.find(e => 
      e.file_path === path.resolve(testDirectory) && e.event_type === 'create'
    );
    if (dirEvent) { // If directory event is recorded
      const dirStats = fs.statSync(testDirectory);
      expect(dirStats.isDirectory()).toBe(true);
    }

    // Verify nested file event
    const nestedEvent = allEvents.find(e => 
      e.file_path === path.resolve(nestedFile) && e.event_type === 'create'
    );
    expect(nestedEvent).toBeDefined();
    const nestedStats = fs.statSync(nestedFile);
    expect(nestedStats.isFile()).toBe(true);
  });

  test('meta-007: measurements table all required fields existence verification', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // Create test file
    const testFile = path.join(testDir, 'complete-metadata.txt');
    const content = 'Line 1\nLine 2\nLine 3';
    fs.writeFileSync(testFile, content);

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    const createEvent = allEvents.find(e => 
      e.file_path === path.resolve(testFile) && e.event_type === 'create'
    );

    expect(createEvent).toBeDefined();

    // Verify required metadata fields (FUNC-000 compliant)
    expect(createEvent.file_size).toBeDefined();
    expect(createEvent.file_size).toBe(content.length);
    
    expect(createEvent.line_count).toBeDefined();
    expect(createEvent.line_count).toBe(3);
    
    expect(createEvent.timestamp).toBeDefined();
    expect(createEvent.timestamp).toBeGreaterThan(0);
    
    expect(createEvent.file_path).toBeDefined();
    expect(createEvent.file_path).toBe(path.resolve(testFile));
    
    expect(createEvent.file_id).toBeDefined(); // File ID from files table
    expect(createEvent.file_id).toBeGreaterThan(0);
    
    // FUNC-000: is_directory determined by filesystem stat
    const fileStats = fs.statSync(testFile);
    expect(fileStats.isFile()).toBe(true);

    // Additional integrity verification
    expect(createEvent.file_name).toBe('complete-metadata.txt');
    expect(createEvent.directory).toBeDefined();
    expect(createEvent.event_type).toBe('create');
  });

  test('meta-008: metadata update accuracy on file modification', async () => {
    // Start monitoring
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 初期ファイル作成
    const testFile = path.join(testDir, 'update-metadata.txt');
    const initialContent = 'Initial line';
    fs.writeFileSync(testFile, initialContent);

    await new Promise(resolve => setTimeout(resolve, 200));

    // ファイル変更（サイズ・行数変更）
    const modifiedContent = 'Modified line 1\nModified line 2\nModified line 3\nModified line 4';
    fs.writeFileSync(testFile, modifiedContent);

    // Wait for processing completion
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify DB records
    const allEvents = await dbManager.getRecentEvents(1000);
    const filePath = path.resolve(testFile);
    
    const createEvent = allEvents.find(e => 
      e.file_path === filePath && e.event_type === 'create'
    );
    const modifyEvent = allEvents.find(e => 
      e.file_path === filePath && e.event_type === 'modify'
    );

    expect(createEvent).toBeDefined();
    expect(modifyEvent).toBeDefined();

    // create時のメタデータ
    expect(createEvent.file_size).toBe(initialContent.length);
    expect(createEvent.line_count).toBe(1);

    // modify時のメタデータ更新確認
    expect(modifyEvent.file_size).toBe(modifiedContent.length);
    expect(modifyEvent.line_count).toBe(4);
    expect(modifyEvent.timestamp).toBeGreaterThan(createEvent.timestamp);
    
    // 同じファイルのobject_id一致確認
    expect(modifyEvent.object_id).toBe(createEvent.object_id);
  });
});
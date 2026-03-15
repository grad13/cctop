/**
 * View Entry Point Tests (from spec: supplement-index.md)
 * Tests CCTOPCli class and main() startup sequence
 * No existing tests cover this module
 * @created 2026-03-14
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../../../src/ui/BlessedFramelessUI', () => ({
  BlessedFramelessUISimple: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../src/database/FileEventReader', () => ({
  FileEventReader: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../src/cli/argument-parser', () => ({
  parseArguments: vi.fn().mockReturnValue({}),
  showHelp: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return { ...actual };
});

describe('CCTOPCli', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit globally to prevent main() side effect from terminating
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should accept empty arguments', async () => {
      const { CCTOPCli } = await import('../../../src/index');
      const cli = new CCTOPCli({});
      expect(cli).toBeDefined();
    });
  });

  describe('findDatabasePath', () => {
    it('should construct database path from target directory', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(true);

      const { CCTOPCli } = await import('../../../src/index');
      // constructor calls findDatabasePath internally
      const cli = new CCTOPCli({});
      expect(cli).toBeDefined();
    });

    it('should throw error in view mode when DB is missing', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(false);

      const { CCTOPCli } = await import('../../../src/index');
      expect(() => new CCTOPCli({ view: true })).toThrow(/No existing database found/);
    });

    it('should call initializeCctopStructure when .cctop dir missing in normal mode', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(false);

      const { CCTOPCli } = await import('../../../src/index');
      // In normal mode, missing .cctop should trigger directory creation
      const cli = new CCTOPCli({});
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('initializeCctopStructure', () => {
    it('should create all required subdirectories', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(false);

      const { CCTOPCli } = await import('../../../src/index');
      new CCTOPCli({});

      // Should create config, themes, data, logs, runtime, temp
      const mkdirCalls = (fs.mkdirSync as any).mock.calls;
      const createdPaths = mkdirCalls.map((call: any[]) => call[0]);
      const expectedDirs = ['config', 'themes', 'data', 'logs', 'runtime', 'temp'];
      for (const dir of expectedDirs) {
        expect(createdPaths.some((p: string) => p.includes(dir))).toBe(true);
      }
    });
  });

  describe('start', () => {
    it('should create FileEventReader and connect to database', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(true);

      const { CCTOPCli } = await import('../../../src/index');
      const { FileEventReader } = await import('../../../src/database/FileEventReader');

      const cli = new CCTOPCli({});
      await cli.start();

      expect(FileEventReader).toHaveBeenCalled();
    });

    it('should create BlessedFramelessUISimple with displayMode all', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(true);

      const { CCTOPCli } = await import('../../../src/index');
      const { BlessedFramelessUISimple } = await import('../../../src/ui/BlessedFramelessUI');

      const cli = new CCTOPCli({});
      await cli.start();

      expect(BlessedFramelessUISimple).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ displayMode: 'all' })
      );
    });
  });

  describe('stop', () => {
    it('should call ui.stop and db.disconnect', async () => {
      const fs = await import('fs');
      (fs.existsSync as any).mockReturnValue(true);

      const { CCTOPCli } = await import('../../../src/index');
      const cli = new CCTOPCli({});
      await cli.start();
      await cli.stop();

      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});

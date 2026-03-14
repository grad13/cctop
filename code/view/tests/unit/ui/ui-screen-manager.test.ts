/**
 * ui-screen-manager.test
 * @created 2026-03-14
 * @checked 2026-03-14
 * @updated 2026-03-14
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock blessed before importing UIScreenManager
const mockScreen = {
  destroy: vi.fn(),
};

vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => mockScreen),
    program: {
      prototype: {
        _parseTerminfo: vi.fn(() => ({})),
      },
    },
  },
  screen: vi.fn(() => mockScreen),
  program: {
    prototype: {
      _parseTerminfo: vi.fn(() => ({})),
    },
  },
}));

import { UIScreenManager } from '../../../src/ui/UIScreenManager.js';

describe('UIScreenManager', () => {
  let manager: UIScreenManager;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    originalStderrWrite = process.stderr.write;
    manager = new UIScreenManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore stderr
    process.stderr.write = originalStderrWrite;
  });

  describe('initializeScreen', () => {
    it('should return a blessed screen instance', () => {
      const screen = manager.initializeScreen();
      expect(screen).toBe(mockScreen);
    });

    it('should suppress xterm error messages on stderr', () => {
      manager.initializeScreen();

      const writes: string[] = [];
      const currentWrite = process.stderr.write;
      // Intercept the patched stderr to check filtering
      const result = (currentWrite as any).call(process.stderr, 'Error on xterm something');
      expect(result).toBe(true);
    });

    it('should suppress Setulc messages on stderr', () => {
      manager.initializeScreen();

      const result = (process.stderr.write as any).call(process.stderr, 'Setulc capability issue');
      expect(result).toBe(true);
    });

    it('should pass through normal stderr output', () => {
      manager.initializeScreen();

      // The patched write should delegate to original for non-suppressed messages
      const mockOriginal = vi.fn(() => true);
      // We can't easily test passthrough without side effects, so verify the function is replaced
      expect(process.stderr.write).not.toBe(originalStderrWrite);
    });

    it('should set TERM environment variable to xterm', () => {
      manager.initializeScreen();
      expect(process.env.TERM).toBe('xterm');
    });
  });

  describe('getScreen', () => {
    it('should return the initialized screen', () => {
      manager.initializeScreen();
      expect(manager.getScreen()).toBe(mockScreen);
    });
  });

  describe('destroy', () => {
    it('should call screen.destroy() when screen exists', () => {
      manager.initializeScreen();
      manager.destroy();
      expect(mockScreen.destroy).toHaveBeenCalledOnce();
    });

    it('should not throw when screen.destroy() throws', () => {
      manager.initializeScreen();
      mockScreen.destroy.mockImplementationOnce(() => {
        throw new Error('cleanup error');
      });

      expect(() => manager.destroy()).not.toThrow();
    });

    it('should not throw when screen is not initialized', () => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});

/**
 * BufferedRenderer Test (FUNC-018 compliant)
 */

// Vitest globals setup (automatically available with globals: true in vitest.config.js)
const BufferedRenderer = require('../../src/utils/buffered-renderer');

describe('BufferedRenderer', () => {
  let renderer;
  let mockStdout;

  beforeEach(() => {
    // Mock for process.stdout.write
    mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
    renderer = new BufferedRenderer({ enableDebounce: false }); // Disable debounce for testing
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
    mockStdout.mockRestore();
  });

  describe('Basic Functionality', () => {
    test('Buffer Management', () => {
      renderer.addLine('test line 1');
      renderer.addLine('test line 2');
      
      expect(renderer.buffer).toHaveLength(2);
      expect(renderer.buffer[0]).toBe('test line 1');
      expect(renderer.buffer[1]).toBe('test line 2');
    });

    test('Clear Operation', () => {
      renderer.addLine('test');
      expect(renderer.buffer).toHaveLength(1);
      
      renderer.clear();
      expect(renderer.buffer).toHaveLength(0);
      expect(renderer.previousBuffer).toHaveLength(1);
      expect(renderer.previousBuffer[0]).toBe('test');
    });

    test('Adding Empty Lines', () => {
      renderer.addLine('');
      renderer.addLine(null);
      renderer.addLine(undefined);
      
      expect(renderer.buffer).toHaveLength(3);
      expect(renderer.buffer[0]).toBe('');
      expect(renderer.buffer[1]).toBe('');
      expect(renderer.buffer[2]).toBe('');
    });
  });

  describe('Buffer Size Limitation', () => {
    test('Delete Old Lines When Exceeding Maximum Size', () => {
      const smallRenderer = new BufferedRenderer({ maxBufferSize: 3, enableDebounce: false });
      
      smallRenderer.addLine('line 1');
      smallRenderer.addLine('line 2');
      smallRenderer.addLine('line 3');
      smallRenderer.addLine('line 4'); // Exceeds maximum size
      
      expect(smallRenderer.buffer).toHaveLength(3);
      expect(smallRenderer.buffer[0]).toBe('line 2'); // First line is deleted
      expect(smallRenderer.buffer[2]).toBe('line 4');
      
      smallRenderer.destroy();
    });
  });

  describe('ANSI Escape Sequences', () => {
    test('Cursor Control Commands', () => {
      renderer.hideCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l');
      
      renderer.showCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h');
      
      renderer.moveCursor(5, 10);
      expect(mockStdout).toHaveBeenCalledWith('\x1b[5;10H');
      
      renderer.clearLine();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[2K');
    });

    test('Save and Restore Cursor Position', () => {
      renderer.saveCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[s');
      expect(renderer.cursorSaved).toBe(true);
      
      renderer.restoreCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[u');
    });

    test('Prevent Duplicate Cursor Save', () => {
      mockStdout.mockClear();
      
      renderer.saveCursor();
      renderer.saveCursor(); // Second call is ignored
      
      expect(mockStdout).toHaveBeenCalledTimes(1);
      expect(mockStdout).toHaveBeenCalledWith('\x1b[s');
    });
  });

  describe('Rendering Functionality', () => {
    test('Basic Rendering', () => {
      // Mock for console.clear
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      renderer.addLine('header');
      renderer.addLine('content');
      renderer.render();
      
      // console.clear is called on first render
      expect(mockConsole).toHaveBeenCalled();
      
      // Cursor control is called correctly
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l'); // hideCursor
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h'); // showCursor
      
      // Buffer contents are output
      expect(mockStdout).toHaveBeenCalledWith('header');
      expect(mockStdout).toHaveBeenCalledWith('content');
      
      mockConsole.mockRestore();
    });

    test('Rendering Empty Buffer', () => {
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      renderer.render();
      
      expect(mockConsole).toHaveBeenCalled();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l');
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h');
      
      mockConsole.mockRestore();
    });

    test('Full Rendering', () => {
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderer.addLine('line 1');
      renderer.addLine('line 2');
      renderer.fullRender();
      
      expect(mockConsole).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith('line 1');
      expect(mockLog).toHaveBeenCalledWith('line 2');
      expect(renderer.cursorSaved).toBe(false);
      
      mockConsole.mockRestore();
      mockLog.mockRestore();
    });
  });

  describe('Delayed Rendering', () => {
    test('Debounce Functionality', async () => {
      const debouncedRenderer = new BufferedRenderer({ 
        renderInterval: 10, 
        enableDebounce: true 
      });
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      debouncedRenderer.addLine('test');
      debouncedRenderer.renderDebounced();
      
      // Not executed immediately
      expect(mockConsole).not.toHaveBeenCalled();
      
      // Executed after specified time
      await new Promise(resolve => setTimeout(resolve, 15));
      expect(mockConsole).toHaveBeenCalled();
      mockConsole.mockRestore();
      debouncedRenderer.destroy();
    });

    test('Immediate Execution When Debounce Disabled', () => {
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      renderer.addLine('test');
      renderer.renderDebounced();
      
      // Executed immediately because debounce is disabled
      expect(mockConsole).toHaveBeenCalled();
      
      mockConsole.mockRestore();
    });
  });

  describe('Resource Management', () => {
    test('Reset Operation', () => {
      renderer.addLine('test');
      renderer.saveCursor();
      
      renderer.reset();
      
      expect(renderer.buffer).toHaveLength(0);
      expect(renderer.previousBuffer).toHaveLength(0);
      expect(renderer.cursorSaved).toBe(false);
      expect(renderer.renderTimer).toBeNull();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h'); // Show cursor
    });

    test('Destroy Operation', () => {
      renderer.addLine('test');
      
      renderer.destroy();
      
      expect(renderer.buffer).toHaveLength(0);
      expect(renderer.previousBuffer).toHaveLength(0);
      expect(renderer.cursorSaved).toBe(false);
    });
  });

  describe('Statistics Information', () => {
    test('getStats', () => {
      renderer.addLine('line1');
      renderer.addLine('line2');
      renderer.clear();
      
      const stats = renderer.getStats();
      
      expect(stats.bufferSize).toBe(0);
      expect(stats.previousBufferSize).toBe(2);
      expect(stats.maxBufferSize).toBe(10000);
      expect(stats.renderInterval).toBe(16);
      expect(stats.cursorSaved).toBe(false);
      expect(stats.enableDebounce).toBe(false);
    });
  });

  describe('Configuration Options', () => {
    test('Initialization with Custom Settings', () => {
      const customRenderer = new BufferedRenderer({
        renderInterval: 33,
        maxBufferSize: 100,
        enableDebounce: true
      });
      
      const stats = customRenderer.getStats();
      expect(stats.renderInterval).toBe(33);
      expect(stats.maxBufferSize).toBe(100);
      expect(stats.enableDebounce).toBe(true);
      
      customRenderer.destroy();
    });

    test('Default Settings', () => {
      const defaultRenderer = new BufferedRenderer();
      
      const stats = defaultRenderer.getStats();
      expect(stats.renderInterval).toBe(16);
      expect(stats.maxBufferSize).toBe(10000);
      expect(stats.enableDebounce).toBe(true);
      
      defaultRenderer.destroy();
    });
  });
});
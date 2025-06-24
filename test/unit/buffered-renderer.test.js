/**
 * BufferedRenderer テスト (FUNC-018準拠)
 */

// Vitest globals配置（vitest.config.jsのglobals: trueで自動利用可能）
const BufferedRenderer = require('../../src/utils/buffered-renderer');

describe('BufferedRenderer', () => {
  let renderer;
  let mockStdout;

  beforeEach(() => {
    // process.stdout.writeのモック
    mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
    renderer = new BufferedRenderer({ enableDebounce: false }); // テスト用にデバウンス無効
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
    mockStdout.mockRestore();
  });

  describe('基本機能', () => {
    test('バッファの管理', () => {
      renderer.addLine('test line 1');
      renderer.addLine('test line 2');
      
      expect(renderer.buffer).toHaveLength(2);
      expect(renderer.buffer[0]).toBe('test line 1');
      expect(renderer.buffer[1]).toBe('test line 2');
    });

    test('クリア処理', () => {
      renderer.addLine('test');
      expect(renderer.buffer).toHaveLength(1);
      
      renderer.clear();
      expect(renderer.buffer).toHaveLength(0);
      expect(renderer.previousBuffer).toHaveLength(1);
      expect(renderer.previousBuffer[0]).toBe('test');
    });

    test('空行の追加', () => {
      renderer.addLine('');
      renderer.addLine(null);
      renderer.addLine(undefined);
      
      expect(renderer.buffer).toHaveLength(3);
      expect(renderer.buffer[0]).toBe('');
      expect(renderer.buffer[1]).toBe('');
      expect(renderer.buffer[2]).toBe('');
    });
  });

  describe('バッファサイズ制限', () => {
    test('最大サイズを超えた場合の古い行削除', () => {
      const smallRenderer = new BufferedRenderer({ maxBufferSize: 3, enableDebounce: false });
      
      smallRenderer.addLine('line 1');
      smallRenderer.addLine('line 2');
      smallRenderer.addLine('line 3');
      smallRenderer.addLine('line 4'); // 最大サイズを超える
      
      expect(smallRenderer.buffer).toHaveLength(3);
      expect(smallRenderer.buffer[0]).toBe('line 2'); // 最初の行が削除される
      expect(smallRenderer.buffer[2]).toBe('line 4');
      
      smallRenderer.destroy();
    });
  });

  describe('ANSIエスケープシーケンス', () => {
    test('カーソル制御コマンド', () => {
      renderer.hideCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l');
      
      renderer.showCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h');
      
      renderer.moveCursor(5, 10);
      expect(mockStdout).toHaveBeenCalledWith('\x1b[5;10H');
      
      renderer.clearLine();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[2K');
    });

    test('カーソル位置の保存と復元', () => {
      renderer.saveCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[s');
      expect(renderer.cursorSaved).toBe(true);
      
      renderer.restoreCursor();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[u');
    });

    test('重複したカーソル保存の防止', () => {
      mockStdout.mockClear();
      
      renderer.saveCursor();
      renderer.saveCursor(); // 2回目は無視される
      
      expect(mockStdout).toHaveBeenCalledTimes(1);
      expect(mockStdout).toHaveBeenCalledWith('\x1b[s');
    });
  });

  describe('レンダリング機能', () => {
    test('基本的なレンダリング', () => {
      // console.clearのモック
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      renderer.addLine('header');
      renderer.addLine('content');
      renderer.render();
      
      // 初回はconsole.clearが呼ばれる
      expect(mockConsole).toHaveBeenCalled();
      
      // カーソル制御が正しく呼ばれる
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l'); // hideCursor
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h'); // showCursor
      
      // バッファ内容が出力される
      expect(mockStdout).toHaveBeenCalledWith('header');
      expect(mockStdout).toHaveBeenCalledWith('content');
      
      mockConsole.mockRestore();
    });

    test('空のバッファのレンダリング', () => {
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      renderer.render();
      
      expect(mockConsole).toHaveBeenCalled();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l');
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h');
      
      mockConsole.mockRestore();
    });

    test('フルレンダリング', () => {
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

  describe('遅延レンダリング', () => {
    test('デバウンス機能', (done) => {
      const debouncedRenderer = new BufferedRenderer({ 
        renderInterval: 10, 
        enableDebounce: true 
      });
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      debouncedRenderer.addLine('test');
      debouncedRenderer.renderDebounced();
      
      // 即座には実行されない
      expect(mockConsole).not.toHaveBeenCalled();
      
      // 指定時間後に実行される
      setTimeout(() => {
        expect(mockConsole).toHaveBeenCalled();
        mockConsole.mockRestore();
        debouncedRenderer.destroy();
        done();
      }, 15);
    });

    test('デバウンス無効時の即座実行', () => {
      const mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
      
      renderer.addLine('test');
      renderer.renderDebounced();
      
      // デバウンス無効なので即座に実行される
      expect(mockConsole).toHaveBeenCalled();
      
      mockConsole.mockRestore();
    });
  });

  describe('リソース管理', () => {
    test('reset処理', () => {
      renderer.addLine('test');
      renderer.saveCursor();
      
      renderer.reset();
      
      expect(renderer.buffer).toHaveLength(0);
      expect(renderer.previousBuffer).toHaveLength(0);
      expect(renderer.cursorSaved).toBe(false);
      expect(renderer.renderTimer).toBeNull();
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h'); // カーソル表示
    });

    test('destroy処理', () => {
      renderer.addLine('test');
      
      renderer.destroy();
      
      expect(renderer.buffer).toHaveLength(0);
      expect(renderer.previousBuffer).toHaveLength(0);
      expect(renderer.cursorSaved).toBe(false);
    });
  });

  describe('統計情報', () => {
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

  describe('設定オプション', () => {
    test('カスタム設定での初期化', () => {
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

    test('デフォルト設定', () => {
      const defaultRenderer = new BufferedRenderer();
      
      const stats = defaultRenderer.getStats();
      expect(stats.renderInterval).toBe(16);
      expect(stats.maxBufferSize).toBe(10000);
      expect(stats.enableDebounce).toBe(true);
      
      defaultRenderer.destroy();
    });
  });
});
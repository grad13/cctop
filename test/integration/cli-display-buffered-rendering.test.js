/**
 * CLI Display + BufferedRenderer 統合テスト (FUNC-018準拠)
 */

// Vitest globals配置（vitest.config.jsのglobals: trueで自動利用可能）
const CLIDisplay = require('../../dist/src/ui/cli-display');

// モックデータベースマネージャー
class MockDatabaseManager {
  async getRecentEvents(limit) {
    return [
      {
        id: 1,
        timestamp: Date.now() - 1000,
        file_name: 'test.js',
        directory: './src',
        event_type: 'modify',
        line_count: 100,
        block_count: 10
      },
      {
        id: 2,
        timestamp: Date.now() - 2000,
        file_name: '日本語ファイル.txt',
        directory: './docs',
        event_type: 'create',
        line_count: 50,
        block_count: 5
      }
    ];
  }
}

describe('CLIDisplay + BufferedRenderer 統合', () => {
  let display;
  let mockDb;
  let mockStdout;
  let mockConsole;

  beforeEach(() => {
    mockDb = new MockDatabaseManager();
    mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
    mockConsole = vi.spyOn(console, 'clear').mockImplementation(() => {});
    
    // テスト環境でもリサイズハンドラーを登録するため、isTTYをtrueに設定
    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;
    
    display = new CLIDisplay(mockDb, {
      mode: 'all',
      maxEvents: 20
    });
    
    // 元の値に戻す
    process.stdout.isTTY = originalIsTTY;
  });

  afterEach(() => {
    if (display) {
      display.stop();
    }
    mockStdout.mockRestore();
    mockConsole.mockRestore();
  });

  describe('BufferedRenderer統合', () => {
    test('BufferedRendererの初期化', () => {
      expect(display.renderer).toBeDefined();
      expect(display.renderer.constructor.name).toBe('BufferedRenderer');
      
      const stats = display.renderer.getStats();
      expect(stats.renderInterval).toBe(16); // 60fps制限
      expect(stats.maxBufferSize).toBe(40); // maxEvents * 2
      expect(stats.enableDebounce).toBe(true);
    });

    test('二重バッファ描画の動作確認', async () => {
      // BufferedRenderer内部の状態をリセットして初回描画にする
      display.renderer.reset();
      
      // イベントデータを追加
      display.addEvent({
        timestamp: Date.now(),
        file_name: 'test.js',
        directory: './src',
        event_type: 'modify',
        line_count: 100,
        block_count: 10
      });

      // レンダリングを同期的に実行（デバウンスを回避）
      display.renderer.clear();
      display.buildHeader();
      display.buildEvents();
      display.buildFooter();
      display.renderer.render(); // renderDebouncedではなく直接render

      // BufferedRendererが使用されていることを確認
      expect(mockConsole).toHaveBeenCalled(); // 初回はconsole.clear
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l'); // カーソル非表示
      expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h'); // カーソル表示
    });

    test('East Asian Width対応の確認', () => {
      // 日本語ファイル名のイベントを追加
      display.addEvent({
        timestamp: Date.now(),
        file_name: '日本語ファイル名.txt',
        directory: './documents',
        event_type: 'create',
        line_count: 50,
        block_count: 5
      });

      // 同期的にレンダリング
      display.renderer.clear();
      display.buildHeader();
      display.buildEvents();
      display.buildFooter();
      display.renderer.render();

      // レンダリングが正常に実行されることを確認
      expect(mockStdout).toHaveBeenCalled();
      // 日本語文字を含む出力があることを確認
      const outputCalls = mockStdout.mock.calls.map(call => call[0]).join('');
      expect(outputCalls).toContain('日本語ファイル名.txt');
    });

    test('大量イベントでのパフォーマンス', () => {
      // 大量のイベントを追加
      for (let i = 0; i < 100; i++) {
        display.addEvent({
          timestamp: Date.now() - i * 1000,
          file_name: `file${i}.js`,
          directory: `./dir${i}`,
          event_type: 'modify',
          line_count: i,
          block_count: Math.floor(i / 10)
        });
      }

      const startTime = process.hrtime();
      display.render();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      // 100ms以下で完了することを確認
      expect(duration).toBeLessThan(100);
    });
  });

  describe('リサイズ対応', () => {
    test('ターミナルリサイズ時のBufferedRenderer リセット', () => {
      const resetSpy = vi.spyOn(display.renderer, 'reset');
      
      // displayを開始してisRunning = trueにする
      display.start();
      
      // リサイズイベントをシミュレート
      process.stdout.emit('resize');

      expect(resetSpy).toHaveBeenCalled();
      resetSpy.mockRestore();
    });
  });

  describe('表示モード切り替え', () => {
    test('All/Uniqueモード切り替え時の描画', () => {
      // 初期状態をリセット
      display.renderer.reset();
      
      display.addEvent({
        timestamp: Date.now(),
        file_name: 'test.js',
        directory: './src',
        event_type: 'modify',
        line_count: 100,
        block_count: 10
      });

      // Allモードでレンダリング（初回）- 同期的に実行
      display.setDisplayMode('all');
      display.renderer.clear();
      display.buildHeader();
      display.buildEvents();
      display.buildFooter();
      display.renderer.render();
      const allModeCallCount = mockStdout.mock.calls.length;

      // Uniqueモードでレンダリング（2回目）- 同期的に実行
      display.setDisplayMode('unique');
      display.renderer.clear();
      display.buildHeader();
      display.buildEvents();
      display.buildFooter();
      display.renderer.render();
      const totalCallCount = mockStdout.mock.calls.length;
      const uniqueModeCallCount = totalCallCount - allModeCallCount;

      // どちらのモードでも描画が実行される
      expect(allModeCallCount).toBeGreaterThan(0);
      expect(uniqueModeCallCount).toBeGreaterThan(0);
    });
  });

  describe('統計情報', () => {
    test('BufferedRenderer統計の取得', () => {
      const stats = display.getStats();
      
      expect(stats.renderer).toBeDefined();
      expect(stats.renderer.bufferSize).toBeDefined();
      expect(stats.renderer.renderInterval).toBe(16);
      expect(stats.renderer.enableDebounce).toBe(true);
    });
  });

  describe('終了処理', () => {
    test('停止時のBufferedRenderer解放', () => {
      const destroySpy = vi.spyOn(display.renderer, 'destroy');
      
      display.stop();
      
      expect(destroySpy).toHaveBeenCalled();
      destroySpy.mockRestore();
    });

    test('異常終了時のリセット', () => {
      const resetSpy = vi.spyOn(display.renderer, 'reset');
      
      display.handleExit();
      
      expect(resetSpy).toHaveBeenCalled();
      resetSpy.mockRestore();
    });
  });

  describe('後方互換性', () => {
    test('既存のrender系メソッドの動作確認', () => {
      // 後方互換性のために残されたメソッドが正常に動作することを確認
      expect(() => {
        display.renderHeader();
        display.renderEvents();
        display.renderFooter();
      }).not.toThrow();
    });

    test('既存のformatメソッドの動作確認', () => {
      const event = {
        timestamp: Date.now(),
        file_name: 'test.js',
        directory: './src',
        event_type: 'modify',
        line_count: 100,
        block_count: 10
      };

      const formattedLine = display.formatEventLine(event);
      expect(typeof formattedLine).toBe('string');
      expect(formattedLine.length).toBeGreaterThan(0);
    });
  });
});
/**
 * BP-001 Responsive Directory Display Test
 * FUNC-024準拠: レスポンシブディレクトリ表示機能
 */

const { EventEmitter } = require('events');
const stringWidth = require('string-width');

// 表示幅計算ユーティリティのモック
class DisplayWidthCalculator {
  // 固定カラム幅の定義
  static FIXED_WIDTHS = {
    modified: 19,      // "2025-06-26 10:30:45"
    elapsed: 10,       // "  00:05:12"
    fileName: 28,      // ファイル名（East Asian Width対応）
    event: 8,          // "modify  "
    lines: 5,          // " 1234"
    blocks: 6,         // "  1234"
    spaces: 12         // カラム間のスペース
  };
  
  static calculateDynamicWidth(terminalWidth = 80) {
    const fixedWidth = Object.values(this.FIXED_WIDTHS).reduce((sum, w) => sum + w, 0);
    const directoryWidth = Math.max(10, terminalWidth - fixedWidth - 2);
    
    return {
      terminal: terminalWidth,
      directory: directoryWidth,
      fixed: fixedWidth
    };
  }
}

// レスポンシブレンダラーのモック
class ResponsiveRenderer extends EventEmitter {
  constructor() {
    super();
    this.terminalWidth = process.stdout.columns || 80;
    this.widthConfig = DisplayWidthCalculator.calculateDynamicWidth(this.terminalWidth);
    this.setupResizeHandler();
  }
  
  setupResizeHandler() {
    // リサイズイベントのシミュレーション用
    this.on('resize', (newWidth) => {
      this.terminalWidth = newWidth;
      this.widthConfig = DisplayWidthCalculator.calculateDynamicWidth(newWidth);
      this.emit('resized', this.widthConfig);
    });
  }
  
  truncateDirectoryPath(path, maxWidth) {
    const pathWidth = stringWidth(path);
    
    if (pathWidth <= maxWidth) {
      // パディングして返す
      return path + ' '.repeat(maxWidth - pathWidth);
    }
    
    // 末尾優先で切り詰め
    const ellipsis = '...';
    const ellipsisWidth = stringWidth(ellipsis);
    const availableWidth = maxWidth - ellipsisWidth;
    
    // 後ろから文字を取得
    let truncated = '';
    let currentWidth = 0;
    
    for (let i = path.length - 1; i >= 0; i--) {
      const char = path[i];
      const charWidth = stringWidth(char);
      
      if (currentWidth + charWidth > availableWidth) {
        break;
      }
      
      truncated = char + truncated;
      currentWidth += charWidth;
    }
    
    return ellipsis + truncated + ' '.repeat(maxWidth - ellipsisWidth - currentWidth);
  }
  
  formatRow(data) {
    const { directory } = this.widthConfig;
    const truncatedDir = this.truncateDirectoryPath(data.directory, directory);
    
    return {
      modified: data.modified,
      elapsed: data.elapsed,
      fileName: data.fileName,
      event: data.event,
      lines: data.lines,
      blocks: data.blocks,
      directory: truncatedDir
    };
  }
  
  simulateResize(newWidth) {
    this.emit('resize', newWidth);
  }
}

describe('BP-001: Responsive Directory Display (FUNC-024)', () => {
  let renderer;

  beforeEach(() => {
    renderer = new ResponsiveRenderer();
  });

  test('should calculate directory width based on terminal width', () => {
    // 80文字ターミナル
    const narrow = DisplayWidthCalculator.calculateDynamicWidth(80);
    expect(narrow.directory).toBeGreaterThanOrEqual(10);
    expect(narrow.terminal).toBe(80);
    
    // 120文字ターミナル
    const medium = DisplayWidthCalculator.calculateDynamicWidth(120);
    expect(medium.directory).toBeGreaterThan(narrow.directory);
    expect(medium.directory).toBe(120 - medium.fixed - 2);
    
    // 200文字ターミナル
    const wide = DisplayWidthCalculator.calculateDynamicWidth(200);
    expect(wide.directory).toBeGreaterThan(medium.directory);
    expect(wide.directory).toBe(200 - wide.fixed - 2);
  });

  test('should maintain minimum directory width of 10 characters', () => {
    // 非常に狭いターミナル
    const veryNarrow = DisplayWidthCalculator.calculateDynamicWidth(50);
    expect(veryNarrow.directory).toBe(10);
  });

  test('should truncate long directory paths with ellipsis at start', () => {
    const longPath = '/very/long/path/to/deeply/nested/directory/structure';
    
    // 20文字幅でのテスト
    const truncated20 = renderer.truncateDirectoryPath(longPath, 20);
    expect(stringWidth(truncated20)).toBe(20);
    expect(truncated20).toMatch(/^\.\.\./);
    expect(truncated20).toContain('structure');
    
    // 30文字幅でのテスト
    const truncated30 = renderer.truncateDirectoryPath(longPath, 30);
    expect(stringWidth(truncated30)).toBe(30);
    expect(truncated30).toContain('directory/structure');
  });

  test('should pad short directory paths to full width', () => {
    const shortPath = './src/';
    
    // 20文字幅でのテスト
    const padded = renderer.truncateDirectoryPath(shortPath, 20);
    expect(stringWidth(padded)).toBe(20);
    expect(padded.trim()).toBe(shortPath);
  });

  test('should handle resize events and recalculate widths', () => {
    const resizeSpy = vi.fn();
    renderer.on('resized', resizeSpy);
    
    // 初期状態
    const initialWidth = renderer.widthConfig.directory;
    
    // リサイズシミュレーション
    renderer.simulateResize(150);
    
    expect(resizeSpy).toHaveBeenCalled();
    expect(renderer.terminalWidth).toBe(150);
    expect(renderer.widthConfig.directory).toBeGreaterThan(initialWidth);
  });

  test('should format row data with truncated directory', () => {
    const rowData = {
      modified: '2025-06-26 10:30:45',
      elapsed: '  00:05:12',
      fileName: 'test-file.js',
      event: 'modify',
      lines: '  123',
      blocks: '    12',
      directory: '/extremely/long/path/that/needs/to/be/truncated/src/components'
    };
    
    // 狭いターミナルでシミュレート
    renderer.simulateResize(80);
    const formatted = renderer.formatRow(rowData);
    
    expect(stringWidth(formatted.directory)).toBe(renderer.widthConfig.directory);
    expect(formatted.directory).toMatch(/^\.\.\./);
  });

  test('should handle East Asian width characters in paths', () => {
    const pathWithCJK = './テスト/ディレクトリ/ファイル/';
    
    // East Asian文字は2幅として計算される
    const truncated = renderer.truncateDirectoryPath(pathWithCJK, 20);
    expect(stringWidth(truncated)).toBe(20);
    
    // 内容確認（末尾が保持される）
    if (stringWidth(pathWithCJK) > 20) {
      expect(truncated).toMatch(/^\.\.\./);
      expect(truncated).toContain('ファイル');
    }
  });

  test('should maintain consistent behavior across multiple resizes', () => {
    const testPath = '/src/components/ui/display/renderer.js';
    const widths = [80, 120, 100, 150, 80];
    const results = [];
    
    widths.forEach(width => {
      renderer.simulateResize(width);
      const truncated = renderer.truncateDirectoryPath(testPath, renderer.widthConfig.directory);
      results.push({
        terminalWidth: width,
        directoryWidth: renderer.widthConfig.directory,
        truncated: truncated.trim()
      });
    });
    
    // 同じターミナル幅では同じ結果
    expect(results[0].truncated).toBe(results[4].truncated);
    
    // より広いターミナルではより多くの情報を表示
    expect(results[1].truncated.length).toBeGreaterThanOrEqual(results[0].truncated.length);
  });

  test('should handle edge cases gracefully', () => {
    // 空のパス
    const empty = renderer.truncateDirectoryPath('', 20);
    expect(stringWidth(empty)).toBe(20);
    expect(empty.trim()).toBe('');
    
    // 1文字のパス
    const single = renderer.truncateDirectoryPath('/', 20);
    expect(stringWidth(single)).toBe(20);
    expect(single.trim()).toBe('/');
    
    // ちょうど幅に収まるパス
    const exact = './exactly20charspath';
    const exactResult = renderer.truncateDirectoryPath(exact, 20);
    expect(stringWidth(exactResult)).toBe(20);
    expect(exactResult.trim()).toBe(exact);
  });
});
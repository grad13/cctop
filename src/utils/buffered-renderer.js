/**
 * Buffered Renderer (FUNC-018準拠)
 * 画面のちらつきを防ぐための二重バッファリング機能
 * VERSIONs/product-v01から移植、v0.1.0.0向けに最適化
 */

class BufferedRenderer {
  constructor(options = {}) {
    this.buffer = [];
    this.previousBuffer = [];
    this.cursorSaved = false;
    
    // FUNC-018仕様: 60fps制限（16ms間隔）
    this.renderInterval = options.renderInterval || 16;
    this.renderTimer = null;
    this.maxBufferSize = options.maxBufferSize || 10000;
    this.enableDebounce = options.enableDebounce !== false; // デフォルトでデバウンス有効
  }

  /**
   * バッファをクリア
   */
  clear() {
    this.previousBuffer = [...this.buffer];
    this.buffer = [];
  }

  /**
   * バッファに行を追加
   */
  addLine(line) {
    // バッファサイズ制限
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift(); // 古い行を削除
    }
    this.buffer.push(line || '');
  }

  /**
   * カーソル位置を保存
   */
  saveCursor() {
    if (!this.cursorSaved) {
      process.stdout.write('\x1b[s'); // Save cursor position
      this.cursorSaved = true;
    }
  }

  /**
   * カーソル位置を復元
   */
  restoreCursor() {
    if (this.cursorSaved) {
      process.stdout.write('\x1b[u'); // Restore cursor position
    }
  }

  /**
   * カーソルを指定行に移動
   */
  moveCursor(row, col = 1) {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  /**
   * 現在行をクリア
   */
  clearLine() {
    process.stdout.write('\x1b[2K'); // Clear entire line
  }

  /**
   * 画面を下までクリア
   */
  clearToBottom() {
    process.stdout.write('\x1b[J'); // Clear from cursor to end of screen
  }

  /**
   * カーソルを非表示にする
   */
  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }

  /**
   * カーソルを表示する
   */
  showCursor() {
    process.stdout.write('\x1b[?25h');
  }

  /**
   * 遅延レンダリング（60fps制限）
   */
  renderDebounced() {
    if (!this.enableDebounce) {
      this.render();
      return;
    }

    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => {
      this.render();
    }, this.renderInterval);
  }

  /**
   * バッファの内容を画面に描画（二重バッファ方式）
   */
  render() {
    // 初回描画時は全体をクリア
    if (!this.cursorSaved) {
      console.clear();
      this.saveCursor();
    }

    // カーソルを非表示にして描画を開始
    this.hideCursor();

    // カーソルを最初に戻す
    this.restoreCursor();

    // 全行を更新（ANSIエスケープシーケンス対応）
    const maxLines = Math.max(this.buffer.length, this.previousBuffer.length);
    
    for (let i = 0; i < maxLines; i++) {
      this.moveCursor(i + 1, 1);
      this.clearLine();
      
      if (i < this.buffer.length && this.buffer[i]) {
        process.stdout.write(this.buffer[i]);
      }
    }

    // カーソルを最後の行の後に移動してから表示
    this.moveCursor(this.buffer.length + 1, 1);
    this.showCursor();

    // 描画完了後にpreviousBufferを更新
    this.previousBuffer = [...this.buffer];
  }

  /**
   * 完全な再描画（緊急時用）
   */
  fullRender() {
    console.clear();
    this.buffer.forEach(line => console.log(line));
    this.cursorSaved = false;
  }

  /**
   * レンダラーをリセット
   */
  reset() {
    clearTimeout(this.renderTimer);
    this.renderTimer = null;
    this.buffer = [];
    this.previousBuffer = [];
    this.cursorSaved = false;
    this.showCursor(); // カーソルを確実に表示
  }

  /**
   * リソース解放
   */
  destroy() {
    this.reset();
  }

  /**
   * 統計情報取得
   */
  getStats() {
    return {
      bufferSize: this.buffer.length,
      previousBufferSize: this.previousBuffer.length,
      maxBufferSize: this.maxBufferSize,
      renderInterval: this.renderInterval,
      cursorSaved: this.cursorSaved,
      enableDebounce: this.enableDebounce
    };
  }
}

module.exports = BufferedRenderer;
# Handoff: BufferedRenderer Test Fixes Required

**From**: Validator  
**To**: Builder  
**Date**: 2025-06-26 15:00 JST  
**Priority**: High  
**Type**: Test Fix - BufferedRenderer Integration  

## 🔍 問題の詳細

BP-001 Day4テストで**BufferedRenderer統合テストが4件失敗**しています。

### 失敗しているテスト
```
❌ cli-display-buffered-rendering.test.js (4/8件失敗)
  × 二重バッファ描画の動作確認 - expected "clear" to be called at least once
  × East Asian Width対応の確認 - expected "spy" to be called at least once  
  × ターミナルリサイズ時のBufferedRenderer リセット - expected "reset" to be called at least once
  × All/Uniqueモード切り替え時の描画 - expected 0 to be greater than 0
```

## 🔬 根本原因分析

### 原因1: `console.clear`の呼び出し条件
**場所**: `src/utils/buffered-renderer.js:render()`

**実装**:
```javascript
render() {
  // 初回描画時は全体をクリア
  if (!this.cursorSaved) {  // ← 初回のみ！
    console.clear();
    this.saveCursor();
  }
  // ...
}
```

**問題**: テストで`console.clear`をspyしているが、`cursorSaved`がfalseの初回描画時のみ呼ばれる

### 原因2: `reset`メソッドの呼び出しタイミング
**場所**: `src/ui/cli-display.js:setupResizeHandler()`

**実装**:
```javascript
process.stdout.on('resize', () => {
  this.widthConfig = this.calculateDynamicWidth();
  
  if (this.renderer && this.isRunning) {  // ← 条件あり
    this.renderer.reset();
    this.render();
  }
});
```

**問題**: テストで`this.isRunning = false`の状態では`reset()`が呼ばれない

### 原因3: テストの期待値とロジックの不一致
**場所**: `test/integration/cli-display-buffered-rendering.test.js`

**問題点**:
- `display.render()`を1回だけ呼んでいるが、`console.clear`は初回のみ実行される
- `process.stdout.emit('resize')`前に`display.start()`が必要
- East Asian Widthテストでspyの対象が不明確

## 💡 推奨修正方法

### 1. テストの修正 (推奨)
```javascript
test('二重バッファ描画の動作確認', async () => {
  // BufferedRenderer内部の状態をリセットして初回描画にする
  display.renderer.reset();  // cursorSaved = false にする
  
  display.addEvent({...});
  display.render();

  // 初回描画時にconsole.clearが呼ばれる
  expect(mockConsole).toHaveBeenCalled();
  expect(mockStdout).toHaveBeenCalledWith('\x1b[?25l'); // カーソル非表示
  expect(mockStdout).toHaveBeenCalledWith('\x1b[?25h'); // カーソル表示
});

test('ターミナルリサイズ時のBufferedRenderer リセット', () => {
  const resetSpy = vi.spyOn(display.renderer, 'reset');
  display.start();  // ← isRunning = true にする！

  // リサイズイベントをシミュレート
  process.stdout.emit('resize');

  expect(resetSpy).toHaveBeenCalled();
  resetSpy.mockRestore();
});
```

### 2. East Asian Widthテストの修正
```javascript
test('East Asian Width対応の確認', () => {
  // stringWidthの呼び出しをspy
  const stringWidthSpy = vi.spyOn(require('string-width'), 'default');
  
  display.addEvent({
    file_name: '日本語ファイル名.txt',
    directory: './documents',
    event_type: 'create'
  });

  display.render();

  // string-widthが呼ばれることを確認
  expect(stringWidthSpy).toHaveBeenCalledWith(expect.stringContaining('日本語'));
  stringWidthSpy.mockRestore();
});
```

### 3. All/Uniqueモード切り替えテストの修正
```javascript
test('All/Uniqueモード切り替え時の描画', () => {
  // 初期状態をリセット
  display.renderer.reset();
  
  display.addEvent({...});

  // Allモードでレンダリング（初回）
  display.setDisplayMode('all');
  display.render();
  const allModeCallCount = mockStdout.mock.calls.length;

  // Uniqueモードでレンダリング（2回目）
  display.setDisplayMode('unique');
  display.render();
  const uniqueModeCallCount = mockStdout.mock.calls.length - allModeCallCount;

  expect(allModeCallCount).toBeGreaterThan(0);
  expect(uniqueModeCallCount).toBeGreaterThan(0);
});
```

## 🎯 修正に必要な作業

### 1. テストファイル修正 (test/integration/cli-display-buffered-rendering.test.js)
- [ ] `beforeEach`で適切な初期化（`display.renderer.reset()`）
- [ ] リサイズテストで`display.start()`呼び出し  
- [ ] East Asian Widthテストで適切なspy対象設定
- [ ] モード切り替えテストでカウント方法修正

### 2. BufferedRenderer改善（オプション）
```javascript
// テスト用の強制クリアメソッド追加
forceRender() {
  this.cursorSaved = false;  // 強制的に初回状態にする
  this.render();
}
```

### 3. 動作確認
- [ ] `npm test test/integration/cli-display-buffered-rendering.test.js`で8/8成功
- [ ] 実際のCLI表示でBufferedRendererが正常動作
- [ ] East Asian Width文字の正確な表示

## 📊 期待される修正結果

**修正前**: 4/8テスト失敗
```
❌ 二重バッファ描画の動作確認
❌ East Asian Width対応の確認  
❌ ターミナルリサイズ時のBufferedRenderer リセット
❌ All/Uniqueモード切り替え時の描画
```

**修正後**: 8/8テスト成功
```
✅ BufferedRendererの初期化  
✅ 二重バッファ描画の動作確認
✅ East Asian Width対応の確認
✅ 大量イベントでのパフォーマンス  
✅ ターミナルリサイズ時のBufferedRenderer リセット
✅ All/Uniqueモード切り替え時の描画
✅ BufferedRenderer統計の取得
✅ 停止時のBufferedRenderer解放
```

## ⚠️ 重要な注意事項

1. **実装変更なし**: BufferedRenderer自体の実装は正常、テストの期待値修正のみ
2. **初期化状態**: テストで`renderer.reset()`を適切に呼んで初期状態を作る
3. **非同期処理**: `renderDebounced()`のタイマー処理に注意
4. **モック管理**: `mockStdout.mockClear()`のタイミングを正確に

## 🚀 期待される効果

- **テスト成功率向上**: BufferedRenderer統合テスト 100%成功
- **品質保証**: 二重バッファ描画機能の動作確認完了
- **リリース準備**: v0.2.0リリースの品質基準達成

この修正により、BP-001の統合テストが完全にパスし、v0.2.0の安定リリースが可能になります。

---
**優先度**: 高 - v0.2.0リリースの品質基準  
**推定作業時間**: 1-2時間
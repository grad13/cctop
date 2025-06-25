# Builder Task: 二重バッファ描画機能の実装確認と最適化

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**優先度**: 高（Phase 1機能）  
**関連仕様**: FUNC-018-double-buffer-rendering.md  
**参考実装**: VERSIONs/product-v01/src/utils/buffered-renderer.js  

## 背景

現在のcctopでは画面更新時にちらつきが発生する可能性があります。VERSIONs/product-v01で既に実装されている二重バッファ描画機能を、現在のv0.1.0.0に適用または最適化する必要があります。

## 実装要求

### 1. 現状確認

現在のコードベースで以下を確認：
- 画面描画の実装方式（src/monitor.js等）
- ちらつき防止の実装有無
- BufferedRendererクラスまたは類似実装の存在

### 2. 実装方針の決定

#### オプション1: 既存実装の移植
VERSIONs/product-v01のBufferedRendererをそのまま移植：
```javascript
// src/utils/buffered-renderer.js
class BufferedRenderer {
  constructor() {
    this.buffer = [];
    this.previousBuffer = [];
    this.cursorSaved = false;
  }
  
  clear() {
    this.previousBuffer = [...this.buffer];
    this.buffer = [];
  }
  
  render() {
    // ANSIエスケープシーケンスによる描画
    this.hideCursor();
    // ... 画面更新処理
    this.showCursor();
  }
}
```

#### オプション2: 簡略版の実装
v02スタイルのシンプルな実装：
```javascript
// 遅延レンダリングのみ
let renderTimer = null;
function renderDebounced(renderFunction) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderFunction, 16); // 60fps
}
```

### 3. 統合作業

#### monitor.jsへの統合例
```javascript
const BufferedRenderer = require('./utils/buffered-renderer');
const renderer = new BufferedRenderer();

function displayEvents(events) {
  renderer.clear();
  
  // ヘッダー
  renderer.addLine(formatHeader());
  
  // イベント行
  events.forEach(event => {
    renderer.addLine(formatEvent(event));
  });
  
  // 一括描画
  renderer.render();
}
```

### 4. カーソル制御の実装

必要なANSIエスケープシーケンス：
```javascript
const ANSI = {
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  SAVE_CURSOR: '\x1b[s',
  RESTORE_CURSOR: '\x1b[u',
  CLEAR_LINE: '\x1b[2K',
  MOVE_CURSOR: (row, col) => `\x1b[${row};${col}H`
};
```

### 5. パフォーマンス最適化

#### メモリ効率
- バッファサイズの制限（最大10000行など）
- 不要な文字列コピーの削減

#### 描画効率
- 60fps制限（16msデバウンス）の実装
- 差分更新の検討（将来的な拡張）

## テスト項目

### ユニットテスト
```javascript
describe('BufferedRenderer', () => {
  test('バッファの管理', () => {
    const renderer = new BufferedRenderer();
    renderer.addLine('test');
    expect(renderer.buffer).toHaveLength(1);
  });
  
  test('クリア処理', () => {
    const renderer = new BufferedRenderer();
    renderer.addLine('test');
    renderer.clear();
    expect(renderer.buffer).toHaveLength(0);
    expect(renderer.previousBuffer).toHaveLength(1);
  });
});
```

### 統合テスト
1. 大量イベント（1000件以上）での描画性能
2. 高頻度更新時のちらつき確認
3. 各種ターミナルでの互換性

## 確認事項

### 実装前確認
- [ ] 現在の描画実装の調査完了
- [ ] 既存のちらつき対策の有無確認
- [ ] 実装方針の決定（移植 or 新規実装）

### 実装後確認
- [ ] ちらつきが解消されていること
- [ ] パフォーマンスが劣化していないこと
- [ ] 既存機能が正常に動作すること

## 完了条件

1. 二重バッファ描画の実装または最適化完了
2. 画面のちらつきが解消されていること
3. 60fps制限が機能していること
4. テストケースが全て合格
5. 3種類以上のターミナルで動作確認済み

## 参考資料

- [FUNC-018-double-buffer-rendering.md](/documents/visions/functions/FUNC-018-double-buffer-rendering.md)
- [BufferedRenderer実装例](/VERSIONs/product-v01/src/utils/buffered-renderer.js)
- [ui006-rendering-update.md](/documents/visions/specifications/ui/ui006-rendering-update.md)

## Validatorへの引き継ぎ事項

実装完了後、以下の検証を依頼：
1. ちらつき解消の視覚的確認
2. パフォーマンステスト（CPU使用率、メモリ使用量）
3. 各種ターミナルでの互換性テスト
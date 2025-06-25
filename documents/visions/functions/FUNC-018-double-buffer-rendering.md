# FUNC-018: 二重バッファ描画機能

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**バージョン**: v1.0.0  
**優先度**: 高  
**対象Phase**: Phase 1 (v0.1.0.0)  
**実装状態**: 実装済み（VERSIONs/product-v01）  

## 概要

CLIアプリケーションの画面描画において、ちらつき（フリッカー）を防止するための二重バッファ方式による描画機能。メモリ上で完全な画面を構築してから一度に画面を更新することで、スムーズな表示更新を実現する。

## 機能の価値

### ユーザー体験の向上
1. **視覚的快適性**: 画面のちらつきがなく、目に優しい表示
2. **プロフェッショナルな印象**: 滑らかな更新により高品質なツールとしての印象
3. **長時間使用への配慮**: 継続的な監視作業でも疲れにくい

### 技術的利点
1. **描画の原子性**: 部分的な描画状態が見えない
2. **パフォーマンス**: 差分更新による効率的な画面更新
3. **拡張性**: 将来的な高度な描画機能への基盤

## 実装方式

### 基本アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐
│  Current Buffer │     │ Previous Buffer │
│  （現在の画面）   │     │  （前回の画面）   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │ Diff Engine │
              │ （差分計算）  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Renderer  │
              │ （画面描画）  │
              └─────────────┘
```

### コア機能

#### 1. バッファ管理
```javascript
class BufferedRenderer {
  constructor() {
    this.buffer = [];         // 現在のバッファ
    this.previousBuffer = []; // 前回のバッファ
  }
  
  clear() {
    this.previousBuffer = [...this.buffer];
    this.buffer = [];
  }
}
```

#### 2. カーソル制御
- **描画前**: カーソルを非表示化（`\x1b[?25l`）
- **描画中**: ANSIエスケープシーケンスで位置制御
- **描画後**: カーソルを再表示（`\x1b[?25h`）

#### 3. 更新戦略

##### フル更新モード（v01実装）
```javascript
render() {
  // カーソル非表示
  this.hideCursor();
  
  // 全行を再描画
  for (let i = 0; i < maxLines; i++) {
    this.moveCursor(i + 1, 1);
    this.clearLine();
    if (i < this.buffer.length) {
      process.stdout.write(this.buffer[i]);
    }
  }
  
  // カーソル表示
  this.showCursor();
}
```

##### 遅延レンダリング（v02実装）
```javascript
// 60fps制限（16ms間隔）
renderDebounced() {
  clearTimeout(this.renderTimer);
  this.renderTimer = setTimeout(() => {
    this.render();
  }, 16);
}
```

## 実装バリエーション

### 1. 完全二重バッファ方式（v01）
- **特徴**: 明示的な2つのバッファを管理
- **利点**: 差分計算が可能
- **欠点**: メモリ使用量が2倍

### 2. 単一バッファ＋遅延方式（v02）
- **特徴**: 1つのバッファ＋時間制御
- **利点**: シンプルな実装
- **欠点**: 差分更新ができない

### 3. 仮想DOM方式（将来拡張）
- **特徴**: React的な差分更新
- **利点**: 最小限の画面更新
- **欠点**: 実装の複雑性

## 使用方法

### 基本的な使用
```javascript
const renderer = new BufferedRenderer();

// 画面構築
renderer.clear();
renderer.addLine('Header Line');
renderer.addLine('Data Line 1');
renderer.addLine('Data Line 2');

// 一括描画
renderer.render();
```

### 継続的更新
```javascript
// ファイル変更イベントごとに
onFileChange(() => {
  renderer.clear();
  buildDisplay(renderer);
  renderer.render();
});
```

## パフォーマンス特性

### メモリ使用量
- **基本使用量**: 表示行数 × 平均行長 × 2（二重バッファの場合）
- **1000行表示時**: 約200KB（平均100文字/行の場合）

### CPU使用率
- **更新頻度**: 最大60fps（16ms間隔）
- **処理時間**: 通常1-2ms/更新（1000行以下）

## 設定オプション

### レンダリング設定
```javascript
{
  renderInterval: 16,      // 更新間隔（ms）
  enableDiff: false,       // 差分更新の有効化
  maxBufferSize: 10000,    // 最大バッファサイズ
  cursorControl: true      // カーソル制御の有効化
}
```

## 既知の制限

### ターミナル互換性
- **Windows CMD**: 一部のANSIエスケープシーケンス非対応
- **古いターミナル**: カーソル制御が不完全な場合あり

### パフォーマンス
- **大量データ**: 10000行以上で遅延が発生する可能性
- **リモート接続**: SSH経由では更新が遅い場合あり

## 関連機能

### 依存する機能
- FUNC-012: CLI表示統合機能（表示フォーマット）
- FUNC-011: chokidar-Database統合（イベント通知）

### 拡張される機能
- FUNC-019: 差分更新最適化（将来）
- FUNC-020: アニメーション効果（将来）

## 実装履歴

### v01 (2025年6月)
- 初期実装: 完全な二重バッファ方式
- ANSIエスケープシーケンスによる画面制御
- カーソル非表示化によるちらつき防止

### v02 (2025年6月)
- 簡略化: 単一バッファ＋遅延レンダリング
- 60fps制限の導入
- よりシンプルで安定した実装

## 参照

### 内部ドキュメント
- [ui006-rendering-update.md](/documents/visions/specifications/ui/ui006-rendering-update.md)
- [BufferedRenderer実装 (v01)](/VERSIONs/product-v01/src/utils/buffered-renderer.js)

### 外部リソース
- [ANSI Escape Sequences](https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797)
- [Terminal Control Best Practices](https://github.com/sindresorhus/ansi-escapes)
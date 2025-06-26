# FUNC-204: レスポンシブディレクトリ表示

**作成日**: 2025年6月26日 01:00
**更新日**: 2025年6月26日 01:00 
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0

## 📊 機能概要

ターミナルのリサイズに応じて、ディレクトリカラムの幅を動的に調整する表示機能

### ユーザー価値
- ターミナル幅に関わらず、常に最適な情報量を表示
- 重要なディレクトリ名（末尾）を優先的に表示
- ウィンドウサイズ変更時の即座の再レイアウト

## 🎯 機能境界

### ✅ 実行する
- ターミナルリサイズイベントの検知と対応
- ディレクトリカラムの動的幅計算（最右端配置）
- パスの末尾優先切り詰め表示（重要な部分を保持）

### ❌ 実行しない
- 他のカラムの幅調整（固定幅を維持）
- ディレクトリ表示の複数行折り返し
- カラム順序の変更

## 📋 技術仕様

### 幅計算ロジック
```javascript
calculateDynamicWidth() {
  const terminalWidth = process.stdout.columns || 80;
  // 固定カラム幅の合計: 88文字
  // Modified(19) + Elapsed(10) + FileName(28) + Event(8) + Lines(5) + Blocks(6) + スペース(12)
  const fixedWidth = 88;
  const directoryWidth = Math.max(10, terminalWidth - fixedWidth - 2);
  
  return {
    terminal: terminalWidth,
    directory: directoryWidth
  };
}
```

### リサイズイベント処理
```javascript
process.stdout.on('resize', () => {
  this.widthConfig = this.calculateDynamicWidth();
  this.renderer.reset();
  this.render(); // 即座に再描画
});
```

### 末尾優先切り詰め
```javascript
truncateDirectoryPathWithWidth(path, maxWidth) {
  if (stringWidth(path) <= maxWidth) {
    return padEndWithWidth(path, maxWidth);
  }
  
  // 末尾から文字を取得して表示
  const ellipsis = '...';
  // 後ろから maxWidth - 3 文字分を取得
  // 例: "/very/long/path/to/file" → "...th/to/file"
}
```

## 🔧 実装ガイドライン

### 表示レイアウト
```
Modified               Elapsed  File Name                    Event    Lines Blocks  Directory
────────────────────────────────────────────────────────────────────────────────────────────
2025-06-26 10:30:45    00:05  config.json                  modify       50    120  src/config/
2025-06-26 10:30:40    00:10  database-manager.js          create      350   1200  ...ong/path/to/src/database/
```

### 設計原則
1. **固定カラム優先**: 基本情報は常に同じ幅で表示
2. **ディレクトリ可変**: 残りスペースをすべて活用
3. **末尾保持**: ファイルの所在が分かる最後の部分を優先表示

## 🧪 テスト要件

- [ ] ターミナル幅80文字での最小幅確認（10文字保証）
- [ ] ターミナル幅200文字での拡張表示確認
- [ ] リサイズ時の即座の再描画確認
- [ ] 長いパスの適切な切り詰め確認

## 💡 使用シナリオ

### 狭いターミナル（80文字）
```
...  src/
...  test/
...  ...ig/
```

### 広いターミナル（120文字）
```
...  src/database/
...  test/integration/
...  /Users/name/project/config/
```

## 🎯 成功指標

- ターミナルリサイズ時の遅延なし再描画
- ディレクトリ名の可読性向上
- 最小10文字幅の保証による安定表示

## 🔗 関連仕様

- **FUNC-020**: East Asian Width対応（文字幅計算で使用）
- **FUNC-021**: 二重バッファ描画（リサイズ時の再描画で活用）
- **FUNC-022**: CLI表示統合（全体のレイアウト設計）
# Builder Task: East Asian Width対応実装

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**優先度**: 高（Phase 1機能）  
**関連仕様**: FUNC-017-east-asian-width-display.md  

## 背景

ユーザーから日本語ファイル名の表示崩れが報告されました。現在の実装では文字数ベースでパディングを計算しているため、全角文字（日本語・中国語・韓国語等）が含まれるファイル名で列の整列が崩れています。

## 実装要求

### 1. 依存パッケージの追加
```json
// package.jsonに追加
{
  "dependencies": {
    "string-width": "^5.1.2"
  }
}
```

### 2. 文字幅計算関数の実装
`src/utils/display-width.js`を新規作成：
```javascript
const stringWidth = require('string-width');

function padEndWithWidth(str, targetWidth) {
  const currentWidth = stringWidth(str);
  const padding = targetWidth - currentWidth;
  
  if (padding <= 0) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  return str + ' '.repeat(padding);
}

function padStartWithWidth(str, targetWidth) {
  const currentWidth = stringWidth(str);
  const padding = targetWidth - currentWidth;
  
  if (padding <= 0) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  return ' '.repeat(padding) + str;
}

function truncateWithEllipsis(str, maxWidth) {
  if (stringWidth(str) <= maxWidth) return str;
  
  const ellipsis = '...';
  const ellipsisWidth = stringWidth(ellipsis);
  let truncated = '';
  let width = 0;
  
  for (const char of str) {
    const charWidth = stringWidth(char);
    if (width + charWidth + ellipsisWidth > maxWidth) {
      return truncated + ellipsis;
    }
    truncated += char;
    width += charWidth;
  }
  
  return truncated;
}

module.exports = {
  padEndWithWidth,
  padStartWithWidth,
  truncateWithEllipsis
};
```

### 3. 既存フォーマッタの修正

monitor.jsまたはformatters.js内の該当箇所を修正：
- `padEnd()`を`padEndWithWidth()`に置換
- `padStart()`を`padStartWithWidth()`に置換

特に以下の箇所：
- ファイル名のフォーマット処理
- サイズ表示のフォーマット処理
- 行数表示のフォーマット処理

### 4. テストの追加

`test/unit/display-width.test.js`を作成：
```javascript
const { padEndWithWidth, padStartWithWidth } = require('../../src/utils/display-width');
const stringWidth = require('string-width');

describe('Display Width Utils', () => {
  test('半角文字の幅計算', () => {
    const result = padEndWithWidth('hello', 10);
    expect(stringWidth(result)).toBe(10);
    expect(result).toBe('hello     ');
  });

  test('全角文字の幅計算', () => {
    const result = padEndWithWidth('こんにちは', 20);
    expect(stringWidth(result)).toBe(20);
    expect(result).toBe('こんにちは          ');
  });

  test('混在文字の幅計算', () => {
    const result = padEndWithWidth('test界隈', 20);
    expect(stringWidth(result)).toBe(20);
  });

  test('幅超過時の省略表示', () => {
    const result = padEndWithWidth('これは長いファイル名です', 10);
    expect(stringWidth(result)).toBeLessThanOrEqual(10);
    expect(result).toContain('...');
  });
});
```

## 確認事項

### 動作確認
1. 日本語ファイル名での表示確認
2. 中国語・韓国語ファイル名での表示確認
3. 絵文字を含むファイル名での表示確認
4. 1000ファイル以上でのパフォーマンス確認

### 互換性確認
- 既存の表示形式（BP-000準拠）が維持されていること
- 英語のみのファイル名で表示が変わらないこと

## 完了条件

1. string-widthパッケージの導入完了
2. 表示幅計算関数の実装・テスト完了
3. 既存フォーマッタへの適用完了
4. 日本語ファイル名での表示崩れ解消確認
5. パフォーマンステスト合格

## 参考資料

- [FUNC-017-east-asian-width-display.md](/documents/visions/functions/FUNC-017-east-asian-width-display.md)
- [string-width npm](https://www.npmjs.com/package/string-width)
- [問題のスクリーンショット](ユーザー提供)

## Validatorへの引き継ぎ事項

実装完了後、以下をValidatorに確認依頼：
1. 各種言語での表示確認（テストケース提供）
2. パフォーマンステスト（1000ファイル以上）
3. 既存機能への影響確認
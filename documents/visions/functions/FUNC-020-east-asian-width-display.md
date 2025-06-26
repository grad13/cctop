# FUNC-020: East Asian Width対応表示機能

**作成日**: 2025年6月25日 08:00  
**更新日**: 2025年6月25日 19:10  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0

## 📊 機能概要

cctopのCLI表示において、日本語・中国語・韓国語などのEast Asian文字が含まれるファイル名を正しい幅で表示する機能。string-widthライブラリを活用し、全角文字の表示幅を正確に計算して列の整列を保つ。

**ユーザー価値**: 
- 日本語ファイル名での表示崩れ解消
- 多言語環境での快適な利用体験
- 視認性の高い整列された表示

## 🎯 機能境界

### ✅ **実行する**
- 半角文字（1幅）・全角文字（2幅）の正確な幅計算
- ファイル名列の幅調整とパディング処理
- 幅超過時の省略記号（...）による切り詰め
- 全カラムでの統一的な幅処理

### ❌ **実行しない**
- 絵文字・特殊記号の完全対応
- ターミナル固有の表示問題対応
- 動的なカラム幅の自動調整
- RTL（右から左）言語のサポート

## 📋 技術仕様

### **依存ライブラリ**
```json
{
  "dependencies": {
    "string-width": "^5.1.2"
  }
}
```

### **コア実装**
```javascript
const stringWidth = require('string-width');

// 表示幅を考慮したパディング（右詰め）
function padEndWithWidth(str, targetWidth) {
  const currentWidth = stringWidth(str);
  
  if (currentWidth > targetWidth) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  return str + ' '.repeat(targetWidth - currentWidth);
}

// 表示幅を考慮したパディング（左詰め）
function padStartWithWidth(str, targetWidth) {
  const currentWidth = stringWidth(str);
  
  if (currentWidth > targetWidth) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  return ' '.repeat(targetWidth - currentWidth) + str;
}

// 幅超過時の省略処理
function truncateWithEllipsis(str, maxWidth) {
  const ellipsis = '...';
  const ellipsisWidth = 3;
  
  if (stringWidth(str) <= maxWidth) return str;
  
  let result = '';
  let width = 0;
  
  for (const char of str) {
    const charWidth = stringWidth(char);
    if (width + charWidth + ellipsisWidth > maxWidth) {
      return result + ellipsis;
    }
    result += char;
    width += charWidth;
  }
  
  return result;
}
```

### **適用箇所**

```javascript
// src/formatters.js での統合
const FILE_NAME_WIDTH = 40;  // BP-000準拠
const SIZE_WIDTH = 10;
const LINES_WIDTH = 10;

module.exports = {
  formatFileName(filename) {
    const displayName = path.relative(process.cwd(), filename) || filename;
    return padEndWithWidth(displayName, FILE_NAME_WIDTH);
  },
  
  formatSize(size) {
    const formatted = formatBytes(size);
    return padStartWithWidth(formatted, SIZE_WIDTH);
  },
  
  formatLines(lines) {
    const formatted = lines ? lines.toString() : '-';
    return padStartWithWidth(formatted, LINES_WIDTH);
  }
};
```

## 🧪 検証済み事項

### **基本動作確認**
- ✅ ASCII文字のみのファイル名：従来通り正常表示
- ✅ 日本語ファイル名：正しい幅で整列
- ✅ 中国語・韓国語ファイル名：正しい幅で整列
- ✅ 混在ファイル名（`test界隈.txt`）：正しい幅計算
- ✅ 長いファイル名：適切に省略記号で切り詰め

## 📊 期待効果

### **国際化対応**
- アジア圏での採用促進
- 多言語プロジェクトでの利用拡大
- グローバル標準への準拠

## ⚠️ 制限事項

### **ターミナル依存性**
- 等幅フォントの使用が前提
- 推奨ターミナル：iTerm2、Windows Terminal、VS Code Terminal
- 一部の古いターミナルでは表示が崩れる可能性

### **文字種別の制限**
- 絵文字：幅計算は可能だが、表示は環境依存
- ゼロ幅文字：基本的なサポートのみ
- 結合文字：string-widthライブラリの制限に依存

## 🔗 関連仕様

- **FUNC-000**: SQLiteデータベース基盤（ファイル名の保存）
- **FUNC-022**: CLI表示統合機能（表示システム全体）
- **BP-000**: v0.1.0.0実装計画（カラム幅定義）

### 外部リンク

- [string-width npm](https://www.npmjs.com/package/string-width)
- [East Asian Width - Unicode Standard](

---

**核心価値**: 多言語環境でも崩れない、美しく整列されたファイル監視表示の実現
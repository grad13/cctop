---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-200-east-asian-width-display.md
---

# Specification: East Asian Width Display

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/utils/ | Node.js |

| Field | Value |
|-------|-------|
| Related | view/view-display-integration.md |
| Test Type | Unit |

## 1. Overview

CLI表示において日本語・中国語・韓国語などのEast Asian文字を含むファイル名を正しい幅で表示する機能。string-widthライブラリを活用し、全角文字の表示幅を正確に計算してカラム整列を保つ。

**Scope (in)**:
- 半角文字（幅1）・全角文字（幅2）の正確な幅計算
- ファイル名カラムの幅調整とパディング処理
- 幅超過時の省略記号（...）による切り詰め
- 全カラムでの統一的な幅処理

**Scope (out)**:
- 絵文字・特殊記号の完全対応
- ターミナル固有の表示問題への対応
- 動的なカラム幅の自動調整
- RTL言語のサポート

## 2. Dependency

```json
{
  "dependencies": {
    "string-width": "^5.1.2"
  }
}
```

## 3. Core Implementation

```javascript
const stringWidth = require('string-width');

// Right-padded string with display width awareness
function padEndWithWidth(str, targetWidth) {
  const currentWidth = stringWidth(str);
  if (currentWidth > targetWidth) {
    return truncateWithEllipsis(str, targetWidth);
  }
  return str + ' '.repeat(targetWidth - currentWidth);
}

// Left-padded string with display width awareness
function padStartWithWidth(str, targetWidth) {
  const currentWidth = stringWidth(str);
  if (currentWidth > targetWidth) {
    return truncateWithEllipsis(str, targetWidth);
  }
  return ' '.repeat(targetWidth - currentWidth) + str;
}

// Truncate with ellipsis when width exceeded
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

## 4. Column Width Constants

```javascript
// src/formatters.js
const FILE_NAME_WIDTH = 40;
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

## 5. Validation

- ASCII-only filenames: display unchanged
- Japanese filenames: aligned correctly with 2-width characters
- Chinese and Korean filenames: aligned correctly
- Mixed filenames (e.g. `test界隈.txt`): correct width calculation
- Long filenames: truncated with ellipsis at correct boundary

## 6. Constraints

**Terminal requirements**:
- Monospace font required
- Recommended: iTerm2, Windows Terminal, VS Code Terminal
- Some older terminals may render incorrectly

**Character type limitations**:
- Emoji: width calculation possible but rendering is environment-dependent
- Zero-width characters: basic support only
- Combining characters: subject to string-width library limitations

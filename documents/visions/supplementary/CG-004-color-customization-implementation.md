# CG-004: 色カスタマイズ実装ガイド

**作成日**: 2025年6月27日 18:30  
**更新日**: 2025年6月27日 18:30  
**作成者**: Architect Agent  
**タイプ**: Code Guide  
**関連仕様**: FUNC-207

## 📋 概要

FUNC-207（表示色カスタマイズ機能）の具体的な実装例・設定事例・技術実装方法を提供します。

## 🎨 プリセットテーマ事例

### themes/default.json
```json
{
  "name": "default",
  "description": "バランスの取れた標準色設定",
  "version": "1.0.0",
  "colors": {
    "header": { "title": "cyan", "path": "white", "separator": "gray" },
    "events": {
      "eventType": {
        "find": "blue", "create": "green", "modify": "yellow", 
        "delete": "red", "move": "magenta"
      }
    },
    "filter": { "keyActive": "green", "keyInactive": "black" }
  }
}
```

### themes/high-contrast.json
```json
{
  "name": "high-contrast",
  "description": "視認性重視の高コントラスト設定",
  "version": "1.0.0",
  "colors": {
    "header": { "title": "white", "path": "white", "separator": "white" },
    "events": {
      "eventType": {
        "find": "white", "create": "white", "modify": "white",
        "delete": "white", "move": "white"
      }
    },
    "filter": { "keyActive": "white", "keyInactive": "dim" }
  }
}
```

### themes/colorful.json
```json
{
  "name": "colorful",
  "description": "鮮やかな色分けで要素を明確に区別",
  "version": "1.0.0",
  "colors": {
    "header": { "title": "magenta", "path": "cyan", "separator": "blue" },
    "events": {
      "eventType": {
        "find": "blue", "create": "brightGreen", "modify": "brightYellow",
        "delete": "brightRed", "move": "brightMagenta"
      }
    },
    "filter": { "keyActive": "brightCyan", "keyInactive": "dim" }
  }
}
```

### themes/minimal.json
```json
{
  "name": "minimal",
  "description": "控えめな色使いのシンプル設定",
  "version": "1.0.0",
  "colors": {
    "header": { "title": "white", "path": "gray", "separator": "dim" },
    "events": {
      "eventType": {
        "find": "gray", "create": "gray", "modify": "white",
        "delete": "gray", "move": "gray"
      }
    },
    "filter": { "keyActive": "white", "keyInactive": "dim" }
  }
}
```

## 🎯 色指定対応表

### サポートする色名
```javascript
const SUPPORTED_COLORS = {
  // 基本色
  'black': '\x1b[30m',
  'red': '\x1b[31m',
  'green': '\x1b[32m',
  'yellow': '\x1b[33m',
  'blue': '\x1b[34m',
  'magenta': '\x1b[35m',
  'cyan': '\x1b[36m',
  'white': '\x1b[37m',
  
  // 明るい色
  'brightBlack': '\x1b[90m',
  'brightRed': '\x1b[91m',
  'brightGreen': '\x1b[92m',
  'brightYellow': '\x1b[93m',
  'brightBlue': '\x1b[94m',
  'brightMagenta': '\x1b[95m',
  'brightCyan': '\x1b[96m',
  'brightWhite': '\x1b[97m',
  
  // 特殊
  'gray': '\x1b[90m',
  'dim': '\x1b[2m',
  'default': '\x1b[39m',
  'reset': '\x1b[0m'
};
```

## 🔧 実装コード例

### ThemeManagerクラス
```javascript
class ThemeManager {
  constructor() {
    this.themesDir = '.cctop/themes';
    this.currentThemeFile = '.cctop/theme.json';
    this.currentTheme = this.loadCurrentTheme();
  }
  
  loadCurrentTheme() {
    try {
      const currentThemeData = JSON.parse(fs.readFileSync(this.currentThemeFile, 'utf8'));
      const themeName = currentThemeData.current || 'default';
      const themePath = path.join(this.themesDir, `${themeName}.json`);
      return JSON.parse(fs.readFileSync(themePath, 'utf8'));
    } catch (error) {
      return this.loadFallbackTheme();
    }
  }
  
  loadFallbackTheme() {
    // default.jsonが読めない場合のハードコードフォールバック
    return { 
      colors: { 
        events: { 
          eventType: { 
            find: "blue", create: "green", modify: "yellow", 
            delete: "red", move: "magenta"
          } 
        } 
      } 
    };
  }
  
  switchTheme(themeName) {
    const currentThemeData = {
      current: themeName,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0"
    };
    fs.writeFileSync(this.currentThemeFile, JSON.stringify(currentThemeData, null, 2));
    this.currentTheme = this.loadCurrentTheme();
  }
  
  // 色適用メソッド
  colorize(text, colorPath) {
    const color = this.getColor(colorPath);
    return color ? `${color}${text}\x1b[0m` : text;
  }
  
  // ネストした色設定取得
  getColor(path) {
    // 例: 'events.eventType.create' → colors.events.eventType.create
    return path.split('.').reduce((obj, key) => obj?.[key], this.currentTheme.colors);
  }
}
```

### 表示要素への適用例

#### ヘッダー表示
```javascript
function renderHeader(path) {
  const title = themeManager.colorize('cctop v0.2.0', 'header.title');
  const pathText = themeManager.colorize(path, 'header.path');
  const separator = themeManager.colorize('─'.repeat(80), 'header.separator');
  
  return `${title} - ${pathText}\n${separator}`;
}
```

#### イベント表示
```javascript
function renderEvent(event) {
  const id = themeManager.colorize(event.id, 'events.eventId');
  const time = themeManager.colorize(event.timestamp, 'events.timestamp');
  const type = themeManager.colorize(event.event_type, `events.eventType.${event.event_type}`);
  const file = themeManager.colorize(event.file_path, 'events.filePath');
  const size = themeManager.colorize(event.file_size, 'events.fileSize');
  
  return `${id} ${time} ${type} ${file} ${size}`;
}
```

#### フィルタライン表示
```javascript
class FilterStatusRenderer {
  static renderFilterLine(filters) {
    const filterItems = [
      { key: 'f', name: 'Find', active: filters.find },
      { key: 'c', name: 'Create', active: filters.create },
      { key: 'm', name: 'Modify', active: filters.modify },
      { key: 'd', name: 'Delete', active: filters.delete },
      { key: 'v', name: 'Move', active: filters.move }
    ];
    
    const rendered = filterItems.map(item => {
      const keyColorPath = item.active ? 'filter.keyActive' : 'filter.keyInactive';
      const labelColorPath = item.active ? 'filter.labelActive' : 'filter.labelInactive';
      
      const keyText = themeManager.colorize(item.key, keyColorPath);
      const labelText = themeManager.colorize(item.name, labelColorPath);
      
      return `[${keyText}]:${labelText}`;
    });
    
    return rendered.join(' ');
  }
}
```

---

**このガイドにより、FUNC-207色カスタマイズ機能の具体的な実装方法を理解できます。使用方法については [FUNC-207](../pilots/FUNC-207-display-color-customization.md) を参照してください。**
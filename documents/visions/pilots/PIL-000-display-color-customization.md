# PIL-000: 表示色カスタマイズ機能

**作成日**: 2025年6月25日 10:00  
**更新日**: 2025年6月26日 18:00  
**作成者**: Architect Agent  
**ステータス**: Draft  
**対象バージョン**: -
**カテゴリ**: Display & UI Experiments

## 📊 機能概要

cctopの全表示要素の色をconfig.jsonで自由にカスタマイズ可能にする機能。イベントタイプフィルタ・ヘッダー・ステータス・テキスト等の全色設定。

**ユーザー価値**: 視認性向上・個人の好み対応・環境適応・アクセシビリティ向上・チーム統一表示

## 🎯 機能境界

### ✅ **実行する**
- 全表示要素の色設定（フィルタ・ヘッダー・イベント・ステータス等）
- config.jsonでのカスタマイズ設定
- プリセット色パターン提供
- リアルタイム色変更・プレビュー機能

### ❌ **実行しない**
- フォント・サイズ・レイアウト変更
- 背景色・ターミナル設定変更
- 画像・アイコン表示

## 📋 必要な仕様

### **config.jsonスキーマ拡張**

#### **色設定セクション追加**
```json
{
  "version": "0.1.0",
  "display": {
    "colors": {
      "theme": "default",              // プリセット名
      "header": {
        "title": "cyan",               // cctop v0.1.0
        "path": "white",               // /path/to/project
        "separator": "gray"            // ────────
      },
      "events": {
        "eventId": "dim",              // ID列
        "timestamp": "yellow",         // TIME列  
        "eventType": {
          "find": "blue",              // findイベント
          "create": "green",           // createイベント
          "modify": "yellow",          // modifyイベント
          "delete": "red",             // deleteイベント
          "move": "magenta"            // moveイベント
        },
        "filePath": "white",           // FILE列
        "fileSize": "cyan",            // SIZE列
        "lineCount": "dim"             // LINES列
      },
      "status": {
        "label": "gray",               // "Events:", "Files:"
        "value": "white",              // 数値
        "separator": "dim"             // |
      },
      "filter": {
        "keyActive": "green",          // [f] アクティブ時
        "keyInactive": "black",        // [f] 非アクティブ時
        "labelActive": "white",        // :Find アクティブ時
        "labelInactive": "gray",       // :Find 非アクティブ時
        "separator": "dim"             // スペース区切り
      },
      "general": {
        "text": "white",               // 一般テキスト
        "highlight": "cyan",          // 強調表示
        "error": "red",               // エラーメッセージ
        "success": "green",           // 成功メッセージ
        "warning": "yellow"           // 警告メッセージ
      }
    }
  }
}
```

### **プリセット色テーマ**

#### **1. Default（デフォルト）**
```json
{
  "theme": "default",
  "description": "バランスの取れた標準色設定",
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

#### **2. High Contrast（高コントラスト）**
```json
{
  "theme": "high-contrast",
  "description": "視認性重視の高コントラスト設定",
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

#### **3. Colorful（カラフル）**
```json
{
  "theme": "colorful",
  "description": "鮮やかな色分けで要素を明確に区別",
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

#### **4. Minimal（ミニマル）**
```json
{
  "theme": "minimal",
  "description": "控えめな色使いのシンプル設定",
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

### **色指定フォーマット**

#### **サポートする色名**
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

## 🔧 技術的実装詳細

### **1. ColorManagerクラス実装**

#### **色管理システム**
```javascript
class ColorManager {
  constructor() {
    this.colors = null;
    this.theme = 'default';
    this.loadColorsFromConfig();
  }
  
  loadColorsFromConfig() {
    const config = ConfigManager.getDisplayConfig();
    this.theme = config.colors?.theme || 'default';
    this.colors = this.mergeWithPreset(config.colors);
  }
  
  // 色適用メソッド
  colorize(text, colorPath) {
    const color = this.getColor(colorPath);
    return color ? `${color}${text}\x1b[0m` : text;
  }
  
  // ネストした色設定取得
  getColor(path) {
    // 例: 'events.eventType.create' → colors.events.eventType.create
    return path.split('.').reduce((obj, key) => obj?.[key], this.colors);
  }
  
  // プリセットとの統合
  mergeWithPreset(userColors) {
    const preset = PRESETS[this.theme] || PRESETS.default;
    return deepMerge(preset, userColors);
  }
}
```

### **2. 表示要素への適用**

#### **ヘッダー表示**
```javascript
function renderHeader(path) {
  const title = colorManager.colorize('cctop v0.1.0', 'header.title');
  const pathText = colorManager.colorize(path, 'header.path');
  const separator = colorManager.colorize('─'.repeat(80), 'header.separator');
  
  return `${title} - ${pathText}\n${separator}`;
}
```

#### **イベント表示**
```javascript
function renderEvent(event) {
  const id = colorManager.colorize(event.id, 'events.eventId');
  const time = colorManager.colorize(event.timestamp, 'events.timestamp');
  const type = colorManager.colorize(event.event_type, `events.eventType.${event.event_type}`);
  const file = colorManager.colorize(event.file_path, 'events.filePath');
  const size = colorManager.colorize(event.file_size, 'events.fileSize');
  
  return `${id} ${time} ${type} ${file} ${size}`;
}
```

#### **フィルタライン表示（FUNC-020統合）**
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
      
      const keyText = colorManager.colorize(item.key, keyColorPath);
      const labelText = colorManager.colorize(item.name, labelColorPath);
      
      return `[${keyText}]:${labelText}`;
    });
    
    return rendered.join(' ');
  }
}
```

### **3. 設定変更・プレビュー機能**

#### **リアルタイム色変更**
```javascript
// CLI色変更コマンド
cctop --set-color events.eventType.create brightGreen
cctop --set-theme colorful
cctop --preview-theme high-contrast
```

#### **設定変更API**
```javascript
class ColorManager {
  setColor(path, color) {
    this.setNestedValue(this.colors, path, color);
    this.saveToConfig();
    this.notifyColorChange();
  }
  
  setTheme(themeName) {
    this.theme = themeName;
    this.loadColorsFromConfig();
    this.notifyColorChange();
  }
  
  previewTheme(themeName) {
    const backup = { ...this.colors };
    this.setTheme(themeName);
    
    // 5秒後に元に戻す
    setTimeout(() => {
      this.colors = backup;
      this.notifyColorChange();
    }, 5000);
  }
}
```

## 🧪 テスト要件

### **基本機能テスト**
- [ ] config.json色設定の正常読み込み
- [ ] 各表示要素への色適用確認
- [ ] プリセットテーマの切り替え動作
- [ ] 無効な色名での適切なフォールバック

### **統合テスト**
- [ ] FUNC-020フィルタ機能との色統合
- [ ] リアルタイム色変更動作
- [ ] 設定保存・読み込み確認

### **視覚的テスト**
- [ ] 各プリセットテーマの表示確認
- [ ] 色覚多様性での視認性確認
- [ ] 異なるターミナル環境での表示確認

## 🎯 実装優先度

### **Phase 1: 基本色設定**
- ColorManagerクラス実装
- config.jsonスキーマ拡張
- 基本的な色適用機能

### **Phase 2: プリセット・拡張機能**
- プリセットテーマ実装
- CLI色変更コマンド
- プレビュー機能

### **Phase 3: 高度機能**
- カスタムテーマ作成支援
- 色設定エクスポート・インポート
- 自動色調整（背景色検出等）

## 💡 将来拡張

### **アクセシビリティ機能**
- 色覚多様性対応テーマ
- ハイコントラストモード
- 色なし表示モード（記号による区別）

### **チーム機能**
- チーム共有カラーテーマ
- プロジェクト固有色設定
- ブランド色対応

## 🎯 成功指標

1. **カスタマイズ性**: 全表示要素の色変更可能
2. **使いやすさ**: プリセットで即座に適用可能
3. **視認性**: 様々な環境での適切な表示
4. **統合性**: 既存機能（FUNC-020等）との完全統合

---

**この色カスタマイズ機能により、cctopは個人の好み・環境・チームに最適化された視覚体験を提供します。**
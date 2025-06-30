# FUNC-207: Color Rendering System

**作成日**: 2025年6月27日 21:50  
**更新日**: 2025年6月30日  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-108, FUNC-202, CG-004

## 📊 機能概要

色テーマ設定に基づいて実際のターミナル出力に色を適用するレンダリングシステム。FUNC-108で管理される色設定を読み取り、各表示要素に適切な色を適用する。

**ユーザー価値**: 
- 視認性の高い表示
- 一貫性のある色適用
- リアルタイムの色反映
- 多様な色形式のサポート

## 🎯 機能境界

### ✅ **実行する**
- 色設定の解釈と適用
- ターミナルへの色出力
- プリセット色と16進数色の処理
- リアルタイムプレビュー機能
- 色値のバリデーション

### ❌ **実行しない**
- 色設定ファイルの管理（FUNC-108の責務）
- テーマの切り替え（FUNC-108の責務）
- 設定の永続化（FUNC-108の責務）

## 📋 必要な仕様

### **ColorManagerクラス**

```javascript
class ColorManager {
  constructor() {
    this.colors = null;
    this.chalk = require('chalk');
  }

  // 色設定を読み込む（FUNC-108経由）
  async loadColors() {
    const themeConfig = await ThemeConfigManager.getCurrentTheme();
    this.colors = themeConfig.colors;
  }

  // 色を適用する
  applyColor(text, colorPath) {
    const color = this.getColorValue(colorPath);
    return this.renderWithColor(text, color);
  }

  // 色値を取得（ドット記法対応）
  getColorValue(path) {
    // 例: "table.row.event_type.modify"
    const parts = path.split('.');
    let value = this.colors;
    for (const part of parts) {
      value = value[part];
    }
    return value;
  }

  // 実際の色レンダリング
  renderWithColor(text, colorValue) {
    if (colorValue.startsWith('#')) {
      // 16進数色
      return this.chalk.hex(colorValue)(text);
    } else {
      // プリセット色
      return this.chalk[colorValue](text);
    }
  }
}
```

### **サポートする色形式**

#### **プリセット色（chalk標準）**
- 基本色: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
- 明るい色: `gray`, `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`
- 特殊: `dim`, `bold`, `italic`, `underline`, `inverse`

#### **16進数色**
- 6桁形式: `#FF0000`, `#00FF00`, `#0000FF`
- 3桁形式（自動展開）: `#F00` → `#FF0000`

### **表示要素への色適用**

```javascript
// イベントタイプの色適用
const eventType = 'modify';
const coloredEvent = colorManager.applyColor(
  eventType, 
  `table.row.event_type.${eventType}`
);

// ステータスバーの色適用
const statusText = 'All Activities';
const coloredStatus = colorManager.applyColor(
  statusText,
  'status.status_bar'
);

// エラーメッセージの色適用
const errorMsg = 'File not found';
const coloredError = colorManager.applyColor(
  errorMsg,
  'messages.error'
);
```

## 🔗 関連機能との連携

### **FUNC-108: Color Theme Configuration**
- current-theme.jsonから色設定を取得
- テーマ変更通知を受け取る
- 設定の再読み込みトリガー

### **FUNC-202: CLI Display Integration**
- 各表示要素のレンダリング時に色適用
- テーブル、ステータスバー、メッセージエリアの色付け

### **FUNC-300: Key Input Manager**
- インタラクティブモードでの色ハイライト
- 選択状態の色変更

## 🎯 機能要件

### **パフォーマンス要件**
1. 色適用のオーバーヘッド最小化
2. 色設定のキャッシング
3. 不要な再レンダリングの回避

### **エラーハンドリング**
1. 無効な色値のフォールバック（デフォルト色）
2. 色設定欠落時の graceful degradation
3. ターミナル非対応色の代替処理

### **リアルタイムプレビュー**
1. 色変更の即座反映
2. プレビューモードでのサンプル表示
3. Before/After比較表示

## 🧪 実装ガイドライン

### **初期化フロー**
```javascript
// 1. アプリケーション起動時
const colorManager = new ColorManager();
await colorManager.loadColors();

// 2. テーマ変更時の再読み込み
ThemeConfigManager.on('themeChanged', async () => {
  await colorManager.loadColors();
  // 画面再描画をトリガー
  displayManager.refresh();
});
```

### **色適用のベストプラクティス**
1. **早期バインディング**: 起動時に色設定を読み込み
2. **遅延評価**: 実際の描画時まで色適用を遅延
3. **バッチ処理**: 複数要素の色適用をまとめて実行

## 📊 期待効果

### **ユーザー体験向上**
- 統一感のある色表示
- 高速な色切り替え
- 多様な環境への対応

### **開発効率向上**
- 色適用ロジックの一元化
- テスタブルな色レンダリング
- 拡張性の高い実装

---

**核心価値**: 柔軟で高速な色レンダリングシステムにより、美しく機能的な表示を実現
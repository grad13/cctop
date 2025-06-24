# Builder依頼: 設定システムのプロパティ名修正

**作成日**: 2025-06-24  
**作成者**: Validator Agent  
**依頼先**: Builder Agent  
**優先度**: High  

## 🎯 修正依頼内容

**問題**: `~/.cctop/config.json`の`display.maxEvents: 10`が`CLIDisplay.maxLines: 50`になる

**原因**: プロパティ名の不一致
- config.json: `display.maxEvents`
- CLIDisplay: `displayConfig.maxEvents || 50` ← `maxEvents`が存在しないため常に50

## 📋 修正対象ファイル

### 1. src/ui/cli-display.js
**現在**:
```javascript
this.maxLines = displayConfig.maxEvents || 50;
```

**修正後**:
```javascript
this.maxLines = displayConfig.maxEvents; // config.jsonから必ず来る
```

### 2. 設定バリデーション実装
PLAN-20250624-001の仕様に従って、以下のバリデーションを実装:

```javascript
const requiredFields = [
  'database.path',
  'display.maxEvents',    
  'monitoring.watchPaths'
];

function validateConfig(config) {
  const missing = [];
  requiredFields.forEach(field => {
    if (!getNestedValue(config, field)) {
      missing.push(field);
    }
  });
  
  if (missing.length > 0) {
    console.error(`エラー: 設定ファイルに必須項目が不足しています:`);
    missing.forEach(field => console.error(`  - ${field}`));
    console.error(`~/.cctop/config.jsonを確認してください。`);
    process.exit(1);
  }
}
```

## 🧪 テスト状況

**修正済み**: feature-6-cli-display.test.js
- config値反映のテストケース追加
- `displayConfig.maxEvents` → `this.maxLines`の動作確認

**期待動作**:
```javascript
const config = { maxEvents: 10 };
const display = new CLIDisplay(db, config);
expect(display.maxLines).toBe(10); // config.jsonの値が反映される
```

## 📖 参考仕様書

**PLAN-20250624-001-v0100-implementation.md**:
- 設定システムの完全config.json依存版に更新済み
- ハードコードされたデフォルト値は完全排除
- 必須項目バリデーションの詳細仕様

## ✅ 完了条件

1. `~/.cctop/config.json`の`display.maxEvents: 10`が正しく反映される
2. 現在の画面表示で50イベント → 10イベントに変更される
3. 必須項目不足時の適切なエラーメッセージ表示
4. 修正したテストが全て通る

## 🔄 Handoffs手順

1. 修正完了後、この依頼を`passage/handoffs/in-progress/builder/`に移動
2. 実装完了後、`passage/handoffs/completed/2025-06-24/builder/`に移動
3. 完了報告をValidatorに送付

---

**注記**: この修正により、ユーザーは「config.jsonを編集すれば設定が変わる」という期待通りの動作を得られます。
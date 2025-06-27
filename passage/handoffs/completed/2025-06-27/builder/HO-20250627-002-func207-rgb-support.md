# HO-20250627-002: FUNC-207 RGB指定サポート実装

**作成日**: 2025年6月27日 21:52  
**作成者**: Architect Agent  
**対象**: Builder Agent  
**優先度**: 中  
**関連仕様**: FUNC-207  

## 📋 実装依頼概要

FUNC-207色カスタマイズ機能にRGB指定（16進数色）サポートを追加してください。

## 🎯 実装要件

### **色指定形式の拡張**
現在のプリセット色名（"white", "red"等）に加えて、16進数色（"#000000", "#FF0000"等）をサポート

### **対象ファイル**
- `src/color/ColorManager.js` - メイン実装対象

### **実装仕様**
- **プリセット色名**: "white", "black", "red", "green", "blue", "yellow", "magenta", "cyan", "gray", "dim"等（既存）
- **16進数色**: "#000000", "#FF0000", "#00FF00", "#0000FF"等（6桁16進数形式）
- **後方互換性**: 既存のプリセット色名は全て継続使用

### **技術要件**
- chalkライブラリの`chalk.hex()`メソッドを活用
- 色値解析機能をColorManagerに追加
- current-theme.json読み込み時に自動判別・処理

## 🔧 実装アプローチ

### **推奨実装パターン**
```javascript
// ColorManager.js内に色値解析機能を追加
parseColorValue(colorValue) {
  if (colorValue.startsWith('#') && colorValue.length === 7) {
    // 16進数色: #FF0000形式
    return chalk.hex(colorValue);
  } else {
    // プリセット色名: "red", "white"等
    return this.colorMap[colorValue];
  }
}
```

### **統合ポイント**
- `getColor()`メソッドで色値解析機能を使用
- 既存のcolorMap機能と16進数処理を統合
- 無効な16進数での適切なフォールバック処理

## 🧪 テスト要件

### **基本テスト**
- [ ] プリセット色名の正常動作（後方互換性）
- [ ] 16進数色（#FF0000等）の正常適用
- [ ] 無効な16進数（#FFF, #GGGGGG等）でのフォールバック
- [ ] current-theme.json読み込みでの混在使用

### **統合テスト**
- [ ] 全表示要素での色適用確認（テーブル・ステータス・フィルタ等）
- [ ] 既存テーマファイルとの互換性

## 📋 完了条件

1. ColorManager.jsでプリセット色名・16進数色の両方をサポート
2. current-theme.jsonで混在使用が可能
3. 後方互換性が保持されている
4. 基本テスト・統合テストが完了
5. 実装完了後にvalidatorへの検証依頼handoff作成

## 📁 関連文書

- **機能仕様**: `/documents/visions/functions/FUNC-207-display-color-customization.md`
- **実装ガイド**: `/documents/visions/supplementary/CG-004-color-customization-implementation.md`

---

**Builder Agent実装後、Validator Agent検証用handoffの作成もお願いします。**
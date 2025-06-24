# FUNC-016: 設定マイグレーション機能

**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**カテゴリ**: Configuration  
**Phase**: 3 (将来機能)  
**ステータス**: Active

## 📊 機能概要

バージョンアップ時に設定ファイルを自動更新する機能。

**ユーザー価値**: バージョンアップ時の手動設定更新不要・設定互換性の保証・スムーズなアップグレード体験

## 🎯 機能境界

### ✅ **実行する**
- 旧設定→新設定の自動変換・バックアップ
- スキーマバージョン管理・互換性チェック
- 設定検証・エラー復旧・マイグレーション履歴管理
- 段階的マイグレーション・ロールバック機能

### ❌ **実行しない**
- 手動設定の妥当性判断・外部設定ファイルの操作
- データベースマイグレーション（FUNC-010の範囲）

## 📋 必要な仕様

### **設定スキーマバージョン管理**

#### **バージョン定義**
```javascript
const schemaVersions = {
  "1.0.0": {
    introduced: "0.1.0.0",
    description: "Initial configuration schema",
    required: ["monitoring", "database", "display"],
    optional: ["performance"]
  },
  "1.1.0": {
    introduced: "0.2.0.0", 
    description: "Added advanced monitoring options",
    changes: ["monitoring.advancedMode", "monitoring.customFilters"],
    deprecated: ["monitoring.simpleMode"]
  },
  "1.2.0": {
    introduced: "0.3.0.0",
    description: "Enhanced display configuration", 
    changes: ["display.themes", "display.layouts"],
    breaking: ["display.colorScheme → display.themes.colorScheme"]
  }
};
```

#### **設定ファイル内バージョン情報**
```json
{
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "monitoring": { ... },
  "database": { ... },
  "display": { ... },
  "_meta": {
    "createdAt": "2025-06-24T23:00:00.000Z",
    "lastMigrated": "2025-06-24T23:00:00.000Z",
    "migratedFrom": null,
    "backupPath": "~/.cctop/backups/config.backup.20250624.json"
  }
}
```

### **マイグレーション定義**

#### **マイグレーションルール**
```javascript
const migrations = [
  {
    from: "1.0.0",
    to: "1.1.0", 
    type: "additive",
    transforms: [
      {
        action: "add",
        path: "monitoring.advancedMode",
        defaultValue: false
      },
      {
        action: "add", 
        path: "monitoring.customFilters",
        defaultValue: []
      },
      {
        action: "deprecate",
        path: "monitoring.simpleMode",
        replacement: "monitoring.advancedMode",
        converter: (value) => !value  // simpleMode=true → advancedMode=false
      }
    ]
  },
  {
    from: "1.1.0",
    to: "1.2.0",
    type: "breaking",
    transforms: [
      {
        action: "move",
        from: "display.colorScheme", 
        to: "display.themes.colorScheme"
      },
      {
        action: "add",
        path: "display.themes.layout",
        defaultValue: "standard"
      },
      {
        action: "restructure",
        path: "display",
        converter: (oldDisplay) => ({
          ...oldDisplay,
          themes: {
            colorScheme: oldDisplay.colorScheme,
            layout: "standard"
          }
        })
      }
    ]
  }
];
```

### **マイグレーション種別**

#### **Additive Migration**（追加型）
- **特徴**: 後方互換性あり
- **操作**: 新設定項目の追加・デフォルト値設定
- **リスク**: 低

#### **Deprecation Migration**（非推奨型）  
- **特徴**: 旧設定は動作するが警告表示
- **操作**: 新設定への値変換・警告メッセージ
- **リスク**: 中

#### **Breaking Migration**（破壊的変更型）
- **特徴**: 旧設定では動作不可
- **操作**: 設定構造の変更・必須変換
- **リスク**: 高

## 🎯 機能要件

### **互換性チェック要件**
1. **スキーマバージョン検証**: 現在の設定ファイルのバージョン確認
2. **マイグレーション経路算出**: 必要なマイグレーション手順の自動計算
3. **互換性評価**: 破壊的変更の有無・影響範囲の評価

### **自動マイグレーション要件**
1. **段階的実行**: 複数バージョン間の段階的マイグレーション
2. **データ保全**: 元設定の自動バックアップ・復元可能性保証
3. **エラー処理**: マイグレーション失敗時の安全な復旧

### **ユーザー制御要件**
1. **事前確認**: 破壊的変更時のユーザー承認取得
2. **手動制御**: 自動マイグレーションの無効化オプション
3. **選択的適用**: 特定項目のみのマイグレーション

## 📊 マイグレーションフロー

### **起動時自動マイグレーション**
```
1. 設定読み込み → config.json・schemaVersion確認
2. バージョン比較 → 現在版と設定版の比較
3. マイグレーション計画 → 必要な変換手順の算出
4. バックアップ作成 → 元設定の安全な保存
5. 段階的変換 → 各バージョンステップの順次実行
6. 設定検証 → 変換後設定の妥当性確認
7. 設定保存 → 新形式での設定ファイル更新
8. 完了通知 → マイグレーション結果の報告
```

### **手動マイグレーション**
```bash
# 設定マイグレーション状況確認
cctop --config-status

# 手動マイグレーション実行
cctop --migrate-config

# 特定バージョンへのマイグレーション
cctop --migrate-config --to 1.2.0

# バックアップからの復元
cctop --restore-config --from ~/.cctop/backups/config.backup.20250624.json
```

## 🔍 統合対象（重複解消）

### **設定マイグレーション記述の統合**
- **FUNC-003**: v0.2.0.0拡張言及で将来のマイグレーション必要性言及

**統合結果**: FUNC-003の設定拡張・マイグレーション関連記述を本機能定義に一元化

## 📈 高度機能

### **設定分析・レポート**
```javascript
const migrationReport = {
  from: "1.0.0",
  to: "1.2.0", 
  summary: {
    totalChanges: 5,
    addedSettings: 3,
    deprecatedSettings: 1,
    breakingChanges: 1
  },
  changes: [
    {
      type: "added",
      path: "monitoring.advancedMode",
      value: false,
      reason: "Enhanced monitoring capabilities"
    },
    {
      type: "moved", 
      from: "display.colorScheme",
      to: "display.themes.colorScheme",
      reason: "Restructured theme system"
    }
  ],
  warnings: [
    "monitoring.simpleMode is deprecated, use monitoring.advancedMode instead"
  ],
  backupPath: "~/.cctop/backups/config.backup.20250624.json"
};
```

### **設定テンプレート変換**
```javascript
// 標準→カスタムテンプレート変換
const templateMigration = {
  from: "standard",
  to: "development",
  transforms: [
    {path: "display.refreshInterval", change: "100 → 50"},
    {path: "performance.enableMetrics", change: "false → true"}
  ]
};
```

### **バッチマイグレーション**
```bash
# 複数環境の一括マイグレーション
cctop --batch-migrate --configs "./configs/*.json"

# チーム設定の統一
cctop --sync-config --from team-template.json
```

## 🔧 安全機能

### **バックアップ戦略**
- **自動バックアップ**: マイグレーション前の必須バックアップ
- **世代管理**: 過去10回分のバックアップ保持
- **整合性チェック**: バックアップファイルの破損検証

### **ロールバック機能**
```javascript
const rollbackOptions = {
  target: "previous",        // 直前バージョン
  automatic: true,          // 失敗時自動ロールバック
  verifyIntegrity: true,    // 復元後整合性確認
  preserveUserData: true    // ユーザーデータ保護
};
```

### **エラー処理**
- **段階的復旧**: 部分失敗時の安全な中断・復旧
- **詳細ログ**: マイグレーション過程の完全記録
- **ユーザー支援**: 手動修正が必要な場合の詳細ガイダンス

## 📊 期待効果

### **アップグレード体験向上**
- 手動設定変更の完全自動化
- バージョンアップ時の設定エラー防止
- スムーズなアップグレード体験の提供

### **運用効率化**
- 複数環境での設定統一・管理
- チーム開発での設定バージョン管理
- 設定変更の履歴・トレーサビリティ確保

### **安定性向上**
- 設定互換性問題の事前解決
- 安全なバックアップ・復元機能
- 破壊的変更時の適切なユーザー制御

---

**核心価値**: 設定の互換性・継続性を保証し、cctopのバージョンアップを常に安全で簡単な体験にする
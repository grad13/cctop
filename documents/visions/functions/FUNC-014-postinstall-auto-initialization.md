# FUNC-014: postinstall自動初期化機能

**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**カテゴリ**: Installation  
**Phase**: 2 (中優先機能)  
**ステータス**: Active

## 📊 機能概要

npm install時の自動的な設定ディレクトリ・設定ファイル作成を行う機能。

**ユーザー価値**: 面倒な初期設定の自動化・すぐに使える状態の提供・初心者にも優しいセットアップ

## 🎯 機能境界

### ✅ **実行する**
- ~/.cctopディレクトリ作成・デフォルトconfig.json作成
- ユーザー確認処理・権限チェック
- 初期データベース作成・設定検証
- セットアップ完了通知・使用方法案内

### ❌ **実行しない**
- ファイル監視・DB管理・UI表示
- 通常のアプリケーション動作・ネットワーク通信

## 📋 必要な仕様

### **初期化ディレクトリ構造**

```
~/.cctop/
├── config.json          # デフォルト設定ファイル
├── activity.db          # 初期データベース（空）
├── logs/                 # ログディレクトリ
│   └── cctop.log        # アプリケーションログ
└── backups/             # 設定バックアップ
    └── config.backup.json
```

### **デフォルト設定テンプレート**

```json
{
  "version": "1.0.0",
  "monitoring": {
    "watchDirectory": ".",
    "ignorePatterns": [
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",
      "**/activity.db*",
      "**/logs/**"
    ],
    "followSymlinks": false,
    "maxDepth": null
  },
  "database": {
    "path": "~/.cctop/activity.db",
    "maxEvents": 100000,
    "retentionDays": 30
  },
  "display": {
    "mode": "all",
    "refreshInterval": 100,
    "maxDisplayLines": 1000,
    "colorEnabled": true
  },
  "performance": {
    "enableMetrics": false,
    "metricsInterval": 5000
  },
  "_meta": {
    "createdAt": "2025-06-24T23:00:00.000Z",
    "createdBy": "postinstall",
    "version": "0.1.0.0"
  }
}
```

### **postinstallスクリプト仕様**

#### **package.jsonエントリ**
```json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js"
  }
}
```

#### **対話的セットアップフロー**
```
1. ウェルカムメッセージ表示
2. 初期化必要性の確認
3. ディレクトリ作成権限の確認
4. 設定ファイル作成の確認
5. セットアップ実行
6. 完了メッセージ・使用方法案内
```

## 🎯 機能要件

### **ユーザー確認要件**
1. **初期化確認**: セットアップ実行前のユーザー同意取得
2. **既存設定保護**: 既存config.jsonの上書き防止
3. **スキップオプション**: CI/CD環境での自動スキップ

### **権限チェック要件**
1. **ディレクトリ作成権限**: ~/.cctop作成可否の事前確認
2. **ファイル書き込み権限**: 設定ファイル作成可否の確認
3. **エラーハンドリング**: 権限不足時の適切なエラー表示

### **安全性要件**
1. **既存データ保護**: 既存のactivity.db・config.jsonを保護
2. **アトミック操作**: セットアップの全成功または全失敗
3. **ロールバック**: 失敗時の部分作成ファイルの削除

## 📊 初期化処理フロー

### **メイン初期化フロー**
```
1. 環境チェック → OS・Node.jsバージョン確認
2. 既存設定確認 → ~/.cctop/の存在確認
3. ユーザー確認 → 対話的セットアップ確認
4. 権限チェック → 必要権限の事前確認
5. ディレクトリ作成 → ~/.cctop/とサブディレクトリ
6. 設定ファイル作成 → デフォルトconfig.json
7. データベース初期化 → 空のactivity.db作成
8. 検証 → 作成されたファイルの妥当性確認
9. 完了通知 → セットアップ完了とガイダンス
```

### **エラーハンドリングフロー**
```
1. エラー検出 → 権限・ディスク容量・既存ファイル等
2. エラー分類 → 回復可能・不可能の判定
3. ユーザー通知 → 分かりやすいエラーメッセージ
4. ロールバック → 部分作成ファイルの削除
5. 代替案提示 → 手動セットアップガイダンス
```

## 🔧 対話的UI仕様

### **ウェルカムメッセージ**
```
┌─────────────────────────────────────────────┐
│  🔥 Welcome to cctop v0.1.0.0!             │
│                                             │
│  Real-time file change monitoring tool     │
│  that helps developers track code changes  │
│                                             │
│  This setup will create:                   │
│  • ~/.cctop/ directory                     │
│  • Default configuration file              │
│  • Empty activity database                 │
│                                             │
│  Continue with setup? (Y/n)                │
└─────────────────────────────────────────────┘
```

### **進捗表示**
```
Setting up cctop...
[✓] Checking environment
[✓] Creating ~/.cctop directory
[✓] Writing default configuration
[✓] Initializing database
[✓] Setup complete!
```

### **完了メッセージ**
```
┌─────────────────────────────────────────────┐
│  🎉 Setup complete!                         │
│                                             │
│  You can now use cctop:                    │
│  $ npx cctop                                │
│  $ npx cctop --help                        │
│                                             │
│  Configuration: ~/.cctop/config.json       │
│  Database: ~/.cctop/activity.db            │
│                                             │
│  For more information, visit:              │
│  https://github.com/your-org/cctop         │
└─────────────────────────────────────────────┘
```

## 🔍 統合対象（重複解消）

### **postinstall記述の統合**
- **FUNC-007**: postinstall仕様詳述
- **FUNC-006**: 設定ファイル連携言及

### **初期化処理記述の統合**
- **FUNC-007**: 自動セットアップ詳述
- **FUNC-010**: データベース初期化言及

**統合結果**: 上記文書のpostinstall・初期化関連記述を本機能定義に一元化

## 📈 高度機能

### **サイレントモード**
```bash
# CI/CD環境での自動インストール
CCTOP_SILENT_INSTALL=1 npm install cctop
```

### **カスタム初期化**
```bash
# カスタム設定での初期化
npx cctop --init --config-template minimal
npx cctop --init --dir /custom/path
```

### **アンインストール支援**
```bash
# 設定ファイル削除支援
npx cctop --cleanup
```

## 🎯 CI/CD対応

### **環境変数制御**
| 環境変数 | 効果 | デフォルト |
|----------|------|-----------|
| `CCTOP_SILENT_INSTALL` | 対話なしインストール | `false` |
| `CCTOP_SKIP_POSTINSTALL` | postinstall完全スキップ | `false` |
| `CCTOP_CONFIG_DIR` | 設定ディレクトリパス | `~/.cctop` |

### **Docker対応**
```dockerfile
# Dockerfileでの使用例
RUN CCTOP_SILENT_INSTALL=1 npm install cctop
```

## 📊 期待効果

### **ユーザー体験向上**
- 即座に使える状態の提供
- 設定ファイルの手動作成不要
- 初心者でも簡単なセットアップ

### **普及促進**
- インストール障壁の大幅削減
- 試用・評価の簡易化
- ドキュメント読まずとも使用開始可能

### **運用効率向上**
- CI/CD環境での自動セットアップ
- チーム開発での統一設定配布
- トラブルシューティングの簡易化

---

**核心価値**: 面倒な初期設定を完全自動化し、cctopを"install即使用可能"な状態で提供
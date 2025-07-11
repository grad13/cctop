# FUNC-101: 共通設定管理機能

**作成日**: 2025年6月24日 10:00  
**更新日**: 2025年6月30日 15:00  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-105, FUNC-106, FUNC-107  

## 📊 機能概要

DaemonとCLIで共有される基本設定を管理する機能。データベースパス、基本ディレクトリ、プロジェクト情報など、システム全体で一貫性が必要な設定を扱う。

**ユーザー価値**: 
- システム全体の一貫性確保
- 設定の重複排除
- 基本設定の一元管理
- バージョン管理の統一

## 🎯 機能境界

### ✅ **実行する**
- 共通設定ファイル（shared-config.json）の読み込み
- プロジェクト全体の基本設定管理
- データベースパスの管理
- バージョン情報の管理
- 設定マージの基本ロジック提供

### ❌ **実行しない**
- Daemon固有設定（FUNC-106の責務）
- CLI固有設定（FUNC-107の責務）
- 色テーマ管理（FUNC-108の責務）
- 設定ファイルの初期化（FUNC-105の責務）

## 📋 必要な仕様

### **3層設定アーキテクチャ**

```
.cctop/
├── config/                   # 設定ファイル用
│   ├── shared-config.json    # 共通設定（このFUNCの管理対象）
│   ├── daemon-config.json    # Daemon専用設定（FUNC-106）
│   └── cli-config.json       # CLI専用設定（FUNC-107）
├── themes/                   # カラーテーマ集（FUNC-108）
│   ├── current-theme.json    # 現在適用中の色設定
│   ├── default.json          # デフォルトテーマ
│   ├── high-contrast.json    # 高コントラストテーマ
│   └── custom/               # ユーザーカスタムテーマ
├── data/                     # データファイル用
│   ├── activity.db           # メインデータベース
│   ├── activity.db-wal       # SQLite WALファイル
│   └── activity.db-shm       # SQLite共有メモリ
├── logs/                     # ログファイル用
│   ├── daemon.log            # Daemonログ
│   └── cli.log               # CLIログ
├── runtime/                  # 実行時ファイル用
│   ├── daemon.pid            # DaemonプロセスID
│   └── daemon.sock           # Unixソケット
├── temp/                     # 一時ファイル用
└── .gitignore                # Git除外設定
```

### **設定読み込み階層**

1. **config/shared-config.json** - 基本設定（必須）
2. **プロセス固有設定** - config/daemon-config.json または config/cli-config.json
3. **CLI引数** - 一時的なオーバーライド

### **shared-config.jsonスキーマ定義**

```json
{
  "version": "0.3.0.0",
  "project": {
    "name": "cctop",
    "description": "Code Change Top - Real-time file monitoring tool"
  },
  "database": {
    "path": ".cctop/data/activity.db",     // DBファイルパス（FUNC-000準拠）
    "maxSize": 104857600                   // 最大DBサイズ（100MB）
  },
  "directories": {
    "config": ".cctop/config",        // 設定ディレクトリ
    "themes": ".cctop/themes",        // テーマディレクトリ
    "data": ".cctop/data",            // データディレクトリ
    "logs": ".cctop/logs",            // ログディレクトリ
    "runtime": ".cctop/runtime",      // 実行時ファイルディレクトリ
    "temp": ".cctop/temp"             // 一時ファイルディレクトリ
  },
  "logging": {
    "maxFileSize": 10485760,          // ログファイル最大サイズ（10MB）
    "maxFiles": 5,                    // ログファイル最大数
    "datePattern": "YYYY-MM-DD"       // ログファイル日付パターン
  }
}
```

### **JSON Schema定義**

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "object",
  "required": ["version", "project", "database", "directories"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+\\.\\d+$"
    },
    "project": {
      "type": "object",
      "required": ["name", "description"],
      "properties": {
        "name": {
          "type": "string"
        },
        "description": {
          "type": "string"
        }
      }
    },
    "database": {
      "type": "object",
      "required": ["path"],
      "properties": {
        "path": {
          "type": "string"
        },
        "maxSize": {
          "type": "integer",
          "minimum": 1048576
        }
      }
    },
    "directories": {
      "type": "object",
      "required": ["config", "themes", "data", "logs", "runtime", "temp"],
      "properties": {
        "config": {
          "type": "string"
        },
        "themes": {
          "type": "string"
        },
        "data": {
          "type": "string"
        },
        "logs": {
          "type": "string"
        },
        "runtime": {
          "type": "string"
        },
        "temp": {
          "type": "string"
        }
      }
    },
    "logging": {
      "type": "object",
      "properties": {
        "maxFileSize": {
          "type": "integer",
          "minimum": 1048576
        },
        "maxFiles": {
          "type": "integer",
          "minimum": 1
        },
        "datePattern": {
          "type": "string"
        }
      }
    }
  }
}
```

### **設定マージ戦略**

```javascript
// 設定読み込み関数の例
async function loadConfiguration(processType) {
  // 1. 共通設定を読み込み
  const sharedConfig = await loadSharedConfig();
  
  // 2. プロセス固有設定を読み込み
  let processConfig = {};
  if (processType === 'daemon') {
    processConfig = await loadDaemonConfig();
  } else if (processType === 'cli') {
    processConfig = await loadCliConfig();
  }
  
  // 3. 設定をマージ（深いマージ）
  const finalConfig = deepMerge(sharedConfig, processConfig);
  
  // 4. CLI引数でオーバーライド
  applyCliOverrides(finalConfig, process.argv);
  
  return finalConfig;
}
```


## 🔍 関連機能との連携

### **3層設定アーキテクチャでの役割**
- **FUNC-101（本機能）**: 共通設定管理・マージロジック提供
- **FUNC-106**: Daemon専用設定管理
- **FUNC-107**: CLI専用設定管理
- **FUNC-108**: 色テーマ設定管理

### **FUNC-105との役割分担**
- **FUNC-105**: 全設定ファイルの初期化・自動セットアップ
- **FUNC-101**: 共通設定のスキーマ定義・読み込みロジック

### **他機能との統合ポイント**
- **FUNC-000**: データベースパス設定の提供
- **全機能**: 基本ディレクトリパスの提供

## 🎯 機能要件

### **共通設定管理要件**
1. **必須設定の保証**: システム動作に必要な設定の確実な提供
2. **ディレクトリ作成**: 設定で指定されたディレクトリの自動作成
3. **バージョン互換性**: 設定フォーマットのバージョン管理

### **設定読み込み要件**
1. **共通設定の読み込み**: shared-config.jsonの確実な読み込み
2. **デフォルト値提供**: 設定が存在しない場合の適切なデフォルト
3. **エラー耐性**: 不正な設定値の検証・修正

### **設定マージ要件**
1. **深いマージ**: ネストされたオブジェクトの適切なマージ
2. **配列マージ戦略**: 配列値の置換・追加の制御
3. **型保証**: マージ後の型の一貫性確保

### **設定検証要件**
1. **スキーマ検証**: JSONスキーマによる構造・型チェック
2. **パス検証**: ファイル・ディレクトリパスの妥当性確認
3. **サイズ制限検証**: 最大値・最小値の範囲チェック

## 📊 設定処理フロー

### **プロセス起動時の設定統合フロー**
```
1. shared-config.json読み込み → 共通設定確立
2. プロセス固有設定読み込み → daemon/cli-config.json適用
3. CLI引数解析 → コマンドライン指定の適用
4. 設定検証 → 全設定の妥当性確認
5. ディレクトリ作成 → 必要なディレクトリの生成
6. 設定確定 → プロセス起動準備完了
```

### **設定ファイル不在時の処理**
```
1. デフォルト設定生成 → 最小限の動作保証
2. FUNC-105呼び出し → .cctop/ディレクトリ構造・設定ファイル初期化
3. 設定再読み込み → 生成された設定を適用
```

## 🔧 実装仕様

### **設定管理の設計原則**
- **責務の明確化**: 共通設定のみを管理、プロセス固有設定は各FUNCへ
- **疎結合**: 各設定ファイルは独立して存在可能
- **段階的拡張**: 基本設定から順次高度な設定へ
- **後方互換性**: 旧バージョン設定の自動マイグレーション

### **設定マージユーティリティ**
```javascript
// 共通マージ関数の提供
export const ConfigMerger = {
  // 深いマージ（オブジェクト用）
  deepMerge(target, source),
  
  // 配列マージ（戦略選択可能）
  mergeArrays(target, source, strategy),
  
  // CLI引数適用
  applyCliArgs(config, args),
  
  // 設定検証
  validate(config, schema)
};
```

## 📊 期待効果

### **アーキテクチャ改善**
- Daemon/CLI完全分離による安定性向上
- 設定の責務分離による保守性向上
- プロセス独立進化の実現

### **ユーザビリティ向上**
- 明確な設定構造による理解容易性
- プロセス別の最適化可能
- 設定競合の完全排除

### **開発効率向上**
- 共通ロジックの再利用
- テスト容易性の向上
- 設定関連バグの削減

---

**核心価値**: 3層設定アーキテクチャの基盤として、システム全体の一貫性と各プロセスの独立性を両立
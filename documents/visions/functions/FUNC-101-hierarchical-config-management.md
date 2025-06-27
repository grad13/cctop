# FUNC-101: 階層的設定管理機能

**作成日**: 2025年6月24日 10:00  
**更新日**: 2025年6月26日 00:00  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-102, FUNC-104, func-105, CG-002  

## 📊 機能概要

CLI引数・config.json・デフォルト値の階層的設定管理を行う機能。

**ユーザー価値**: 柔軟な設定変更・環境固有設定・簡単な初期設定・一貫した設定体験

## 🎯 機能境界

### ✅ **実行する**
- 設定ファイル読み込み・CLI引数パース
- 設定値マージ・デフォルト値提供
- 設定検証・エラーハンドリング
- 設定優先順位管理

### ❌ **実行しない**
- ファイル監視・DB管理・UI表示
- メタデータ収集・ネットワーク通信
- 動的アップデート

## 📋 必要な仕様

### **設定管理構造**

1. **CLI引数** - 一時的なオーバーライド
2. **config.json** - メイン設定ファイル（.cctop/config.json）

**注意**: 
- JSコード内に設定値を一切定義しない（定数除く）

### **config.jsonスキーマ定義**

```json
{
  "version": "0.2.0.0",
  "monitoring": {
    "watchPaths": [],              // 監視対象パス（複数指定可）
    "excludePatterns": [           // 除外パターン（FUNC-002 chokidar.ignoredと同期）
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",                     // 全隠しファイル（.DS_Store, .eslintrc等含む）
      "**/.cctop/**"
    ],
    "debounceMs": 100,             // イベントデバウンス時間
    "maxDepth": 10,                // 最大監視深度
    "moveThresholdMs": 100,        // moveイベント判定時間（FUNC-001）
    "systemLimits": {              // ファイル監視上限管理（FUNC-012）
      "requiredLimit": 524288,     // 必要な上限値（OS共通）
      "checkOnStartup": true,      // 起動時上限チェック
      "warnIfInsufficient": true   // 不足時警告表示
    },
    "backgroundMonitor": {         // バックグラウンド監視設定（FUNC-003）
      "enabled": true,             // バックグラウンド監視の有効/無効
      "logLevel": "info",          // ログレベル（error, warn, info, debug）
      "heartbeatInterval": 30000   // ハートビート間隔（ms）
    }
  },
  "database": {
    "path": ".cctop/activity.db", // DBファイルパス（FUNC-000準拠）
    "mode": "WAL"                    // SQLiteモード
  },
  "display": {
    "maxEvents": 20,               // 最大表示イベント数
    "refreshRateMs": 100,          // 表示更新間隔
    "colors": {                    // 色カスタマイズ（基本色のみ）
      "find": "cyan",
      "create": "green",
      "modify": "yellow",
      "move": "blue",
      "delete": "red",
      "restore": "magenta"
    },
    "statusArea": {                // ステータス表示エリア（FUNC-902）
      "maxLines": 3,               // ステータス表示行数（1-10）
      "enabled": true,             // ステータス表示のON/OFF
      "scrollSpeed": 200,          // 横スクロール速度（ms）
      "updateInterval": 5000       // 統計更新間隔（ms）
    }
  }
}
```

### **JSON Schema定義**

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "object",
  "required": ["version", "monitoring", "database", "display"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "monitoring": {
      "type": "object",
      "required": ["watchPaths", "excludePatterns"],
      "properties": {
        "watchPaths": {
          "type": "array",
          "items": { "type": "string" }
        },
        "excludePatterns": {
          "type": "array",
          "items": { "type": "string" }
        },
        "debounceMs": {
          "type": "integer",
          "minimum": 50
        },
        "maxDepth": {
          "type": "integer",
          "minimum": 1
        },
        "moveThresholdMs": {
          "type": "integer",
          "minimum": 50,
          "maximum": 1000
        },
        "systemLimits": {
          "type": "object",
          "properties": {
            "requiredLimit": {
              "type": "integer",
              "minimum": 1024
            },
            "checkOnStartup": {
              "type": "boolean"
            },
            "warnIfInsufficient": {
              "type": "boolean"
            }
          }
        },
        "backgroundMonitor": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean"
            },
            "logLevel": {
              "type": "string",
              "enum": ["error", "warn", "info", "debug"]
            },
            "heartbeatInterval": {
              "type": "integer",
              "minimum": 5000,
              "maximum": 300000
            }
          }
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
        "mode": {
          "type": "string",
          "enum": ["WAL", "DELETE", "TRUNCATE", "PERSIST", "MEMORY"]
        }
      }
    },
    "display": {
      "type": "object",
      "required": ["maxEvents", "refreshRateMs"],
      "properties": {
        "maxEvents": {
          "type": "integer",
          "minimum": 1
        },
        "refreshRateMs": {
          "type": "integer",
          "minimum": 50
        },
        "colors": {
          "type": "object",
          "properties": {
            "find": { "type": "string" },
            "create": { "type": "string" },
            "modify": { "type": "string" },
            "move": { "type": "string" },
            "delete": { "type": "string" },
            "restore": { "type": "string" }
          }
        },
        "statusArea": {
          "type": "object",
          "properties": {
            "maxLines": {
              "type": "integer",
              "minimum": 1,
              "maximum": 10
            },
            "enabled": {
              "type": "boolean"
            },
            "scrollSpeed": {
              "type": "integer",
              "minimum": 100,
              "maximum": 1000
            },
            "updateInterval": {
              "type": "integer",
              "minimum": 1000,
              "maximum": 30000
            }
          }
        }
      }
    }
  }
}
```

### **CLI引数定義**

**CLI仕様統合**: CLI引数の詳細は **[FUNC-104: CLIインターフェース統合仕様](./FUNC-104-cli-interface-specification.md)** を参照

```bash
cctop [options] [directory]

Options:
  --timeout <seconds>         タイムアウト時間（秒）
  --daemon --start            背景監視プロセス開始
  --daemon --stop             背景監視プロセス停止
  --view                      Monitor起動なし、既存DBから表示のみ
  --verbose                   詳細出力モード
  --check-limits              ファイル監視制限の確認と推奨設定表示
  -h, --help                  ヘルプメッセージ表示
```


## 🔍 関連機能との連携

### **FUNC-105との役割分担**
- **FUNC-105**: 設定ファイルの初期化・自動セットアップ
- **FUNC-101**: config.jsonスキーマ定義・設定値の階層的マージ処理

### **他機能との統合ポイント**
- **FUNC-000**: データベースパス設定の管理
- **FUNC-105**: ローカル設定初期化との連携
- **FUNC-203**: イベントフィルタリング設定の管理

## 🎯 機能要件

### **設定読み込み要件**
1. **起動時設定読み込み**: アプリケーション開始時の全設定統合
3. **エラー耐性**: 不正な設定値の検証・修正

### **設定マージ要件**
1. **優先順位適用**: CLI引数 > config.json設定
2. **部分マージ**: オブジェクト単位での細かい設定上書き
3. **型変換**: 文字列→数値、boolean等の自動変換

### **設定検証要件**
1. **スキーマ検証**: JSONスキーマによる構造・型チェック
2. **範囲検証**: 数値の最小・最大値チェック
3. **依存関係検証**: 設定間の論理的整合性チェック

## 📊 設定処理フロー

### **起動時設定統合フロー**
```
1. config.json読み込み → ファイル設定適用
2. CLI引数解析 → ユーザー指定設定適用
3. 設定検証 → 最終設定の妥当性確認
4. 設定確定 → アプリケーション設定完了
```

## 🔧 実装仕槕

### **設定管理の設計原則**
- **設定の一元化**: config.jsonがメイン設定ソース（.cctop/config.json）
- **JSコードのクリーン化**: ハードコード値を完全排除
- **ユーザーフレンドリー**: 設定変更 = config.json編集のみ
- **明確な責任分離**: config.json=デフォルト、CLI=一時上書き

## 📊 期待効果

### **ユーザビリティ向上**
- 環境に応じた柔軟な設定変更
- CLI・ファイル・環境変数による多様な設定方法
- 設定エラーの早期発見・修正

### **運用効率向上**
- 設定の一元管理・バージョン管理
- 環境固有設定の分離・管理
- 動的設定変更による再起動不要

---

**核心価値**: 柔軟で堅牢な設定管理により、様々な環境・用途でのcctop利用を最適化
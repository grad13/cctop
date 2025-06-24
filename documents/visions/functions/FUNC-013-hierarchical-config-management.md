# FUNC-013: 階層的設定管理機能

**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**カテゴリ**: Configuration  
**Phase**: 2 (中優先機能)  
**ステータス**: Active

## 📊 機能概要

CLI引数・config.json・デフォルト値の階層的設定管理を行う機能。

**ユーザー価値**: 柔軟な設定変更・環境固有設定・簡単な初期設定・一貫した設定体験

## 🎯 機能境界

### ✅ **実行する**
- 設定ファイル読み込み・CLI引数パース
- 設定値マージ・デフォルト値提供
- 設定検証・エラーハンドリング
- 環境変数サポート・設定優先順位管理

### ❌ **実行しない**
- ファイル監視・DB管理・UI表示
- メタデータ収集・ネットワーク通信

## 📋 必要な仕様

### **設定優先順位（シンプル化）**

1. **CLI引数** - 一時的なオーバーライド
2. **config.json** - 必須設定ファイル（~/.cctop/config.json）

**注意**: 
- 環境変数サポートはv0.2.0.0で追加予定
- JSコード内に設定値を一切定義しない（定数除く）

### **config.jsonスキーマ定義**

```json
{
  "version": "0.1.0",
  "monitoring": {
    "watchPaths": [],              // 監視対象パス（複数指定可）
    "excludePatterns": [           // 除外パターン
      "**/node_modules/**",
      "**/.git/**",
      "**/.DS_Store",
      "**/.cctop/**",
      "**/coverage/**",
      "**/*.log"
    ],
    "debounceMs": 100,             // イベントデバウンス時間
    "maxDepth": 10                 // 最大監視深度
  },
  "database": {
    "path": "~/.cctop/activity.db",  // DBファイルパス
    "mode": "WAL"                    // SQLiteモード
  },
  "display": {
    "maxEvents": 20,               // 最大表示イベント数
    "refreshRateMs": 100           // 表示更新間隔
  }
}
```

### **JSON Schema定義（v0.2.0.0で追加予定）**

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
        }
      }
    }
  }
}
```

### **CLI引数定義**

```bash
cctop [options] [directory]

Options:
  -c, --config <path>         設定ファイルパス (default: ~/.cctop/config.json)
  -d, --dir <directory>       監視ディレクトリ (default: .)
  -m, --mode <mode>           表示モード [all|unique] (default: all)
  -i, --ignore <patterns>     除外パターン (カンマ区切り)
  --max-events <number>       最大イベント数 (default: 100000)
  --refresh <ms>              更新間隔(ms) (default: 100)
  --no-color                  色分け無効
  --follow-symlinks           シンボリックリンク追跡
  --max-depth <number>        最大監視深度
  -v, --verbose               詳細出力
  -q, --quiet                 静寂モード
  -h, --help                  ヘルプ表示
  --version                   バージョン表示
```

### **環境変数サポート**

| 環境変数 | 対応設定 | 例 |
|----------|----------|-----|
| `CCTOP_CONFIG` | config.json パス | `~/.config/cctop.json` |
| `CCTOP_WATCH_DIR` | 監視ディレクトリ | `/home/user/project` |
| `CCTOP_MODE` | 表示モード | `unique` |
| `CCTOP_MAX_EVENTS` | 最大イベント数 | `50000` |
| `CCTOP_NO_COLOR` | 色分け無効 | `1` |
| `CCTOP_DB_PATH` | DBパス | `/tmp/cctop.db` |

## 🔍 統合対象（重複解消）

### **config.json記述の統合**
- **FUNC-003**: 高度版設定管理詳述
- **FUNC-006**: 基本版設定管理詳述  
- **FUNC-007**: postinstall時の初期設定作成詳述

### **設定階層記述の統合**
- **FUNC-003**: CLI引数優先度詳述
- **FUNC-006**: デフォルト値管理詳述

**統合結果**: 上記3文書の設定管理関連記述を本機能定義に一元化

## 🎯 機能要件

### **設定読み込み要件**
1. **起動時設定読み込み**: アプリケーション開始時の全設定統合
2. **設定ファイル監視**: config.json変更時の動的リロード
3. **エラー耐性**: 不正な設定値の検証・修正

### **設定マージ要件**
1. **優先順位適用**: CLI > 環境変数 > config.json > デフォルト
2. **部分マージ**: オブジェクト単位での細かい設定上書き
3. **型変換**: 文字列→数値、boolean等の自動変換

### **設定検証要件**
1. **スキーマ検証**: JSONスキーマによる構造・型チェック
2. **範囲検証**: 数値の最小・最大値チェック
3. **依存関係検証**: 設定間の論理的整合性チェック

## 📊 設定処理フロー

### **起動時設定統合フロー**
```
1. デフォルト値読み込み → 基本設定確立
2. config.json読み込み → ファイル設定適用
3. 環境変数読み込み → 環境固有設定適用
4. CLI引数解析 → ユーザー指定設定適用
5. 設定検証 → 最終設定の妥当性確認
6. 設定確定 → アプリケーション設定完了
```

### **動的リロードフロー**
```
1. config.json変更検出 → ファイル監視による検出
2. 新設定読み込み → 変更内容の取得
3. 設定マージ → CLI引数・環境変数との再統合
4. 設定検証 → 新設定の妥当性確認
5. 設定適用 → 実行中システムへの適用
6. 通知 → ユーザーへの変更通知
```

## 🔧 実装仕槕

### **設定管理の設計原則**
- **設定の一元化**: ~/.cctop/config.jsonが唯一の設定ソース
- **JSコードのクリーン化**: ハードコード値を完全排除
- **ユーザーフレンドリー**: 設定変更 = config.json編集のみ
- **明確な責任分離**: config.json=デフォルト、CLI=一時上書き

### **自動監視対象追加の実装例**
```javascript
// src/config/config-manager.js
async initialize(cliArgs = {}) {
  // 既存の設定読み込み処理...
  
  // 監視対象ディレクトリの決定
  const targetDir = cliArgs.watchPath || process.cwd();
  const absoluteTargetDir = path.resolve(targetDir);
  
  // 既に監視対象に含まれているかチェック
  const isAlreadyWatched = this.config.monitoring.watchPaths.some(watchPath => {
    return path.resolve(watchPath) === absoluteTargetDir;
  });
  
  if (!isAlreadyWatched) {
    const shouldAdd = await this.promptAddDirectory(absoluteTargetDir);
    if (shouldAdd) {
      this.config.monitoring.watchPaths.push(absoluteTargetDir);
      await this.save();
      console.log(`✅ Added to monitor: ${absoluteTargetDir}`);
    } else {
      console.log(`ℹ️  Monitoring with current config only`);
    }
  }
  
  return this.config;
}
```

### **実装における注意点**
- config.json読み込みエラー時は即座に終了
- 全てのパスは絶対パスで統一管理
- `path.resolve()`による正規化比較で重複チェック
config.reload(); // Promise<void>
```

## 📈 高度機能

### **設定プロファイル**
- **development**: 開発環境用設定
- **production**: 本番環境用設定
- **testing**: テスト環境用設定

### **設定テンプレート**
- **minimal**: 最小限設定
- **recommended**: 推奨設定
- **performance**: 高性能設定

### **設定バックアップ**
- **自動バックアップ**: 設定変更時の自動保存
- **復元機能**: 前回設定への復元

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
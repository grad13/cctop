# FUNC-104: CLIインターフェース統合仕様

**作成日**: 2025年6月26日 16:10  
**更新日**: 2025年6月26日 16:10  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-101, FUNC-102, FUNC-003, func-105

## 📊 機能概要

cctopコマンドラインインターフェースの全オプション・引数を一元的に定義する統合仕様。

**ユーザー価値**: 
- 全CLIオプションの一覧性確保
- 一貫性のあるインターフェース設計
- ヘルプ表示の統一基準

## 🎯 機能境界

### ✅ **実行する**
- 全CLIオプション・引数の定義
- ヘルプメッセージの標準化
- エラーメッセージの統一
- バージョン情報の管理

### ❌ **実行しない**
- 各機能の詳細実装（各FUNCを参照）
- インタラクティブモードのキー操作（FUNC-202/023で定義）
- 内部API設計

### ⚠️ **重要**: CLI仕様一元化原則
**Critical Issue対応**: 他FUNC（101, 102等）でのCLI定義は参考用のみとし、実装は本FUNC-104仕様を単一の信頼できる情報源（Single Source of Truth）とする。

## 📋 コマンド構造

### **基本構文**
```bash
cctop [options] [directory]
```

### **位置引数**
- `[directory]` - 監視対象ディレクトリ（省略時: カレントディレクトリ）

## 🔧 オプション一覧


### **監視制御関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `--timeout <seconds>` | タイムアウト時間（秒） | FUNC-101 |
| `--daemon --start` | 背景監視プロセス開始 | FUNC-003 |
| `--daemon --stop` | 背景監視プロセス停止 | FUNC-003 |
| `--view` | Monitor起動なし、既存DBから表示のみ | FUNC-003, FUNC-202 |

### **出力制御関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `--verbose` | 詳細出力モード | FUNC-101 |

### **システム管理関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `--check-limits` | ファイル監視制限の確認と推奨設定表示 | FUNC-102 |

### **ヘルプ・情報関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `-h, --help` | ヘルプメッセージ表示 | FUNC-101 |


## 📝 ヘルプメッセージ

### **標準ヘルプ表示**
```
cctop - Code Change Top (File Monitoring Tool)

Usage: cctop [options] [directory]

Options:
  Monitoring:
    --timeout <sec>       Timeout in seconds
    --daemon --start      Start background monitoring
    --daemon --stop       Stop background monitoring

  Display:
    --view                View existing data only (no monitoring)

  Output:
    --verbose             Enable verbose output

  System:
    --check-limits        Check file watch limits

  Help:
    -h, --help            Show this help message

Interactive Controls:
  Display modes:
    a - All events       u - Unique files      q - Quit

  Event filters:
    f - Find  c - Create  m - Modify  d - Delete  v - Move  r - Restore

Examples:
  cctop                   # Monitor current directory
  cctop src/              # Monitor src directory
  cctop --daemon --start  # Start background monitoring
  cctop --view            # View existing data only
  cctop --check-limits    # Check system limits
```

## 🎨 インタラクティブモード操作

### **表示モード切替**（FUNC-202）
- `a` - All mode（全イベント表示）
- `u` - Unique mode（ユニークファイルのみ）
- `q` - 終了

### **イベントフィルタ**（FUNC-023）
- `f` - Find イベント
- `c` - Create イベント
- `m` - Modify イベント
- `d` - Delete イベント
- `v` - Move イベント
- `r` - Restore イベント

## 💡 使用例

### **基本的な使用**
```bash
# カレントディレクトリを監視
cctop

# 特定ディレクトリを監視
cctop /path/to/project

# srcディレクトリを監視
cctop src/
```

### **背景監視制御**
```bash
# 背景監視開始
cctop --daemon --start

# 背景監視停止
cctop --daemon --stop

# 表示のみ（監視なし）
cctop --view
```

### **システム管理**
```bash
# システム制限確認
cctop --check-limits

# 詳細出力
cctop --verbose

# タイムアウト設定
cctop --timeout 300
```

## 🧪 エラーメッセージ

### **標準エラー形式**
```
Error: <エラー内容>
Try 'cctop --help' for more information.
```

### **一般的なエラー**
- `Error: Invalid directory: <path>` - 無効なディレクトリ
- `Error: Unknown option: <option>` - 不明なオプション
- `Error: Missing argument for: <option>` - 引数不足
- `Error: Cannot watch more than <limit> files` - 監視制限超過

## 🎯 成功指標

1. **統一性**: 全オプションが一貫した命名規則
2. **発見性**: --helpで全機能が把握可能
3. **拡張性**: 新規オプション追加時の明確なガイドライン
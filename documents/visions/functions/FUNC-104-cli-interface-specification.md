# FUNC-104: CLIインターフェース統合仕様

**作成日**: 2025年6月26日 16:10  
**更新日**: 2025年6月26日 16:10  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0

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
- インタラクティブモードのキー操作（FUNC-022/023で定義）
- 内部API設計

### ⚠️ **重要**: CLI仕様一元化原則
**Critical Issue対応**: 他FUNC（011, 012等）でのCLI定義は参考用のみとし、実装は本FUNC-014仕様を単一の信頼できる情報源（Single Source of Truth）とする。

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
| `-d, --dir <directory>` | 監視ディレクトリを指定 | FUNC-011 |
| `-t, --timeout <seconds>` | タイムアウト時間（秒） | FUNC-011 |

### **出力制御関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `-v, --verbose` | 詳細出力モード | FUNC-011 |
| `-q, --quiet` | 静音モード（エラーのみ表示） | FUNC-011 |

### **システム管理関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `--check-limits` | ファイル監視制限の確認と推奨設定表示 | FUNC-102 |

### **ヘルプ・情報関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `-h, --help` | ヘルプメッセージ表示 | FUNC-011 |
| `--version` | バージョン情報表示 | FUNC-011 |


## 📝 ヘルプメッセージ

### **標準ヘルプ表示**
```
cctop - Code Change Top (File Monitoring Tool)

Usage: cctop [options] [directory]

Options:
  Monitoring:
    -d, --dir <dir>       Directory to watch [default: current]
    -t, --timeout <sec>   Timeout in seconds

  Output:
    -v, --verbose         Enable verbose output
    -q, --quiet           Quiet mode (errors only)

  System:
    --check-limits        Check file watch limits

  Help:
    -h, --help            Show this help message
    --version             Show version information

Interactive Controls:
  Display modes:
    a - All events       u - Unique files      q - Quit

  Event filters:
    f - Find  c - Create  m - Modify  d - Delete  v - Move  r - Restore

Examples:
  cctop                   # Monitor current directory
  cctop src/              # Monitor src directory
  cctop --global          # Use global configuration
  cctop --check-limits    # Check system limits
```

## 🎨 インタラクティブモード操作

### **表示モード切替**（FUNC-022）
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

# srcディレクトリを監視（位置引数）
cctop src/

# srcディレクトリを監視（オプション指定）
cctop --dir src/
```

### **設定管理**
```bash
# デフォルト起動
cctop

# システム制限確認
cctop --check-limits
```

### **出力制御**
```bash
# 詳細出力
cctop --verbose

# 静音モード
cctop --quiet

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
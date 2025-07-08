# FUNC-104: CLI引数・起動挙動仕様

**作成日**: 2025年6月26日 16:10  
**更新日**: 2025年7月7日  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-101, FUNC-102, FUNC-003, func-105

## 📊 機能概要

cctopコマンドの引数・オプション・起動挙動を一元的に定義する仕様。

**ユーザー価値**: 
- 全CLI引数・オプションの一覧性確保
- 一貫性のある起動挙動設計
- 初心者にとって迷わない単純な操作体系

## 🎯 機能境界

### ✅ **実行する**
- 全CLI引数・オプションの定義
- デフォルト起動挙動の定義
- 初期化・daemon・CLI連携の制御
- ヘルプメッセージの標準化
- エラーメッセージの統一

### ❌ **実行しない**
- 各機能の詳細実装（各FUNCを参照）
- インタラクティブモードのキー操作（FUNC-202/023で定義）
- 内部API設計

### ⚠️ **重要**: CLI引数仕様一元化原則
**Critical Issue対応**: 他FUNC（101, 102等）での引数定義は参考用のみとし、実装は本FUNC-104仕様を単一の信頼できる情報源（Single Source of Truth）とする。

## 📋 コマンド構造

### **基本構文**
```bash
cctop [options] [directory]
```

### **位置引数**
- `[directory]` - 監視対象ディレクトリ（省略時: カレントディレクトリ）

## 🚀 デフォルト起動挙動

### **引数なし実行時の挙動**
```bash
cctop
```

**自動実行される処理**:
1. **初期化確認**: カレントディレクトリに`.cctop/`が存在しない場合は初期化実行
2. **Daemon起動**: バックグラウンド監視プロセスを自動起動
3. **CLI起動**: インタラクティブな表示画面を起動
4. **終了時Daemon停止**: CLI終了時（qキー押下等）にDaemonを自動停止

### **初期化処理詳細**
```bash
# .cctop/が存在しない場合の自動実行（FUNC-105準拠）
mkdir -p .cctop/{config,themes,data,logs,runtime,temp}
mkdir -p .cctop/themes/custom

# データベースファイル作成
touch .cctop/data/activity.db

# 設定ファイル作成
# .cctop/config/shared-config.json（FUNC-101）
# .cctop/config/daemon-config.json（FUNC-106）
# .cctop/config/cli-config.json（FUNC-107）
# .cctop/themes/current-theme.json（FUNC-108）
# .cctop/themes/default.json, high-contrast.json
# .cctop/.gitignore
```

### **起動シーケンス**
```
1. Directory Check    → .cctop/存在確認
2. Initialize         → 必要時のみ初期化実行  
3. Daemon Start       → バックグラウンド監視開始
4. CLI Start          → インタラクティブ画面表示
5. User Interaction   → ユーザー操作
6. CLI Exit           → q押下等での終了
7. Daemon Stop        → バックグラウンド監視停止
```

### **ユーザー体験**
- **初回**: `cctop` → 初期化 → 即座に動作開始
- **2回目以降**: `cctop` → 即座に動作開始
- **終了**: `q` → 全て自動で片付け完了

## 🔧 オプション一覧


### **監視制御関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `daemon start` | 背景監視プロセス開始 | FUNC-003 |
| `daemon stop` | 背景監視プロセス停止 | FUNC-003 |
| `daemon status` | 背景監視プロセス状態確認 | FUNC-003 |
| `view` | Daemon起動なし、既存DBから表示のみ | FUNC-003, FUNC-202 |

### **出力制御関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `--verbose` | 詳細出力モード | FUNC-101 |

### **ヘルプ・情報関連**
| オプション | 説明 | 参照FUNC |
|-----------|------|----------|
| `-h, --help, help` | ヘルプメッセージ表示 | FUNC-101 |


## 📝 ヘルプメッセージ

### **標準ヘルプ表示**
```
cctop - Code Change Top (File Watching Tool)

Usage: cctop [options] [directory]

Options:
  Watching:
    daemon start      Start background daemon
    daemon stop       Stop background daemon
    daemon status     Check background daemon status

  Display:
    view                View existing data only (no daemon)

  Output:
    --verbose             Enable verbose output

  Help:
    -h, --help, help            Show this help message

Interactive Controls:
  Display modes:
    a - All events       u - Unique files      q - Quit

  Event filters:
    f - Find  c - Create  m - Modify  d - Delete  v - Move  r - Restore

Examples:
  cctop                # Full auto: init + daemon + cli (recommended)
  cctop daemon start   # Start background daemon only
  cctop daemon status  # Check daemon status
  cctop view           # View existing data only
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
# カレントディレクトリを監視（デフォルト挙動）
# 1. .cctop初期化（必要時のみ）
# 2. daemon自動起動
# 3. CLI表示
# 4. 終了時daemon自動停止
cctop

# 特定ディレクトリを監視
cctop /path/to/project

# srcディレクトリを監視
cctop src/
```

### **背景監視制御**
```bash
# 背景監視開始
cctop daemon start

# 背景監視停止
cctop daemon stop

# 背景監視状態確認
cctop daemon status

# 表示のみ（監視なし）
cctop view
```

### **システム管理**
```bash
# 詳細出力
cctop --verbose
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
# HO-20250628-004: Critical CLI機能実装依頼

**作成日**: 2025年6月28日 00:40  
**作成者**: Validator Agent  
**依頼先**: Builder Agent  
**優先度**: Critical  
**期限**: 即時対応推奨  

## 📋 概要

FUNC-104仕様に基づくCLI機能の未実装部分を発見しました。これらは基本的なCLI機能であり、ユーザビリティに直結するため、Critical優先度での実装を依頼します。

## 🚨 Critical Issue: CLI基本機能の未実装

### 検証結果
- **--verbose**: ✅ 実装済み・動作確認
- **--timeout**: ✅ 実装済み・動作確認  
- **--daemon**: ✅ 実装済み・動作確認
- **--view**: ✅ 実装済み・動作確認
- **--help**: ❌ 未実装（テスト失敗）
- **--check-limits**: ❌ 未実装（テスト失敗）
- **位置引数 [directory]**: ❌ 未実装（テスト失敗）

## 🎯 実装要求機能

### 1. **--help オプション実装**

#### 要求仕様（FUNC-104準拠）
```bash
cctop --help
# または
cctop -h
```

#### 期待出力
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

#### 実装要件
- プロセスは正常終了（exit code 0）すること
- stdoutに出力すること
- 他のオプションと組み合わせても--helpが優先されること

### 2. **--check-limits オプション実装**

#### 要求仕様（FUNC-102準拠）
```bash
cctop --check-limits
```

#### 期待出力例
```
File Watch Limits Check:
  Current inotify watch limit: 8192
  Current inotify instances limit: 128
  Current inotify queued events limit: 16384

Recommended settings for large projects:
  fs.inotify.max_user_watches=524288
  fs.inotify.max_user_instances=512
  fs.inotify.max_queued_events=65536

To apply these settings:
  sudo sysctl fs.inotify.max_user_watches=524288
  sudo sysctl fs.inotify.max_user_instances=512
  sudo sysctl fs.inotify.max_queued_events=65536

To make permanent, add to /etc/sysctl.conf
```

#### 実装要件
- 現在のシステム制限値を読み取り表示
- 推奨設定値を表示
- 設定変更方法のガイダンスを表示
- プロセスは正常終了（exit code 0）すること

### 3. **位置引数 [directory] 実装**

#### 要求仕様
```bash
cctop /path/to/directory  # 指定ディレクトリを監視
cctop                      # カレントディレクトリを監視（デフォルト）
cctop src/                 # 相対パスも対応
```

#### 実装要件
- 位置引数として最初の非オプション引数をディレクトリとして扱う
- ディレクトリが存在しない場合はエラーメッセージを表示
- 相対パス・絶対パス両方に対応
- オプションと組み合わせ可能（例: `cctop --verbose src/`）

## 📁 関連ファイル

### 修正対象
- `src/main.js` または CLI解析を行っているファイル
- `bin/cctop` （CLIエントリーポイント）

### 参照仕様
- `documents/visions/functions/FUNC-104-cli-interface-specification.md`
- `documents/visions/functions/FUNC-102-file-watch-limit-management.md`

## 🧪 テストファイル

以下のテストが現在失敗しており、実装により成功するようになります：
- `test/integration/func-104-cli-options-complete.test.js`
  - "should support --help option and display usage information"
  - "should support --check-limits option for file watch limits"
  - "should support positional directory argument"

## 💡 実装ヒント

### CLI解析の改善
現在の手動パース実装を、より堅牢な方法に改善することを推奨：
- commander.jsやyargsなどのCLIフレームワーク使用検討
- または既存の手動パースを拡張

### --check-limits実装例
```javascript
// Linux/macOSでの制限値読み取り
const fs = require('fs');

function getInotifyLimits() {
  try {
    const maxWatches = fs.readFileSync('/proc/sys/fs/inotify/max_user_watches', 'utf8').trim();
    const maxInstances = fs.readFileSync('/proc/sys/fs/inotify/max_user_instances', 'utf8').trim();
    const maxQueued = fs.readFileSync('/proc/sys/fs/inotify/max_queued_events', 'utf8').trim();
    return { maxWatches, maxInstances, maxQueued };
  } catch (error) {
    // macOS or Windows
    return null;
  }
}
```

## ⏰ 推定作業時間

- **--help実装**: 1-2時間
- **--check-limits実装**: 2-3時間
- **位置引数実装**: 1-2時間
- **総計**: 4-7時間

## 🎯 完了判定基準

1. 上記3つのテストが全て成功すること
2. 各機能がFUNC-104仕様に準拠していること
3. エラーハンドリングが適切であること
4. ユーザーフレンドリーなメッセージ出力

---

**影響**: これらは基本的なCLI機能であり、ユーザーが最初に触れる部分です。特に--helpは必須機能であり、即時実装が推奨されます。
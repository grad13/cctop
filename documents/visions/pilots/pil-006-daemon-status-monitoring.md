# PIL-006: Daemon Status Monitoring

**作成日**: 2025年6月26日 21:30  
**更新日**: 2025年6月26日 21:30  
**作成者**: Architect Agent  
**ステータス**: Draft  
**対象バージョン**: v0.3.0.0候補
**カテゴリ**: System & Daemon Experiments  

## 概要

**PIL-004 Background Activity Monitor**の管理・監視機能として、デーモンプロセスの状態確認・診断・健全性チェック機能を提供する。開発者がデーモンの動作状況を詳細に把握し、問題の早期発見・対処を可能にする。

### ユーザー価値
- **状況把握**: デーモンの動作状況・リソース使用量の詳細確認
- **問題診断**: エラー・異常状態の早期発見・原因特定
- **運用支援**: ログ・統計情報による運用改善データ提供

## 機能仕様

### 基本状態確認

#### シンプル状態表示
```bash
# 基本状態確認
cctop --status
>> Daemon: Running (PID: 12345)
>> Directory: /project
>> Since: 2025-06-26 09:00:00 (3h 45m ago)
>> Events: 47 changes monitored
```

**表示項目**:
- **プロセス状態**: 実行中・停止中・異常状態
- **PID情報**: プロセスID・実行確認
- **監視ディレクトリ**: 現在の監視対象パス
- **実行時間**: 起動時刻・経過時間
- **監視統計**: 記録イベント数

### 詳細状態確認

#### 拡張状態表示
```bash
# 詳細状態確認
cctop --status --verbose
>> Daemon Status: Running (Healthy)
>> PID: 12345, Parent PID: 1
>> Working Directory: /project
>> Started: 2025-06-26 09:00:00 (3h 45m ago)
>> Configuration: /project/.cctop/config.json

>> Monitoring Statistics:
>>   Total Events: 47
>>   - File Created: 12
>>   - File Modified: 28
>>   - File Deleted: 4
>>   - File Moved: 3

>> Resource Usage:
>>   Memory: 15.2 MB (Virtual: 45.1 MB)
>>   CPU: 0.1% (Average over 1h)
>>   File Handles: 8

>> Database Status:
>>   File: ~/.cctop/activity.db (2.1 MB)
>>   WAL File: ~/.cctop/activity.db-wal (156 KB)
>>   SHM File: ~/.cctop/activity.db-shm (32 KB)
>>   Last Write: 2025-06-26 12:44:32

>> Log Status:
>>   File: ~/.cctop/daemon.log (34 KB)
>>   Level: info
>>   Last Entry: 2025-06-26 12:44:32
>>   Rotation: Enabled (7 days retention)
```

### JSON出力（スクリプト連携）

#### 構造化データ出力
```bash
# JSON形式状態出力
cctop --status --json
{
  "daemon": {
    "status": "running",
    "pid": 12345,
    "workingDir": "/project",
    "startTime": "2025-06-26T09:00:00.123Z",
    "uptime": 13470,
    "configPath": "/project/.cctop/config.json"
  },
  "monitoring": {
    "totalEvents": 47,
    "eventCounts": {
      "created": 12,
      "modified": 28,
      "deleted": 4,
      "moved": 3
    }
  },
  "resources": {
    "memory": { "rss": 15876096, "vss": 47284224 },
    "cpu": { "usage": 0.1, "time": 156 },
    "fileHandles": 8
  },
  "database": {
    "path": "~/.cctop/activity.db",
    "size": 2097152,
    "walSize": 159744,
    "shmSize": 32768,
    "lastWrite": "2025-06-26T12:44:32.456Z"
  },
  "log": {
    "path": "~/.cctop/daemon.log",
    "size": 34816,
    "level": "info",
    "lastEntry": "2025-06-26T12:44:32.789Z"
  }
}
```

### ヘルスチェック機能

#### 健全性診断
```bash
# ヘルスチェック
cctop --health
>> Daemon Health: OK
>> Process: Running (PID: 12345)
>> Database: Accessible (2.1 MB)
>> Log File: Writable (34 KB)
>> Configuration: Valid
>> Memory Usage: Normal (15.2 MB)
>> CPU Usage: Low (0.1%)
```

#### 包括的診断
```bash
# 詳細診断
cctop --diagnose
>> Running daemon diagnostics...

>> Process Status: OK
>>   PID 12345 is running
>>   Process is responding to signals
>>   Memory usage within normal range

>> Database Status: OK
>>   Database file is accessible
>>   WAL mode is active
>>   Last write was successful
>>   No corruption detected

>> Log Status: OK
>>   Log file is writable
>>   Rotation is functioning
>>   No error patterns detected

>> Configuration Status: OK
>>   Config file is valid JSON
>>   All required fields present
>>   Watch patterns are valid

>> File System Status: OK
>>   Working directory is accessible
>>   No permission issues detected
>>   Watch targets are accessible
```

## 技術仕様

### 依存関係
- **PIL-004**: Background Activity Monitor（デーモンプロセス本体）
- **FUNC-000**: SQLiteデータベース基盤（状態データ取得）
- **FUNC-104**: CLI引数統合（コマンドライン制御）

### 状態取得方式

#### プロセス情報取得
- **PID確認**: PIDファイル読み取り → プロセス生存確認
- **リソース情報**: `/proc`ファイルシステムまたはOS APIでメモリ・CPU取得
- **実行時間**: プロセス開始時刻から経過時間計算

#### データベース状態確認
- **ファイル情報**: SQLiteファイルサイズ・アクセス時刻
- **WAL/SHM状態**: Write-Ahead Log・Shared Memoryファイル確認
- **データ統計**: イベントテーブルからレコード数・種別集計

#### ログファイル解析
- **ファイル状態**: ログファイル存在・書き込み権限確認
- **最新エントリ**: 最後のログエントリ時刻・レベル
- **エラーパターン**: 最近のエラー・警告メッセージ検出

### パフォーマンス考慮

#### 軽量な状態確認
- **キャッシュ利用**: 頻繁な確認時のシステム負荷軽減
- **非ブロッキング**: デーモン動作に影響を与えない状態取得
- **最小限アクセス**: 必要最小限のファイル・プロセスアクセス


## 制限事項

### 機能制限
- **読み取り専用**: 状態確認のみ、制御機能なし（PIL-004で提供）
- **デーモン依存**: PIL-004デーモン実行時のみ詳細情報取得可能
- **プラットフォーム依存**: OS固有のプロセス情報取得方式

### 精度制限
- **リソース情報**: OSの提供する情報に依存・瞬間値のみ
- **ログ解析**: 簡易パターン解析・完全な構文解析なし
- **診断精度**: 基本的な健全性チェック・高度な異常検出なし

## 拡張予定

### Phase 1実装（v0.3.0.0）
- **基本status**: シンプルな状態確認（--status）
- **詳細確認**: 拡張情報表示（--status --verbose）
- **JSON出力**: スクリプト連携対応（--status --json）

### Phase 2拡張（v0.3.1.0）
- **ヘルスチェック**: 健全性診断（--health）
- **包括診断**: 詳細問題分析（--diagnose）
- **履歴確認**: 過去の状態変化履歴

### Phase 3連携（v0.4.0.0）
- **アラート機能**: 異常状態の通知・警告
- **トレンド分析**: リソース使用量の推移分析
- **自動修復**: 軽微な問題の自動修正提案

## 関連機能

- **PIL-004**: Background Activity Monitor（デーモン本体）
- **FUNC-000**: SQLiteデータベース基盤（データソース）
- **FUNC-104**: CLI引数統合（コマンドライン制御）

## 関連機能

- **PIL-004**: Background Activity Monitor（デーモンプロセス本体）
- **PIL-007**: Health Diagnostics（健全性診断・修復機能）
- **FUNC-000**: SQLiteデータベース基盤（状態データ取得）
- **FUNC-104**: CLI引数統合（コマンドライン制御）

## 参考資料

#### 類似機能の参考
- **systemctl status**: systemdサービス状態確認
- **pm2 status**: Node.jsプロセス管理状態表示
- **docker stats**: コンテナリソース使用量表示
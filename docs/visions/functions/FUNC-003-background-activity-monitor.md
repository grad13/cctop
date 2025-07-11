# FUNC-003: Background Activity Daemon

**作成日**: 2025年6月26日  
**更新日**: 2025年6月30日  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-000, FUNC-001, FUNC-002, FUNC-101, FUNC-104, FUNC-200-205

## 📊 機能概要

バックグラウンドでファイル変更を監視し、CLIがDatabaseから情報を取得する2プロセス分離アーキテクチャ

**ユーザー価値**: 
- 継続的なファイル監視によるバックグラウンド活動の完全把握
- プロセス分離による安定した監視・表示機能
- 24/7監視と適切な終了制御による運用効率の向上

## 🎯 機能境界

### ✅ **実行する**
- バックグラウンド監視プロセス（Daemon）とユーザー表示プロセス（CLI）の完全分離
- Daemon Process: ファイル変更イベントをDatabaseに記録
- CLI Process: Databaseから情報を取得して表示
- SQLite Database: プロセス間通信の中心
- Process Management: `cctop`実行時のMonitor自動起動・管理
- PIDファイル・ログ管理・自動復旧機能

### ❌ **実行しない**
- ファイル内容の直接解析・変換処理
- ネットワーク通信・外部システム連携
- 設定ファイルの編集・管理（FUNC-101の責務）
- 詳細な表示制御・UI設計（FUNC-200-205の責務）

## 📋 技術仕様

### **プロセス分離アーキテクチャ**
- **Daemon**: 独立プロセスによる24/7監視
- **Database**: SQLite WAL modeによる並行アクセス
- **CLI**: リアルタイム表示（60ms遅延）
- **Process Control**: PIDファイル・ログ管理・自動復旧

### **Process State Management**
- **PIDファイル**: `.cctop/daemon.pid` でプロセス状態管理
- **ログファイル**: `.cctop/logs/daemon.log` でプロセス履歴管理
- **設定分離**: Daemon状態とファイル監視データの完全分離

### **Process Management**
- **PID管理**: `.cctop/daemon.pid`
- **ログ出力**: `.cctop/logs/daemon.log`
- **設定ファイル**: `.cctop/config.json`準拠
- **自動起動**: `cctop`コマンド実行時にDaemon状態確認・起動
- **手動起動**: `cctop --daemon --start`でDaemon単独起動
- **停止制御**: `cctop --daemon --stop`でDaemon停止
- **起動者記録**: Daemon起動時に起動者（独立起動 or CLI起動）を記録
- **終了制御**: 起動者に応じた適切な終了処理

### **CLI統合仕様**
Daemon制御の具体的なCLIオプションは **[FUNC-104: CLIインターフェース統合仕様](./FUNC-104-cli-interface-specification.md)** で定義されています：
- `cctop --daemon --start`: Daemon単独起動（背景監視開始）
- `cctop --daemon --stop`: Daemon停止（背景監視停止）
- `cctop --view`: Daemon起動なし、既存DBから表示のみ

## 🔗 関連機能との連携

### **FUNC-000: Database Foundation**
- FUNC-000準拠の5テーブル構成（event_types, files, events, measurements, aggregates）を使用
- SQLite WAL/SHM設定による並行読み書きアクセス対応
- Daemon（書き込み）とCLI（読み取り）の同時データベースアクセス

### **FUNC-101: Configuration Management**
- `.cctop/config.json`の監視設定を利用
- excludePatterns等のフィルタ設定を継承

### **FUNC-200-205: View & Display Functions**
- **CLI Process実装**: 既存View機能群（FUNC-200-205）を統合利用
- **FUNC-202依存**: CLI表示統合機能をCLI Processで実行
- **表示エンジン**: FUNC-200(East Asian Width)、FUNC-201(二重バッファ)等を継承
- **責務分離**: Daemon=データ書き込み、CLI=FUNC-202ベース表示

## 🚀 実装仕様

### **起動フロー**
1. `cctop`実行時にPIDファイル確認
2. Daemon未起動の場合は自動起動（起動者="cli"として記録）
3. Daemon既起動の場合は起動者記録を確認（起動者="standalone"として維持）
4. CLI起動してDatabase接続
5. リアルタイム表示開始

### **終了フロー**
#### **CLI終了時のDaemon制御**
- **起動者="cli"**: CLI終了時にDaemonも停止
- **起動者="standalone"**: CLI終了時もDaemonは継続実行
- **起動者判定**: `.cctop/daemon.pid`ファイル内に起動者情報を記録

### **PIDファイル仕様**

#### **ファイル形式**
```json
{
  "pid": 12345,
  "started_by": "cli",  // "cli" or "standalone"
  "started_at": 1719456789,
  "config_path": "/path/to/.cctop/config.json"
}
```

#### **起動者記録ルール**
- **"cli"**: `cctop`コマンド実行時にDaemonを自動起動した場合
- **"standalone"**: `cctop --daemon --start`コマンドで起動した場合

### **エラーハンドリング**
- Daemon crash時の自動復旧
- Database lock時の待機・再試行
- PIDファイル破損時の回復処理

### **設定仕様**
バックグラウンド監視設定は[FUNC-101: 階層的設定管理](./FUNC-101-hierarchical-config-management.md)の`monitoring.backgroundMonitor`セクションで管理されます。

設定例：
```json
{
  "monitoring": {
    "backgroundMonitor": {
      "enabled": true,
      "logLevel": "info",
      "heartbeatInterval": 30000
    }
  }
}
```

## 🧪 テスト要件

### **基本機能テスト**
- Daemon/CLI独立テスト
- プロセス間通信テスト
- 異常終了時の復旧テスト
- 長時間運用テスト

### **終了制御テスト**
- CLI起動DaemonのCLI終了時停止確認
- Standalone DaemonのCLI終了時継続確認
- PIDファイルの起動者情報正確性確認

## 📊 期待効果

### **システム安定性向上**
- プロセス分離による監視機能の安定性確保
- 24/7監視による完全なファイル活動追跡
- 適切な終了制御による運用効率の向上

### **運用効率向上**
- バックグラウンド監視によるユーザー作業の非阻害
- 自動起動・停止制御による運用負荷軽減
- 統合されたプロセス管理による運用の簡素化

---

**核心価値**: プロセス分離アーキテクチャにより、安定した継続監視と柔軟なユーザー操作を両立  
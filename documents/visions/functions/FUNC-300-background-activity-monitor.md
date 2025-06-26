# FUNC-300: Background Activity Monitor

**機能概要**: バックグラウンドでファイル変更を監視し、ViewerがDatabaseから情報を取得する2プロセス分離アーキテクチャ

**Status**: Active  
**Priority**: Medium  
**Version**: v0.2.0.0  
**Category**: Extension (300番台)  
**Created**: 2025-06-26  
**Updated**: 2025-06-26  

## 機能定義

### Core Functionality
バックグラウンド監視プロセス（Monitor）とユーザー表示プロセス（Viewer）の完全分離により、継続的なファイル監視を実現

### Technical Architecture
1. **Monitor Process**: ファイル変更イベントをDatabaseに記録
2. **Viewer Process**: Databaseから情報を取得して表示
3. **SQLite Database**: プロセス間通信の中心
4. **Process Management**: `cctop`実行時のMonitor自動起動・管理

### System Components
- **Monitor**: 独立プロセスによる24/7監視
- **Database**: SQLite WAL modeによる並行アクセス
- **Viewer**: リアルタイム表示（60ms遅延）
- **Process Control**: PIDファイル・ログ管理・自動復旧

## 技術仕様

### Database Schema
```sql
-- events table (FUNC-000準拠)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    details TEXT
);

-- monitor_status table (新規)
CREATE TABLE monitor_status (
    id INTEGER PRIMARY KEY,
    pid INTEGER,
    started_at INTEGER,
    last_heartbeat INTEGER,
    status TEXT DEFAULT 'running'
);
```

### Process Management
- **PID管理**: `~/.cctop/monitor.pid`
- **ログ出力**: `~/.cctop/logs/monitor.log`
- **設定ファイル**: `~/.cctop/config.json`準拠
- **自動起動**: `cctop`コマンド実行時にMonitor状態確認・起動

### Performance Characteristics
- **遅延**: 平均60ms（SQLite読み取り）
- **並行性**: WAL modeによる読み書き同時実行
- **リソース**: Monitor最小限CPU使用、Viewer瞬時起動

## 関連機能との連携

### FUNC-000: Database Foundation
- SQLite WAL/SHM設定を継承
- events テーブル構造を拡張
- 並行アクセス対応

### FUNC-101: Configuration Management
- `~/.cctop/config.json`の監視設定を利用
- excludePatterns等のフィルタ設定を継承

### FUNC-200: Display Management
- Viewer表示をFUNC-200の描画エンジンで実装
- リアルタイム更新表示

## Implementation Notes

### Startup Flow
1. `cctop`実行時にPIDファイル確認
2. Monitor未起動の場合は自動起動
3. Viewer起動してDatabase接続
4. リアルタイム表示開始

### Error Handling
- Monitor crash時の自動復旧
- Database lock時の待機・再試行
- PIDファイル破損時の回復処理

### Configuration
```json
{
  "monitor": {
    "enabled": true,
    "logLevel": "info",
    "heartbeatInterval": 30000
  }
}
```

## Testing Requirements
- Monitor/Viewer独立テスト
- プロセス間通信テスト
- 異常終了時の復旧テスト
- 長時間運用テスト

---
**Related Functions**: FUNC-000, FUNC-101, FUNC-200  
**Implementation Guide**: CG-004 (作成予定)  
**Blueprint**: BP-001 v0.2.0.0  
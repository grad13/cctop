# PIL-007: Health Diagnostics

**作成日**: 2025年6月26日 21:35  
**更新日**: 2025年6月26日 21:35  
**作成者**: Architect Agent  
**ステータス**: Draft  
**対象バージョン**: v0.3.1.0候補
**カテゴリ**: System & Daemon Experiments  

## 概要

**cctopシステム全体の健全性診断・問題発見・自動修復機能**を提供する。デーモンプロセス、データベース、設定ファイル、ログシステム等の包括的ヘルスチェックにより、システム問題の早期発見と予防保守を実現する。

### ユーザー価値
- **予防保守**: 問題が顕在化する前の早期発見・対処
- **問題診断**: システム異常の根本原因特定・解決方針提示
- **自動修復**: 軽微な問題の自動修正・復旧処理

## 機能仕様

### 基本ヘルスチェック

#### シンプル健全性確認
```bash
# 基本ヘルスチェック
cctop --health
>> System Health: OK
>> Daemon: Running (PID: 12345)
>> Database: Accessible (2.1 MB)
>> Configuration: Valid
>> Disk Space: 45GB available
```

**チェック項目**:
- **デーモン状態**: プロセス生存・応答性確認
- **データベース**: アクセス可能性・基本整合性
- **設定ファイル**: JSON構文・必須項目確認
- **ディスク容量**: 利用可能容量・閾値確認

### 包括的診断

#### 詳細システム診断
```bash
# 包括的診断
cctop --diagnose
>> Running comprehensive system diagnostics...

>> Process Health: OK
>>   Daemon PID 12345 is running and responsive
>>   Memory usage: 15.2MB (within normal range)
>>   CPU usage: 0.1% (low)
>>   File handles: 8/1024 (normal)

>> Database Health: OK
>>   Primary DB accessible: ~/.cctop/activity.db (2.1MB)
>>   WAL file present: activity.db-wal (156KB)
>>   SHM file present: activity.db-shm (32KB)
>>   Integrity check: PASSED
>>   No corruption detected

>> Configuration Health: OK
>>   Config file exists: /project/.cctop/config.json
>>   JSON syntax: Valid
>>   Required fields: All present
>>   Watch patterns: Valid regex patterns
>>   Exclude patterns: No conflicts detected

>> File System Health: OK
>>   Working directory accessible: /project
>>   Permission levels: Read/write OK
>>   Watch targets: All accessible
>>   Disk space: 45GB available (safe)

>> Log System Health: OK
>>   Log file writable: ~/.cctop/daemon.log (34KB)
>>   Rotation functioning: Last rotated 2 days ago
>>   No error patterns in recent entries
>>   Log level appropriate: info

>> Overall Assessment: HEALTHY
>>   No critical issues detected
>>   System operating within normal parameters
>>   Recommended action: Continue monitoring
```

### 問題検出・分類

#### 警告レベル問題
```bash
cctop --health
>> System Health: WARNING
>> Issues detected:
>>   - High memory usage: 245MB (threshold: 200MB)
>>   - Log file growing rapidly: 125MB (threshold: 100MB)
>>   - Disk space low: 2.1GB available (threshold: 5GB)
>> Recommended actions:
>>   - Monitor memory usage trends
>>   - Consider log rotation
>>   - Free up disk space
```

#### 重大問題検出
```bash
cctop --health
>> System Health: CRITICAL
>> Critical issues detected:
>>   - Database corruption: integrity check FAILED
>>   - Configuration invalid: JSON syntax error
>>   - Daemon not responding: process exists but unresponsive
>> Immediate action required:
>>   - Run 'cctop --repair-db' to fix database
>>   - Check config file syntax
>>   - Restart daemon process
```

### 自動修復機能

#### 軽微問題の自動修正
```bash
# 自動修復実行
cctop --heal
>> Running automatic system repair...

>> Cleaning orphaned lock files... OK
>>   Removed 3 stale lock files
>> Optimizing database... OK
>>   VACUUM completed, reclaimed 2.5MB
>> Rotating oversized logs... OK
>>   Archived daemon.log (125MB) -> daemon.log.2025-06-26
>> Validating configuration... OK
>>   No issues found
>> Checking file permissions... OK
>>   All permissions correct

>> Auto-repair completed successfully
>> 3 issues resolved automatically
>> System health improved: WARNING -> OK
```

#### 修復可能性評価
```bash
# 修復評価（実際の修復は行わない）
cctop --heal --dry-run
>> Analyzing system for auto-repairable issues...

>> Found 4 repairable issues:
>>   ✓ Orphaned lock files (3 files) - Safe to remove
>>   ✓ Database fragmentation (15%) - Safe to optimize
>>   ✓ Oversized log file (125MB) - Safe to rotate
>>   ⚠ Configuration backup missing - Can create backup

>> Found 1 issue requiring manual intervention:
>>   ✗ Database corruption detected - Manual repair needed

>> Run 'cctop --heal' to apply automatic fixes
>> Run 'cctop --repair-db' for database issues
```

## 技術仕様

### 依存関係
- **PIL-004**: Background Activity Monitor（デーモン状態確認）
- **PIL-006**: Daemon Status Monitoring（状態データ取得）
- **FUNC-000**: SQLiteデータベース基盤（DB診断対象）
- **FUNC-101**: 階層的設定管理（設定診断対象）

### 診断アルゴリズム

#### プロセス健全性チェック
```javascript
// 疑似コード
async function checkProcessHealth() {
  const checks = {
    existence: await checkProcessExists(pid),
    responsiveness: await checkSignalResponse(pid),
    resources: await getResourceUsage(pid),
    fileHandles: await getOpenFileCount(pid)
  };
  
  return evaluateProcessHealth(checks);
}
```

#### データベース整合性チェック
```javascript
async function checkDatabaseHealth() {
  const checks = {
    accessibility: await testDatabaseConnection(),
    integrity: await runIntegrityCheck(),
    walStatus: await checkWalFileStatus(),
    corruption: await detectCorruptionPatterns(),
    performance: await measureQueryPerformance()
  };
  
  return evaluateDatabaseHealth(checks);
}
```

#### 設定ファイル検証
```javascript
async function checkConfigurationHealth() {
  const checks = {
    existence: await checkConfigFileExists(),
    syntax: await validateJsonSyntax(),
    schema: await validateConfigSchema(),
    patterns: await validateWatchPatterns(),
    conflicts: await detectPatternConflicts()
  };
  
  return evaluateConfigHealth(checks);
}
```

### 修復ストラテジー

#### 安全な自動修復
- **ロックファイル削除**: 孤児化したロックファイルの除去
- **ログローテーション**: 肥大化ログファイルの強制ローテーション
- **DB最適化**: VACUUM・インデックス再構築
- **権限修正**: ファイル・ディレクトリ権限の自動修正

#### 手動介入要求
- **データベース破損**: 重度の整合性問題
- **設定ファイル破損**: 構文エラー・スキーマ違反
- **権限問題**: システムレベルの権限不足
- **ディスク容量不足**: 物理的リソース制約


## 診断項目詳細

### システムリソース診断
- **メモリ使用量**: RSS・VSS・使用率・トレンド分析
- **CPU使用量**: 瞬間値・平均値・ピーク検出
- **ディスク容量**: 利用可能容量・増加率・予測枯渇時期
- **ファイルハンドル**: 開放数・上限・リーク検出

### データベース診断
- **整合性チェック**: PRAGMA integrity_check・foreign key check
- **パフォーマンス**: クエリ実行時間・インデックス効率
- **WALモード**: Write-Ahead Log状態・チェックポイント頻度
- **断片化**: ページ使用率・VACUUM必要性

### 設定・ファイルシステム診断
- **設定妥当性**: JSON構文・スキーマ適合・パターン検証
- **権限確認**: ファイル・ディレクトリアクセス権限
- **パス存在確認**: 監視対象・除外対象の存在確認
- **パターン競合**: 包含・除外パターンの論理矛盾検出

## 制限事項

### 診断制限
- **OS依存**: システムリソース情報の取得方式
- **権限制限**: システムレベル診断の権限制約
- **外部要因**: ネットワーク・ハードウェア問題の検出限界

### 修復制限
- **安全性重視**: データ破損リスクのある修復は実行しない
- **保守的アプローチ**: 不確実な修復は手動介入を要求
- **バックアップ前提**: 重要データの事前バックアップ確認

## 拡張予定

### Phase 1実装（v0.3.1.0）
- **基本ヘルスチェック**: --healthコマンド実装
- **包括診断**: --diagnoseコマンド実装
- **軽微な自動修復**: --healコマンド基本機能

### Phase 2拡張（v0.3.2.0）
- **予測診断**: 問題予測・事前警告機能
- **修復履歴**: 修復実行履歴・効果追跡
- **カスタム診断**: ユーザー定義診断項目

### Phase 3統合（v0.4.0.0）
- **監視連携**: 外部監視システムとの統合
- **通知システム**: 問題検出時の自動通知
- **レポート生成**: 定期健全性レポート自動生成

## 関連機能

- **PIL-004**: Background Activity Monitor（診断対象システム）
- **PIL-006**: Daemon Status Monitoring（状態データソース）
- **FUNC-000**: SQLiteデータベース基盤（診断対象DB）
- **FUNC-101**: 階層的設定管理（診断対象設定）

## 参考資料

#### 類似機能の参考
- **systemctl status**: systemdサービス健全性確認
- **docker system df**: Dockerシステムリソース診断
- **git fsck**: Gitリポジトリ整合性チェック
- **npm doctor**: Node.js環境診断
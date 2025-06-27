# HO-20250626-016: FUNC-003 Background Activity Monitor品質保証依頼

**作成日**: 2025年6月26日 23:05  
**依頼者**: Architect Agent  
**対象者**: Validator Agent  
**優先度**: High  
**前提条件**: Builder HO-20250626-016完了後  

## 📋 検証依頼概要

FUNC-003（Background Activity Monitor）2プロセス分離アーキテクチャの包括的品質保証。Monitor Process・Viewer Process・プロセス間通信・並行アクセス・エラーハンドリングの全側面を検証してください。

## 🎯 検証対象機能

### FUNC-003: Background Activity Monitor
**仕様書**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`

**検証範囲**:
- 2プロセス分離アーキテクチャの正確な実装
- SQLite WAL mode並行アクセスの整合性
- Process管理・PIDファイル・ログシステムの信頼性
- エラーハンドリング・異常復旧の完全性

## 🧪 検証項目詳細

### 1. プロセス分離検証

#### 1.1 Monitor Process独立性テスト
```bash
# Test 1: Monitor独立起動
cctop --daemon
ps aux | grep monitor  # プロセス確認
kill -0 $PID           # 生存確認

# Test 2: ターミナル終了後の継続監視
cctop --daemon
exit                   # ターミナル終了
# 新ターミナルでプロセス確認・監視継続確認
```

**期待結果**:
- [ ] Monitor独立プロセスとして起動
- [ ] ターミナル終了後も監視継続
- [ ] CPU使用率 < 5%、メモリ使用率 < 50MB

#### 1.2 Viewer Process表示テスト
```bash
# Test 1: Monitor未起動時の自動起動
pkill -f monitor       # Monitor停止
cctop                  # Viewer起動
# Monitor自動起動・Viewer表示確認

# Test 2: Viewer独立終了
cctop                  # Monitor + Viewer起動
Ctrl+C                 # Viewer終了
ps aux | grep monitor  # Monitor継続確認
```

**期待結果**:
- [ ] Monitor未起動時の自動起動機能
- [ ] Viewer終了後もMonitor継続動作
- [ ] FUNC-202 CLI表示機能の完全継承

### 2. SQLite WAL Mode並行アクセス検証

#### 2.1 同時読み書きテスト
```bash
# 並行プロセステスト
cctop --daemon         # Monitor起動（書き込み）
cctop &                # Viewer起動（読み取り）
# 大量ファイル変更実行
for i in {1..100}; do touch test_$i.txt; done
# 両プロセス正常動作・データ整合性確認
```

**検証ポイント**:
- [ ] Monitor書き込み・Viewer読み取りの同時実行
- [ ] Database lockエラーなし
- [ ] データ整合性保証（書き込み→即座読み取り反映）
- [ ] WAL/SHMファイル正常生成

#### 2.2 高負荷時の安定性テスト
```bash
# 高頻度ファイル変更テスト
while true; do
  touch high_freq_$(date +%s%N).txt
  rm high_freq_*.txt
  sleep 0.01
done &

# 10分間の監視継続・エラー監視
timeout 600 cctop
```

**期待結果**:
- [ ] 高負荷時の安定動作（10分間エラーなし）
- [ ] メモリリークなし
- [ ] 全イベント正確記録

### 3. Process Management検証

#### 3.1 PIDファイル管理テスト
```bash
# Test 1: PIDファイル正常生成
cctop --daemon
cat ~/.cctop/monitor.pid  # JSON形式確認
jq . ~/.cctop/monitor.pid # 構造確認

# Test 2: 重複起動防止
cctop --daemon            # 既存Monitor存在
cctop --daemon            # 重複起動試行
echo $?                   # エラーコード確認
```

**検証項目**:
- [ ] PIDファイル正常生成（JSON形式・必要フィールド）
- [ ] プロセス生存確認機能
- [ ] 重複起動防止機能
- [ ] 孤児PIDファイル自動削除

#### 3.2 ログシステム検証
```bash
# ログ出力確認
cctop --daemon
tail -f ~/.cctop/logs/monitor.log

# ログローテーション確認
# 24時間後・ファイルサイズ上限での自動ローテーション
```

**期待結果**:
- [ ] 構造化ログ出力（JSON形式推奨）
- [ ] ログレベル制御（debug/info/warn/error）
- [ ] 自動ローテーション機能
- [ ] 保持期間管理（デフォルト7日）

### 4. エラーハンドリング・復旧検証

#### 4.1 異常終了復旧テスト
```bash
# Test 1: Monitor強制終了
cctop --daemon
kill -9 $MONITOR_PID     # 強制終了
cctop                    # Viewer起動
# 孤児PIDファイル検出・削除・新Monitor起動確認

# Test 2: Database破損対応
# activity.dbファイル破損状態作成
# Monitor起動時の適切なエラーハンドリング確認
```

**検証ポイント**:
- [ ] 孤児PIDファイル自動検出・削除
- [ ] Database破損時の適切なエラー報告
- [ ] 復旧可能エラーの自動リトライ
- [ ] 致命的エラー時の安全停止

#### 4.2 シグナルハンドリングテスト
```bash
# 正常終了テスト
cctop --daemon
kill -TERM $MONITOR_PID  # SIGTERM送信
# 正常終了・リソース解放・PIDファイル削除確認

# 設定再読み込みテスト
kill -HUP $MONITOR_PID   # SIGHUP送信
# 設定再読み込み・ログレベル変更反映確認
```

**期待結果**:
- [ ] SIGTERM正常終了・リソース解放
- [ ] SIGINT（Ctrl+C）適切処理
- [ ] SIGHUP設定再読み込み
- [ ] 各シグナル処理時間 < 3秒

### 5. パフォーマンス・品質検証

#### 5.1 リアルタイム性テスト
```bash
# レスポンス時間測定
echo "test" > realtime_test.txt
# Viewer表示反映時間測定（目標: 60ms以内）

# 大量ファイル処理
mkdir mass_test && cd mass_test
for i in {1..1000}; do touch file_$i.txt; done
# 全ファイル検出・表示確認
```

**品質基準**:
- [ ] ファイル変更→Viewer表示: 平均60ms以内
- [ ] 1000ファイル監視での安定動作
- [ ] UI応答性維持（キーボード操作遅延なし）

#### 5.2 長時間運用テスト
```bash
# 24時間連続監視テスト
cctop --daemon
# 24時間後のMonitor状態・メモリ使用量・ログサイズ確認
```

**期待結果**:
- [ ] 24時間連続安定動作
- [ ] メモリリークなし（使用量増加 < 10%）
- [ ] ログファイルサイズ適切管理

## 📊 品質証明書作成要件

### 検証完了時の成果物
1. **品質証明書**: `documents/records/reports/func003-quality-assurance-report.md`
2. **テスト結果**: 全検証項目の詳細結果
3. **パフォーマンス測定**: レスポンス時間・リソース使用量
4. **発見Issue**: 不具合・改善提案があれば詳細記録

### 品質証明書必須項目
- [ ] **仕様準拠確認**: FUNC-003仕様書との100%適合確認
- [ ] **アーキテクチャ検証**: 2プロセス分離の正確な実装
- [ ] **信頼性保証**: 異常状況での安定性・復旧能力
- [ ] **パフォーマンス証明**: リアルタイム性・長時間運用の品質
- [ ] **運用準備完了**: 本番環境での安全運用可能性

## 🚨 Critical検証ポイント

### 絶対確認事項
1. **データ整合性**: Monitor書き込み・Viewer読み取りの完全同期
2. **プロセス独立性**: Monitor・Viewerの完全独立動作
3. **異常復旧**: 全パターンの異常状況からの自動復旧
4. **セキュリティ**: PIDファイル・ログファイルの適切な権限設定

### 不合格基準（即時Builder差し戻し）
- Monitor・Viewer間のデータ不整合
- プロセス間依存による障害波及
- 異常時の自動復旧失敗
- メモリリーク・リソース枯渇

## 📁 関連リソース

### 仕様書・設計文書
- **FUNC-003**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`
- **FUNC-000**: `documents/visions/functions/FUNC-000-sqlite-database-foundation.md`
- **BP-001**: `documents/visions/blueprints/BP-001-for-version0200-restructered.md`

### Builder実装成果物
- **Builder handoff**: `passage/handoffs/pending/builder/HO-20250626-016-func003-background-monitor-implementation.md`

この検証により、FUNC-003が本番環境での安全・安定・高性能な2プロセス分離アーキテクチャとして完成することを保証してください。
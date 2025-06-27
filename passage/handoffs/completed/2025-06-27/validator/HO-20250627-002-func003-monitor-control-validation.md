# HO-20250627-002: FUNC-003 Monitor終了制御機能検証

**作成日**: 2025年6月27日 01:30  
**期限**: 2025年6月28日 18:00  
**優先度**: Medium  
**作成者**: Architect Agent  
**対象**: Validator Agent  

## 📋 検証要求概要

Builder Agent更新完了後、FUNC-003「Background Activity Monitor」のMonitor終了制御機能を検証してください。「気持ちの良い」Monitor管理が実現されているかを重点的に確認します。

## 🎯 検証対象

### **主要検証項目**
1. **Monitor終了制御の正確性**（起動者による制御）
2. **PIDファイル管理の信頼性**
3. **後方互換性の維持**
4. **異常系処理の堅牢性**
5. **既存機能の回帰防止**

## 🧪 詳細テスト仕様

### **1. Monitor終了制御検証（最重要）**

#### **A. 基本制御パターンテスト**

##### **パターン1: Viewer起動Monitor → Viewer終了**
```bash
# 前提: Monitor未起動状態
$ ps aux | grep monitor  # Monitor無し確認

# 実行: ViewerでMonitor起動
$ cctop &
VIEWER_PID=$!

# 確認: PIDファイル内容
$ cat .cctop/monitor.pid
# 期待値:
# {
#   "pid": MONITOR_PID,
#   "started_by": "viewer",
#   "started_at": TIMESTAMP,
#   "config_path": "/.../config.json"
# }

# 実行: Viewer終了
$ kill $VIEWER_PID
$ sleep 2

# 検証: Monitor停止確認
$ ps aux | grep monitor  # Monitor無し確認
```

##### **パターン2: Standalone Monitor → Viewer起動・終了**
```bash
# 前提: Monitor独立起動
$ cctop-monitor &
MONITOR_PID=$!

# 確認: PIDファイル内容
$ cat .cctop/monitor.pid
# 期待値: started_by="standalone"

# 実行: Viewer起動・終了
$ cctop &
VIEWER_PID=$!
$ kill $VIEWER_PID
$ sleep 2

# 検証: Monitor継続確認
$ ps aux | grep monitor  # Monitor継続確認
$ kill $MONITOR_PID      # 手動クリーンアップ
```

##### **パターン3: 不明起動Monitor → Viewer終了**
```bash
# 前提: 従来形式PIDファイル作成
$ echo "12345" > .cctop/monitor.pid
$ cctop-monitor &
MONITOR_PID=$!

# 実行: Viewer起動・終了
$ cctop &
VIEWER_PID=$!
$ kill $VIEWER_PID

# 検証: Monitor継続確認（安全側動作）
$ ps aux | grep monitor  # Monitor継続確認
```

#### **B. 複数インスタンステスト**
```bash
# シナリオ: 複数Viewer、1つのMonitor
$ cctop &          # Viewer1でMonitor起動
VIEWER1_PID=$!
$ cctop &          # Viewer2（Monitor既存利用）
VIEWER2_PID=$!

$ kill $VIEWER1_PID  # Viewer1終了
$ ps aux | grep monitor  # Monitor継続確認（Viewer2が存在）

$ kill $VIEWER2_PID  # Viewer2終了
$ ps aux | grep monitor  # Monitor継続確認（started_by="viewer"だが最後のViewerではない）
```

### **2. PIDファイル管理検証**

#### **A. JSON形式書き込み・読み取りテスト**
```javascript
// テストケース: 正確なJSON形式
const expectedFormat = {
  pid: expect.any(Number),
  started_by: expect.stringMatching(/^(viewer|standalone)$/),
  started_at: expect.any(Number),
  config_path: expect.stringContaining('.cctop/config.json')
};

// 検証項目:
// - JSON形式の正確性
// - 必須フィールドの存在
// - データ型の正確性
// - 文字エンコーディング
```

#### **B. 後方互換性テスト**
```bash
# テスト1: 従来形式PIDファイル読み取り
$ echo "12345" > .cctop/monitor.pid
$ cctop --check-monitor-status
# 期待値: started_by="unknown"として処理

# テスト2: 壊れたJSONファイル処理
$ echo "invalid json" > .cctop/monitor.pid
$ cctop
# 期待値: エラー処理後、正常動作継続
```

#### **C. ファイル権限・異常系テスト**
```bash
# テスト1: 読み取り専用PIDファイル
$ chmod 444 .cctop/monitor.pid
$ cctop
# 期待値: 適切なエラーメッセージ、動作継続

# テスト2: ディレクトリ権限不足
$ chmod 555 .cctop/
$ cctop
# 期待値: 適切なエラーメッセージ、読み取り専用モード
```

### **3. プロセスライフサイクル検証**

#### **A. 正常終了テスト**
```bash
# SIGTERM送信による正常終了
$ cctop-monitor &
MONITOR_PID=$!
$ kill -TERM $MONITOR_PID

# 検証項目:
# - PIDファイル削除確認
# - ログへの終了記録
# - データベース正常クローズ
# - 未処理イベントの処理完了
```

#### **B. 異常終了・回復テスト**
```bash
# SIGKILL送信による強制終了
$ cctop-monitor &
MONITOR_PID=$!
$ kill -9 $MONITOR_PID

# 次回起動時の回復確認
$ cctop
# 期待動作:
# - 古いPIDファイル検出・削除
# - 新しいMonitor正常起動
# - データベース整合性確認
```

#### **C. ゾンビプロセス検出テスト**
```bash
# プロセスが死んでいるがPIDファイルが残存
$ echo '{"pid":99999,"started_by":"viewer"}' > .cctop/monitor.pid
$ cctop

# 期待動作:
# - プロセス非存在検出
# - PIDファイル自動削除
# - 新Monitor起動
```

### **4. ログ・監査機能検証**

#### **A. 起動・終了ログ確認**
```bash
# ログファイル内容確認
$ tail -f .cctop/logs/monitor.log

# 期待ログエントリ:
# "Monitor started by: viewer"
# "Monitor stopped (started by viewer)"
# "Monitor continues running (started standalone)"
```

#### **B. 状態変更監査**
```bash
# Monitor状態変更の完全監査
$ cctop --monitor-status
# 期待出力:
# - 現在のMonitor状態
# - 起動者情報
# - 稼働時間
# - 最後の状態変更
```

## 📊 品質基準

### **機能的品質基準**
- [ ] 終了制御: 100%期待通りの動作
- [ ] PIDファイル: JSON形式の正確性100%
- [ ] 後方互換性: 従来形式での完全動作
- [ ] 異常回復: 全異常ケースでの適切な回復

### **非機能的品質基準**
- [ ] パフォーマンス: PIDファイル操作のオーバーヘッド < 10ms
- [ ] 信頼性: 1000回起動・終了での異常ゼロ
- [ ] 保守性: ログからの状態追跡可能性100%

### **ユーザビリティ基準**
- [ ] 直感性: 「期待通り」の動作感覚
- [ ] 透明性: ログで動作理由が明確
- [ ] 予測可能性: 同一条件で同一結果

## 🔧 テスト環境・条件

### **基本テスト環境**
- **OS**: macOS, Linux (Ubuntu)
- **Node.js**: v24.2.0
- **並行度**: 単一・複数プロセス

### **ストレステスト条件**
- **反復テスト**: 起動・終了を1000回実行
- **並行テスト**: 複数Viewer同時起動・終了
- **長時間テスト**: 24時間連続Monitor動作

### **エッジケーステスト**
- **ディスク容量不足**: /tmpフル状態
- **プロセス制限**: ulimit制限下
- **権限制限**: 読み取り専用ファイルシステム

## 📋 テスト実行手順

### **Phase 1: 基本機能テスト（90分）**
1. **終了制御パターンテスト** (30分)
   - Viewer起動Monitor → Viewer終了
   - Standalone Monitor → Viewer起動・終了
   - 不明起動Monitor → Viewer終了

2. **PIDファイル管理テスト** (30分)
   - JSON形式読み書き
   - 後方互換性
   - 異常系処理

3. **プロセスライフサイクルテスト** (30分)
   - 正常終了・異常終了
   - ゾンビプロセス検出
   - 回復処理

### **Phase 2: 統合・ストレステスト（90分）**
1. **複数インスタンステスト** (30分)
2. **異常系・エッジケーステスト** (30分)
3. **長時間・反復テスト** (30分)

### **Phase 3: 回帰テスト（60分）**
1. **既存機能回帰確認** (30分)
2. **パフォーマンス回帰確認** (30分)

### **Phase 4: 品質保証レポート（30分）**
1. 全テスト結果集計
2. 問題分析・改善提案
3. リリース可否判定

## 📝 報告要件

### **品質保証レポート内容**
1. **テスト実行結果**: 全項目の詳細結果
2. **「気持ちの良さ」評価**: ユーザー体験の主観評価
3. **発見した問題**: 具体的問題と影響度評価
4. **パフォーマンス分析**: リソース使用量・レスポンス時間
5. **改善提案**: 品質向上・保守性向上提案

### **最終判定基準**
- **High**: 全基本機能合格
- **Medium**: ストレステスト80%以上合格
- **Low**: 既存機能回帰ゼロ

### **報告ファイル**
- `documents/records/reports/func003-monitor-control-validation-report.md`

## 🔗 参考資料

- **FUNC-003更新仕様**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`
- **Builder更新内容**: Builderからの完了報告
- **既存テストケース**: `test/monitors/`ディレクトリ

---

**最終成果**: Monitor制御が「期待通りに動作する」安心感と信頼性の確認
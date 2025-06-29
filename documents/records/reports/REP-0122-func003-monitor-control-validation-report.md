# FUNC-003 Monitor終了制御機能検証レポート

**検証日**: 2025年6月27日  
**検証者**: Validator Agent  
**対象**: FUNC-003 Background Activity Monitor - Monitor終了制御機能  
**検証依頼**: HO-20250627-002

## 📋 検証概要

FUNC-003「Background Activity Monitor」のMonitor起動者記録・終了制御機能の品質保証を実施。

**重要発見**: 仕様で要求されている起動者記録・終了制御機能が未実装であることを確認。

## 🚨 検証結果: 機能不足により検証中断

### **致命的問題: 起動者記録・終了制御機能未実装**

#### **1. PIDファイル形式不適合**

**期待される形式（FUNC-003仕様）**:
```json
{
  "pid": 12345,
  "started_by": "viewer",        // ← 未実装
  "started_at": 1719456789,      // ← 未実装  
  "config_path": "/path/to/.cctop/config.json"  // ← 未実装
}
```

**現在の実装**:
```json
{
  "pid": 32521,
  "startTime": "2025-06-26T16:37:19.609Z",  // ← 形式違い
  "scriptPath": "/Users/takuo-h/Workspace/Code/06-cctop/cctop/src/monitors/monitor-process.js",
  "processName": "cctop-monitor",
  "parentPid": 32503
}
```

**問題**: 
- `started_by`フィールドが存在しない
- `started_at`フィールドが存在しない  
- `config_path`フィールドが存在しない
- タイムスタンプ形式が仕様と異なる

#### **2. 終了制御ロジック未実装**

**現在のViewer終了処理（viewer-process.js:174-210）**:
```javascript
async stop() {
  // Monitor終了制御ロジックが一切なし
  // 起動者による制御判定なし
  // 単にViewer自身の停止のみ実行
}
```

**要求されている制御ロジック**:
```javascript
// 未実装の必要機能
async onViewerExit() {
  const monitorStatus = await this.processManager.checkMonitorStatus();
  
  if (monitorStatus.started_by === "viewer") {
    // Viewerが起動したMonitorは停止
    await this.processManager.stopMonitor();
  } else if (monitorStatus.started_by === "standalone") {
    // 独立起動Monitorは継続
    // 停止処理は実行しない
  }
}
```

#### **3. 起動者記録機能未実装**

**現在のMonitor起動処理**:
- `started_by`情報を記録していない
- viewer起動か独立起動かの区別がない
- 終了制御に必要な情報が保存されていない

## 📊 基本機能検証結果

**実施可能だった基本検証**:

### ✅ PIDファイル基本操作
- [x] PIDファイル作成・読み取り: 正常動作
- [x] JSON形式での記録: 正常動作  
- [x] プロセス存在確認: 正常動作

### ✅ Monitor起動・停止の基本機能
- [x] Monitor独立起動: 正常動作
- [x] ProcessManager経由でのMonitor制御: 正常動作
- [x] PIDファイルのクリーンアップ: 正常動作

### ❌ 要求機能（未実装により検証不可）
- [ ] 起動者記録機能
- [ ] Viewer起動Monitor→Viewer終了時停止制御
- [ ] Standalone Monitor→Viewer終了時継続制御  
- [ ] 従来形式PIDファイルとの互換性
- [ ] 起動者不明時の安全側動作

## 🔧 Builder修正要求

以下の機能実装がFUNC-003準拠に必要:

### **1. PIDファイル形式拡張**
- `started_by`, `started_at`, `config_path`フィールド追加
- 従来形式との互換性確保
- UNIX timestamp形式での時刻記録

### **2. 起動者記録ロジック**  
- Viewer経由起動時: `started_by: "viewer"`
- Monitor独立起動時: `started_by: "standalone"`
- 不明な場合: `started_by: "unknown"`

### **3. 終了制御ロジック**
- `ViewerProcess.stop()`に制御判定追加
- `started_by: "viewer"`時のみMonitor停止
- その他の場合はMonitor継続

### **4. 後方互換性**
- 従来の数値のみPIDファイル読み取り対応
- 不正JSON時の適切なエラー処理

## 📝 Builder向け優先度付き修正リスト

### **P1 (最高優先度): 基本制御機能**
1. ProcessManager.savePidFile()に起動者情報追加
2. ViewerProcess.ensureMonitorRunning()で起動者=viewerに設定
3. ViewerProcess.stop()に終了制御ロジック追加

### **P2 (高優先度): 互換性・堅牢性**  
4. ProcessManager.getPidInfo()で従来形式対応
5. JSON parsing エラー処理強化
6. 起動者不明時の安全側処理

### **P3 (中優先度): 最適化・ログ**
7. 制御判定をログ出力
8. Monitor状態確認の詳細化
9. 設定ファイルへの拡張項目追加

## ⏰ 次回検証計画

Builder修正完了後に以下を実施予定:

### **Phase 1: 基本機能検証 (30分)**
- PIDファイル新形式の動作確認
- 起動者記録の正確性確認  
- 終了制御の基本動作確認

### **Phase 2: 統合シナリオ検証 (60分)**
- Viewer→Monitor起動→Viewer終了→Monitor停止シーケンス
- Standalone Monitor→Viewer起動→Viewer終了→Monitor継続シーケンス
- 従来形式PIDファイルとの互換性確認

### **Phase 3: 異常系・エッジケース検証 (30分)**
- PIDファイル破損時の動作
- プロセス異常終了時の回復
- 権限不足時の処理

## 📋 Builder完了確認チェックリスト

修正完了時に以下を確認:

- [ ] `started_by`フィールド付きPIDファイル作成
- [ ] Viewer起動時に`started_by: "viewer"`記録
- [ ] 独立起動時に`started_by: "standalone"`記録  
- [ ] Viewer終了時の条件付きMonitor停止
- [ ] 従来形式PIDファイル読み取り対応
- [ ] 新機能のテストケース追加

## 🔄 Builder連携

**依頼ファイル**: `passage/handoffs/pending/builder/HO-20250627-002-func003-monitor-control-update.md`

**期限**: 2025年6月28日 16:00

**完了後**: Builder完了報告後に本検証を再開・完了予定

---

**結論**: 要求機能の未実装により検証中断。Builder修正完了後に再検証実施。
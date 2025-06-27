# FUNC-205: ステータス表示エリア機能

**作成日**: 2025年6月26日 16:15  
**更新日**: 2025年6月26日 16:15  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-202, FUNC-206

## 📊 機能概要

画面下部にプログラムの進行状況・統計情報・システム状態を表示するステータスエリア機能。

**ユーザー価値**: 
- 初期スキャン進行状況の可視化
- 活動統計の一目での把握
- エラー・警告の即座な通知
- システム負荷状態の監視

## 🎯 機能境界

### ✅ **実行する**
- 初期スキャン進行状況の表示
- 期間別活動統計（10分/1時間/今日）
- システム状態・警告の表示
- エラーメッセージの優先表示
- 状態に応じた色分け表示
- 長文メッセージの横スクロール表示
- ストリーム形式による複数行表示（行数設定可能）

### ❌ **実行しない**
- 詳細なログ表示（別画面・ファイル出力）
- 設定値を超える行数表示
- ユーザーインタラクション（読み取り専用）
- 長期履歴の保存（直近のみ表示）

## 📋 必要な仕様

### **配置場所**
現在のFUNC-202レイアウトの下部に設定可能行数追加（デフォルト3行）：

```
Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
2025-06-25 19:07:51    00:04  FUNC-120-event-type-filte...       modify     197      16  documents/visions/functions
────────────────────────────────────────────────────
All Activities  (4/156)
[a] All  [u] Unique  [q] Exit
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
>> Initial scan completed: 2,453 files in 1.2s
>> Last 10min: 23 changes (8 create, 15 modify) in 5 files  
>> Database: 15.2MB, 12,456 events
```

### **ストリーム表示仕様**

#### **基本動作**
- **最新メッセージ**: 常に最上行に表示
- **既存メッセージ**: 新しいメッセージが来ると下にプッシュダウン
- **溢れたメッセージ**: 設定行数+1行目以降は自動削除（見えなくなる）
- **表示行数**: 1〜設定値行（config.jsonで設定可能、デフォルト3行）

### **表示内容仕様**

#### **1. 初期スキャン進行状況**
```
>> Initial scan: 2,453 files found (ongoing...)
>> Initial scan completed: 2,453 files in 0.8s
```

#### **2. 期間別活動統計**
```
>> Last 10min: 23 changes (8 create, 15 modify) in 5 files
>> Last hour: 156 events, most active: src/ (89 events)
>> Today: 1,247 total events across 234 files
```

#### **3. システム状態**
```
>> Database: 15.2MB, 12,456 events
>> Activity rate: 12 events/min (normal)
!! High activity: 45 events/min (consider increasing debounce)
```

#### **4. ファイル監視状態**
```
>> Watching: 8,192 files (limit: 524,288)
!! File watch limit: 500,000/524,288 (approaching limit)
!! Watch limit exceeded: increase fs.inotify.max_user_watches
```

#### **5. エラー・警告**
```
!! Cannot access: /protected/directory (permission denied)
!! Large file skipped: data.log (>100MB)
>> Reconnecting to database...
```

### **メッセージプレフィックス仕様**

| プレフィックス | 意味 | 色 | 優先度 |
|---------------|------|-----|--------|
| `!!` | エラー・警告 | 赤色 | 最高 |
| `>>` | 通常メッセージ・進行状況 | 白色 | 通常 |

### **表示優先順位**
1. **エラー・警告** (!!) - 赤色、即座表示、必ず最上行
2. **進行状況** (>>) - 白色、処理中状態、継続表示
3. **統計情報** (>>) - 白色、通常時の情報
4. **システム状態** (>>) - 白色、正常動作時、下位行

### **更新頻度仕様**
- **エラー・警告**: 即座表示（100ms以内）
- **進行状況**: 1秒毎更新
- **統計情報**: 5秒毎更新
- **システム状態**: 10秒毎更新
- **横スクロール**: 200ms毎に1文字送り

### **文字表示制御**

#### **短文メッセージ（ターミナル幅以内）**
- 通常通り左寄せで表示
- 右側は空白で埋める

#### **長文メッセージ（ターミナル幅超過）**
```
# 表示例（ターミナル幅80文字の場合）
[0-3秒] !! Cannot access: /very/long/path/to/protected/directory/with/many/sub
[3-6秒] cess: /very/long/path/to/protected/directory/with/many/subdirectories
[6-9秒] /very/long/path/to/protected/directory/with/many/subdirectories (per
[9-12秒] long/path/to/protected/directory/with/many/subdirectories (permiss
```

#### **スクロール仕様**
- **開始**: メッセージ表示開始から3秒後
- **速度**: 200ms毎に1文字左送り
- **終了**: 最後の文字が表示されたら3秒停止後、先頭に戻る
- **ループ**: 次のメッセージまで継続

### **メッセージライフサイクル**

#### **追加ルール**
- **新規メッセージ**: 最上行に挿入、既存は下にシフト
- **重複回避**: 同一内容は既存を更新（新規追加しない）
- **継続更新**: 進行状況は同一行で更新（シフトしない）

#### **表示例（時系列）**
```
# t=0s: 初期状態
>> Initial scan: scanning files...

# t=5s: 統計追加
>> Initial scan: 1,234 files found (ongoing...)
>> Monitoring started: 0 events

# t=10s: 完了 + エラー発生
!! Cannot access: /protected/dir (permission denied)
>> Initial scan completed: 2,453 files in 8.2s
>> Last 10min: 0 events

# t=15s: 新しい統計（最古の統計が消える）
!! Cannot access: /protected/dir (permission denied)  
>> Initial scan completed: 2,453 files in 8.2s
>> Last 10min: 12 changes (8 create, 4 modify) in 6 files
```

## 🔧 実装ガイドライン

### **ステータス管理クラス**
```javascript
class StatusDisplay {
  constructor(config) {
    this.messageLines = [];        // 設定可能行数のメッセージ配列
    this.scrollStates = [];        // 各行のスクロール状態
    this.updateInterval = null;
    this.terminalWidth = 80;
    this.config = config.display.statusArea;
    this.maxLines = this.config.maxLines || 3;
  }

  // 新規メッセージ追加（最上行に挿入）
  addMessage(message, priority, type) {
    // 重複チェック、優先度ソート、シフト処理
  }
  
  // メッセージ更新（同一行で更新）
  updateMessage(oldMessage, newMessage) {}
  
  // 表示用の全行取得
  getDisplayLines() {}
  
  // 横スクロール制御
  updateScrolling() {}
  
  // 統計情報生成
  generateStatistics() {}
  
  // 行の削除・シフト
  shiftLines() {}
}
```

### **config.json設定拡張**

FUNC-101（階層的設定管理）のconfig.jsonに以下を追加：

```json
"display": {
  // 既存の設定...
  "statusArea": {
    "maxLines": 3,                    // ステータス表示行数（1-10）
    "enabled": true,                  // ステータス表示のON/OFF
    "scrollSpeed": 200,               // 横スクロール速度（ms）
    "updateInterval": 5000            // 統計更新間隔（ms）
  }
}
```

### **設定値仕様**
- **maxLines**: 1〜10の範囲（デフォルト: 3）
- **enabled**: true/false（デフォルト: true）
- **scrollSpeed**: 100〜1000ms（デフォルト: 200ms）
- **updateInterval**: 1000〜30000ms（デフォルト: 5000ms）

### **統計データ取得**
```sql
-- 10分間統計
SELECT 
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT file_id) as unique_files
FROM events 
WHERE timestamp > datetime('now', '-10 minutes')
GROUP BY event_type;

-- 最もアクティブなディレクトリ
SELECT 
  directory_path,
  COUNT(*) as event_count
FROM events e
JOIN files f ON e.file_id = f.id
WHERE timestamp > datetime('now', '-1 hour')
GROUP BY directory_path
ORDER BY event_count DESC
LIMIT 1;
```

### **FUNC-202との統合**
- 既存レイアウトの下部に設定可能行数追加
- 二重バッファ描画システム（FUNC-021）との連携
- 動的行数調整（1〜maxLines行）
- config.jsonによる完全制御
- キーボード操作には影響しない
- ターミナルリサイズ時の再描画対応

## 🧪 テスト要件

### **表示テスト**
- 各メッセージタイプの正確な表示
- ストリーム形式のプッシュダウン動作
- 優先順位による行の並び替え
- 横スクロール動作の正確性
- 3行制限の動作確認
- ターミナルリサイズ時の適応

### **統計精度テスト**
- 期間別イベント集計の正確性
- リアルタイム更新の遅延測定
- 大量イベント時の性能影響

### **エラーハンドリング**
- データベース接続エラー時の表示
- 権限不足時の適切な警告
- 長時間プロセス時の進行状況表示

## 💡 使用シナリオ

### **初回起動時**
```
1. >> Initial scan: scanning files...
2. >> Initial scan: 1,234 files found (ongoing...)
3. >> Initial scan completed: 2,453 files in 1.2s
4. >> Monitoring started: watching 2,453 files
```

### **通常監視時**
```
# 静穏時
>> Database: 8.5MB, 3,421 events

# 活発時
>> Last 10min: 45 changes (12 create, 28 modify, 5 delete) in 18 files

# 高負荷時
!! High activity: 67 events/min (consider increasing debounce to 200ms)
```

### **問題発生時**
```
# 短文エラー
!! Database locked: waiting for unlock...

# 長文エラー（横スクロール）
[0-3秒] !! Cannot access: /very/long/path/to/deeply/nested/protected/director
[3-6秒] ess: /very/long/path/to/deeply/nested/protected/directory/structure (
[6-9秒] long/path/to/deeply/nested/protected/directory/structure (permission 
[9-12秒] h/to/deeply/nested/protected/directory/structure (permission denied)
```

## 🎯 成功指標

1. **情報価値**: ユーザーが状況を即座に把握できる
2. **非侵襲性**: メイン表示領域を圧迫しない
3. **適応性**: 様々な状況に応じた適切な情報表示
4. **パフォーマンス**: 表示更新がメイン機能に影響しない

## 🔗 関連仕様

- **表示基盤**: [FUNC-202: CLI表示統合](./FUNC-202-cli-display-integration.md)
- **データベース**: [FUNC-000: SQLiteデータベース基盤](./FUNC-000-sqlite-database-foundation.md)
- **監視制限**: [FUNC-102: ファイル監視上限管理](./FUNC-102-file-watch-limit-management.md)

---

**核心価値**: プログラムの内部状態を分かりやすく伝え、ユーザーの安心感と制御感を向上させる
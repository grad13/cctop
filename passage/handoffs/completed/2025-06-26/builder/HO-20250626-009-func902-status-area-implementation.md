# HO-20250626-009: FUNC-902 ステータス表示エリア実装

**作成日**: 2025年6月26日 16:35  
**作成者**: Architect Agent  
**依頼先**: Builder Agent  
**優先度**: High  
**期限**: 2025年6月28日  
**関連FUNC**: FUNC-902, FUNC-011, FUNC-022

## 📊 依頼概要

FUNC-902「ステータス表示エリア機能」の実装を依頼します。画面下部にプログラムの進行状況・統計情報・システム状態を表示するストリーム形式のステータスエリアを追加してください。

## 🎯 実装対象機能

### **ステータス表示エリア**
- **配置**: FUNC-022のCLI表示下部に追加
- **行数**: config.jsonで設定可能（デフォルト3行、最大10行）
- **表示形式**: ストリーム（新規メッセージが上、古いメッセージは下にプッシュダウン）
- **メッセージプレフィックス**: `>>` (通常・白色), `!!` (エラー・警告・赤色)
- **横スクロール**: 長文メッセージの自動スクロール機能

## 🔧 実装要件

### **1. StatusDisplayクラス実装**
```javascript
// src/display/StatusDisplay.js
class StatusDisplay {
  constructor(config) {
    this.messageLines = [];        // 設定可能行数のメッセージ配列
    this.scrollStates = [];        // 各行のスクロール状態
    this.config = config.display.statusArea;
    this.maxLines = this.config.maxLines || 3;
    this.terminalWidth = process.stdout.columns || 80;
  }

  // 新規メッセージ追加（最上行に挿入）
  addMessage(message, type = 'info') {
    const prefix = type === 'error' ? '!!' : '>>';
    const fullMessage = `${prefix} ${message}`;
    
    // 重複チェック・優先度ソート・シフト処理
    this.insertMessage(fullMessage, type);
    this.shiftLines();
  }
  
  // メッセージ更新（同一行で更新）
  updateMessage(searchText, newMessage, type = 'info') {
    // 既存メッセージを検索して更新（シフトしない）
  }
  
  // 表示用の全行取得
  getDisplayLines() {
    return this.messageLines.map((line, index) => {
      return this.applyScrolling(line, index);
    });
  }
  
  // 横スクロール処理
  applyScrolling(message, lineIndex) {
    if (message.length <= this.terminalWidth) {
      return message.padEnd(this.terminalWidth);
    }
    
    // スクロール位置計算・文字列切り出し
    const scrollPos = this.scrollStates[lineIndex] || 0;
    return message.substring(scrollPos, scrollPos + this.terminalWidth);
  }
}
```

### **2. FUNC-022との統合**
```javascript
// src/display/CLIDisplay.js への統合
class CLIDisplay {
  constructor(config) {
    // 既存の初期化...
    this.statusDisplay = new StatusDisplay(config);
  }
  
  render() {
    // 既存のメイン表示
    this.renderMainContent();
    
    // ステータスエリア表示
    if (this.statusDisplay.config.enabled) {
      this.renderStatusArea();
    }
  }
  
  renderStatusArea() {
    const statusLines = this.statusDisplay.getDisplayLines();
    statusLines.forEach((line, index) => {
      const color = line.startsWith('!!') ? 'red' : 'white';
      this.drawLine(this.getStatusLinePosition(index), line, color);
    });
  }
}
```

### **3. 統計情報生成**
```javascript
// src/services/StatisticsService.js
class StatisticsService {
  constructor(database) {
    this.db = database;
  }
  
  async generatePeriodStatistics() {
    // 10分間統計
    const last10min = await this.getEventStatistics('-10 minutes');
    
    // 1時間統計
    const lastHour = await this.getEventStatistics('-1 hour');
    
    // 今日の統計
    const today = await this.getEventStatistics('date(\'now\')');
    
    return { last10min, lastHour, today };
  }
  
  async getEventStatistics(timeFilter) {
    const sql = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT file_id) as unique_files
      FROM events 
      WHERE timestamp > datetime('now', ?)
      GROUP BY event_type
    `;
    
    return await this.db.all(sql, [timeFilter]);
  }
}
```

### **4. config.json設定読み込み**
FUNC-011で追加されたstatusArea設定を読み込み：
```json
"display": {
  "statusArea": {
    "maxLines": 3,
    "enabled": true,
    "scrollSpeed": 200,
    "updateInterval": 5000
  }
}
```

## 📋 実装詳細

### **メッセージ表示例**
```
Modified             Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
2025-06-25 19:07:51    00:04  FUNC-120-event-type-filte...       modify     197      16  ./documents/visions/functions
────────────────────────────────────────────────────
All Activities  (4/156)
[a] All  [u] Unique  [q] Exit
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
>> Initial scan completed: 2,453 files in 1.2s
>> Last 10min: 23 changes (8 create, 15 modify) in 5 files  
!! High activity: 45 events/min (consider increasing debounce)
```

### **横スクロール動作**
```
# 長文メッセージの場合（200ms毎に1文字スクロール）
[0-3秒] >> Initial scan completed: very/long/path/to/deeply/nested/director
[3-6秒] ial scan completed: very/long/path/to/deeply/nested/directory/struc
[6-9秒] scan completed: very/long/path/to/deeply/nested/directory/structure
```

### **統合タイミング**
- **初期スキャン時**: 進行状況の表示
- **通常監視時**: 期間統計の定期更新
- **エラー発生時**: 即座に警告表示
- **高負荷時**: パフォーマンス警告

## 🧪 実装時の考慮事項

### **パフォーマンス**
- ステータス更新は既存描画に影響しない
- 横スクロールの軽量実装
- メモリリーク防止（古いメッセージの適切な削除）

### **設定連携**
- config.json設定の動的読み込み
- 設定値バリデーション（1-10行制限等）
- enabled=falseの場合の完全非表示

### **エラーハンドリング**
- データベース接続エラー時の適切な表示
- 統計取得失敗時のフォールバック
- ターミナルリサイズ時の再描画

## ✅ 完了基準

1. **基本機能**: ストリーム形式ステータス表示の実装
2. **設定連携**: config.json設定の完全対応
3. **統合**: FUNC-022との seamless な統合
4. **横スクロール**: 長文メッセージの自動スクロール
5. **統計機能**: 期間別活動統計の自動生成
6. **パフォーマンス**: 既存機能への影響なし

## 🔗 関連ファイル・依存関係

### **必須確認事項**
- `documents/visions/functions/FUNC-902-status-display-area.md` - 完全仕様
- `documents/visions/functions/FUNC-011-hierarchical-config-management.md` - 設定仕様
- `documents/visions/functions/FUNC-022-cli-display-integration.md` - 統合先

### **実装ファイル候補**
- `src/display/StatusDisplay.js` - メインクラス
- `src/services/StatisticsService.js` - 統計生成
- `src/display/CLIDisplay.js` - 統合点

## 📝 成果物

- StatusDisplayクラスの完全実装
- FUNC-022との統合実装
- 統計サービスの実装
- 動作確認・デモ可能な状態

## 🚨 重要事項

- **テスト協調**: Validator Agent と連携してテスト実装をサポート
- **仕様準拠**: FUNC-902仕様書に100%準拠
- **品質**: 硬派なCLIツールにふさわしい堅牢な実装
- **拡張性**: 将来的な機能追加に対応可能な設計

---

**期待**: ユーザーがシステムの状況を即座に把握できる、価値の高いステータス表示機能の実装をお願いします。
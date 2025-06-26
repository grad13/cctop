# UI009: 設定可能なカラム表示システム

**作成日**: 2025-06-24  
**作成者**: Architect Agent  
**目的**: CLI表示のカラム順序・表示設定をユーザー設定可能にする  

## 🎯 概要

cctop v0.1.0.0のCLI表示において、カラムの順序変更・表示/非表示・幅調整をユーザーが設定可能にする機能を定義します。特に「ディレクトリを最も右に表示」する要望に対応し、柔軟な表示カスタマイズを実現します。

## 📊 現在の表示から提案する変更

### 現在のカラム構成（ui001準拠）
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             src/            modify    125      8
```

### 提案するデフォルト構成
```
Modified             Elapsed    File Name             Event   Lines  Blocks Directory      
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             modify    125      8  src/
```

**変更点**:
- **Directory**を最右に移動（ユーザー要望対応）
- **Event/Lines/Blocks**を集約して数値情報をグループ化
- **File Name**の視認性向上

## 🔧 設定システム統合

### config.json設定項目
```json
{
  "display": {
    "maxEvents": 20,
    "refreshRateMs": 100,
    "columns": {
      "order": ["modified", "elapsed", "fileName", "event", "lines", "blocks", "directory"],
      "widths": {
        "modified": 19,
        "elapsed": 10,
        "fileName": 28,
        "directory": 15,
        "event": 8,
        "lines": 5,
        "blocks": 6
      },
      "visibility": {
        "modified": true,
        "elapsed": true,
        "fileName": true,
        "directory": true,
        "event": true,
        "lines": true,
        "blocks": true
      },
      "alignment": {
        "modified": "right",
        "elapsed": "right",
        "fileName": "left",
        "directory": "left",
        "event": "left",
        "lines": "right",
        "blocks": "right"
      }
    }
  }
}
```

### コマンドライン引数（一時設定）
```bash
# カラム順序変更
cctop --column-order=fileName,event,directory,lines,blocks,modified,elapsed

# 特定カラム非表示
cctop --hide-columns=elapsed,blocks

# カラム幅調整
cctop --column-widths=fileName:35,directory:20

# デフォルト設定リセット
cctop --reset-columns
```

## 📐 実装設計

### Phase 1: 基本カラム順序変更（v0.1.0.0対応）

#### 1.1 設定読み込みシステム
```javascript
// src/config/display-config.js
class DisplayConfig {
  constructor(config) {
    this.columnOrder = config.display.columns?.order || this.getDefaultOrder();
    this.columnWidths = config.display.columns?.widths || this.getDefaultWidths();
    // 既存のmaxEvents等の設定も統合
  }
  
  getDefaultOrder() {
    return ['modified', 'elapsed', 'fileName', 'event', 'lines', 'blocks', 'directory'];
  }
  
  // CLI引数による一時的な設定オーバーライド
  applyCliOverrides(cliArgs) {
    if (cliArgs.columnOrder) {
      this.columnOrder = cliArgs.columnOrder.split(',');
    }
  }
}
```

#### 1.2 Stream Renderer更新
```javascript
// src/ui/stream-renderer.js  
class StreamRenderer {
  constructor(displayConfig) {
    this.displayConfig = displayConfig;
    this.columnOrder = displayConfig.columnOrder;
    this.columnWidths = displayConfig.columnWidths;
  }
  
  formatHeader() {
    const headers = this.columnOrder.map(col => this.getColumnHeader(col));
    return this.alignColumns(headers);
  }
  
  formatEventRow(event) {
    const values = this.columnOrder.map(col => this.getColumnValue(event, col));
    return this.alignColumns(values);
  }
}
```

### Phase 2: 高度な設定機能（v0.2.0.0以降）

#### 2.1 カラム表示/非表示
- `visibility`設定によるカラム表示制御
- 非表示カラムの幅を他カラムに再配分

#### 2.2 動的幅調整
- ターミナル幅に応じた自動調整
- 最小幅保証とオーバーフロー処理

#### 2.3 インタラクティブ設定
- `c`キー: 設定モード切り替え
- カラム順序のドラッグ&ドロップ風操作

## 🎨 表示品質の保持

### カラム配置原則
1. **情報重要度順**: 最重要情報（ファイル名）を中央寄り
2. **データ型グループ化**: 時間系、ファイル系、数値系を集約
3. **視認性優先**: Directory最右配置で他情報との分離

### 色分け・フォーマットの継承
- ui001準拠の色分け（find: 青、create: 明るい緑等）を維持
- 右寄せ/左寄せの配置規則を維持
- 区切り線・ヘッダーフォーマットを維持

## ⚠️ 実装上の注意点

### 設定検証
```javascript
// 無効なカラム名のエラーハンドリング
validateColumnOrder(order) {
  const validColumns = ['modified', 'elapsed', 'fileName', 'directory', 'event', 'lines', 'blocks'];
  const invalid = order.filter(col => !validColumns.includes(col));
  if (invalid.length > 0) {
    throw new Error(`Invalid column names: ${invalid.join(', ')}`);
  }
}
```

### 互換性維持
- 設定ファイルが古い場合のデフォルト値適用
- 新しい設定項目追加時の既存設定保護

### パフォーマンス
- カラム設定の変更検出とキャッシュ
- レンダリング処理の最適化

## 📋 テスト要件

### 設定テスト
- [ ] デフォルト設定での正常表示
- [ ] カラム順序変更の反映確認
- [ ] 無効設定時のエラーハンドリング
- [ ] CLI引数オーバーライドの動作確認

### 表示テスト
- [ ] 各カラムの正しい配置
- [ ] 色分け・配置の継承確認
- [ ] ターミナル幅変更への対応

### 統合テスト
- [ ] 既存All/Uniqueモードとの両立
- [ ] キーボード操作（a/u/q）の正常動作
- [ ] 設定ファイル更新の反映

## 🚀 実装優先度

### Priority 1: v0.1.0.0対応（必須）
- config.jsonでのカラム順序設定
- デフォルト設定でDirectory最右表示
- CLI引数による一時的な順序変更

### Priority 2: v0.2.0.0対応（推奨）
- カラム表示/非表示機能
- 幅調整機能
- 設定値検証の強化

### Priority 3: 将来版（オプション）
- インタラクティブ設定UI
- 動的幅調整
- プリセット設定機能

## 🔗 関連仕様

### 依存する仕様
- **ui001-cli-baseline.md**: 基本CLI表示システム
- **ui002-stream-display.md**: ストリーム表示レンダリング
- **a002-configuration-system.md**: 設定管理システム

### 影響を受ける仕様
- **ui005-configuration.md**: 設定UI（将来的に統合）
- **ui008-cli-ui-design.md**: 全体UIデザイン一貫性

## 📈 期待効果

### ユーザビリティ向上
- **視認性向上**: Directory最右表示によるファイル名の明確化
- **カスタマイズ性**: 個人の作業スタイルに応じた表示調整
- **作業効率**: 重要情報の優先表示

### 技術的メリット
- **拡張性**: 将来的な表示機能追加の基盤
- **保守性**: 設定ベースの柔軟な仕様変更
- **テスタビリティ**: 設定パターンによる網羅的テスト

---

**実装方針**: 既存ui001の安定性を保ちながら、段階的にカスタマイズ機能を追加する
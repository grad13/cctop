# cctop v0.1.0.0 UI表示改善調査レポート

**作成日**: 2025-06-24  
**作成者**: Architect Agent  
**目的**: ディレクトリ最右表示と表示設定編集機能の実装方針策定

## 📋 調査目標

1. ディレクトリを最も右に表示する変更
2. 表示設定を編集可能にする機能
3. 既存UI仕様との整合性確認
4. 技術的実装方針の検討

## 🔍 調査結果

### 1. 既存UI仕様の現状

#### 現在の表示レイアウト（BP-000より）
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             src/            modify    125      8
2025-06-24 14:28:03   00:01:07  new-test.js          test/           create     45      3
```

#### カラム仕様詳細
| カラム | 幅 | 配置 | 説明 |
|--------|-----|------|------|
| Modified | 19 | 右寄せ | ファイル変更時刻（YYYY-MM-DD HH:MM:SS） |
| Elapsed | 10 | 右寄せ | 経過時間（HH:MM:SS または MM:SS） |
| File Name | 28 | 左寄せ | ファイル名（長い場合は省略） |
| Directory | 15 | 左寄せ | ディレクトリパス（長い場合は省略） |
| Event | 8 | 左寄せ | イベントタイプ |
| Lines | 5 | 右寄せ | 行数（-で不明を表示） |
| Blocks | 6 | 右寄せ | ブロック数（-で不明を表示） |

**合計幅**: 97文字（区切り文字含む）

### 2. ディレクトリ最右表示の提案

#### 提案レイアウト
```
Modified             Elapsed    File Name             Event   Lines  Blocks  Directory
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             modify    125      8    src/
2025-06-24 14:28:03   00:01:07  new-test.js          create     45      3    test/
```

#### カラム順序変更
**現在**: Modified | Elapsed | File Name | Directory | Event | Lines | Blocks  
**提案**: Modified | Elapsed | File Name | Event | Lines | Blocks | Directory

#### 利点
1. **ファイル名の視認性向上**: ファイル名とディレクトリが離れて、ファイル名が注目されやすい
2. **数値情報の集約**: Lines、Blocksが右寄せで並び、数値比較が容易
3. **情報の重要度順**: 左から重要度順（時刻→ファイル名→イベント→統計→パス）に配置

### 3. 技術的実装方針

#### 実装対象ファイル
- `src/ui/stream-renderer.js`: 表示レンダリング処理
- `src/cli/formatters/stream-formatter.js`: カラムフォーマット処理
- `src/config/defaults.js`: デフォルト設定

#### 実装方針
```javascript
// 新しいカラム順序定義
const columnOrder = [
  'modified',    // 19文字、右寄せ
  'elapsed',     // 10文字、右寄せ
  'fileName',    // 28文字、左寄せ
  'event',       // 8文字、左寄せ
  'lines',       // 5文字、右寄せ
  'blocks',      // 6文字、右寄せ
  'directory'    // 15文字、左寄せ（最右端）
];
```

### 4. 表示設定編集機能の設計

#### 設定項目（a002ベース拡張）
```json
{
  "display": {
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

#### 設定編集方法
1. **設定ファイル編集**: `~/.cctop/config.json`を直接編集
2. **コマンドライン引数**: 一時的な設定変更
3. **将来拡張**: インタラクティブ設定エディタ

#### コマンドライン引数例
```bash
# ディレクトリを最右に移動
cctop --column-order modified,elapsed,fileName,event,lines,blocks,directory

# 特定カラムを非表示
cctop --hide-columns elapsed,blocks

# カラム幅調整
cctop --column-width fileName:35,directory:20
```

### 5. Hot Reload対応（a002準拠）

#### 動的変更可能項目
```javascript
const hotReloadableDisplayKeys = [
  'display.columns.order',
  'display.columns.widths',
  'display.columns.visibility',
  'display.columns.alignment'
];
```

#### 実装方針
- 設定ファイル監視により変更を自動検出
- 表示レイアウトの即座反映
- 既存表示データの再描画

## 📊 実装優先順位

### Phase 1: 基本機能（高優先度）
1. **カラム順序変更**: ディレクトリを最右に移動
2. **設定ファイル対応**: config.json内でのカラム順序設定
3. **既存UI仕様との統合**: ui001-ui008との整合性確保

### Phase 2: 拡張機能（中優先度）
4. **コマンドライン引数**: 一時的なレイアウト変更
5. **カラム幅調整**: ユーザー設定による幅変更
6. **カラム表示/非表示**: 不要カラムの除外機能

### Phase 3: 高度機能（低優先度）
7. **Hot Reload**: 設定変更の即座反映
8. **インタラクティブ設定**: 実行時の設定変更UI
9. **レイアウトプリセット**: よく使う設定の保存

## 🎯 実装仕様書作成提案

### 新規作成予定仕様書
1. **ui009-configurable-columns.md**: 設定可能カラムシステム仕様
2. **ui010-layout-customization.md**: レイアウトカスタマイズ機能仕様

### 既存仕様書更新
- **ui002-stream-display.md**: 新しいカラム順序の反映
- **ui005-configuration.md**: 表示設定項目の追加

## 🔄 設定システムとの統合

### a002との連携
- 既存の設定システム基盤を活用
- display セクションの拡張として実装
- 階層的設定管理の適用

### 互換性保証
- デフォルト設定での後方互換性維持
- 既存の表示幅・合計文字数の維持
- previous-v01ユーザーの移行支援

## 📈 期待効果

### ユーザビリティ向上
1. **視認性**: ファイル名とディレクトリの分離により情報整理
2. **カスタマイズ性**: ユーザーの作業スタイルに合わせた表示調整
3. **効率性**: 重要な情報の優先表示

### 技術的メリット
1. **拡張性**: 将来的なカラム追加への対応
2. **保守性**: 設定ベースによる表示制御
3. **テスト容易性**: 設定による動作変更のテスト

---

**次のアクション**: この調査結果を基に、ui009-configurable-columns.md仕様書を作成し、実装計画を策定する。
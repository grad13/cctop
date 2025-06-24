# CCTop 詳細表示モード仕様

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: フォーカスモードから個別ファイルの詳細情報を表示する機能の仕様

## 📋 概要

### 機能概要
- フォーカスモードで選択したファイルの詳細情報を表示
- `Enter`キーで詳細モードに遷移
- `ESC`キーで通常表示に復帰

### 位置づけ
- **previous-v01**: 部分実装（DetailViewRendererクラスは存在するが未完成）
- **新版**: MVPでは基本実装、将来的に拡張

## 🖥️ 表示内容

### 基本情報セクション
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full Path:     /Users/project/src/components/App.jsx
File Name:     App.jsx
Directory:     src/components/
File Size:     12,345 bytes (12.1 KB)
```

### タイムスタンプ情報
```
Created:       2025-06-20 10:30:45
Modified:      2025-06-21 18:57:01
Last Event:    2025-06-21 18:57:01 (modify)
```

### 統計情報
```
Statistics:
  Total Events:    45
  Modifications:   38
  Line Changes:    +1,234
  Block Changes:   +89
```

### 最近の変更履歴
```
Recent History:
  2025-06-21 18:57:01  modify   +12 lines   +2 blocks
  2025-06-21 18:45:23  modify   +34 lines   +5 blocks
  2025-06-21 17:30:15  modify   -8 lines    -1 block
  2025-06-21 16:22:08  modify   +56 lines   +8 blocks
  2025-06-21 15:10:30  modify   +23 lines   +3 blocks
  [... 最大10件表示 ...]
```

### フッター
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ESC] Back to list  [h] Show more history  [s] Show session stats
```

## 📊 データ取得

### 必要なクエリ
1. **ファイル基本情報**
   ```sql
   SELECT * FROM file_objects_cache 
   WHERE object_id = ?
   ```

2. **統計情報**
   ```sql
   SELECT * FROM object_statistics 
   WHERE object_id = ?
   ```

3. **変更履歴**
   ```sql
   SELECT * FROM events 
   WHERE object_id = ? 
   ORDER BY timestamp DESC 
   LIMIT 10
   ```

## ⌨️ キーボード操作

### 詳細表示モード内での操作
| キー | 機能 | 説明 |
|------|------|------|
| `ESC` | 戻る | リスト表示に戻る |
| `h` | 履歴拡張 | より多くの履歴を表示（将来実装） |
| `s` | セッション統計 | セッション別の統計（将来実装） |
| `↑↓` | スクロール | 内容が画面に収まらない場合（将来実装） |

## 🎨 表示スタイル

### 装飾
- **ヘッダー/フッター**: 二重線（`━`）で区切り
- **セクションタイトル**: 太字または色付き
- **データラベル**: 右寄せ、固定幅
- **データ値**: 左寄せ

### 色使い
- **ヘッダー**: 白または明るいグレー
- **ラベル**: グレー
- **値**: デフォルト色
- **重要な数値**: 変更量に応じて色分け（増加:緑、減少:赤）

## 💻 実装ガイドライン

### DetailViewRendererクラス
```javascript
class DetailViewRenderer {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }
  
  async render(objectId) {
    // 1. データ取得
    const fileInfo = await this.getFileInfo(objectId);
    const statistics = await this.getStatistics(objectId);
    const history = await this.getHistory(objectId);
    
    // 2. 画面クリア
    console.clear();
    
    // 3. 各セクションを描画
    this.renderHeader();
    this.renderBasicInfo(fileInfo);
    this.renderTimestamps(fileInfo);
    this.renderStatistics(statistics);
    this.renderHistory(history);
    this.renderFooter();
  }
}
```

### 画面遷移フロー
```
リスト表示
  ↓ [Enter]キー
フォーカスモード
  ↓ 選択行で[Enter]キー
詳細表示モード ← 現在の仕様範囲
  ↓ [ESC]キー
リスト表示に戻る
```

## 📈 パフォーマンス考慮事項

### データ取得の最適化
- 3つのクエリを並列実行
- 必要なデータのみ取得（SELECT * は避ける）
- インデックスを活用した高速検索

### 表示の最適化
- 長いパスは適切に省略（中間部分を...で置換）
- 履歴は最初は10件のみ表示
- スクロールは将来実装として保留

## 🚀 将来の拡張案

### Phase 2
- 変更内容のdiff表示
- より詳細な統計グラフ（アスキーアート）
- ファイル内容のプレビュー（最初の数行）
- 関連ファイルの表示

### Phase 3
- 編集機能への連携（エディタ起動）
- 変更のアニメーション表示
- 複数ファイルの比較表示
- エクスポート機能（CSV/JSON）

---

**注記**: この仕様はprevious-v01で未実装だった詳細表示モードの完全な仕様定義です。MVPでは基本的な情報表示に留め、段階的に機能を拡張していきます。
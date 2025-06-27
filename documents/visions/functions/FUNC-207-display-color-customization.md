# FUNC-207: 表示色カスタマイズ機能

**作成日**: 2025年6月25日 10:00  
**更新日**: 2025年6月27日 21:50  
**作成者**: Architect Agent  
**対象バージョン**: -  
**関連仕様**: FUNC-202, CG-004

## 📊 機能概要

cctopの全表示要素の色をconfig.jsonで自由にカスタマイズ可能にする機能。イベントタイプフィルタ・ヘッダー・ステータス・テキスト等の全色設定。

**ユーザー価値**: 視認性向上・個人の好み対応・環境適応・アクセシビリティ向上・チーム統一表示

## 🎯 機能境界

### ✅ **実行する**
- 全表示要素の色設定（フィルタ・ヘッダー・イベント・ステータス等）
- config.jsonでのカスタマイズ設定
- プリセット色パターン提供
- リアルタイム色変更・プレビュー機能

### ❌ **実行しない**
- フォント・サイズ・レイアウト変更
- 背景色・ターミナル設定変更
- 画像・アイコン表示

## 📋 必要な仕様

### **色設定ファイル構成**

#### **ディレクトリ構造**
```
.cctop/
├── config.json          # 現在のシステム設定
├── current-theme.json   # 現在の色設定（実際の色データ）
└── themes/              # プリセットテーマ集（コピー元・参考用）
    ├── default.json     # デフォルトプリセット
    ├── high-contrast.json
    ├── colorful.json
    └── minimal.json
```

#### **ファイルの位置づけ**
- **current-theme.json**: `config.json`と同格の「現在の状態」ファイル
- **themes/**: プリセット保管庫（直接参照せず、コピー元として使用）

#### **色設定ファイル形式（current-theme.json / themes/*.json）**

**表示イメージ例（実際の画面レイアウト）**:
```
Event Timestamp          Elapsed  File Name                Event    Lines Blocks Directory
2025-06-27 16:37:44     54:48    FUNC-207-display-color... modify   247   24     documents/visions/functions
2025-06-27 16:34:40     54:48    CG-004-color-customiz... modify   239   16     documents/visions/supplementary

All Activities  20 events                                    ← status_bar
[a] All  [u] Unique  [q] Exit                              ← general_keys
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore  ← event_filters
>> Monitor: running (PID: 80465)                           ← message_area
>> Last 10min: 10 changes (10 modify) in 1 files         ← message_area
```

**JSON設定（current-theme.json）**:
```json
{
  "name": "default",
  "description": "現在適用中の色設定",
  "lastUpdated": "2025-06-27T10:00:00Z",
  "version": "1.0.0",
  "colors": {
    "table": {
      "column_headers": "white",     // "Modified", "Elapsed", "File Name"等の列ヘッダー
      "row": {
        "event_timestamp": "#00FF00",  // "2025-06-27 16:37:44" (Event Timestamp列) - 16進数指定例
        "elapsed_time": "yellow",    // "54:48" (Elapsed列) - プリセット色指定例
        "file_name": "white",        // "FUNC-207-display-color..." (File Name列)
        "event_type": {
          "find": "blue",            // "find" (Event列)
          "create": "#00FF00",       // "create" (Event列) - 16進数指定例
          "modify": "yellow",        // "modify" (Event列)
          "delete": "#FF0000",       // "delete" (Event列) - 16進数指定例
          "move": "magenta",         // "move" (Event列)
          "restore": "cyan"          // "restore" (Event列)
        },
        "lines": "cyan",             // "247" (Lines列)
        "blocks": "dim",             // "24" (Blocks列)
        "directory": "blue"          // "documents/visions/pilots" (Directory列)
      }
    },
    "status_bar": {
      "label": "gray",               // "All Activities", "events"
      "count": "white",              // "20"
      "separator": "dim"             // 区切り文字
    },
    "general_keys": {
      "key_active": "green",         // "[a]" (アクティブなキー)
      "key_inactive": "#000000",     // "[u]" (非アクティブなキー) - 16進数指定例
      "label_active": "white",       // "All" (アクティブなラベル)
      "label_inactive": "gray"       // "Unique" (非アクティブなラベル)
    },
    "event_filters": {
      "key_active": "green",         // "[f]" (アクティブなフィルタキー)
      "key_inactive": "#000000",     // "[f]" (非アクティブなフィルタキー) - 16進数指定例
      "label_active": "white",       // ":Find" (アクティブなフィルタラベル)
      "label_inactive": "gray"       // ":Find" (非アクティブなフィルタラベル)
    },
    "message_area": {
      "prompt": "cyan",              // ">>" 
      "label": "gray",               // "Monitor:", "Last 10min:"
      "status": "green",             // "running"
      "pid": "dim",                  // "(PID: 80465)"
      "summary": "white"             // "10 changes (10 modify) in 1 files"
    }
  }
}
```

### **current-theme.json仕様**

#### **現在の色設定ファイル**
- **位置づけ**: `config.json`と同格の「現在の状態」を保存
- **内容**: 実際に使用される色設定データ（上記JSON参照）
- **更新**: テーマ切り替え・カスタマイズ時に全体を更新
- **読み込み**: cctop起動時に直接読み込み（themes/参照なし）

#### **色指定形式**
色設定では以下の2つの形式をサポート:
- **プリセット色名**: `"white"`, `"black"`, `"red"`, `"green"`, `"blue"`, `"yellow"`, `"magenta"`, `"cyan"`, `"gray"`, `"dim"`等
- **16進数色**: `"#000000"`, `"#FF0000"`, `"#00FF00"`, `"#0000FF"`等（6桁16進数形式）

**後方互換性**: 既存のプリセット色名は全て引き続き使用可能


### **プリセットテーマ一覧**
- **default**: バランスの取れた標準色設定
- **high-contrast**: 視認性重視の高コントラスト設定
- **colorful**: 鮮やかな色分けで要素を明確に区別
- **minimal**: 控えめな色使いのシンプル設定

## 🔧 実装における設計思想

### **ファイル読み込み方針**
- **cctop起動時**: `current-theme.json`を直接読み込み
- **themes/参照なし**: プリセットファイルは間接的な参照なし
- **高速化**: テーマ名→ファイル参照の処理が不要

### **設定変更フロー**
1. **プリセット適用**: themes/ → current-theme.json へコピー
2. **直接編集**: current-theme.json を直接変更
3. **再起動**: cctop起動時に current-theme.json を読み込み

## 🔧 技術的実装概要

### **基本アーキテクチャ**
- **ColorManager**: `current-theme.json`読み込み・色適用・RGB指定サポート
- **themes/ディレクトリ**: プリセット保管（直接参照なし）
- **設定の永続化**: `current-theme.json`への直接書き込み

### **RGB指定サポート実装要件**
**ColorManager.js改変が必要**:
- 色値解析機能追加: プリセット色名 + 16進数色（#000000形式）の両方をサポート
- chalkライブラリ活用: `chalk.hex()`メソッドによる16進数色処理
- 後方互換性保持: 既存のプリセット色名は継続使用可能

### **実装ガイド参照**
**具体的な実装コード・クラス設計**: [CG-004: 色カスタマイズ実装ガイド](../supplementary/CG-004-color-customization-implementation.md) を参照

## 🧪 テスト要件

### **基本機能テスト**
- [ ] current-theme.json色設定の正常読み込み
- [ ] プリセット色名（"white", "red"等）の正常適用
- [ ] 16進数色（"#FF0000", "#00FF00"等）の正常適用
- [ ] 各表示要素への色適用確認
- [ ] 無効な色名/16進数での適切なフォールバック

### **統合テスト**
- [ ] event_filters機能との色統合（プリセット色・16進数色両方）
- [ ] current-theme.json変更後の再読み込み動作
- [ ] 既存テーマファイルとの後方互換性確認

## 🎯 実装優先度

### **Phase 1: 基本色設定**
- ColorManagerクラス実装・RGB指定サポート追加
- 色値解析機能実装（プリセット色名 + 16進数色）
- config.jsonスキーマ拡張
- 基本的な色適用機能

### **Phase 2: プリセット・拡張機能**
- プリセットテーマ実装
- themes/ディレクトリ自動初期化
- current-theme.json管理機能

### **Phase 3: 高度機能**
- カスタムテーマ作成支援
- 色設定エクスポート・インポート
- 自動色調整（背景色検出等）

## 🎨 色設定のベストプラクティス

### 視認性の確保
- **高コントラスト**: 背景色との明確な区別
- **色覚多様性対応**: 色だけでなく明度でも区別
- **読みやすさ**: 長時間見続けても疲れない色選択

### 意味的な色使い
- **create**: 緑系（成長・追加の意味）
- **delete**: 赤系（警告・削除の意味）
- **modify**: 黄系（変更・注意の意味）
- **move**: 青・シアン系（移動の意味）
- **find**: 青系（検索・発見の意味）

### テーマ設計指針
- **一貫性**: 同じ要素は常に同じ色
- **階層性**: 重要度に応じた色の強弱
- **環境適応**: ターミナル背景色との調和

## 🎯 成功指標

1. **カスタマイズ性**: 全表示要素の色変更可能
2. **使いやすさ**: プリセットで即座に適用可能
3. **視認性**: 様々な環境での適切な表示
4. **統合性**: 既存機能（FUNC-020等）との完全統合

---

**この色カスタマイズ機能により、cctopは個人の好み・環境・チームに最適化された視覚体験を提供します。**
# FUNC-107: CLI設定管理機能

**作成日**: 2025年6月30日  
**更新日**: 2025年6月30日  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-101, FUNC-200-207, FUNC-400-403

## 📊 機能概要

CLIプロセス専用の設定管理機能。画面表示、レンダリング、インタラクティブ操作に関する設定を管理する。

**ユーザー価値**: 

- 表示のカスタマイズ
- 色テーマの設定
- インタラクティブ操作の調整
- ユーザー体験の最適化

## 🎯 機能境界

### ✅ **実行する**

- CLI専用設定ファイルの読み込み
- 表示パラメータの管理
- 色・テーマ設定の管理
- インタラクティブ機能の設定
- ユーザープリファレンスの管理

### ❌ **実行しない**

- Daemon監視設定（FUNC-106の責務）
- 共通設定管理（FUNC-101の責務）
- 設定ファイルの初期化（FUNC-105の責務）

## 📋 必要な仕様

### **cli-config.jsonスキーマ定義**

```json
{
  "version": "0.3.0.0",
  "display": {
    "maxEvents": 20,               // 最大表示イベント数
    "refreshRateMs": 100,          // 画面更新間隔
    "dateFormat": "YYYY-MM-DD HH:mm:ss", // 日時表示形式
    "columns": {                   // カラム表示設定
      "timestamp": { "width": 19, "visible": true },
      "elapsed": { "width": 9, "visible": true },
      "fileName": { "width": 35, "visible": true },
      "event": { "width": 8, "visible": true },
      "lines": { "width": 6, "visible": true },
      "blocks": { "width": 8, "visible": true },
      "directory": { "width": "auto", "visible": true }
    },
    "directoryMutePaths": [        // ディレクトリ表示時に省略するベースパス
      // 例: "/Users/takuo-h/Workspace/Code/06-cctop/"
    ]
  },
  "colors": {                      // イベントタイプ別色設定
    "find": "cyan",
    "create": "green",
    "modify": "yellow",
    "move": "blue",
    "delete": "red",
    "restore": "magenta",
    "error": "red",
    "warning": "yellow",
    "info": "white"
  },
  "interactive": {                 // インタラクティブ機能
    "keyRepeatDelay": 500,         // キーリピート開始遅延（ms）
    "keyRepeatInterval": 100,      // キーリピート間隔（ms）
    "selectionHighlight": "inverse", // 選択時のハイライト方式
    "detailViewPosition": "bottom"   // 詳細表示位置
  },
  "locale": {                      // ローカライズ設定
    "language": "en",              // 表示言語
    "timezone": "system"           // タイムゾーン
  }
}
```

### **設定ファイル配置**

```
.cctop/
├── daemon-config.json    # Daemon専用設定（FUNC-106）
├── cli-config.json       # CLI専用設定
└── shared-config.json    # 共通設定（FUNC-101）
```

### **CLI起動時の設定読み込み順序**

1. shared-config.json（共通設定）
2. cli-config.json（CLI専用設定）
3. ユーザーホームの.cctoprc（個人設定）
4. コマンドライン引数（オーバーライド）

## 🔗 関連機能との連携

### **FUNC-200-207: Display Functions**

- 表示パラメータの提供
- カラム設定の管理
- 色テーマの適用

### **FUNC-400-403: Interactive Functions**

- インタラクティブ設定の提供
- キー操作パラメータの管理

### **FUNC-101: 共通設定管理**

- 共通設定（DBパス等）の継承
- 設定マージロジックの共有

## 🎯 機能要件

### **ユーザープリファレンス**

1. 個人設定ファイル（~/.cctoprc）のサポート
2. テーマプリセット機能
3. 設定のエクスポート・インポート

### **動的設定変更**

- 実行中の設定変更（色、カラム幅等）
- 変更の即時反映
- 設定の永続化オプション

### **設定検証要件**

1. 色値の妥当性確認
2. 数値パラメータの範囲チェック
3. カラム幅の合計確認

## 📊 期待効果

### **ユーザー体験向上**

- 個人の好みに合わせた表示
- 作業環境に最適化された設定
- 直感的な操作性

### **保守性向上**

- CLI専用設定の独立管理
- Daemon/CLI独立進化の実現
- 設定競合の排除

---

**核心価値**: CLIの表示・操作を最適化する専用設定管理により、優れたユーザー体験を提供
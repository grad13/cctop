# FUNC-106: Daemon設定管理機能

**作成日**: 2025年6月30日  
**更新日**: 2025年6月30日  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-101, FUNC-003, FUNC-001, FUNC-002

## 📊 機能概要

Daemonプロセス専用の設定管理機能。ファイル監視、イベント処理、データベース書き込みに関する設定を管理する。

**ユーザー価値**: 
- Daemon動作の柔軟な制御
- 監視対象・除外パターンの設定
- パフォーマンスチューニング
- システムリソース管理

## 🎯 機能境界

### ✅ **実行する**
- Daemon専用設定ファイルの読み込み
- 監視パラメータの管理
- イベント処理設定の管理
- データベース書き込み設定
- システムリソース制限の管理

### ❌ **実行しない**
- CLI表示設定（FUNC-107の責務）
- 共通設定管理（FUNC-101の責務）
- 設定ファイルの初期化（FUNC-105の責務）

## 📋 必要な仕様

### **daemon-config.jsonスキーマ定義**

```json
{
  "version": "0.3.0.0",
  "monitoring": {
    "watchPaths": [],              // 監視対象パス（複数指定可）
    "excludePatterns": [           // 除外パターン
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",                     // 全隠しファイル
      "**/.cctop/**"
    ],
    "debounceMs": 100,             // イベントデバウンス時間
    "maxDepth": 10,                // 最大監視深度
    "moveThresholdMs": 100,        // moveイベント判定時間
    "systemLimits": {              // ファイル監視上限管理
      "requiredLimit": 524288,     // 必要な上限値
      "checkOnStartup": true,      // 起動時上限チェック
      "warnIfInsufficient": true   // 不足時警告表示
    }
  },
  "daemon": {
    "pidFile": ".cctop/daemon.pid",   // PIDファイルパス
    "logFile": ".cctop/logs/daemon.log", // ログファイルパス
    "logLevel": "info",               // ログレベル
    "heartbeatInterval": 30000,       // ハートビート間隔（ms）
    "autoStart": true                 // CLI起動時の自動起動
  },
  "database": {
    "writeMode": "WAL",               // SQLite書き込みモード
    "syncMode": "NORMAL",             // 同期モード
    "cacheSize": 65536,               // キャッシュサイズ（KB）
    "busyTimeout": 5000               // ビジータイムアウト（ms）
  }
}
```

### **設定ファイル配置**

```
.cctop/
├── daemon-config.json    # Daemon専用設定
├── cli-config.json       # CLI専用設定（FUNC-107）
└── shared-config.json    # 共通設定（FUNC-101）
```

### **Daemon起動時の設定読み込み順序**

1. shared-config.json（共通設定）
2. daemon-config.json（Daemon専用設定）
3. コマンドライン引数（オーバーライド）

## 🔗 関連機能との連携

### **FUNC-003: Background Activity Daemon**
- Daemon起動・停止制御の設定提供
- PIDファイル・ログファイルパスの管理

### **FUNC-001/002: File Monitoring**
- 監視パラメータ（debounce、threshold等）の提供
- 除外パターンの管理

### **FUNC-101: 共通設定管理**
- 共通設定（DBパス等）の継承
- 設定マージロジックの共有

## 🎯 機能要件

### **設定検証要件**
1. 監視パスの存在確認
2. 除外パターンの妥当性検証
3. 数値パラメータの範囲チェック
4. システムリソース制限の確認

### **動的再読み込み**
- SIGHUPシグナルでの設定再読み込み
- 監視継続しながらの設定更新
- 変更通知機能

## 📊 期待効果

### **運用効率向上**
- Daemon専用設定の独立管理
- パフォーマンスチューニングの容易化
- トラブルシューティングの効率化

### **保守性向上**
- 設定の責務分離
- Daemon/CLI独立進化の実現
- 設定競合の排除

---

**核心価値**: Daemonプロセスの動作を最適化する専用設定管理により、安定した継続監視を実現
# FUNC-102: ファイル監視上限管理機能

**作成日**: 2025年6月25日 10:00  
**更新日**: 2025年6月26日 00:00  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-101, FUNC-104  

## 📊 機能概要

OS固有のファイル監視上限（Linux: inotify、macOS: ファイルディスクリプタ）をconfig.jsonで設定・管理する機能。

**ユーザー価値**: 大規模プロジェクト監視時のシステム制限エラー防止（Linux: ENOSPC、macOS: EMFILE）・環境固有の最適化・自動設定適用

## 🎯 機能境界

### ✅ **実行する**
- config.jsonでの監視上限値設定
- システム上限値の現在値確認（OS別）
- 設定値と実際の上限のチェック・警告
- OS別の推奨設定値の提案

### ❌ **実行しない**
- システム設定の自動変更（sudo権限不要を維持）
- 他のファイル監視設定（chokidar固有設定等）

## 📋 必要な仕様

### **config.jsonスキーマ拡張**

FUNC-101（階層的設定管理）のconfig.jsonに以下を追加：

```json
"monitoring": {
  // 既存の設定...
  "systemLimits": {
    "requiredLimit": 524288,             // 必要な上限値（OS共通）
    "checkOnStartup": true,              // 起動時上限チェック
    "warnIfInsufficient": true           // 不足時警告表示
  }
}
```

### **実装要件（BP-000準拠）**

#### **1. 起動時チェック機能**
- `/proc/sys/fs/inotify/max_user_watches`読み取り
- `config.systemLimits.requiredLimit`と比較
- 不足時の警告メッセージ表示

#### **2. 設定確認コマンド（拡張）**
```bash
cctop --check-limits
# 出力例 (Linux):
# Current inotify limit: 8192
# Required limit: 524288
# Status: INSUFFICIENT
# 
# To fix, run:
# echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
# sudo sysctl --system

# 出力例 (macOS):
# Current file descriptor limit: 256
# Required limit: 8192
# Status: INSUFFICIENT
# 
# To fix, run:
# ulimit -n 8192
# Or add to your shell profile for permanent change
```

#### **3. 警告メッセージ設計**
```
⚠️  WARNING: inotify limit may be insufficient
   Current: 8192 watches
   Required: 524288 watches (configured in .cctop/config.json)
   
   Large projects may encounter "ENOSPC" errors.
   To increase limit permanently:
   
   echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
   sudo sysctl --system
   
   Suppress this warning: set monitoring.systemLimits.warnIfInsufficient to false
```

### **実装方式（実装コード準拠）**

#### **1. 既存ConfigManagerクラス拡張**
- `checkInotifyLimits()` メソッド追加
- 起動時自動チェック統合
- 設定値バリデーション拡張

#### **2. プラットフォーム判定**
- Linux: `/proc/sys/fs/inotify/max_user_watches`確認
- macOS: チェックスキップ（FSEvents使用のため制限なし）
- Windows: チェックスキップ（対象外）

#### **3. エラーハンドリング**
- `/proc/sys/fs/inotify/max_user_watches`読み取り失敗時の適切な処理
- 権限不足・ファイル不存在の場合の静的対応

## 🔧 実装ガイドライン

### **1. 基本実装方針**
- `/proc/sys/fs/inotify/max_user_watches`の読み取り
- Linux環境でのみチェック実行（macOS/Windowsはスキップ）
- 読み取り失敗時は静かに処理（エラー表示なし）

### **2. 統合ポイント**

**View仕様統合**: `--check-limits`オプションの詳細は **[FUNC-104: Viewインターフェース統合仕様](./FUNC-104-view-interface-specification.md)** を参照

- 既存ConfigManagerクラスに`checkSystemLimits()`メソッド追加
- 起動時の自動チェック統合
- `--check-limits`コマンドラインオプション追加

## 🧪 テスト要件

- プラットフォーム判定の正確性
- 設定値の検証ロジック
- 警告メッセージの適切な表示
- Linux環境での実動作確認

## 💡 実装計画

### **v0.2.0.0での実装範囲**
- 基本的なチェック機能・警告表示
- config.json設定統合
- コマンドラインオプション

## 🎯 成功指標

1. **エラー防止**: 
   - Linux: "ENOSPC"エラー発生前警告
   - macOS: "too many open files"エラー発生前警告
2. **使いやすさ**: 設定方法の明確な提示・実行しやすいコマンド提供
3. **非破壊性**: sudo権限不要・既存設定への影響なし
4. **クロスプラットフォーム**: 各OSに応じた適切なチェック

---

**このFunc仕様は、OS固有のファイル監視制限問題を解決し、cctopの大規模プロジェクト対応能力を向上させる重要な機能です。**
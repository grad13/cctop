# FUNC-019: inotify上限管理機能

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**カテゴリ**: System Configuration  
**Phase**: 2 (中優先機能)  
**ステータス**: Draft

## 📊 機能概要

Linux環境でのinotify.max_user_watches上限を~/.cctop/config.jsonで設定・管理する機能。

**ユーザー価値**: 大規模プロジェクト監視の「ENOSPC: System limit for number of file watchers reached」エラー防止・環境固有の最適化・自動設定適用

## 🎯 機能境界

### ✅ **実行する**
- config.jsonでのinotify上限値設定
- システム上限値の現在値確認
- 設定値と実際の上限のチェック・警告
- 推奨設定値の提案

### ❌ **実行しない**
- システム設定の自動変更（sudo権限不要を維持）
- 他のファイル監視設定（chokidar固有設定等）

## 📋 必要な仕様

### **config.jsonスキーマ拡張**

```json
{
  "version": "0.1.0",
  "monitoring": {
    "watchPaths": [],
    "excludePatterns": [...],
    "inotify": {
      "requiredMaxUserWatches": 524288,    // 必要な上限値
      "checkOnStartup": true,              // 起動時上限チェック
      "warnIfInsufficient": true,          // 不足時警告表示
      "recommendedValue": 524288           // 推奨値（表示用）
    }
  },
  "database": {...},
  "display": {...}
}
```

### **実装要件（BP-000準拠）**

#### **1. 起動時チェック機能**
- `/proc/sys/fs/inotify/max_user_watches`読み取り
- `config.inotify.requiredMaxUserWatches`と比較
- 不足時の警告メッセージ表示

#### **2. 設定確認コマンド（拡張）**
```bash
cctop --check-inotify
# 出力例:
# Current inotify limit: 8192
# Required limit: 524288
# Status: INSUFFICIENT
# 
# To fix, run:
# echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
# sudo sysctl --system
```

#### **3. 警告メッセージ設計**
```
⚠️  WARNING: inotify limit may be insufficient
   Current: 8192 watches
   Required: 524288 watches (configured in ~/.cctop/config.json)
   
   Large projects may encounter "ENOSPC" errors.
   To increase limit permanently:
   
   echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
   sudo sysctl --system
   
   Suppress this warning: set monitoring.inotify.warnIfInsufficient to false
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

## 🔧 技術的実装詳細

### **1. ファイル読み取り実装**
```javascript
// 実装例（実際のコード構造に準拠）
const fs = require('fs');
const path = require('path');

class InotifyChecker {
  static async getCurrentLimit() {
    try {
      if (process.platform !== 'linux') {
        return null; // Linux以外はチェック不要
      }
      
      const limitPath = '/proc/sys/fs/inotify/max_user_watches';
      const content = await fs.promises.readFile(limitPath, 'utf8');
      return parseInt(content.trim(), 10);
    } catch (error) {
      return null; // 読み取り失敗は静的に処理
    }
  }
  
  static checkLimitSufficiency(current, required) {
    if (current === null) return { status: 'unknown', canCheck: false };
    if (current >= required) return { status: 'sufficient', canCheck: true };
    return { status: 'insufficient', canCheck: true, shortage: required - current };
  }
}
```

### **2. config.json統合実装**
- 既存の設定読み込み処理に`inotify`セクション追加
- デフォルト値: `requiredMaxUserWatches: 524288`
- バリデーション: 正の整数値チェック

### **3. CLI統合実装**
- `--check-inotify`オプション追加
- 起動時自動チェック（`checkOnStartup: true`時）
- 警告抑制オプション対応

## 🧪 テスト要件

### **単体テスト**
- `InotifyChecker.getCurrentLimit()`の各プラットフォーム動作
- 設定値パース・バリデーション
- 警告メッセージ生成ロジック

### **統合テスト**
- config.json読み込み→inotify設定取得→チェック実行
- 各警告条件での適切なメッセージ表示
- プラットフォーム別の動作確認

### **実環境テスト**
- Linux環境での実際の上限値確認
- 大規模ディレクトリでの監視開始→エラー再現→設定後解決確認

## 💡 実装優先度

### **v0.1.0.0 (Phase 2)**
- 基本的なチェック機能・警告表示
- config.json設定統合

### **v0.2.0.0 (将来拡張)**
- より詳細なシステム情報表示
- 自動設定提案・ベストプラクティス表示

## 🎯 成功指標

1. **エラー防止**: 大規模プロジェクトでの"ENOSPC"エラー発生前警告
2. **使いやすさ**: 設定方法の明確な提示・実行しやすいコマンド提供
3. **非破壊性**: sudo権限不要・既存設定への影響なし
4. **クロスプラットフォーム**: Linux以外での適切なスキップ動作

---

**このFunc仕様は、実際のinotify制限問題を解決し、cctopの大規模プロジェクト対応能力を向上させる重要な機能です。**
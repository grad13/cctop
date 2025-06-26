# Builder Handoff: inotify上限管理機能実装

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**対象**: Builder Agent  
**機能**: FUNC-019 inotify上限管理機能  
**優先度**: 高（Phase 2）

## 📋 作業概要

Linux環境でのinotify.max_user_watches上限をconfig.jsonで設定・管理する機能の実装。

**目標**: 大規模プロジェクト監視時の「ENOSPC: System limit for number of file watchers reached」エラーを事前に防ぐ仕組みの構築。

## 🎯 実装要件

### **1. config.jsonスキーマ拡張**

#### **実装場所**: 既存のconfig.json処理（ConfigManager）

#### **追加スキーマ**:
```json
{
  "monitoring": {
    "inotify": {
      "requiredMaxUserWatches": 524288,
      "checkOnStartup": true,
      "warnIfInsufficient": true,
      "recommendedValue": 524288
    }
  }
}
```

#### **実装手順**:
1. 既存ConfigManagerクラスでinotifyセクション読み込み対応
2. スキーマバリデーション追加（正の整数値チェック）
3. デフォルト値設定（requiredMaxUserWatches: 524288）

### **2. inotify上限チェッククラス実装**

#### **実装場所**: `src/system/` 新規 または 既存のsystem関連モジュール

#### **実装内容**:
```javascript
class InotifyChecker {
  // Linux環境での現在上限値取得
  static async getCurrentLimit()
  
  // 設定値と現在値の比較・不足判定
  static checkLimitSufficiency(current, required)
  
  // 警告メッセージ生成
  static generateWarningMessage(current, required)
  
  // プラットフォーム判定（Linux以外はスキップ）
  static shouldCheckLimits()
}
```

#### **技術要件**:
- `/proc/sys/fs/inotify/max_user_watches`の安全な読み取り
- 権限不足・ファイル不存在時の適切なエラーハンドリング
- macOS/Windows環境での適切なスキップ処理

### **3. 起動時自動チェック機能**

#### **統合場所**: メインの起動処理（cctop起動時）

#### **実装手順**:
1. config.json読み込み後にinotifyチェック実行
2. `checkOnStartup: true`時のみチェック実行
3. 不足時の警告メッセージ表示
4. 監視開始前の事前チェック

### **4. CLI拡張（--check-inotifyオプション）**

#### **実装内容**:
```bash
cctop --check-inotify
```

#### **出力例**:
```
Current inotify limit: 8192
Required limit: 524288 (configured)
Status: INSUFFICIENT

To increase limit permanently:
echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
sudo sysctl --system
```

## 🔧 具体的実装ガイド

### **Phase 1: 基本チェック機能**

#### **1. InotifyCheckerクラス実装**
```javascript
const fs = require('fs').promises;

class InotifyChecker {
  static async getCurrentLimit() {
    if (process.platform !== 'linux') return null;
    
    try {
      const content = await fs.readFile('/proc/sys/fs/inotify/max_user_watches', 'utf8');
      return parseInt(content.trim(), 10);
    } catch (error) {
      return null; // 読み取り失敗は静的処理
    }
  }
  
  static checkLimitSufficiency(current, required) {
    if (current === null) return { status: 'unknown', canCheck: false };
    if (current >= required) return { status: 'sufficient', canCheck: true };
    return { 
      status: 'insufficient', 
      canCheck: true, 
      shortage: required - current 
    };
  }
}
```

#### **2. ConfigManager統合**
- 既存config.json読み込み処理にinotifyセクション追加
- `getInotifyConfig()`メソッド追加
- バリデーション処理統合

#### **3. 起動時チェック統合**
- メイン起動処理でのチェック呼び出し
- 警告メッセージの適切なタイミングでの表示

### **Phase 2: CLI拡張**

#### **4. --check-inotifyオプション追加**
- 既存CLI引数パーサーに新オプション追加
- 詳細なシステム情報表示機能

## 🧪 テスト要件

### **単体テスト**
- [ ] `InotifyChecker.getCurrentLimit()`の各プラットフォーム動作
- [ ] config.json読み込み・inotifyセクション解析
- [ ] 警告メッセージ生成ロジック
- [ ] プラットフォーム判定ロジック

### **統合テスト**
- [ ] 起動時自動チェック動作
- [ ] --check-inotifyオプション動作
- [ ] config.json設定変更→チェック結果変化確認

### **実環境テスト**
- [ ] Linux環境での実際の上限値確認
- [ ] macOS環境でのスキップ動作確認
- [ ] 大規模ディレクトリでの実際のエラー→警告確認

## 📁 影響するファイル

### **変更対象**
- `src/config/ConfigManager.js` (または既存config処理)
- `src/system/InotifyChecker.js` (新規)
- `src/cli/` (CLI引数処理)
- メインエントリーポイント (起動時チェック統合)

### **テストファイル**
- `test/system/InotifyChecker.test.js` (新規)
- `test/config/ConfigManager.test.js` (拡張)

## ⚠️ 重要な注意事項

### **実装上の制約**
1. **sudo権限不要**: システム設定変更は行わない（読み取りのみ）
2. **非破壊的**: 既存設定・動作への影響なし
3. **graceful failure**: チェック失敗時も正常に動作継続

### **クロスプラットフォーム対応**
- Linux: 完全なチェック機能
- macOS: チェックスキップ（FSEvents使用のため制限なし）
- Windows: チェックスキップ

## 🎯 完了条件

- [ ] FUNC-019仕様の完全実装
- [ ] 全テストケースのパス
- [ ] Linux環境での実動作確認
- [ ] macOS環境でのスキップ動作確認
- [ ] config.json設定→起動時チェック→警告表示の全体動作確認

---

**このHandoffは、実際のinotify制限問題を解決し、cctopの大規模プロジェクト対応能力を大幅に向上させる重要な機能です。**
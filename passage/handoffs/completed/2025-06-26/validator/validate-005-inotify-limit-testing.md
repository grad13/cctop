# Validator Handoff: inotify上限管理機能テスト

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**対象**: Validator Agent  
**機能**: FUNC-019 inotify上限管理機能  
**優先度**: 高（Phase 2）

## 📋 テスト概要

Linux環境でのinotify.max_user_watches上限管理機能の包括的テスト実施。

**目標**: config.json設定・起動時チェック・CLI拡張・警告表示の全機能が正常動作することを確認。

## 🎯 テスト要件

### **1. 単体テスト**

#### **InotifyCheckerクラステスト**

**テスト対象**: `src/system/InotifyChecker.js`

**テストケース**:
```javascript
describe('InotifyChecker', () => {
  describe('getCurrentLimit', () => {
    test('Linux環境で正常な値を取得', async () => {
      // /proc/sys/fs/inotify/max_user_watches読み取り成功
    });
    
    test('Linux環境でファイル読み取り失敗時null返却', async () => {
      // 権限不足・ファイル不存在時の処理
    });
    
    test('非Linux環境でnull返却', async () => {
      // macOS/Windows環境での適切なスキップ
    });
  });
  
  describe('checkLimitSufficiency', () => {
    test('十分な上限値での sufficient 判定', () => {
      // current >= required の場合
    });
    
    test('不足時の insufficient 判定', () => {
      // current < required の場合
    });
    
    test('チェック不可時の unknown 判定', () => {
      // current === null の場合
    });
  });
});
```

#### **ConfigManager統合テスト**

**テスト対象**: config.json読み込み・inotifyセクション処理

**テストケース**:
```javascript
describe('ConfigManager inotify integration', () => {
  test('正常なinotify設定の読み込み', () => {
    const config = {
      monitoring: {
        inotify: {
          requiredMaxUserWatches: 524288,
          checkOnStartup: true
        }
      }
    };
    // 設定値の正常取得確認
  });
  
  test('inotify設定不在時のデフォルト値適用', () => {
    // デフォルト値: requiredMaxUserWatches: 524288
  });
  
  test('不正な設定値でのバリデーションエラー', () => {
    // 負の値・文字列・null等での適切なエラー処理
  });
});
```

### **2. 統合テスト**

#### **起動時自動チェック機能**

**テスト対象**: cctop起動→設定読み込み→inotifyチェック→警告表示

**テストケース**:
```javascript
describe('Startup inotify check integration', () => {
  test('checkOnStartup=true時の自動チェック実行', async () => {
    // 起動時の自動チェック動作確認
  });
  
  test('checkOnStartup=false時のチェックスキップ', async () => {
    // 設定無効時のスキップ動作確認
  });
  
  test('上限不足時の警告メッセージ表示', async () => {
    // 実際の警告メッセージ出力確認
  });
  
  test('上限十分時の警告なし動作', async () => {
    // 問題なし時の正常動作確認
  });
});
```

#### **CLI拡張テスト**

**テスト対象**: `cctop --check-inotify` オプション

**テストケース**:
```javascript
describe('CLI --check-inotify option', () => {
  test('現在の上限値表示', async () => {
    // 実際のシステム値の表示確認
  });
  
  test('設定値との比較結果表示', async () => {
    // sufficient/insufficient判定結果の表示
  });
  
  test('推奨設定コマンド表示', async () => {
    // sysctl設定コマンドの適切な表示
  });
});
```

### **3. 実環境テスト**

#### **Linux環境テスト**

**実行環境**: Ubuntu/CentOS/Debian等のLinux環境

**テストシナリオ**:
1. **低い上限値での動作確認**
   ```bash
   # 一時的に上限を下げる
   sudo sysctl fs.inotify.max_user_watches=1024
   
   # cctop起動→警告表示確認
   cctop --check-inotify
   ```

2. **上限引き上げ後の動作確認**
   ```bash
   # 上限を引き上げる
   sudo sysctl fs.inotify.max_user_watches=524288
   
   # cctop起動→警告なし確認
   cctop
   ```

3. **大規模ディレクトリでの実際のエラー再現**
   ```bash
   # 大量ファイルの監視でENOSPCエラー再現
   # → 事前警告での防止確認
   ```

#### **macOS環境テスト**

**テストシナリオ**:
1. **チェック機能のスキップ動作**
   ```bash
   # macOSでcctop起動→inotifyチェックスキップ確認
   cctop --check-inotify
   # 出力: "inotify checks are not applicable on macOS"
   ```

2. **FSEvents使用での正常動作**
   ```bash
   # 大規模ディレクトリ監視→制限なし動作確認
   ```

### **4. エラーケーステスト**

#### **権限・ファイルアクセスエラー**

**テストケース**:
```javascript
describe('Error handling', () => {
  test('/proc読み取り権限不足時の適切な処理', async () => {
    // 権限不足でもcctop動作継続確認
  });
  
  test('config.json不正設定時の適切なフォールバック', () => {
    // 設定エラー時のデフォルト値使用確認
  });
  
  test('システム情報取得失敗時の graceful degradation', async () => {
    // 情報取得失敗でも機能継続確認
  });
});
```

## 🔧 テスト実行手順

### **Phase 1: 基本機能テスト**

#### **1. ユニットテスト実行**
```bash
# InotifyChecker単体テスト
npm test -- --testPathPattern=InotifyChecker

# ConfigManager統合テスト
npm test -- --testPathPattern=ConfigManager.*inotify
```

#### **2. 実環境での基本動作確認**
```bash
# 現在の上限値確認
cat /proc/sys/fs/inotify/max_user_watches

# cctopでのチェック機能確認
cctop --check-inotify

# config.json設定確認
cat ~/.cctop/config.json
```

### **Phase 2: 統合テスト**

#### **3. 起動時チェック動作確認**
```bash
# config.json設定変更
# monitoring.inotify.checkOnStartup: true

# cctop起動→警告表示確認
cctop

# 設定無効化→警告なし確認
# monitoring.inotify.checkOnStartup: false
cctop
```

#### **4. 実際のエラーシナリオテスト**
```bash
# 上限を一時的に下げる
sudo sysctl fs.inotify.max_user_watches=1024

# 大規模ディレクトリ監視→警告確認
cctop /path/to/large/project

# 上限復旧→正常動作確認
sudo sysctl fs.inotify.max_user_watches=524288
```

## 📊 期待される結果

### **正常動作パターン**

#### **1. 十分な上限値時**
```
$ cctop --check-inotify
Current inotify limit: 524288
Required limit: 524288 (configured)
Status: SUFFICIENT
✓ Your system is properly configured for large-scale file monitoring.
```

#### **2. 不足時の警告**
```
⚠️  WARNING: inotify limit may be insufficient
   Current: 8192 watches
   Required: 524288 watches (configured)
   
   Large projects may encounter "ENOSPC" errors.
   To increase limit permanently:
   
   echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
   sudo sysctl --system
```

#### **3. macOSでのスキップ**
```
$ cctop --check-inotify
inotify limit checks are not applicable on macOS (using FSEvents).
Your system supports unlimited file watching.
```

### **エラーハンドリング**

#### **4. システム情報取得失敗**
```
$ cctop --check-inotify
Unable to determine current inotify limits.
If you encounter file watching errors, consider increasing the limit manually.
```

## ⚠️ テスト時の注意事項

### **システム設定変更**
- テスト時のsysctl変更は一時的なもの（再起動で復旧）
- 永続的変更は/etc/sysctl.d/への影響考慮
- テスト終了後の設定復旧確認

### **権限管理**
- sudo権限が必要なテストの事前確認
- 権限不足時のgraceful failureテスト重要性
- 非破壊的テストの徹底

## 🎯 テスト完了条件

- [ ] 全ユニットテストのパス（100%カバレッジ）
- [ ] Linux環境での実動作確認
- [ ] macOS環境でのスキップ動作確認
- [ ] 実際のENOSPCエラーシナリオでの事前警告確認
- [ ] config.json設定変更→動作変化の確認
- [ ] CLI --check-inotifyオプションの完全動作確認
- [ ] エラーケース・エッジケースでの適切な処理確認

---

**このテスト計画により、inotify上限管理機能の品質・信頼性・実用性を完全に保証します。**
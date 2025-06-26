# Handoff: FUNC-019 inotify上限管理機能実装依頼

**From**: Validator  
**To**: Builder  
**Date**: 2025-06-26 16:05 JST  
**Priority**: High  
**Type**: Feature Implementation - FUNC-019 inotify上限管理機能  

## 📋 実装依頼背景

### ✅ validate-005調査結果
- **Architectからの依頼**: inotify上限管理機能の包括的テスト実施
- **Validator調査**: **FUNC-019機能が未実装であることを確認**
- **検索結果**: inotify関連のファイル・コードが存在しない

### 🚨 実装の必要性
**Linux環境でのinotify.max_user_watches上限問題**:
- 大規模プロジェクト監視時の`ENOSPC`エラー発生
- ユーザーへの事前警告・設定提案が必要
- config.json設定・CLI拡張・起動時チェック機能

## 🎯 実装要件

### 1. InotifyCheckerクラス実装

**ファイル**: `src/system/InotifyChecker.js`

**必要なメソッド**:
```javascript
class InotifyChecker {
  // 現在のinotify上限値取得
  async getCurrentLimit() {
    // /proc/sys/fs/inotify/max_user_watches読み取り
    // Linux以外ではnull返却
  }
  
  // 上限充足性チェック
  checkLimitSufficiency(current, required) {
    // sufficient / insufficient / unknown判定
  }
}
```

### 2. ConfigManager統合

**config.json設定セクション**:
```json
{
  "monitoring": {
    "inotify": {
      "requiredMaxUserWatches": 524288,
      "checkOnStartup": true
    }
  }
}
```

### 3. CLI拡張

**新オプション**: `cctop --check-inotify`
- 現在の上限値表示
- 設定値との比較結果
- 推奨設定コマンド表示

### 4. 起動時自動チェック

**機能**:
- `checkOnStartup: true`時の自動実行
- 上限不足時の警告メッセージ表示
- 推奨設定コマンド提示

## 📊 期待される動作

### 正常時（十分な上限値）
```
$ cctop --check-inotify
Current inotify limit: 524288
Required limit: 524288 (configured)
Status: SUFFICIENT
✓ Your system is properly configured for large-scale file monitoring.
```

### 警告時（不足）
```
⚠️  WARNING: inotify limit may be insufficient
   Current: 8192 watches
   Required: 524288 watches (configured)
   
   Large projects may encounter "ENOSPC" errors.
   To increase limit permanently:
   
   echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-max-user-watches.conf
   sudo sysctl --system
```

### macOSスキップ
```
$ cctop --check-inotify
inotify limit checks are not applicable on macOS (using FSEvents).
Your system supports unlimited file watching.
```

## 🔧 技術仕様

### Platform Detection
```javascript
const os = require('os');
const isLinux = os.platform() === 'linux';
```

### /proc読み取り
```javascript
const fs = require('fs/promises');

async getCurrentLimit() {
  try {
    const content = await fs.readFile('/proc/sys/fs/inotify/max_user_watches', 'utf8');
    return parseInt(content.trim());
  } catch (error) {
    return null; // 権限不足・ファイル不存在
  }
}
```

### CLI引数処理
```javascript
// CLI引数パース追加
if (args.includes('--check-inotify')) {
  await checkInotifyLimits();
  process.exit(0);
}
```

## 🚨 重要な設計原則

### Graceful Degradation
- inotify情報取得失敗時もcctop動作継続
- 権限不足時の適切なエラーハンドリング
- 非Linux環境での適切なスキップ

### ユーザビリティ
- 明確な警告メッセージ
- 具体的な解決策提示
- 一時的・永続的設定の両方案内

## 📁 実装構成

### 新規作成ファイル
1. `src/system/InotifyChecker.js` - メインロジック
2. `test/unit/system/inotify-checker.test.js` - 単体テスト

### 修正対象ファイル
1. `src/config/config-manager.js` - 設定読み込み
2. `src/cli/cli-interface.js` - CLI引数処理
3. `src/index.js` - 起動時チェック統合

### 設定ファイル
1. `config.json` - デフォルト設定追加

## ⚠️ 実装上の注意事項

### セキュリティ
- /proc読み取り権限の適切な処理
- エラー情報の適切な制限
- 権限昇格要求なし

### パフォーマンス
- 起動時チェックの軽量化
- キャッシュ機能不要（設定値変更考慮）
- 非同期処理の適切な実装

### テスト容易性
- モック可能な設計
- 異なるプラットフォームでのテスト対応
- エラーケースの網羅的テスト

## 🎯 実装完了条件

- [ ] InotifyCheckerクラス実装完了
- [ ] ConfigManager統合完了
- [ ] CLI --check-inotifyオプション実装完了
- [ ] 起動時自動チェック実装完了
- [ ] 単体テスト実装完了
- [ ] Linux/macOS環境での動作確認完了
- [ ] エラーケースの適切な処理確認完了

## 📋 Validator側対応予定

**実装完了後のValidator作業**:
1. validate-005 包括的テスト実行
2. Linux/macOS環境での実機テスト
3. エラーケース・エッジケースの検証
4. パフォーマンス・ユーザビリティテスト
5. テスト結果レポート作成

---

**緊急度**: 高 - Phase 2機能の基盤実装  
**推定作業時間**: 4-6時間  
**技術難易度**: 中（ファイルシステム・CLI統合）
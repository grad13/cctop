# Improvement: テスト実行時のエラー出力クリーンアップ

**ID**: improvement-001-test-output-cleanup  
**From**: Validator Agent (自己提案)  
**To**: Validator Agent  
**Priority**: Medium  
**Type**: Quality Improvement  
**Created**: 2025-06-25  

## 📋 問題の概要

BP-000テストスイート実行時に、想定内動作でありながら大量のエラーメッセージが出力される問題。

### 具体例
```
stderr | test/integration/chokidar-db/config-validation.test.js
エラー: 設定ファイルが見つかりません: /var/folders/.../config.json
```

## 🎯 改善提案

### 1. テスト環境でのエラー出力抑制

**対象箇所**: `src/config/config-manager.js`
```javascript
// 現在
console.error(`\nエラー: 設定ファイルが見つかりません: ${this.configPath}`);

// 改善案
if (this.interactive || process.env.CCTOP_VERBOSE) {
  this.cliInterface.error(`エラー: 設定ファイルが見つかりません: ${this.configPath}`);
}
```

### 2. 適用範囲
- 設定ファイル不在エラー
- JSON構文エラー  
- 設定検証エラー
- その他の想定内エラー

## 📊 期待効果

1. **テスト出力のクリーン化** - 本物のエラーが見つけやすくなる
2. **CI/CD環境の安定性向上** - 誤検知の削減
3. **開発者体験の向上** - デバッグ効率化

## 💡 実装方針

1. **CLIInterface活用** - エラー出力を一元管理
2. **ログレベル制御** - verbose/quiet/normalモード実装
3. **テスト専用設定** - テスト時の出力制御

## 🔧 技術詳細

### 影響範囲
- ConfigManager: 約10箇所のconsole.error
- DatabaseManager: 初期化時のログ
- FileMonitor: スキャン完了メッセージ

### テスト要件
- 既存テストが全て成功を維持
- 実際のエラーは適切に出力される
- verboseモードでは全出力が確認可能

## 📝 Notes

- ユーザーからの指摘により発覚
- 現在はクリティカルな問題（Delete操作等）を優先
- 品質向上フェーズで実施予定

---

**Status**: Pending  
**Next Action**: クリティカル問題解決後に実施
# FUNC-103: postinstall自動初期化機能

**作成日**: 2025年6月24日 10:00  
**更新日**: 2025年6月26日 02:00  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0  

## 📊 機能概要

npm install時に~/.cctopディレクトリとデフォルト設定ファイルを自動作成する。

**ユーザー価値**: インストール後すぐに使える状態を提供

## 🎯 機能境界

### ✅ **実行する**
- ~/.cctop or .cctop ディレクトリの作成
- デフォルトconfig.jsonの配置
- 既存時のスキップ（エラーなし）

### ❌ **実行しない**
- 対話的な確認プロンプト
- 進捗メッセージの表示
- データベースの初期化（初回実行時にFUNC-000で作成）
- 複雑なエラーハンドリング

## 🎯 実装内容

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js"
  }
}
```

```javascript
// scripts/postinstall.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const cctopDir = path.join(os.homedir(), '.cctop');

// 既存なら終了
if (fs.existsSync(cctopDir)) {
  process.exit(0);
}

// 作成
try {
  fs.mkdirSync(cctopDir);
  fs.writeFileSync(
    path.join(cctopDir, 'config.json'),
    JSON.stringify(require('./defaultConfig'), null, 2)
  );
} catch (error) {
  console.error('Failed to create ~/.cctop:', error.message);
  process.exit(1);
}
```

## 🔗 関連仕様

- **設定構造**: [FUNC-100: ローカル・グローバル設定管理](./FUNC-100-local-global-storage-management.md)
- **config.json**: [FUNC-101: 階層的設定管理](./FUNC-101-hierarchical-config-management.md)

---

**核心価値**: npm install → ~/.cctop自動作成 → すぐ使える
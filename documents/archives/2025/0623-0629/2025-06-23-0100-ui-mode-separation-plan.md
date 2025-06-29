---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250623-001-ui-mode-separation.md
Keywords: ui-mode-separation, classic-mode, ink-mode, esm-modules, commonjs, esbuild, bundling, stream-display, ink-v6, jsx-conversion, builder-agent, ui-implementation, command-structure
---

# cctop UIモード分離 作業計画書

## 文書情報
- **作成日**: 2025-06-23
- **作成者**: Claude Assistant (Builder Agent)
- **文書ID**: PLAN-20250623-001
- **関連Issue**: #ui-mode-separation
- **ステータス**: 承認待ち

## 1. エグゼクティブサマリー

### 1.1 現状の問題
- Ink v6への移行によりInk UIが動作不能（ESモジュール互換性問題）
- stream表示モードがStreamDisplayクラスのエントリーポイント不足により動作不能
- ユーザーは現在どちらのUIモードも使用できない状態

### 1.2 提案する解決策
- 従来のstream表示を「classic」モードとして修正・復活
- Ink v6をesbuildでバンドルし、CommonJSプロジェクトで動作可能にする
- 2つの独立したUIモードを提供（classic/ink）

### 1.3 期待される成果
- ユーザーは用途に応じて2つのUIモードを選択可能
- 既存のCommonJSコードベースを維持しつつ最新のInk v6を利用
- 総作業時間2時間で実装完了

## 2. 技術設計

### 2.1 アーキテクチャ

```
cctop/
├── bin/
│   └── cctop              # エントリーポイント（変更）
├── src/
│   └── ui/
│       ├── stream-display.js   # Classic UI（修正）
│       ├── ink-entry.js        # Ink UI ESMエントリー（新規）
│       └── ink/                # Ink コンポーネント（JSX化）
├── dist/                       # ビルド成果物（新規）
│   └── ink-bundle.js          # バンドル済みInk UI
└── package.json               # ビルドスクリプト追加
```

### 2.2 技術選定の根拠

#### ESモジュール対応方針
検討した3つのオプション：
1. **完全ESM移行**: 全ファイル書き換え（工数: 8-10時間、リスク: 高）
2. **Ink UIのみバンドル**: 影響範囲限定（工数: 1-2時間、リスク: 低）← 採用
3. **ハイブリッド**: 部分的ESM化（工数: 3-4時間、リスク: 中）

**採用理由**: 
- 既存コードへの影響を最小化
- 短時間で確実に動作する実装
- 将来的な完全移行への段階的アプローチ

#### ビルドツール選定
**esbuild**を選定（webpack、Rollupと比較）
- 高速（数秒でビルド完了）
- 設定が最小限
- Node.jsターゲットのバンドルに最適

## 3. 実装計画

### 3.1 Phase 1: Classic UIの復活

#### 目的
stream-display.jsを実行可能にし、classicコマンドで起動できるようにする

#### 作業内容

##### 3.1.1 コマンド変更
**ファイル**: `bin/cctop`
```javascript
// Before
if (command === 'stream') {

// After  
if (command === 'classic') {
```

##### 3.1.2 stream-display.jsの修正
**ファイル**: `src/ui/stream-display.js`

現在の問題：
- StreamDisplayクラスは定義されているが、インスタンス化されていない
- コマンドライン引数の処理がない

追加する内容：
```javascript
// ファイル末尾に追加
if (require.main === module) {
  const path = require('path');
  const ConfigManager = require('../config/config-manager');
  const DatabaseManager = require('../database/database-manager');
  const FileMonitor = require('../monitors/file-monitor');
  
  async function main() {
    // 初期化とStreamDisplay起動ロジック
  }
  
  main().catch(console.error);
}
```

##### 3.1.3 検証項目
- [ ] `bin/cctop classic`で起動確認
- [ ] ファイルイベントの表示確認
- [ ] Ctrl+Cでの正常終了確認

### 3.2 Phase 2: Ink v6対応

#### 目的
Ink v6のJSX/ESMコードをバンドルし、CommonJSプロジェクトで動作させる

#### 作業内容

##### 3.2.1 依存関係の更新
```bash
npm install ink@^6.0.0
npm install --save-dev esbuild
```

**package.json**に追加：
```json
{
  "scripts": {
    "build:ink": "esbuild src/ui/ink-entry.js --bundle --platform=node --outfile=dist/ink-bundle.js --format=cjs --jsx-factory=React.createElement --jsx-fragment=React.Fragment --external:sqlite3 --external:chokidar"
  }
}
```

##### 3.2.2 ink-entry.jsの作成
**新規ファイル**: `src/ui/ink-entry.js`
```javascript
import React from 'react';
import { render } from 'ink';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// CommonJSモジュールのインポート
const DatabaseManager = require('../database/database-manager');
const FileMonitor = require('../monitors/file-monitor');
const ConfigManager = require('../config/config-manager');

// Ink UIコンポーネント（JSX）
import App from './ink/App.js';

// メイン処理
async function main() {
  // 既存のink-display.jsのロジックを移植
}

main();
```

##### 3.2.3 コンポーネントのJSX化
変換対象ファイル：
- `src/ui/ink/App.js`
- `src/ui/ink/components/Header.js`
- `src/ui/ink/components/Footer.js`
- `src/ui/ink/components/FileEventsTable.js`

変換例：
```javascript
// Before (React.createElement)
return React.createElement(Box, { flexDirection: 'column' },
  React.createElement(Text, {}, 'Hello')
);

// After (JSX)
return (
  <Box flexDirection="column">
    <Text>Hello</Text>
  </Box>
);
```

##### 3.2.4 bin/cctopの更新
```javascript
} else if (command === 'ink' || command === 'ui' || !command) {
  const inkBundlePath = path.join(__dirname, '..', 'dist', 'ink-bundle.js');
  
  // ビルドチェック
  if (!fs.existsSync(inkBundlePath)) {
    console.error('Error: Ink UI bundle not found. Run "npm run build:ink" first.');
    process.exit(1);
  }
  
  const child = spawn('node', [inkBundlePath, ...args], {
    stdio: 'inherit'
  });
```

##### 3.2.5 .gitignoreの更新
```
# Build outputs
dist/
```

##### 3.2.6 検証項目
- [ ] `npm run build:ink`成功確認
- [ ] `bin/cctop ink`で起動確認
- [ ] 3モード切り替え（1/2/3キー）
- [ ] キーボード操作（↑↓、q）

### 3.3 Phase 3: テストとドキュメント

#### 3.3.1 テスト実装

**Classic UIテスト**: `test/integration/ui/classic.test.js`
```javascript
describe('Classic UI', () => {
  test('should start and display events', async () => {
    // プロセス起動
    // 標準出力の確認
    // プロセス終了
  });
});
```

**Ink UIテスト**: `test/integration/ui/ink.test.js`
```javascript
describe('Ink UI', () => {
  test('should build successfully', async () => {
    // ビルドコマンド実行
    // dist/ink-bundle.js存在確認
  });
  
  test('should start without errors', async () => {
    // スモークテスト
  });
});
```

#### 3.3.2 ドキュメント更新

**README.md**への追加：
```markdown
## 使い方

### Classic UI（シンプルな表示）
```bash
cctop classic [path]
```

### Ink UI（インタラクティブUI）
```bash
# 初回はビルドが必要
npm run build:ink

# 起動
cctop [path]
# または
cctop ink [path]
```
```

## 4. リスクと対策

### 4.1 特定されたリスク

| リスク | 影響度 | 発生確率 | 対策 |
|-------|--------|----------|------|
| stream-display.jsの修正が予想より複雑 | 中 | 低 | 最小限の変更に留める |
| esbuildの設定でエラー | 高 | 中 | 段階的なビルド設定テスト |
| Ink v6の非互換性 | 高 | 低 | 公式ドキュメント参照 |
| テスト実行時間の長期化 | 低 | 中 | UIテストは最小限に |

### 4.2 コンティンジェンシープラン
- Phase 2で問題が発生した場合、Ink v5での実装に切り替え
- 時間超過の場合、Phase 3を簡略化

## 5. 検証基準

### 5.1 機能要件
- [ ] Classic UI: `cctop classic`で起動し、イベントを表示
- [ ] Ink UI: `cctop ink`で起動し、インタラクティブ操作が可能
- [ ] 両モードでファイル監視が正常動作

### 5.2 非機能要件
- [ ] ビルド時間: 10秒以内
- [ ] 起動時間: 3秒以内
- [ ] メモリ使用量: 100MB以内

### 5.3 完了条件
- [ ] すべての実装タスク完了
- [ ] テストスイートがパス
- [ ] ドキュメント更新完了
- [ ] コードレビュー完了

## 6. スケジュール

| Phase | 作業内容 | 推定時間 | 開始時刻 | 完了予定 |
|-------|----------|----------|----------|----------|
| Phase 1 | Classic UI復活 | 30分 | 10:45 | 11:15 |
| Phase 2 | Ink v6対応 | 60分 | 11:15 | 12:15 |
| Phase 3 | テスト・文書 | 30分 | 12:15 | 12:45 |
| **合計** | | **2時間** | | |

## 7. 参考資料

### 7.1 関連文書
- [r002 Test Design](../design/r002-test-design.md)
- [v009 UI Strategy](../vision/v009-ui-strategy.md)
- [Architecture Overview](../visions/specifications/architecture/overview.md)

### 7.2 外部リソース
- [Ink v6 Documentation](https://github.com/vadimdemedes/ink)
- [esbuild Documentation](https://esbuild.github.io/)
- [ESM in Node.js](https://nodejs.org/api/esm.html)

## 8. 承認

| 役割 | 名前 | 承認日時 | 署名 |
|------|------|----------|------|
| 作成者 | Claude Assistant (Builder) | 2025-06-23 10:45 | [自動] |
| レビュワー | - | - | - |
| 承認者 | - | - | - |

---

**次のアクション**: この計画書の承認後、Phase 1の実装を開始します。
# レスポンシブディレクトリ表示仕様書

**文書ID**: SPEC-CLI-001  
**作成日**: 2025-06-24  
**作成者**: Architect Agent（兼任）  
**バージョン**: v0.1.0  
**対象システム**: cctop CLI Display  

## 📋 概要

### 目的
- ディレクトリパスの視認性向上
- ターミナル幅に応じた動的表示調整
- 長いパス表示時の情報欠損防止

### 問題定義
**現状の問題**:
1. ディレクトリカラムが固定幅15文字で表示
2. 長いパスが切り詰められて重要情報が見切れる
3. ターミナル幅を広げても恩恵を受けられない
4. パス情報の優先度が相対的に低い位置（中央）に配置

### 解決方針
- **ディレクトリ情報を最右端に移動**
- **ターミナル幅に応じた動的幅調整**
- **折り返しなしの横スクロール対応**
- **レスポンシブレイアウト実現**

## 🎯 要件定義

### 機能要件

#### FR001: カラム順序変更
- **現在**: `Modified | Elapsed | FileName | Directory | Event | Lines | Blocks`
- **変更後**: `Modified | Elapsed | FileName | Event | Lines | Blocks | Directory`

#### FR002: 動的幅計算
- ターミナル幅を取得（`process.stdout.columns`）
- 固定幅カラムの総幅を計算
- 残り幅をディレクトリカラムに割り当て

#### FR003: 折り返し防止
- パスが長くても改行しない
- 切り詰め（...）は最小限に抑制
- 可能な限り末尾（ファイル名に近い部分）を表示

#### FR004: レスポンシブ対応
- ターミナルサイズ変更時に即座反映
- `process.stdout.on('resize', callback)`イベント対応

### 非機能要件

#### NFR001: パフォーマンス
- 表示更新時の計算コスト最小化
- リアルタイム表示に影響なし

#### NFR002: 互換性
- 既存のAll/Uniqueモード動作維持
- 既存のキーバインド動作維持
- テストスイートの動作保証

#### NFR003: 可読性
- 最小幅保証（ディレクトリカラム最低10文字）
- 適切な区切り表示維持

## 🎨 UI設計

### 現在のレイアウト（固定幅97文字）
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             src/            modify    125      8
2025-06-24 14:28:03   00:01:07  very-long-name.js    /very/long/...  create     45      3
```

### 新レイアウト（レスポンシブ幅）
```
Modified             Elapsed    File Name             Event   Lines  Blocks Directory
----------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             modify    125      8  src/
2025-06-24 14:28:03   00:01:07  very-long-name.js    create     45      3  /very/long/deep/directory/structure/
```

### カラム幅仕様

| カラム | 現在幅 | 新幅 | 配置 | 変更点 |
|--------|--------|------|------|--------|
| Modified | 19 | 19 | 固定 | 変更なし |
| Elapsed | 10 | 10 | 固定 | 変更なし |
| File Name | 28 | 28 | 固定 | 変更なし |
| Event | 8 | 8 | 固定 | 位置移動（右に2つ） |
| Lines | 5 | 5 | 固定 | 位置移動（右に1つ） |
| Blocks | 6 | 6 | 固定 | 変更なし |
| Directory | 15 | 動的 | 可変 | **最右端・レスポンシブ** |

### 動的幅計算式
```javascript
const terminalWidth = process.stdout.columns || 80;
const fixedColumnsWidth = 19 + 2 + 10 + 2 + 28 + 2 + 8 + 2 + 5 + 2 + 6; // 86文字
const separatorWidth = 2; // 最後のスペース
const directoryWidth = Math.max(10, terminalWidth - fixedColumnsWidth - separatorWidth);
```

### ターミナル幅別表示例

#### 狭い幅（80文字）の場合
```
Modified             Elapsed    File Name             Event   Lines  Blocks Directory
--------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             modify    125      8  src/
```
Directory幅: `80 - 86 = 10` (最小幅保証)

#### 標準幅（120文字）の場合
```
Modified             Elapsed    File Name             Event   Lines  Blocks Directory
------------------------------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             modify    125      8  src/components/ui/
```
Directory幅: `120 - 86 = 34`

#### 広い幅（160文字）の場合
```
Modified             Elapsed    File Name             Event   Lines  Blocks Directory
--------------------------------------------------------------------------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             modify    125      8  /Users/user/project/src/components/ui/display/
```
Directory幅: `160 - 86 = 74`

## 🔧 技術仕様

### 実装対象ファイル
- **メインファイル**: `src/ui/cli-display.js`
- **対象メソッド**: 
  - `renderEvent(event)` - 行表示ロジック
  - `renderHeader()` - ヘッダー表示
  - `formatDirectory(dirPath)` - パス整形（拡張）

### 新規実装メソッド

#### `calculateDynamicWidth()`
```javascript
calculateDynamicWidth() {
  const terminalWidth = process.stdout.columns || 80;
  const fixedWidth = 19 + 10 + 28 + 8 + 5 + 6 + (6 * 2); // 固定カラム + スペース
  return {
    terminal: terminalWidth,
    directory: Math.max(10, terminalWidth - fixedWidth - 2)
  };
}
```

#### `truncateDirectoryPath(path, maxWidth)`
```javascript
truncateDirectoryPath(path, maxWidth) {
  if (path.length <= maxWidth) {
    return path.padEnd(maxWidth);
  }
  
  // 末尾優先の切り詰め（パスの終わり部分を保持）
  const truncated = '...' + path.slice(-(maxWidth - 3));
  return truncated.padEnd(maxWidth);
}
```

#### `setupResizeHandler()`
```javascript
setupResizeHandler() {
  if (process.stdout.isTTY) {
    process.stdout.on('resize', () => {
      this.widthConfig = this.calculateDynamicWidth();
      // 必要に応じて再描画
    });
  }
}
```

### データフロー

```
1. ターミナル幅取得
   ↓
2. 動的幅計算
   ↓  
3. ディレクトリパス整形
   ↓
4. 新レイアウトで行表示
   ↓
5. リサイズ時の再計算
```

### レスポンシブ対応

#### リサイズイベント処理
```javascript
// cli-display.js constructor内
this.widthConfig = this.calculateDynamicWidth();
this.setupResizeHandler();
```

#### 表示更新タイミング
- 初期化時: 幅計算実行
- リサイズ時: 幅再計算 + （必要に応じて）再描画
- 新イベント表示時: 最新幅設定で表示

## 🧪 テスト仕様

### テストケース

#### TC001: カラム順序変更
```javascript
test('Should display directory column at rightmost position', () => {
  const display = new CLIDisplay(dbManager, { maxEvents: 20 });
  const mockEvent = createMockEvent();
  
  const output = captureDisplayOutput(() => {
    display.renderEvent(mockEvent);
  });
  
  // ディレクトリが最後に表示されることを確認
  expect(output).toMatch(/modify\s+\d+\s+\d+\s+.*$/);
});
```

#### TC002: 動的幅計算
```javascript
test('Should calculate directory width based on terminal size', () => {
  // ターミナル幅をモック
  Object.defineProperty(process.stdout, 'columns', {
    value: 120,
    writable: true
  });
  
  const display = new CLIDisplay(dbManager, { maxEvents: 20 });
  const widthConfig = display.calculateDynamicWidth();
  
  expect(widthConfig.terminal).toBe(120);
  expect(widthConfig.directory).toBe(34); // 120 - 86
});
```

#### TC003: 最小幅保証
```javascript
test('Should guarantee minimum directory width', () => {
  // 極端に狭いターミナル
  Object.defineProperty(process.stdout, 'columns', {
    value: 50
  });
  
  const display = new CLIDisplay(dbManager, { maxEvents: 20 });
  const widthConfig = display.calculateDynamicWidth();
  
  expect(widthConfig.directory).toBe(10); // 最小幅保証
});
```

#### TC004: リサイズ対応
```javascript
test('Should respond to terminal resize', (done) => {
  const display = new CLIDisplay(dbManager, { maxEvents: 20 });
  
  // 初期幅
  expect(display.widthConfig.directory).toBe(34);
  
  // リサイズシミュレート
  Object.defineProperty(process.stdout, 'columns', { value: 160 });
  process.stdout.emit('resize');
  
  // 非同期更新の確認
  setTimeout(() => {
    expect(display.widthConfig.directory).toBe(74);
    done();
  }, 10);
});
```

### 回帰テスト要件
- 既存のAll/Uniqueモード動作
- 既存のキーバインド動作
- 既存のテストスイート全合格

## 📊 成功基準

### 定量的基準
- [ ] ターミナル幅80文字でディレクトリ最低10文字表示
- [ ] ターミナル幅120文字でディレクトリ34文字表示
- [ ] ターミナル幅160文字でディレクトリ74文字表示
- [ ] リサイズ応答時間50ms以内

### 定性的基準
- [ ] 長いパスの視認性向上
- [ ] 既存機能の動作保証
- [ ] ユーザビリティ向上

### 検証方法
1. **手動テスト**: 各ターミナルサイズでの表示確認
2. **自動テスト**: 上記TC001-004の実行
3. **回帰テスト**: 既存テストスイート実行
4. **実運用テスト**: 長時間動作での安定性確認

## 🚀 実装計画

### Phase 1: 基本実装（0.5日）
1. カラム順序変更
2. 動的幅計算ロジック
3. 基本表示変更

### Phase 2: レスポンシブ対応（0.5日）
1. リサイズイベント処理
2. 動的再描画
3. パフォーマンス調整

### Phase 3: テスト・検証（0.5日）
1. 新規テストケース実装
2. 回帰テスト実行
3. 実運用確認

### 総所要時間: 1.5日

## ⚠️ リスクと対策

### リスク1: 既存レイアウト依存の破綻
**対策**: テストファーストで既存動作保証

### リスク2: パフォーマンス劣化
**対策**: 幅計算の最適化・キャッシュ化

### リスク3: 特殊ターミナルでの動作不良
**対策**: フォールバック処理の実装

## 📝 備考

### 将来拡張
- カラム順序のユーザー設定対応
- カラム幅の個別調整機能
- より高度なパス省略アルゴリズム

### 参考資料
- ui001-cli-baseline.md: 基本UI仕様
- ui002-stream-display.md: 表示フォーマット
- ui007-relative-path-display.md: パス表示仕様
# P048: npm Package Publish Protocol

**プロトコル番号**: P048  
**作成日**: 2025年6月27日  
**最終更新**: 2025年6月27日  
**対象**: Clerk Agent（パッケージ管理・文書整理責任）  
**適用範囲**: RELEASEsディレクトリからのnpm公開手続き  

## 概要

RELEASEsディレクトリに格納されたパッケージを適切にnpmに公開するための包括的手続き。パッケージ名変更、テストファイル除外、メタデータ更新を含む本番公開準備プロセス。

## 適用条件

- RELEASEsディレクトリにパッケージが配置済み
- npm アカウント・2FA設定済み
- パッケージ名・バージョンが決定済み

## 手続きフローチャート

```
1. 現状確認 → 2. package.json修正 → 3. バイナリファイル準備 
    ↓
7. 公開実行 ← 6. README.md更新 ← 5. .npmignore作成 ← 4. 最終検証
```

## Phase 1: 現状確認・準備

### 1.1 既存パッケージ確認
```bash
npm view <パッケージ名>
```
- 現在のバージョン確認
- 既存の依存関係確認
- 公開済みファイル構成確認

### 1.2 RELEASEsディレクトリ構造確認
```bash
ls -la RELEASEs/<パッケージ名>-<バージョン>/
```
- package.json存在確認
- bin/ディレクトリ確認
- src/ディレクトリ確認

## Phase 2: package.json修正

### 2.1 必須修正項目
以下を順序通りに修正：

1. **name修正**:
   ```json
   "name": "旧名" → "name": "新パッケージ名"
   ```

2. **version更新**:
   ```json
   "version": "旧バージョン" → "version": "新バージョン"
   ```

3. **bin設定更新**:
   ```json
   "bin": {
     "旧コマンド名": "./bin/旧ファイル名"
   }
   ↓
   "bin": {
     "新コマンド名": "./bin/新ファイル名"
   }
   ```

4. **scripts修正**:
   ```json
   "start": "node bin/旧ファイル名" → "start": "node bin/新ファイル名"
   ```

### 2.2 本番最適化（削除項目）

1. **test系スクリプト削除**:
   ```json
   "test": "vitest run",
   "test:sequential": "node test/test-sequential.js",
   "test:watch": "vitest",
   "test:rdd": "vitest run --reporter=verbose",
   "test:e2e": "vitest run test/e2e/",
   "test:integration": "vitest run test/integration/",
   "rdd-verify": "node test/rdd-daily-verification.js"
   ```
   → **完全削除**

2. **devDependencies削除**:
   ```json
   "devDependencies": {
     "vitest": "^3.2.4",
     "zod": "^3.25.67"
   }
   ```
   → **完全削除**

### 2.3 保持必須項目
- `"postinstall": "node scripts/postinstall.js"` **必須保持**
- `dependencies` **完全保持**
- `engines` **完全保持**

## Phase 3: バイナリファイル準備

### 3.1 binファイルコピー
```bash
cd RELEASEs/<パッケージ名>-<バージョン>/
cp bin/<旧ファイル名> bin/<新ファイル名>
```

### 3.2 binディレクトリ確認
```bash
ls -la bin/
```
- 新ファイル名の実行権限確認
- ファイルサイズ一致確認

## Phase 4: .npmignore作成

### 4.1 除外ファイル指定
以下内容で`.npmignore`を作成：

```
# Test files
test/
*.test.js
vitest.config.js

# Development files
.git/
.gitignore
node_modules/

# Documentation
docs/

# Coverage
coverage/
```

### 4.2 効果確認
```bash
npm pack --dry-run
```
- 除外されるファイル一覧確認
- パッケージサイズ確認

## Phase 5: README.md・CHANGELOG.md更新

### 5.1 README.md必須修正箇所

1. **タイトル修正**:
   ```markdown
   # 旧名 - 説明 → # 新パッケージ名 - 説明
   ```

2. **インストール手順修正**:
   ```bash
   npm install -g 旧名 → npm install -g 新パッケージ名
   npm install 旧名 → npm install 新パッケージ名
   ```

3. **使用法修正**:
   ```bash
   旧コマンド → 新コマンド
   npx 旧名 → npx 新パッケージ名
   ```

4. **開発セクション最適化**:
   ```bash
   # 削除
   npm test
   
   # 保持
   npm install
   npm start
   ```

### 5.2 CHANGELOG.md作成・配置

1. **ソース取得**:
   ```bash
   # 親gitのvisions/versions.mdを英訳
   source: /documents/visions/versions.md
   target: /RELEASEs/<パッケージ名>-<バージョン>/CHANGELOG.md
   ```

2. **英訳・構造変換**:
   ```markdown
   # Change Log
   
   ## [0.2.1.0] - 2025-06-27
   ### Silent Monitoring & Clean Console
   
   **User Experience**: Complete removal of verbose logs during file monitoring, clean display
   
   **Major Feature Improvements**:
   - **Complete separation of monitor and viewer functions**
     - Background Monitor: Silent file change monitoring and database recording
     - Viewer Process: Retrieve information from database and display
     - Clean terminal display even when monitoring 110 files
   ```

3. **必須変換項目**:
   - **日本語→英語**: 全文翻訳
   - **ユーザー体験→User Experience**: 構造統一
   - **主要機能→Major Features**: セクション名統一
   - **技術的詳細→Technical Details**: 詳細度調整

4. **品質基準**:
   - [ ] npm標準のCHANGELOG.md形式準拠
   - [ ] Keep a Changelog形式の採用検討
   - [ ] セマンティックバージョニング表記統一
   - [ ] ユーザー視点の機能説明維持

### 5.3 ファイル配置確認
```bash
ls -la RELEASEs/<パッケージ名>-<バージョン>/
# 確認項目:
# - README.md (更新済み)
# - CHANGELOG.md (新規作成・英訳済み)
# - package.json (Phase 2で更新済み)
```

## Phase 6: 最終検証

### 6.1 パッケージ内容確認
```bash
npm pack --dry-run
```
- ファイル一覧確認
- サイズ確認（目安: 100KB以下）

### 6.2 package.json整合性確認
- name/version/bin/scriptsの一貫性
- 不要な依存関係がないこと
- 必須依存関係の保持

## Phase 7: 公開実行

### 7.1 公開コマンド実行
```bash
cd RELEASEs/<パッケージ名>-<バージョン>/
npm publish --otp=<2FAコード>
```

### 7.2 2FA対応
- Google Authenticator等から6桁コード取得
- 時間制限内（30秒以内）で入力
- エラー時は新しいコードで再実行

### 7.3 公開確認
```bash
npm view <新パッケージ名>
```
- バージョン確認
- ファイル構成確認
- 依存関係確認

## トラブルシューティング

### よくあるエラーと対処法

1. **OTP Error**:
   ```
   npm error code EOTP
   ```
   → 新しい2FAコードで再実行

2. **Package Name Conflict**:
   ```
   npm error 403 Forbidden
   ```
   → パッケージ名の重複確認・変更

3. **Version Conflict**:
   ```
   npm error 403 You cannot publish over the previously published versions
   ```
   → バージョン番号の増加

## 成功基準

- [ ] npm viewで新パッケージが表示される
- [ ] 新コマンド名でグローバルインストール可能
- [ ] パッケージサイズが適切（100KB以下推奨）
- [ ] 不要なテストファイルが含まれていない
- [ ] README.mdが新パッケージ名で統一されている
- [ ] CHANGELOG.mdが英訳済みで配置されている
- [ ] ユーザー視点の機能説明が維持されている

## 改定履歴

- **v1.1.0** (2025-06-27): CHANGELOG.md作成手続き追加
  - visions/versions.md英訳によるCHANGELOG.md作成手続き追加
  - npm標準形式への変換プロセス明確化
  - 品質基準・チェックリスト追加

- **v1.0.0** (2025-06-27): 初回作成
  - ccflux 0.2.1公開実績をベースに作成
  - RELEASEsディレクトリ活用パターンを標準化

## 関連プロトコル

- **P045**: Git管理分離プロトコル（親git vs 子git判定）
- **P019**: Documents編集必須プロセス（文書品質保証）

## 注意事項

1. **事前バックアップ**: RELEASEsディレクトリは編集前にバックアップ推奨
2. **段階的実行**: 各Phaseを順序通りに実行（並列化禁止）
3. **検証徹底**: Phase 6での最終検証を省略しない
4. **2FA準備**: 公開前に認証アプリを手元に準備
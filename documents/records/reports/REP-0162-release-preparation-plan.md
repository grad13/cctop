# REP-20250629-006: cctop v0.3.0 リリース準備計画

**作成日**: 2025-06-29
**作成者**: Clerk
**ステータス**: 提案
**カテゴリー**: リリース管理

## 概要

cctopのnpmパッケージ名譲渡が完了し、v0.3.0として正式リリースを行うための準備計画。現状調査に基づき、必要な整備項目と実施順序を提案する。

## 現状分析

### ✅ 既に整備済みの項目
- 基本的なpackage.json設定（name, version, main, bin等）
- .npmignoreによる公開ファイル制御
- CHANGELOG.mdによるバージョン管理
- テストスイート（Vitest）
- ビルドシステム（TypeScript）

### ❌ 未整備の重要項目
1. **メタデータ不足**: repository, homepage, bugs情報
2. **リリースプロセス**: 自動化スクリプト未設定
3. **CI/CD**: GitHub Actions未設定
4. **ドキュメント**: CONTRIBUTING.md, RELEASING.md不在
5. **ライセンス**: LICENSEファイル未作成

## リリース準備計画

### Phase 1: 基本整備（v0.3.0リリース前必須）

#### 1.1 package.json完全化
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOURUSERNAME/cctop.git"
  },
  "homepage": "https://github.com/YOURUSERNAME/cctop#readme",
  "bugs": {
    "url": "https://github.com/YOURUSERNAME/cctop/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

#### 1.2 LICENSEファイル作成
- MIT Licenseの正式テキスト配置
- 著作権表記の明確化

#### 1.3 リリーススクリプト追加
```json
{
  "scripts": {
    "prepublishOnly": "npm run clean && npm run build && npm test",
    "clean": "rm -rf dist"
  }
}
```

### Phase 2: プロセス文書化（v0.3.0リリース時並行実施）

#### 2.1 RELEASING.md作成
```markdown
# リリースプロセス

1. CHANGELOGを更新
2. バージョンを更新: `npm version patch/minor/major`
3. ビルド確認: `npm run build`
4. テスト実行: `npm test`
5. 公開: `npm publish`
6. GitHubリリース作成
```

#### 2.2 手動リリースチェックリスト
- [ ] CHANGELOG.md更新確認
- [ ] versions.md更新確認
- [ ] README.md確認
- [ ] 全テストパス確認
- [ ] ビルド成功確認
- [ ] npm pack動作確認

### Phase 3: 自動化整備（v0.3.1以降）

#### 3.1 GitHub Actions基本設定
`.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
```

#### 3.2 自動リリースワークフロー
- タグプッシュ時の自動npm publish
- GitHubリリースの自動作成
- CHANGELOGからのリリースノート抽出

### Phase 4: コミュニティ整備（継続的改善）

#### 4.1 CONTRIBUTING.md
- コーディング規約
- PR作成ガイドライン
- イシュー報告テンプレート

#### 4.2 イシューテンプレート
- バグ報告用
- 機能要望用
- 質問用

## 推奨実施順序

### v0.3.0リリースまでに（必須）
1. **package.json更新** → repository/homepage/bugs追加
2. **LICENSEファイル作成** → MIT License正式配置
3. **prepublishOnlyスクリプト** → 品質保証
4. **最終動作確認** → npm pack & インストールテスト

### v0.3.0リリース後すぐに
1. **RELEASING.md作成** → プロセス明文化
2. **GitHub Actions設定** → 基本的なCI構築
3. **READMEブラッシュアップ** → バッジ追加等

### 継続的改善として
1. **CONTRIBUTING.md** → コミュニティ参加促進
2. **自動リリース** → 効率化
3. **セキュリティポリシー** → 脆弱性対応体制

## 技術的考慮事項

### npm公開時の注意点
- **初回公開**: `npm publish --access public`
- **2FA対応**: npm accountの2FA設定推奨
- **スコープ考慮**: `@username/cctop`ではなく`cctop`として公開

### バージョニング戦略
- **Semantic Versioning**準拠
- **v0.3.0**: ccflux→cctop改名（Breaking Change扱い）
- **以降**: 機能追加はminor、バグ修正はpatch

## リスクと対策

### 想定リスク
1. **名前衝突**: 既に解決済み（Simon Lydellから譲渡）
2. **互換性問題**: ccfluxユーザーへの移行案内必要
3. **品質問題**: prepublishOnlyで自動テスト実施

### 移行サポート
- ccfluxからの移行ガイド作成
- npm deprecateでccfluxに案内表示
- GitHubでの明確な案内

## まとめ

v0.3.0リリースに向けて、最低限必要な整備（Phase 1）を優先的に実施し、その後段階的に自動化・文書化を進めることで、持続可能なリリースプロセスを構築する。

## 関連文書
- documents/visions/versions.md
- cctop/CHANGELOG.md
- cctop/README.md

## アーカイブキーワード
cctop, リリース計画, npm公開, v0.3.0, パッケージ譲渡, リリースプロセス, CI/CD, GitHub Actions, package.json, 自動化
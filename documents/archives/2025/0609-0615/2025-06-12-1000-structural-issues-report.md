---
**アーカイブ情報**
- アーカイブ日: 2025-06-23（DDD2 L2→L3移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/daily/
- 検索キーワード: プロジェクト構造的問題報告書, リンク切れファイル検出, wrappers backend不整合, kebab-case snake_case命名不統一, 404エラーページ重複, テストファイル混在, TimeBoxファイル構造検証, 2025-06-12全体チェック

---

# プロジェクト構造的問題報告書

**作成日時**: 2025年06月12日 10:00
**検証対象**: TimeBoxプロジェクト全体のファイル構造
**目的**: 重複、命名規則違反、不適切な配置、リンク切れなどの構造的問題の特定

## 🔴 緊急度：高（修正必須）

### 1. **リンク切れファイル**
**詳細**: wrappersディレクトリから参照されているが存在しないファイル
- `/src/wrappers/api/server-structure.php` が `/src/backend/api/server-structure.php` を参照しているが、backendには存在しない
**影響**: 本番環境でエラーが発生する可能性
**推奨対応**: 
- server-structure.phpをbackendに作成するか、wrappers側を削除

### 2. **wrappers/backend間の不整合**
**詳細**: wrappers/apiディレクトリに以下のファイルがあるが、backend/apiには対応ファイルなし
- `server-structure.php`
**影響**: API動作の不整合
**推奨対応**: 必要性を確認し、不要なら削除

## 🟡 緊急度：中（改善推奨）

### 3. **命名規則の不統一**
**詳細**: ケバブケース（kebab-case）とスネークケース（snake_case）が混在
- ケバブケース例: `taskgrid-data.php`, `check-error-log.php`, `test-routes.php`
- スネークケース例: `guest_debug.php`, `clear_localStorage.php`, `register_temp.php`
**影響**: コード可読性の低下、新規開発時の混乱
**推奨対応**: PHPファイルはスネークケースに統一

### 4. **エラーページの重複と不一致**
**詳細**: 404.htmlが複数存在
- `/src/frontend/pages/error/404.html`
- `/src/wrappers/pages/error/404.html`
- 403.html, 500.htmlはfrontendのみ
**影響**: エラーハンドリングの一貫性欠如
**推奨対応**: エラーページをfrontend/pages/errorに統一し、wrappersのものを削除

### 5. **テストファイルの配置**
**詳細**: テストファイルが本番コードと同じディレクトリに混在
- `/src/backend/api/test_*.php`
- `/src/backend/api/test-*.php`
**影響**: 本番環境にテストコードが混入するリスク
**推奨対応**: 専用のtestディレクトリに移動

## 🟢 緊急度：低（整理推奨）

### 6. **未使用の可能性があるutilsファイル**
**詳細**: 複数のナビゲーション実装が共存
- `pjax-navigation.js`
- `seamless-navigation.js`
- `view-transitions-navigation.js`
**影響**: コードベースの肥大化
**推奨対応**: 現在使用中のものを特定し、未使用は削除

### 7. **ファビコン関連ファイルの重複感**
**詳細**: favicon関連のユーティリティが複数存在
- `favicon-simple.js`
- `favicon-stabilizer.js`
- `favicon-solution-guide.md`（コード内にドキュメント）
**影響**: 保守性の低下
**推奨対応**: 統合または役割の明確化

### 8. **wrappers構造の簡略化余地**
**詳細**: wrappersがほぼ全てrequire_onceのみ
**影響**: ディレクトリ構造の複雑化
**推奨対応**: .htaccessでの直接ルーティングも検討

## 推奨アクションプラン

1. **即座に対応（高優先度）**
   - server-structure.phpのリンク切れ解消
   - エラーページの統一

2. **次回リファクタリング時（中優先度）**
   - 命名規則の統一（snake_caseへ）
   - テストファイルの専用ディレクトリ移動

3. **時間がある時（低優先度）**
   - 未使用utilsファイルの整理
   - ファビコン関連の統合

## 構造的健全性の評価

全体的にプロジェクト構造は整理されているが、以下の改善により更に保守性が向上する：
- 命名規則の統一
- テストと本番コードの分離
- 重複ファイルの削除
- リンク切れの解消

これらの問題は動作に致命的な影響はないが、長期的な保守性と開発効率に影響するため、計画的な改善を推奨する。
---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: Validator環境設計, テスト環境構成, コロケーション方式, Vitest PHPUnit Puppeteer, ユニットテスト統合テストE2E, テストディレクトリ構造, コードレビューフロー, Builder Validator Architect協働, 品質ゲート, カバレッジ70%, PHPビルトインサーバー, ローカルテスト環境, CI/CD連携, テストツールスタック, ハイブリッド方式

---

# REP-0021: Validator環境設計書

**作成日**: 2025年6月16日 23:33  
作成者: Clerk Agent  
ステータス: 調査・提案  

## 1. 概要

Validator Agentが使用するテスト環境の一般的な構成と、本プロジェクトへの適用案をまとめる。

## 2. 一般的なテスト環境の構成

### 2.1 ディレクトリ構造

#### 【決定】パターン2: コロケーション方式を採用
```
project/
├── src/
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── Button.js
│   │   │   └── Button.test.js      # 同じディレクトリに配置
│   │   └── utils/
│   │       ├── api.js
│   │       └── api.test.js
│   └── backend/
│       └── api/
│           ├── auth.php
│           └── auth.test.php
└── tests/                          # E2E、統合テストのみ
    ├── e2e/
    ├── integration/
    └── fixtures/                   # テスト用データ
```

**採用理由**:
- 関連ファイルが近く、開発効率が高い
- テストファイルの発見が容易
- 保守性が高い
- ビルド時の除外設定は `.gitignore` と `vite.config.js` で対応

### 2.2 【決定】テストツールスタック

#### フロントエンド（JavaScript）
- **テストランナー**: Vitest（Viteとの統合性を重視）
- **アサーション**: Vitest内蔵 + chai（必要に応じて）
- **E2Eテスト**: Puppeteer（軽量で設定が簡単）
- **モック**: Vitest内蔵のモック機能を使用
- **カバレッジ**: c8（Vitest標準）

#### バックエンド（PHP）
- **ユニットテスト**: PHPUnit 9.x
- **統合テスト**: PHPUnit + SQLiteインメモリDB
- **APIテスト**: PHPUnit内蔵のHTTPクライアント

#### 選定理由
- Viteプロジェクトとの親和性
- 設定の簡潔さ
- 高速な実行速度
- 豊富なドキュメント

### 2.3 環境設定

#### 開発環境
```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir src",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### テスト設定ファイル
- `vitest.config.js`: Vitestの設定
- `playwright.config.js`: E2Eテストの設定
- `phpunit.xml`: PHPテストの設定

## 3. 本プロジェクトへの適用案

### 3.1 【決定】本プロジェクトの構成

```
workspace/
├── src/
│   ├── frontend/
│   │   ├── components/           # 共通コンポーネント
│   │   │   ├── loginForm/
│   │   │   │   ├── LoginForm.js
│   │   │   │   └── LoginForm.test.js
│   │   │   └── notification/
│   │   │       ├── notification.js
│   │   │       └── notification.test.js
│   │   ├── islands/               # 島モジュール
│   │   │   ├── taskgrid/
│   │   │   │   ├── js/
│   │   │   │   │   ├── taskgrid-core.js
│   │   │   │   │   └── taskgrid-core.test.js
│   │   │   └── timebox/
│   │   │       ├── js/
│   │   │       │   ├── timebox-core.js
│   │   │       │   └── timebox-core.test.js
│   │   ├── lib/                   # フロントエンドライブラリ
│   │   │   ├── api.js
│   │   │   ├── api.test.js
│   │   │   ├── auth.js
│   │   │   └── auth.test.js
│   │   └── pages/                 # ページHTML
│   └── backend/
│       ├── api/                   # APIエンドポイント
│       │   ├── vision/
│       │   │   ├── daily.php
│       │   │   └── daily.test.php
│       │   ├── timebox/
│       │   │   ├── sessions.php
│       │   │   └── sessions.test.php
│       │   ├── auth.php
│       │   └── auth.test.php
│       ├── lib/                   # バックエンドライブラリ
│       │   ├── Database.php
│       │   └── Database.test.php
│       └── definitions/           # DB定義
├── wrappers/                       # APIラッパー（シンボリックリンク）
│   └── api/                       # backend/api/へのアクセスポイント
│       ├── vision/
│       └── timebox/
├── tests/                         # 統合・E2Eテストのみ
│   ├── e2e/
│   │   ├── setup/                # Puppeteer設定
│   │   ├── auth-flow.e2e.js
│   │   └── task-management.e2e.js
│   ├── integration/
│   │   ├── api-auth.test.js
│   │   └── vision-timebox.test.js
│   └── fixtures/                 # テスト用データ
│       ├── users.json
│       └── tasks.json
├── vitest.config.js               # Vitest設定（ルート）
├── phpunit.xml                    # PHPUnit設定（ルート）
└── .puppeteerrc.js                # Puppeteer設定（ルート）
```

**重要なポイント**:
- **wrappers/**: APIアクセスポイント（シンボリックリンクでbackend/api/を参照）
- **コロケーション**: ユニットテストは実装ファイルと同じディレクトリに配置
- **統合/E2E**: tests/ディレクトリに集約

**設定ファイルの配置理由**:
- ルートレベルに配置することで、設定の一元管理が可能
- package.jsonのスクリプトがシンプルになる
- CI/CDとの統合が容易

### 3.2 Validatorの権限と責務

#### 作成・編集権限
- `**/*.test.js`, `**/*.spec.js`: フルアクセス
- `tests/`: フルアクセス
- `test-config/`: フルアクセス
- テスト用モック・フィクスチャ: フルアクセス

#### 読み取り専用
- `src/`: ソースコード確認用
- `package.json`: テストスクリプト確認用

#### 実行権限
- `npm test`系のコマンド
- `php vendor/bin/phpunit`
- ローカルサーバー起動（テスト用）

### 3.3 テスト種別と配置

1. **ユニットテスト**: ソースコードと同じディレクトリ
2. **統合テスト**: `tests/integration/`
3. **E2Eテスト**: `tests/e2e/`
4. **パフォーマンステスト**: `tests/performance/`（将来）

### 3.4 環境分離

#### ローカル（Validator管理）
- 高速なユニットテスト
- 基本的な統合テスト
- モックを使用したテスト

#### CI/CD（Claude非接触）
- 完全なE2Eテスト
- セキュリティスキャン
- パフォーマンステスト
- 本番同等環境でのテスト

## 4. 実装優先順位

### Phase 1: 基礎構築（必須）
1. Vitest導入とユニットテスト環境
2. 基本的なテストスクリプト設定
3. カバレッジ測定設定

### Phase 2: 拡張（推奨）
1. E2Eテスト環境（Playwright）
2. PHPUnitの設定
3. テストデータ管理

### Phase 3: 高度化（オプション）
1. ビジュアルリグレッションテスト
2. パフォーマンステスト
3. mutationテスト

## 5. 注意事項

1. **テストの独立性**: 各テストは他のテストに依存しない
2. **環境変数**: `.env.test`でテスト用設定を管理
3. **データベース**: テスト用の独立したDBまたはインメモリDB使用
4. **並列実行**: 可能な限り並列実行可能な設計

## 6. コードレビュープロセス

### 6.1 BuilderとValidatorの協働フロー

#### 基本フロー
1. **Builder**: 機能実装・コード作成
2. **Builder**: セルフテスト（基本動作確認）
3. **Builder → Validator**: テスト依頼（handoffs/経由）
4. **Validator**: テストケース作成・実行
5. **Validator → Builder**: 結果フィードバック
6. **Builder**: 修正対応（必要に応じて）
7. **Architect**: 最終承認（設計との整合性確認）

#### レビューの観点
- **Validator**: テスタビリティ、品質、パフォーマンス
- **Architect**: 設計との整合性、技術的妥当性
- **Builder**: 実装の正確性、保守性

### 6.2 マージ権限

#### 権限の所在
- **通常のマージ**: Architectが最終判断
- **緊急修正**: BuilderとValidatorの合意で可
- **ドキュメント**: 該当エージェントが自己責任でマージ

#### マージ条件
1. Validatorのテスト合格
2. Architectの設計承認（大規模変更時）
3. 関連ドキュメントの更新完了

### 6.3 品質ゲート

#### 必須条件
- ユニットテストのカバレッジ: 70%以上
- E2Eテスト: 主要フロー通過
- リント: エラー0件
- 型チェック: エラー0件（TypeScript使用時）

#### 推奨条件
- パフォーマンステスト: 基準値クリア
- セキュリティスキャン: 脆弱性なし

## 7. テストディレクトリの最終決定

REP-0020からの引き継ぎ事項に基づき、以下を最終決定とする：

### 採用案: ハイブリッド方式
```
workspace/
├── src/                           # ユニットテストはコロケーション
│   ├── frontend/
│   │   └── components/
│   │       ├── Button.js
│   │       └── Button.test.js     # 同じディレクトリに配置
│   └── backend/
│       └── api/
│           ├── auth.php
│           └── auth.test.php      # 同じディレクトリに配置
├── tests/                         # 統合・E2Eテストは独立
│   ├── e2e/
│   ├── integration/
│   └── fixtures/                  # テスト用データ
└── test-config/                   # 設定ファイル集約
```

### 選定理由
1. **開発効率**: 関連ファイルが近く、素早くテスト可能
2. **明確な分離**: ユニットと統合/E2Eの責務が明確
3. **CI/CD統合**: tests/ディレクトリで一括実行も可能

## 8. ローカルテスト環境の技術詳細

REP-0020からの引き継ぎ事項：

### 8.1 PHPビルトインサーバーの構成

#### 基本設定
```bash
# 開発用スクリプト（package.json）
"scripts": {
  "local:php": "php -S localhost:8080 -t src/backend/public",
  "local:frontend": "vite",
  "local:start": "concurrently npm:local:*"
}
```

#### 制約事項と対策
- **制約**: .htaccessが効かない
  - **対策**: ルーティング用のrouter.phpを作成
- **制約**: 同時接続数の制限
  - **対策**: 開発時は問題なし、本番はApache/Nginx使用

### 8.2 データベース接続

#### SQLite（現行）
- **利点**: 設定不要、ポータブル
- **開発時**: `db/dev.sqlite`を使用
- **テスト時**: `:memory:`または`db/test.sqlite`

#### 将来的な拡張
- Docker Composeでの MySQL/PostgreSQL 対応
- 環境変数での切り替え（`.env.local`）

### 8.3 認証システムのモック化

#### 現状（ゲスト認証）
- モック不要、そのまま使用可能

#### 将来的な本格認証時
```javascript
// Mock認証ミドルウェア
if (process.env.NODE_ENV === 'test') {
  app.use(mockAuthMiddleware);
}
```

## 9. CI/CD連携の詳細

### 9.1 環境の棲み分け

#### ローカル（Validator管理）
- **責務**: 高速フィードバック、開発効率
- **実行内容**: 
  - ユニットテスト（変更ファイルのみ）
  - 基本的なリント
  - 型チェック

#### CI/CD（Claude非接触）
- **責務**: 完全性保証、本番同等検証
- **実行内容**:
  - 全テストスイート
  - E2Eテスト（実際のブラウザ）
  - セキュリティスキャン
  - パフォーマンス計測

### 9.2 結果の統合方法

#### 統合フロー
1. **ローカル実行**: Validatorが基本テスト
2. **プッシュ前チェック**: pre-pushフックで最低限の品質保証
3. **CI実行**: GitHub Actionsで完全テスト
4. **結果通知**: PRにコメントとして表示

#### 結果の可視化
```yaml
# .github/workflows/test.yml
- name: Test Results
  uses: dorny/test-reporter@v1
  with:
    name: 'Test Results'
    path: 'coverage/*.xml'
    reporter: 'jest-junit'
```

## 10. 次のステップ

1. Vitestの導入とサンプルテスト作成
2. ローカル開発環境のセットアップスクリプト作成
3. コードレビューワークフローの試験運用
4. CI/CDパイプラインとの統合計画

---

## 参照URL

**関連レポート**:
- REP-0020: 5エージェント体制移行計画書（上位計画）
- REP-0022: エージェント間受け渡しシステム設計書（連携方式）
- REP-0023: Validator用コンテナ環境の提案（将来的拡張）

**テストツール関連**:
- [Vitest](https://vitest.dev/) - Viteネイティブのテストランナー
- [Puppeteer](https://pptr.dev/) - ヘッドレスブラウザ操作
- [PHPUnit](https://phpunit.de/) - PHPユニットテストフレームワーク

---

## 疑問点・決定事項

### 決定事項
1. **テストディレクトリ構造**: ハイブリッド方式（ユニットテストはコロケーション、E2E/統合テストはtests/ディレクトリ）
2. **テストツールスタック**: Vitest（JS）、PHPUnit（PHP）、Puppeteer（E2E）
3. **コードレビューフロー**: Builder→Validator→Architectの3段階
4. **品質ゲート**: カバレッジ70%以上、リント/型チェックエラー0
5. **ローカルテスト環境**: PHPビルトインサーバー＋Vite構成

### 疑問点（今後の検討事項）
1. **ビジュアルリグレッションテスト**: 必要性とツール選定
2. **mutationテスト**: テスト品質のさらなる向上手法
3. **Docker Compose導入**: MySQL/PostgreSQL対応のタイミング
4. **パフォーマンステスト**: 基準値と測定方法
5. **セキュリティスキャン**: ツール選定と導入時期

---
以上
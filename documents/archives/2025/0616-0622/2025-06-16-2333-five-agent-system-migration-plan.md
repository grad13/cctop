---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: 5エージェント体制移行計画, Builder Validator Architect Clerk Inspector, 3エージェントから5エージェント, 責務分離, ローカルテスト環境, コード品質向上, 並行作業効率化, DDD1更新, P016権限マトリックス, handoffs通信, マルチエージェントオーケストレーション, Scribe系文書部門, Coder系実装部門, 段階的移行計画, エージェント間協調

---

# REP-0020: 5エージェント体制移行計画書

**作成日**: 2025年6月16日 23:33  
作成者: Clerk Agent  
ステータス: 計画中  
**注記**: 文書内のディレクトリ構造は2025年6月19日REP-0085により新構造に更新済み  

## 1. 概要

現在の3エージェント体制（Coder/Clerk/Inspector）から、5エージェント体制への移行計画。ローカルテスト環境の構築を前提として、コード作成と検証の分離、ドキュメント管理の専門化を図る。

本計画は、Redditで共有されたマルチエージェントオーケストレーションシステムの実装事例（https://www.reddit.com/r/ClaudeAI/comments/1l11fo2/how_i_built_a_multiagent_orchestration_system/）にインスパイアされている。

## 2. 移行の背景と目的

### 2.1 現状の課題
- **Coder**: コード作成とテストが混在し、責務が過大
- **Clerk**: メタルールから仕様書まで幅広く、焦点が分散
- **テストのボトルネック**: ローカルテスト不可により、本番環境での確認に依存

### 2.2 期待効果
- コード品質の向上（作成と検証の分離）
- ドキュメント管理の専門化
- 並行作業による開発効率向上
- 責務の明確化による混乱の削減

## 3. 新体制の構造

```
TimeBoxプロジェクト - 5エージェント体制
├── Coder系（実装部門）
│   ├── Builder Agent
│   │   └── コード作成・実装
│   └── Validator Agent
│       └── テスト・検証
├── Scribe系（文書部門）
│   ├── Clerk Agent
│   │   └── メタルール・プロセス管理
│   └── Architect Agent
│       └── 仕様・設計管理
└── Inspector Agent（監視部門）
    └── 統計・監視（変更なし）
```

## 4. 各エージェントの詳細定義

### 4.1 Builder Agent（新設）
**責務**:
- ソースコード実装（src/配下）
- 新機能開発
- バグ修正の実装
- リファクタリング

**権限**:
- src/: フルアクセス
- 設定ファイル（ルートディレクトリ）:
  - package.json: 編集可（依存関係・スクリプト管理）
  - package-lock.json: 読み取りのみ（npm自動管理）
  - vite.config.js: 編集可（ビルド設定）
  - tsconfig.json: 編集可（TypeScript設定）※将来追加時
  - その他のビルド関連設定: 編集可
- documents/records/: 作業記録の作成・編集
- documents/agents/status/builder.md: 自身のステータス管理

**禁止事項**:
- テストの実行（Validatorの責務）
- メタルール・仕様書編集（dominants/, meta/, specifications/, roadmaps/）
- CLAUDE.md編集

### 4.2 Validator Agent（新設）
**責務**:
- ローカルテスト実行
- テストケース作成
- コード品質チェック
- パフォーマンス測定
- セキュリティ検証

**権限**:
- src/: 読み取り専用
- tests/: フルアクセス（新設予定）
- ローカル環境でのコマンド実行
- documents/records/: テスト結果・検証記録の作成
- documents/agents/status/validator.md: 自身のステータス管理

**禁止事項**:
- 実装コードの直接編集（Builderへフィードバック）
- メタルール・仕様書編集（dominants/, meta/, specifications/, roadmaps/）

### 4.3 Clerk Agent（役割縮小）
**責務**:
- meta/配下の管理
- CLAUDE.md管理
- プロトコル・仮説管理
- インシデント対応

**権限**:
- documents/rules/meta/: フルアクセス
- documents/records/: フルアクセス（全種類の記録作成可）
- documents/agents/status/clerk.md: 自身のステータス管理
- CLAUDE.md: 編集権限（独占）

**変更点**:
- specifications/, roadmaps/の管理権限をArchitectへ移譲

### 4.4 Architect Agent（新設）
**責務**:
- アーキテクチャ設計
- 仕様書管理（specifications/）
- ロードマップ管理（roadmaps/）
- 技術選定・設計判断
- Coder系内の技術的競合の調整

**権限**:
- documents/techs/specifications/: フルアクセス
- documents/techs/roadmaps/: フルアクセス
- documents/records/: 設計関連の記録作成
- documents/agents/status/architect.md: 自身のステータス管理
- **技術的決定権**: Coder系（Builder/Validator）間の技術的見解の相違における最終判断

**禁止事項**:
- コード実装
- メタルール策定（Clerkの領域）
- プロセス・ルールへの介入

**権限の明確化**:
- メタレベルの決定（開発プロセス、ルール）→ Clerkの領域
- 技術レベルの決定（設計、実装方針）→ Architectの領域
- 例：「テストをいつ実施するか」はClerk、「どのテストフレームワークを使うか」はArchitect

### 4.5 Inspector Agent（変更なし）
**責務・権限**: 現行を維持
- surveillance/配下の管理
- 統計・監視機能
- documents/records/: 監視結果の記録作成
- documents/agents/status/inspector.md: 自身のステータス管理

## 5. 決定が必要な事項

### 5.1 REP-0021（Validator環境設計書）で検討する事項
1. **テストディレクトリの配置**
   - tests/の構造（ルートレベル vs コロケーション）
   - テスト種別ごとの配置ルール

2. **コードレビュープロセス**
   - BuilderとValidatorの協働フロー
   - レビューの観点とチェックポイント
   - マージ権限と承認プロセス

3. **ローカルテスト環境の具体的構成**
   - PHPビルトインサーバーの設定
   - データベース接続方法
   - 認証システムのモック化

4. **ValidatorのCI/CD連携**
   - ローカルとCI/CDの棲み分け
   - テスト結果の統合方法

### 5.2 REP-0022（エージェント間受け渡しシステム）で検討する事項
1. **バグレポートの管理者**
   - 発見から修正までのフロー
   - 各エージェントの責任分担

2. **エージェント間の通信プロトコル**
   - handoffs/ディレクトリの構造
   - ファイルベースのメッセージパッシング

3. **移行期間中の運用**
   - 既存Coderの作業分割方法
   - 段階的移行のタイムライン

4. **エージェント切り替えの頻度**
   - 実運用での切り替えパターン
   - コンテキスト維持の方法

5. **エージェント間オーケストレーション**
   - 複数エージェントが関わるタスクの調整
   - 非同期コミュニケーションの実装

### 5.3 本レポートで決定済みの事項
1. **status/ディレクトリの再編**
   - **決定**: 5ファイル体制（builder.md, validator.md, clerk.md, architect.md, inspector.md）を作成
   - 既存のcoder.mdは移行後にarchiveへ

2. **P016（権限マトリックス）の更新タイミング**
   - **決定**: 並行作成方式
   - P016-v2（5エージェント版）を作成し、移行完了時にreplaceする

3. **エージェント命名規則**
   - **決定**: すべて「Agent」接尾辞で統一
   - **正式名称**: Builder Agent, Validator Agent, Clerk Agent, Architect Agent, Inspector Agent
   - **略称**: B/V/C/A/M（ログやタグで使用）
   - **ファイル名**: 小文字（builder.md, validator.md等）

4. **将来的な拡張性**
   - **決定**: 策定せず。将来の状況に応じて対応

## 6. 検討事項の整理

### 6.1 REP-0021での検討完了事項
- ✅ テストディレクトリ構造（ハイブリッド方式採用）
- ✅ コードレビュープロセス（Builder→Validator→Architectフロー）
- ✅ ローカルテスト環境（PHPビルトインサーバー＋Vite）
- ✅ CI/CD連携（ローカルとCI/CDの役割分担明確化）

### 6.2 REP-0022での検討完了事項
- ✅ バグレポート管理フロー（発見→記録→依頼→修正→検証）
- ✅ エージェント間通信（handoffs/ディレクトリベース）
- ✅ 移行期間の運用（3週間の段階的移行）
- ✅ エージェント切り替え（1日1-2回、タスク単位）
- ✅ オーケストレーション（ファイルベースの非同期通信）

## 7. 移行ステップ（案）

### Phase 1: 準備（2-3時間）
1. DDD1更新案作成
2. P016権限マトリックス改訂案作成
3. 新エージェントのstatusファイル準備

### Phase 2: 段階的移行（4-6時間）
1. Architect Agent先行稼働
2. Builder/Validator分離
3. Clerk役割調整

### Phase 3: 本格稼働（2-3時間）
1. 全エージェント稼働確認
2. 旧体制の記録整理
3. 新体制での初回タスク実施

## 8. リスクと対策

### 8.1 移行リスク
- **コンテキスト分断**: エージェント間の情報共有不足
- **責任の曖昧さ**: 境界ケースでの判断迷い
- **オーバーヘッド増加**: 切り替えコスト

### 8.2 対策
- 明確な責務定義とチェックリスト
- 共有ドキュメントでの情報集約
- 定期的な体制レビュー

## 9. 決定事項まとめ

### 9.1 本レポートでの決定事項
- **status/ディレクトリ**: 5ファイル体制に拡張
- **P016更新**: 並行作成してreplace方式
- **Scribe系**: 文書部門の名称として採用
- **Architectの権限**: Coder系内の技術的決定権
- **エージェント命名**: Agent接尾辞統一、略称B/V/C/A/M

### 9.2 REP-0021での決定事項
- **テストディレクトリ**: ハイブリッド方式（ユニットはコロケーション、E2E/統合は独立）
- **コードレビュー**: Builder→Validator→Architectの3段階フロー
- **ローカル環境**: PHPビルトインサーバー＋Vite構成
- **品質ゲート**: カバレッジ70%以上、リント/型チェックエラー0

### 9.3 REP-0022での決定事項
- **handoffs/**: エージェント間通信用ディレクトリ構造
- **ファイル命名**: HO-YYYYMMDD-XXX形式
- **バグ管理**: BUG-YYYYMMDD-XXX形式、4段階優先度
- **移行計画**: 3週間での段階的移行（Architect先行→Builder/Validator分離→完全移行）

## 10. 次のアクション

1. **REP-0021、REP-0022の完成**
2. **DDD1（Dominant）**の更新案作成
3. **P016-v2**の作成開始

---

## 参照URL

**関連レポート**:
- REP-0021: Validator環境設計書（テスト環境の詳細）
- REP-0022: エージェント間受け渡しシステム設計書（通信方式の詳細）

**インスピレーション元**:
- [How I built a multi-agent orchestration system using Claude Code and MCP](https://www.reddit.com/r/ClaudeAI/comments/1l11fo2/how_i_built_a_multiagent_orchestration_system/) - Reddit記事（マルチエージェントシステムの実装事例）

---

## 疑問点・決定事項

### 決定事項
1. **status/ディレクトリ**: 5ファイル体制（builder.md, validator.md, clerk.md, architect.md, inspector.md）を作成
2. **P016（権限マトリックス）の更新タイミング**: 並行作成方式（P016-v2を作成し、移行完了時にreplace）
3. **エージェント命名規則**: すべて「Agent」接尾辞で統一（正式名称と略称を定義）
4. **Scribe系**: 文書部門の正式名称として採用
5. **Architectの権限**: Coder系内の技術的決定権を明確化

### 疑問点（REP-0021、REP-0022で検討）
1. **テストディレクトリの配置**: → REP-0021でハイブリッド方式に決定
2. **コードレビュープロセス**: → REP-0021でBuilder→Validator→Architectフローに決定
3. **バグレポートの管理者**: → REP-0022で発見→記録→依頼→修正→検証フローに決定
4. **エージェント間の通信プロトコル**: → REP-0022でhandoffs/ディレクトリベースに決定
5. **移行期間中の運用**: → REP-0022で3週間の段階的移行に決定

---
以上
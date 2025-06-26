# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔺 Dominant - メタレベル最高規則

### ⛔ 絶対不変要素の保護（P040: 不変要素保護プロトコル）
**以下の要素は絶対不変であり、変更・統合・修正は一切禁止**：
- **Dominantセクション全体**（このセクションを含む）
- **P000**（システム最上位原則）

**違反時**: 即座に作業停止し、ユーザーに報告すること

### プロジェクト改善の階層性原則（Strategic vs Tactical Programming）
**すべての作業・改善活動には階層があり、より高次の改善が常に優先される。**

#### 階層定義（上位ほど重要）
1. **[Strategic] システム全体の改善メカニズム**: meta生成・改善プロセス自体の改善
2. **[Tactical] 方法論・プロセスの改善**: 開発手法・ワークフロー・品質管理方法の改善
3. **[Implementation] 個別実装・問題解決**: 機能実装・バグ修正・具体的タスク

#### 適用原則
- **上位検出時の即座切替**: 作業中により高次の改善機会を発見したら、現作業を中断して上位改善を優先
- **成果の波及効果重視**: 下位の成果より、上位改善による広範な効果を重視
- **メタ認知の常時発動**: 現在の作業がどの階層に属するか常に意識

### Agent役割必須原則（Single Responsibility Principle - SRP）
**詳細**: `documents/rules/dominants/ddd1-agent-role-mandatory-system.md`（**DDD1: Dominantレベル最高規則**）

**要約**: 全Claude Code AssistantはBuilder/Validator/Architect/Clerk/Inspectorのいずれか1つの役割を必ず持つ。単一責任原則により、例外・兼務・役割外作業は一切禁止。

### 階層メモリメンテナンス原則（Cache Hierarchy）
**詳細**: `documents/rules/dominants/ddd2-hierarchy-memory-maintenance.md`（**DDD2: Dominantレベル最高規則**）

**要約**: 全文書はL0→L1→L2→L3のCache Hierarchy構造で管理。L1(status)は進捗記録専用。日次・週次・月次で移行。records/配下は1レポート1トピック厳守。

**重要**: 「DDD2に従ってください」と指示された場合、それは「階層的メモリキャッシュ原理」を実現することを意味します。具体的には：
- L0（Session Cache）→L1（agents/status/進捗専用）→L2（records）→L3（archives）の階層管理
- **L1→L2移行はP044プロトコルに従って実行** (`documents/rules/meta/protocols/p044-l1-l2-migration-protocol.md`)
- **L2→L3移行はP043プロトコルに従って実行** (`documents/rules/meta/protocols/p043-l2-to-l3-archive-migration-protocol.md`)
  - キーワード追加による検索継続性の確保
  - patterns検索での永続的アクセス
- 1レポート1トピック原則を守ること

## 🌐 言語設定

### 基本言語
- **返答**: 基本的に日本語で行う
- **技術用語**: 一般的な英単語・技術用語は適宜使用可
- **コード**: プログラミングコード・コメントは英語（変数名・関数名等）

### 言語使用の目安
- 説明・解説: 日本語
- エラーメッセージ引用: 原文のまま（英語）
- 技術用語: commit、push、bug、fix等は英語OK
- ファイル名・パス: 英語（既存の命名規則に従う）

### agent切り替え時の必須確認事項

**セッション継続時は特に注意**: 前回からの変更事項を必ず確認

作業開始時に以下を必ず確認：
1. **agent宣言**: 「私は[Builder/Validator/Architect/Clerk/Inspector]として作業します」
2. **権限確認**: `documents/agents/roles/{agent}.md`で権限・責務・制限を確認
3. **現状確認**: `documents/agents/status/{agent}.md`で進捗・現在作業を確認
4. **権限違反時**: 即座停止しユーザーに報告
5. **passage/handoffs/確認**: Builder/Validator/Architectは`passage/handoffs/pending/{agent}/`の新規依頼を確認

### 🔄 handoffsワークフロー（Producer-Consumer Pattern）

エージェント間の作業受け渡しは**3段階の明確な状態管理**で行う
1. **Pending**（`pending/{agent}/`で待機）- Queue
2. **In Progress**（`in-progress/{agent}/`で作業中）- Processing
3. **Completed**（`completed/YYYY-MM-DD/{agent}/`で完了記録）- Archive

セッション開始時にpending確認、作業選択してin-progressへ移動、完了時にcompletedへ移動することで、エージェント間の非同期協調と進捗可視化を実現する。

## 📦 cctopプロジェクト概要

**cctop (Code Change Top)** は、リアルタイムでファイルの変更を監視し、コード構造の分析を提供する高機能なファイルモニタリングツールです。

### 主要機能
- **リアルタイム監視**: chokidarによる高性能ファイル変更検出
- **イベント追跡**: Find/Create/Modify/Delete/Moveの全イベントを記録
- **メタデータ収集**: ファイルサイズ、行数、タイムスタンプ、inode情報
- **永続化**: SQLite3による全イベントのデータベース保存

### 技術スタック
- **監視ライブラリ**: chokidar@3.5.3
- **データベース**: sqlite3@5.1.6
- **実行環境**: Node.js v24.2.0

## 🎯 開発指針（Core Development Principles）

### KISS原則（Keep It Simple, Stupid）
1. **最もシンプルな実装から開始** - 複雑性は必要になってから追加
2. **過度な最適化の回避** - "Premature optimization is the root of all evil" - Donald Knuth

### YAGNI原則（You Aren't Gonna Need It）
1. **現在必要な機能のみ実装** - 将来の要件を推測して実装しない
2. **投機的な一般化の禁止** - 具体的な要求が来てから抽象化

### DRY原則（Don't Repeat Yourself）
1. **コードの重複排除** - 同じロジックは一箇所に集約
2. **単一の信頼できる情報源** - Single Source of Truth

### 📁 directory操作時のREADME.md更新（必須）
**README.mdは各directoryのメタデータfile**：
1. **file追加/削除/改名** → 即座にREADME.md更新
2. **チェックリスト参照** - `documents/rules/meta/checklists/chk001-directory-operation.md`
3. **.DS_Storeと同じ扱い** - directory状態を常に反映

- 各エージェントディレクトリ（agents/roles/, agents/status/）

**理念**: 「directory操作 = README.md更新」を一体の作業として扱う

### ⚠️ file命名規則（Naming Convention）

**必須チェック**:
- 英語のみ使用（日本語禁止）
- kebab-serial-case形式（小文字-ハイフン区切り）
- directory名との重複回避
- 明確で簡潔な名前

**詳細**: `documents/rules/meta/protocols/p006-file-naming-convention.md`参照

## Git操作ポリシー（Version Control Best Practices）

### 基本ポリシー
- **許可される操作**: コミット、プッシュ、ブランチ作成、マージ、リベース、タグ作成など
- **禁止される操作**: 履歴を破壊的に変更する操作（force push、履歴書き換え等）や、現状を保存する前に履歴をloadする
- **コミット方針**: 適切なコミットメッセージで変更内容を明記し、積極的にコミット・プッシュしてよい

### 🔀 Git管理の完全分離（Separation of Concerns）

**2つの独立リポジトリ**による完全分離体制：

#### **判定ルール**（ファイルパスで機械的判定）:
- **親git (06-cctop/)**: documents/, passage/, CLAUDE.md, VERSIONs/
- **子git (cctop/)**: src/, test/, package.json, jest.config.js, scripts/

#### **物理的境界防止**:
- **親git**: .gitignoreでcctop/完全除外済み
- **子git**: .gitignoreで親git管理領域完全除外済み
- **境界違反**: 物理的に不可能な状態を実現

#### **作業前必須確認**:
1. **現在ディレクトリ確認**: `pwd`
2. **対象ファイルパス確認**: 編集・作成するファイルの場所
3. **CHK006実行**: Git操作前確認チェックリスト
4. **P045判定**: 上記ルールで適切なgit確認
5. **正しいgitで作業開始**

#### **Agent別ガイドライン**:
- **Builder/Validator**: 主に子git、ドキュメント更新時のみ親git
- **Architect/Clerk/Inspector**: 主に親git、コード確認時のみ子git読み取り

### 🚨 Git操作前の強制確認（Pre-commit Checklist）

**git commit実行前に必ず以下を確認し、全て完了でなければコミット禁止**：

#### **Phase 1: CHK006基本確認**
- **現在ディレクトリ**: `pwd`で位置確認済み
- **P045判定**: ファイルパスで適切なgit判定済み
- **境界確認**: 他git管理ファイルが混入していない

#### **Phase 2: 従来確認項目**

1. **「documents/agents/status/{agent}.mdは更新済みか？」**
   - 完了作業を記録
   - 次の作業計画を更新
   - 最終更新日時を更新

2. **「タスク完了チェックリストを確認したか？」**
   - `documents/rules/meta/checklists/chk005-task-completion.md`の全項目確認
   - 特にGit操作セクション（5.1）の必須項目

3. **「reports切り出しは完了したか？」**（該当する場合）
   - 完了作業の詳細をreportsへ記録
   - documents/agents/status/{agent}.mdから詳細をreportsに移動

**違反時**: documents/agents/status/{agent}.md未更新でのコミットはincident扱い

## ⚠️ 絶対最重要：セッション開始時必須確認プロセス

### セッション開始時の強制実行手順（Initialization Protocol）

**問題**: 「今何をやっているか」が即座に出てこない → 認識齟齬発生
**解決**: 以下を毎セッション開始時に必ず実行する

#### 必須確認手順（30秒以内完了）
1. **documents/agents/roles/{agent}.md読了**（20秒）
   - 自身のAgent（Builder/Validator/Architect/Clerk/Inspector）のroleファイル確認
   - 自分の役割・権限の確認（Single Responsibility）
   - 他agentとの関係性の確認

2. **documents/agents/status/{agent}.md読了**（20秒）
   - 自身のAgent（Builder/Validator/Architect/Clerk/Inspector）のstatusファイル確認
   - 現在の作業フェーズ確認
   - 次の明確な作業確認
   - 改善すべき指摘された点と、強化すべき評価された点の確認

3. **TodoRead実行**（5秒）
   - 未完了タスク確認

4. **現状即答準備**（5秒）
   - 「現在何をやっているか」を5秒以内で回答可能にする
   - 「次に何をすべきか」を即座に提示可能にする

#### 作業完了時の強制更新義務
- **必須**: documents/agents/status/{agent}.mdの更新
- **内容**: 完了項目追加 + 次の作業更新 + ブロッカー記載
- **タイミング**: 作業終了直後（遅延厳禁）
- **Builder/Validator/Architect**: handoffs/完了移動も必須（ワークスペースroot）

## ⚠️ 最重要：Documents編集必須プロセス

**詳細手順**: `documents/rules/meta/protocols/p019-documents-editing-advanced.md` を参照

**要点**: Documents編集時の品質問題の90%は基本プロセス違反が原因。P019プロセスを100%遵守すること。

## 重要：自動ドキュメント化義務（Documentation as Code）

対話中の以下の内容は、**ユーザー指示なしで自動的に文書化**：
- 設計方針・機能仕様の決定
- 実装計画・マイルストーン
- 技術的決定事項
- 問題解決方法

**原則**: 重要な決定は即座に文書化し、適切な場所に配置

### 🚨 記録・ドキュメント化の強制実行

**必須タイミング**:
- 作業開始時・30分毎・コミット前・作業終了時
- 問題解決完了時・重要質疑応答後

**記録対象**:
- 2file以上の変更
- 新機能・バグ修正・設定変更
- 重要な質疑応答・設計方針

**documents/agents/status/{agent}.md更新**:
- 全対話を作業ログに時系列記録
- 完了後：詳細をreportsへ移動
- 2-3日後：要約も削除（肥大化防止）

**詳細**: 各エージェントのstatus管理方針を参照

## ドキュメント管理

**詳細**: `documents/README.md` 参照

**配置基準**: visions/roadmaps/meta/records の5カテゴリー

## 定式化された検証プロセス（Test-Driven Approach）

新機能実装や大きな変更を行う前に、4段階検証プロセスを必ず実行すること：
1. **Red Phase**: 網羅的現状チェック・失敗条件の明確化
2. **Green Phase**: 疑問点・不明瞭点の文書化（records/reports/へ保存）
3. **Refactor Phase**: ユーザー返信・意思決定
4. **Deploy Phase**: アクション実行・結果追記

**詳細手順**: 必要に応じて以前のプロジェクトレビューを参照

## 🔍 ファイル検索のヒント

### ファイルが見つからない場合
ファイルパスで迷子になった場合は、以下の手順で検索：

1. **トップディレクトリに移動**: `cd /Users/takuo-h/Workspace/Code/06-cctop`
2. **Glob/Grepツールで検索**: 
   - ファイル名がわかる場合: `Glob pattern="**/*filename*"`
   - 内容で検索する場合: `Grep pattern="検索文字列"`
3. **よくある迷子ケース**:
   - cctop/内とdocuments/内の混同
   - 親gitとcctop内gitの混同（P045で完全分離済み）
   - アーカイブ済みファイルの検索（archives/以下を確認）
---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: 並列処理プロトコル, Roo Orchestrator, MCPサーバー統合, 領域分割型並列化, データ並列型処理, タスク依存関係型, ステップベース並列処理, Claude Code並列実行, handoffsディレクトリ活用, カスタムコマンド定義, マルチエージェント並列化, P026一括適用, オーケストレーション設計, 並列度制御, エラーハンドリング

---

# REP-0026: 並列処理プロトコル設計書

**作成日**: 2025年6月16日 07:30  
**作成者**: Clerk Agent  
**ステータス**: 提案中  
**参照URL**: 
- REP-0024: MCPサーバー統合調査レポート
- REP-0022: エージェント間受け渡しシステム
- https://zenn.dev/mizchi/articles/claude-code-orchestrator (mizchi - Claude Code版Orchestrator)
- https://github.com/RooCodeInc/Roo-Code (Roo Code公式リポジトリ)
- https://www.anthropic.com/engineering/claude-code-best-practices (Claude Code Best Practices)

## 疑問点・決定事項
- [ ] MCPサーバーの起動・管理方法の詳細
- [ ] 並列度の上限設定（何タスクまで同時実行可能か）
- [ ] エラーハンドリングの方針
- [x] タスク並列化の3種類の明確化（領域分割型、データ並列型、タスク依存関係型）
- [x] ステップベースの並列処理アプローチ採用
- [x] handoffs/ディレクトリを活用した結果集約
- [x] .claude/commands/によるカスタムコマンド定義

---

## 1. 概要

独立性の高いデータ処理タスクを並列実行するためのプロトコル。Roo Orchestratorの「ステップ内並列・ステップ間順次」アプローチを採用し、MCPサーバーとfile-basedシステムのハイブリッド構成を提案する。

## 2. 並列化の3つのパターン

本プロトコルでは、並列処理を以下の3つのパターンに分類し、それぞれ個別のレポートで詳細化しています。

### 2.1 領域分割型並列化（Domain Partitioning）
**詳細レポート**: [REP-0027: 領域分割型並列化（Multi-Agent）](./REP-0027-domain-partitioning-parallelism.md)

**特徴**: multi-agentのように、独立した領域に分けて並列化
- **例**: REP-0022のエージェント間受け渡しシステム
- **適用場面**: 異なる責任領域を持つタスクの並列実行
- **具体例**: 
  - Coder: src/の実装
  - Clerk: documents/の文書化
  - Inspector: 統計収集

### 2.2 データ並列型（Data Parallelism）
**詳細レポート**: [REP-0032: データ並列型処理プロトコル](./REP-0032-data-parallelism-protocol.md)

**特徴**: pythonのmultiprocessingのように、同じ処理fを多くのデータ集合x=(x1,x2,...)に対し並列適用
- **例**: P026を複数ファイルに一括適用
- **適用場面**: 同一処理の大量データへの適用
- **具体例**:
  ```
  f = P026適用関数
  x = [p001.md, p002.md, ..., p025.md]
  並列実行: f(p001), f(p002), ..., f(p025)
  ```

### 2.3 タスク依存関係型（Task Dependency Orchestration）
**詳細レポート**: [REP-0029: タスク依存関係型オーケストレーション](./REP-0029-task-dependency-orchestration.md)

**特徴**: Roo Orchestratorのように、タスクの依存関係を整理して「分割統治」
- **例**: 複雑なプロジェクトの段階的実行
- **適用場面**: 前段の結果が後段に必要なタスク
- **具体例**:
  ```
  Step1: 分析 → Step2: 設計 → Step3: 実装 → Step4: 検証
  各Step内では並列実行可能
  ```

## 3. 基本アーキテクチャ

### 3.1 ステップベース並列処理

```
Step 1: 分析フェーズ
├── Task A: 対象ファイルの調査（並列）
├── Task B: 依存関係の分析（並列）
└── Task C: 作業量の見積もり（並列）
    ↓ 全タスク完了後
Step 2: 実行フェーズ
├── Task D: グループ1のファイル処理（並列）
├── Task E: グループ2のファイル処理（並列）
└── Task F: グループ3のファイル処理（並列）
    ↓ 全タスク完了後
Step 3: 統合フェーズ
└── Task G: 結果の統合とレポート作成
```

### 3.2 通信方式の選択

#### Option 1: MCPサーバー方式（推奨）
```bash
# MCPサーバー起動
npx @modelcontextprotocol/server-filesystem \
  --directory handoffs \
  --watch
```

**メリット**:
- リアルタイムな変更検知
- 自動的な同期
- スケーラブル

#### Option 2: File-based方式（フォールバック）
```
handoffs/
├── orchestrator/
│   ├── task-definitions/    # タスク定義
│   └── step-status/         # ステップ状態管理
├── parallel/
│   ├── step-1/             # Step 1の並列タスク
│   ├── step-2/             # Step 2の並列タスク
│   └── step-3/             # Step 3の並列タスク
└── results/                # 完了結果
```

## 4. 実装パターン

### 4.1 タスク定義形式

```markdown
# TASK-001: ファイルグループAへのP026適用

**タスク種別**: データ処理
**並列可能**: Yes
**依存関係**: なし
**推定時間**: 10分
**担当Agent**: Clerk

## 入力
- 対象ファイルリスト: protocols/p001-p005.md

## 処理内容
1. 各ファイルにP026形式を適用
2. 参照URLの追加
3. 疑問点・決定事項の抽出

## 出力
- 処理済みファイル数
- 追加した疑問点の数
- エラーがあった場合はその詳細
```

### 4.2 並列実行の管理

#### Orchestratorの役割
1. **タスク分割**: 独立実行可能な単位に分割
2. **リソース管理**: 同時実行数の制御
3. **進捗監視**: 各タスクの状態追跡
4. **結果集約**: 並列タスクの結果統合

#### 実行フロー
```python
# 疑似コード
def execute_parallel_step(step_tasks):
    results = []
    for task in step_tasks:
        # 各タスクを独立したセッションで実行
        session = create_new_session(task)
        results.append(session.execute())
    
    # 全タスク完了を待機
    wait_for_all(results)
    return aggregate_results(results)
```

## 5. P026適用の並列化例

### 5.1 タスク分析（Step 1）

**目的**: 全体像の把握と作業計画

並列タスク:
- **Task 1-A**: protocols/ディレクトリの調査（約25ファイル）
- **Task 1-B**: hypotheses/ディレクトリの調査（約45ファイル）
- **Task 1-C**: reports/ディレクトリの調査（約20ファイル）

### 5.2 並列処理（Step 2）

**目的**: P026の一括適用

並列タスク:
- **Task 2-A**: protocols/p001-p008.md（8ファイル）
- **Task 2-B**: protocols/p009-p015.md（7ファイル）
- **Task 2-C**: protocols/p017-p024.md（8ファイル）
- **Task 2-D**: hypotheses/h001-h015.md（15ファイル）
- **Task 2-E**: hypotheses/h016-h030.md（15ファイル）
- **Task 2-F**: hypotheses/h031-h045.md（15ファイル）

### 5.3 結果統合（Step 3）

**目的**: 実行結果の集約とレポート作成

単一タスク:
- **Task 3-A**: 全結果の統合とサマリー作成

## 6. コマンド定義（.claude/commands/）

Claude Codeでは、`.claude/commands/`ディレクトリにMarkdownファイルを配置することで、プロジェクト固有のカスタムコマンドを定義できます。

### 6.1 ディレクトリ構造
```
.claude/
└── commands/
    ├── apply-p026.md          # P026適用コマンド
    ├── parallel-execute.md    # 並列実行コマンド
    └── orchestrate.md         # オーケストレーション実行
```

### 6.2 apply-p026.md
```markdown
# apply-p026

指定されたファイルパターンにP026を適用します。

## 使用方法
/project:apply-p026 <file-pattern>

## 引数
- file-pattern: 対象ファイルのglob pattern

## 実行例
/project:apply-p026 "protocols/p00[1-8].md"

## 処理内容
1. 指定パターンに合致するファイルを検索
2. 各ファイルにP026形式を適用
3. 結果をhandoffs/results/に保存
```

### 6.3 parallel-execute.md
```markdown
# parallel-execute

タスク定義に基づいて並列実行を開始します。

## 使用方法
/project:parallel-execute <task-definition>

## 引数
- task-definition: タスク定義ファイルのパス

## 実行例
/project:parallel-execute "handoffs/orchestrator/p026-application.yaml"

## 処理内容
1. タスク定義ファイルを読み込み
2. 並列実行可能なタスクを識別
3. Taskツールで各タスクを独立実行
4. 結果を集約してレポート作成
```

### 6.4 orchestrate.md
```markdown
# orchestrate

Roo Orchestrator方式でステップベースの実行を行います。

## 使用方法
/project:orchestrate <orchestration-plan>

## 引数
- orchestration-plan: オーケストレーション計画ファイル

## 実行例
/project:orchestrate "handoffs/orchestrator/p026-full-application.md"

## 処理内容
1. 計画ファイルからステップを読み込み
2. 各ステップを順次実行
3. ステップ内のタスクは並列実行
4. 前ステップの結果を次ステップに引き継ぎ

## ステップ定義例
```yaml
steps:
  - name: "分析フェーズ"
    parallel_tasks:
      - analyze_protocols
      - analyze_hypotheses
      - analyze_reports
  - name: "実行フェーズ"
    parallel_tasks:
      - apply_to_group_1
      - apply_to_group_2
      - apply_to_group_3
```
```

## 7. 実装上の注意点

### 7.1 並列度の制御
- **推奨**: 同時実行は3-5タスクまで
- **理由**: リソース競合とデバッグの困難さを回避

### 7.2 エラーハンドリング
- 各タスクは独立して失敗可能
- 失敗タスクは後で再実行
- 部分的成功も許容

### 7.3 結果の一貫性
- 同一ファイルへの並列アクセスは禁止
- ファイルグループを事前に分割
- 競合が発生しないよう設計

## 8. 期待効果

### 8.1 時間短縮
- **直列処理**: 90ファイル × 1分 = 90分
- **並列処理**: 90ファイル ÷ 5並列 × 1分 = 18分
- **短縮率**: 80%

### 8.2 品質向上
- 独立したセッションでの実行により副作用を防止
- 各タスクの結果を個別に検証可能
- 失敗の局所化

## 9. 次のステップ

1. **環境準備**: MCPサーバーのセットアップまたはfile-basedシステムの選択
2. **タスク定義**: 各並列化パターンの詳細定義（REP-0027、REP-0032、REP-0029参照）
3. **試験実行**: 小規模なファイルセットでテスト
4. **本番実行**: 全対象ファイルへの適用

---

## 更新履歴

- 2025年6月16日 07:30: 初版作成（Clerk Agent）
- 2025年6月17日 14:50: 3つの並列化パターンへの参照を追加（REP-0027、REP-0032、REP-0029）
- 2025年6月17日 15:40: データ並列型処理の実装要件をREP-0032へ移動
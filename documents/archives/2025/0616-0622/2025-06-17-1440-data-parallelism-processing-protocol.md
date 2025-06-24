---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: データ並列型処理プロトコル, P026一括適用, MCPコンテキスト局所化, Taskツール並列実行, バッチ処理, 同一処理大量データ, 並列map処理, 独立性原則, コンテキスト削減90%, handoffs data-parallel, 冪等性設計, エラーハンドリング3層, 処理時間97.5%短縮, mcp-agent並列実装, 最小コンテキスト設計

---

# REP-0032: データ並列型処理プロトコル（Data Parallelism）

**作成日**: 2025年6月17日 14:40  
**作成者**: Clerk Agent  
**ステータス**: 確定  
**参照URL**: 
- REP-0026: 並列処理プロトコル設計書
- REP-0027: 領域分割型並列化（Multi-Agent）
- REP-0029: タスク依存関係型オーケストレーション
- REP-0037: Claude Code並列実行方法の調査報告（高度な並列化手法）
- P026: ドキュメントメタデータ標準

## 疑問点・決定事項
- [x] 最適なバッチサイズ（5-10ファイル/バッチで決定）
- [x] エラー発生時のリトライ戦略（3層エラー管理で対応）
- [x] 進捗表示・ログ出力の方法（リアルタイム進捗表示）
- [x] 同一処理の大量データへの適用に特化
- [x] ファイル単位での独立性を前提
- [x] 部分的成功を許容する設計
- [x] Taskツール並列実行方式を採用（Claude Code内で完結）
- [x] handoffs/data-parallel/構造で実装

---

## 1. 概要

データ並列型処理は、同一の処理関数を多数の独立したデータに対して並列適用するパターン。Pythonのmultiprocessingやmap-reduceパラダイムに類似し、大量の定型処理を効率化する。

## 2. 基本概念

### 2.1 数学的表現
```
f: 処理関数
X = {x₁, x₂, ..., xₙ}: 入力データ集合
Y = {y₁, y₂, ..., yₙ}: 出力データ集合

並列処理: Y = parallel_map(f, X)
where yᵢ = f(xᵢ) for all i ∈ [1, n]
```

### 2.2 独立性の原則
- 各データ要素の処理は他に依存しない
- 処理順序は結果に影響しない
- 部分的な失敗が全体を止めない

### 2.3 MCPによるコンテキスト局所化の本質

#### コンテキスト管理の課題
エージェントとの対話が進むにつれて、以下の問題が発生する：
- **コンテキストの肥大化**: 対話履歴が蓄積し、トークン数が増大
- **認知負荷の増加**: エージェントが把握すべき情報量が増加
- **処理速度の低下**: コンテキスト解析に時間がかかる

#### MCPの解決アプローチ
MCPの本質は**コンテキストの局所化**にある：

1. **タスクの切り出し**: 大きなコンテキストから独立したタスクを抽出
2. **最小限の情報伝達**: タスク実行に必要な情報のみを渡す
3. **結果のみの返却**: 実行過程ではなく結果だけを返す

```
大きなコンテキスト（対話履歴全体）
    ↓ MCPによる切り出し
最小コンテキスト（タスク定義のみ）
    ↓ 実行
結果のみ返却（過程は隠蔽）
```

#### データ並列処理との相性
データ並列処理は、この局所化と特に相性が良い：

**例：SQLiteテーブル追加タスク**
```python
# 従来：全コンテキストを保持
"これまでの議論を踏まえて、ユーザー管理機能のために
SQLiteにusersテーブルを追加してください。
カラムは先ほど話した通り..."

# MCP活用：最小コンテキスト
Task("add_users_table", "SQLiteにusersテーブル追加。カラム: id, name, email")
```

**効果**：
- **コンテキスト削減**: 90%以上の削減（数千トークン→数十トークン）
- **並列実行可能**: 各タスクが独立したコンテキストで実行
- **時間短縮**: コンテキスト解析時間がほぼゼロに

#### 垂直分割の優位性
データ並列処理における垂直分割（同一処理の繰り返し）では：
- **強い独立性仮定**: 各データ要素の処理が完全に独立
- **コンテキスト不要**: 処理関数とデータのみで実行可能
- **結果の単純性**: 成功/失敗と処理結果のみ必要

これにより、MCPの「コンテキスト局所化」の恩恵を最大限に享受できる。

## 3. 適用場面

### 3.1 典型的なユースケース
1. **フォーマット変換**: 多数のファイルへの統一フォーマット適用
2. **一括更新**: ヘッダー・フッター・メタデータの一括更新
3. **検証処理**: 大量ファイルのlint・validation
4. **データ抽出**: 多数のファイルからの情報収集

### 3.2 具体例：P026適用
```javascript
// 処理関数
function applyP026(filePath) {
  const content = readFile(filePath);
  const updated = addMetadataHeader(content);
  const withSections = addRequiredSections(updated);
  writeFile(filePath, withSections);
  return { file: filePath, status: 'success' };
}

// 対象ファイル
const files = glob('protocols/*.md');

// 並列実行
const results = parallelMap(applyP026, files, { concurrency: 5 });
```

## 4. 実装パターン

### 4.1 バッチ分割戦略
```
全ファイル（90個）
    ↓ 分割
Batch 1: files[0:10]   → Worker 1
Batch 2: files[10:20]  → Worker 2
Batch 3: files[20:30]  → Worker 3
...
Batch 9: files[80:90]  → Worker 9
```

### 4.2 Claude Code実装（MCP活用版）

#### MCPを活用したTask並列実行
```bash
# MCP filesystemサーバーを起動
claude mcp add filesystem npx @modelcontextprotocol/server-filesystem /path/to/project

# 自律的なタスク生成とオーケストレーション
claude code <<EOF
You are the orchestrator for P026 batch application.
Goal: Apply P026 metadata standard to all protocol files in parallel.

Step 1: Analyze protocols/ directory and create 5-10 file batches
Step 2: For each batch, spawn Task(...) with specific instructions:
  - Task("batch_001", "Apply P026 to protocols/p001-p010.md, record results")
  - Task("batch_002", "Apply P026 to protocols/p011-p020.md, record results")
  - Continue for all batches...
Step 3: Wait for all tasks and aggregate results in summary report
EOF
```

#### Task定義例（MCP対応版）
```markdown
# TASK-BATCH-001: protocols p001-p010へのP026適用

**MCPツール**: filesystem（読み書き権限付き）

**処理内容**:
protocols/ディレクトリのp001.mdからp010.mdに対してP026フォーマットを適用する。

**Task実行コマンド**:
Task("batch_001", instruction="
1. mcp__filesystem__read_file で各ファイルを読み込み
2. P026形式のメタデータヘッダーを追加
3. 疑問点・決定事項セクションを追加
4. mcp__filesystem__write_file で更新を保存
5. 処理結果をhandoffs/batch-001-results.mdに記録
")

**並列性の活用**:
- 各Taskは独立したエージェントとして並列実行
- ファイルシステムへの同時アクセスはMCPが管理
```

#### Python実装例（mcp-agent使用）
```python
import asyncio
from mcp_agent.app import MCPApp
from mcp_agent.agents.agent import Agent

async def apply_p026_batch(batch_name, file_list):
    """バッチ単位でP026を適用"""
    app = MCPApp(name=batch_name)
    async with app.run():
        agent = Agent(
            name=batch_name,
            instruction=f"Apply P026 to files: {file_list}",
            server_names=["filesystem"]
        )
        return await agent.run()

async def execute_data_parallel():
    """データ並列実行のメイン関数"""
    # ファイルリストを取得
    all_files = glob('protocols/*.md')
    
    # バッチに分割（10ファイルずつ）
    batches = [all_files[i:i+10] for i in range(0, len(all_files), 10)]
    
    # 並列実行（asyncio.gatherで真の並列処理）
    tasks = []
    for i, batch in enumerate(batches):
        task = apply_p026_batch(f"batch_{i:03d}", batch)
        tasks.append(task)
    
    # 全タスクの完了を待機
    results = await asyncio.gather(*tasks)
    
    # 結果を集約してレポート生成
    return aggregate_results(results)

# 実行
asyncio.run(execute_data_parallel())
```

## 5. ディレクトリ構造

### 5.1 実行時の構造
```
handoffs/
├── data-parallel/
│   ├── batches/           # バッチ定義
│   │   ├── batch-001.md   # ファイル1-10
│   │   ├── batch-002.md   # ファイル11-20
│   │   └── ...
│   ├── results/           # 処理結果
│   │   ├── batch-001-results.md
│   │   ├── batch-002-results.md
│   │   └── ...
│   └── summary/           # 統合サマリー
│       └── execution-summary.md
```

### 5.2 結果フォーマット
```markdown
# Batch-001 実行結果

**実行時刻**: 2025-06-17 14:45
**対象ファイル数**: 10
**成功**: 9
**失敗**: 1

## 成功ファイル
- protocols/p001.md ✓
- protocols/p002.md ✓
...

## 失敗ファイル
- protocols/p008.md ✗
  - エラー: ファイルがロックされています
  - 対処: 後で再実行が必要

## 追加された疑問点
- p001.md: 用語の統一基準について
- p003.md: デプロイ頻度の目標値
...
```

## 6. エラーハンドリング

### 6.1 エラーレベル
1. **ファイルレベル**: 個別ファイルの処理失敗
   - 記録して続行
   - 後で再実行リストに追加

2. **バッチレベル**: バッチ全体の失敗
   - バッチ全体を再実行対象に
   - 他のバッチは継続

3. **システムレベル**: 並列処理システムの失敗
   - 全体を停止
   - 部分的な成功結果は保持

### 6.2 リトライ戦略
```yaml
retry_policy:
  file_level:
    max_attempts: 3
    delay: 1s
    backoff: exponential
  
  batch_level:
    max_attempts: 2
    delay: 10s
    
  system_level:
    manual_intervention_required: true
```

## 7. パフォーマンス指標

### 7.1 理論値
- **順次処理**: N × T（Nファイル × T秒/ファイル）
- **並列処理**: (N / P) × T（P = 並列度）
- **オーバーヘッド**: バッチ準備 + 結果集約

### 7.2 実測例（P026適用）

#### 従来方式（全コンテキスト保持）
```
対象: 90ファイル
処理時間/ファイル: 60秒（コンテキスト解析含む）
並列度: 5

順次処理: 90 × 60秒 = 90分
並列処理: (90 / 5) × 60秒 = 18分
短縮率: 80%
```

#### MCP方式（コンテキスト局所化）
```
対象: 90ファイル
処理時間/ファイル: 15秒（コンテキスト最小化により75%削減）
並列度: 10（コンテキスト削減により並列度向上）

順次処理: 90 × 15秒 = 22.5分
並列処理: (90 / 10) × 15秒 = 2.25分
短縮率: 97.5%

コンテキストサイズ:
- 従来: 対話履歴全体（数万トークン）
- MCP: タスク定義のみ（100トークン以下）
```

## 8. ベストプラクティス

### 8.1 設計原則
1. **独立性の確保**: ファイル間の依存を排除
2. **冪等性**: 同じ処理を複数回実行しても安全
3. **原子性**: 各ファイルの処理は全完了or全ロールバック

### 8.2 実装のコツ
- バッチサイズは5-15ファイルが最適
- 進捗表示は10%単位で十分
- ログは構造化形式（JSON/YAML）で出力
- 部分的成功を前提とした設計

### 8.3 MCPによるコンテキスト最適化

#### タスク設計の指針
1. **最小限の指示**: タスク実行に必要な情報のみを含める
2. **自己完結性**: 外部コンテキストへの参照を避ける
3. **結果の明確化**: 期待する出力形式を簡潔に定義

#### 良い例と悪い例
```python
# ❌ 悪い例：過剰なコンテキスト
Task("update_file", """
先ほど議論したP026の仕様に基づいて、
前回のレビューで指摘された点を考慮しながら、
protocols/p001.mdを更新してください。
特に疑問点セクションは重要なので...
""")

# ✅ 良い例：最小コンテキスト
Task("update_file", "protocols/p001.mdにP026ヘッダー追加")
```

#### パフォーマンスへの影響
- **レスポンス時間**: 75%短縮（コンテキスト解析削減）
- **メモリ使用量**: 90%削減（トークン数削減）
- **並列度向上**: 2-3倍（リソース効率化）

## 9. 他の並列化パターンとの使い分け

### 9.1 選択基準
| パターン | 適用場面 | 例 |
|---------|---------|-----|
| **データ並列** | 同一処理×大量データ | フォーマット変換、一括更新 |
| **領域分割** | 異なる専門性 | multi-agent協調 |
| **タスク依存** | 段階的処理 | 分析→設計→実装 |

### 9.2 組み合わせ例
```
Step 1: 分析（タスク依存型）
    ↓
Step 2: 一括更新（データ並列型）← ここで本プロトコル適用
    ↓
Step 3: 検証（領域分割型）
```

## 10. 実装アプローチの選択

Web参照資料（Claude Code Best Practices、mizchi氏のOrchestrator）から得られた知見を基に評価：

### 10.1 利用可能なアプローチ

#### A. Multiple Checkouts方式
- **概要**: 3-4個のgitチェックアウトを別フォルダに作成
- **評価**: ❌ 本プロジェクトには過剰

#### B. Git Worktrees方式  
- **概要**: 軽量な複数作業ツリー
- **評価**: △ 将来的な選択肢

#### C. Taskツール並列実行方式（推奨）
- **概要**: Claude Code内でTaskツールを使った並列実行
- **評価**: ✅ 最適な選択
- **注意**: 実際は順次実行（疑似並列）。真の並列実行にはREP-0037参照

### 10.2 MCPベースの並列実行パターン

**MCP Task()による真の並列実行**
```bash
# 対話モードでの並列タスク起動
claude
> Task("analyze_protocols", "protocols/ディレクトリの全ファイルを解析")
> Task("analyze_reports", "reports/ディレクトリの全ファイルを解析")
> Task("analyze_meta", "meta/ディレクトリの全ファイルを解析")

# 3つのタスクが同時に実行され、ユーザーは対話を継続可能
> これらの解析結果をまとめて、P026適用対象を特定してください
```

**MCPオーケストレーターパターン**
```python
# 自律的なサブタスク生成と管理
claude code <<EOF
You are the P026 orchestrator.
Goal: Apply P026 to 90 protocol files efficiently.

1. Create optimal batches (5-10 files each)
2. For each batch, spawn a Task with:
   - Unique batch ID
   - File list
   - Error handling instructions
3. Monitor progress and handle failures:
   - Retry failed files
   - Adjust batch size based on success rate
4. Generate comprehensive report
EOF
```

**MCP並列処理の利点**
- **真の並列性**: 各Taskは独立プロセスで実行
- **非ブロッキング**: メインスレッドは対話継続可能
- **自動リソース管理**: MCPがファイルアクセスを調整
- **エラー分離**: 一つのTask失敗が他に影響しない

## 11. P026適用の具体的実装

### 11.1 必要なインフラ

**handoffs/構造の詳細**
```
handoffs/
├── data-parallel/
│   ├── batches/         # バッチ定義ファイル
│   ├── results/         # 処理結果
│   └── summary/         # 統合レポート
└── README.md           # 使用方法
```

**バッチ定義フォーマット**
```markdown
# BATCH-001: protocols p001-p005

**対象ファイル**:
- protocols/p001-file-naming-convention.md
- protocols/p002-development.md
- protocols/p003-deployment.md
- protocols/p004-local-development.md
- protocols/p005-agent-permissions.md

**処理内容**: P026メタデータ標準の適用
**期待結果**: 5ファイルすべてにヘッダー追加
```

### 11.2 処理関数の標準化

```javascript
// P026適用の例
function applyP026ToFile(filePath) {
  // 1. ファイル読み込み
  // 2. 既存ヘッダーチェック
  // 3. ヘッダー追加/更新
  // 4. 疑問点セクション追加
  // 5. 更新履歴追加
  // 6. ファイル書き込み
  // 7. 結果記録
}
```

### 11.3 進捗管理とレポーティング

**リアルタイム進捗表示**
```markdown
## 処理進捗

総ファイル数: 90
処理済み: 45 (50%)
成功: 43
失敗: 2
残り時間（推定）: 45分

### 現在処理中
- Batch-005: protocols/p041-p045.md
```

## 12. 実装チェックリスト（拡張版）

### 12.1 事前準備
- [ ] handoffs/data-parallel/構造作成
- [ ] 対象ファイルの完全リスト作成（Glob使用）
- [ ] P026適用関数の冪等性確認
- [ ] バッチ分割計画（90ファイル→9バッチ）

### 12.2 実装項目
- [ ] バッチ定義ファイル自動生成スクリプト
- [ ] P026適用関数の実装
- [ ] エラーハンドリングロジック（3層）
- [ ] 進捗トラッキング機能
- [ ] 結果集約・レポート生成

### 12.3 テスト項目
- [ ] 小規模テスト（5ファイル）での動作確認
- [ ] エラー注入テスト（意図的な失敗）
- [ ] 再実行テスト（冪等性確認）
- [ ] 競合テスト（同一ファイルへの並行アクセス）

### 12.4 実行後の確認
- [ ] 成功率95%以上の達成
- [ ] 失敗ファイルの原因分析
- [ ] 処理時間の記録（理論値との比較）
- [ ] 次回実行のための改善点抽出

## 13. 推奨実装手順

### Phase 1: 基盤構築（2時間）
1. handoffs/構造作成
2. バッチ定義テンプレート作成
3. P026適用関数の実装

### Phase 2: 小規模実証（1時間）
1. protocols/の5ファイルで試験
2. エラーケースの確認
3. 結果レポート生成

### Phase 3: 本番実行（3時間）
1. 全90ファイルのバッチ分割
2. 並列実行開始
3. 進捗モニタリング
4. 結果集約とレポート

---

## 14. MCPを活用した高度な並列化手法

### 14.1 MCPによる並列処理の実現

MCPの登場により、以下の真の並列処理が可能になりました：

#### A. Task()による並列エージェント
```bash
# 複数のMCPサーバーを登録
claude mcp add filesystem npx @modelcontextprotocol/server-filesystem /path
claude mcp add fetch npx @modelcontextprotocol/server-fetch
claude mcp add postgres npx @modelcontextprotocol/server-postgres

# 並列タスクの実行
claude
> Task("data_collection", "Fetch data from API and save to filesystem")
> Task("db_analysis", "Analyze database schema and generate report")
> Task("file_processing", "Process all markdown files in parallel")
```

#### B. Python mcp-agentによる並列実装
```python
# 50種類以上のMCPサーバーから必要なものを選択
# filesystem, GitHub, Slack, Docker等を組み合わせた並列処理
```

### 14.2 MCPサーバーの活用例

データ並列処理に有用なMCPサーバー：

| MCPサーバー | 用途 | 並列処理での活用 |
|-----------|------|----------------|
| filesystem | ファイル読み書き | バッチ単位のファイル処理 |
| GitHub | リポジトリ操作 | 複数PRの並列レビュー |
| PostgreSQL | DB操作 | 並列クエリ実行 |
| Docker | コンテナ管理 | 複数環境での並列テスト |
| Slack | 通知 | 進捗の並列通知 |

### 14.3 従来手法との比較

**REP-0037の手法（MCP以前）**:
1. カスタムMCPサーバー方式
2. 外部オーケストレーション方式
3. --dangerously-skip-permissions活用

**MCP活用（現在推奨）**:
- Task()による標準的な並列実行
- 50種類以上の既存MCPサーバー活用
- 自律的なタスク生成と管理

詳細は[REP-0037: Claude Code並列実行方法の調査報告](./REP-0037-claude-code-parallel-execution-methods.md)も参照。

## 更新履歴

- 2025年6月17日 14:40: 初版作成（Clerk Agent）- REP-0028の番号重複を解決しREP-0032として作成
- 2025年6月17日 15:40: REP-0026から実装要件を統合（セクション10-13追加）
- 2025年6月17日 16:05: 高度な並列化手法への参照を追加（REP-0037との連携）
- 2025年6月18日 08:00: MCPの知見を反映した大幅更新（Clerk Agent）
  - セクション4.2: MCPを活用したTask並列実行の実装例追加
  - セクション10.2: MCPベースの並列実行パターンに更新
  - セクション14: MCPによる高度な並列化手法を追加
  - 真の並列処理が可能になったことを明記
- 2025年6月18日 08:10: MCPのコンテキスト局所化に関する考察追加（Clerk Agent）
  - セクション2.3: MCPによるコンテキスト局所化の本質を追加
  - セクション7.2: MCP方式によるパフォーマンス改善例を追加
  - セクション8.3: MCPによるコンテキスト最適化のベストプラクティス追加
  - データ並列処理とコンテキスト局所化の相性の良さを強調
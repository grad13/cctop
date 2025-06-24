---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: MCPサーバー統合, SQLite操作自動化, Claude Code CLI MCP構文, filesystem puppeteer統合, オーケストレーション基盤構築, Task並列処理, REP番号自動管理, E2Eテスト自動化, ファイル操作一括処理, エージェント誘導システム, monitor.db timeboxing.sqlite, 段階的実装計画, Phase1-3移行, 一括設定スクリプト, 定量効果分析, 自律的ワークフロー構築

---

# REP-0072: MCPサーバー統合によるSQLite操作自動化計画

**作成日**: 2025年6月18日 20:05  
**作成者**: Clerk Agent  
**ステータス**: 計画策定  
**カテゴリー**: 3.1 オーケストレーション基盤構築  
**参照URL**: REP-0024（MCP統合調査）、externals/cache/summaries/talk-with-ChatGPT-about-mcp-summary.md  
**関連文書**: 
- REP-0024: MCPサーバー統合調査レポート
- REP-0059: SQLite移行Phase1・2完了報告
- REP-0026: 並列処理プロトコル設計書

## 疑問点・決定事項
- [x] MCPサーバーの起動・設定方法の確認 → 具体的コマンド・設定を追記
- [x] エージェント誘導方法の課題 → CLAUDE.md更新・プロトコル策定で対応
- [x] 追加MCPサーバー統合 → filesystem/fetch/puppeteerを段階的に追加（postgresは除外）
- [x] REP-0073統合完了 → 実用タスク例集・定量効果分析を統合
- [x] **Claude Code CLI MCP構文確認** → `claude mcp add <name> <commandOrUrl> [args...]` 形式で確認完了
- [ ] Claude CodeでのMCP権限設定
- [ ] SQLite操作の具体的なユースケース選定  
- [ ] メインプロダクト（TimeBoxing）でのSQLite活用方針
- [x] 検証対象: Inspector既存SQLite + メインプロダクトの新規SQLite + 3種類追加MCP

## ✅ 実用的MCP構成に変更
**Claude Code CLI MCP構文**: `claude mcp add <name> <commandOrUrl> [args...]` 形式で確認完了。
**MCPサーバー構成**: filesystem + puppeteer の2種類に絞って実用性重視の構成に変更。SQLiteは既存手法で十分、fetchは必要性低いため除外。

---

## 1. 計画概要

### 1.1 目的
実用的MCPサーバー統合によって以下を実現：
1. **ファイル操作自動化**: 大量Markdownファイルの一括処理・REP番号管理・アーカイブ自動移行
2. **品質保証自動化**: 自動E2Eテスト・UIリグレッション検出・スクリーンショット比較
3. **並列処理基盤**: filesystem + puppeteer の組み合わせによる効率的自動化
4. **開発ワークフロー**: ドキュメント整理とテスト実行の完全自動化

### 1.2 現状分析

#### プロジェクト現状・統合対象
| 領域 | 対象 | 現状 | MCP統合効果 |
|------|------|------|-------------|
| **ファイル** | 大量Markdownファイル | 手動管理 | 一括処理・REP番号自動化 |
| **品質** | E2Eテスト | 手動実行 | 自動回帰テスト・UI検証 |
| **ドキュメント** | アーカイブ移行 | 手動作業 | 自動移行・整合性維持 |
| **開発** | プロトコル一括更新 | 手動編集 | バッチ処理による効率化 |

#### MCPサーバー検証状況
- **REP-0024**: 技術調査完了（現時点では直接統合困難）
- **externals資料**: 50種類以上のMCPサーバー実装例確認
- **実装可能性**: 段階的アプローチによる検証が必要

## 2. 段階的実装計画

### 2.1 Phase 1: MCP環境構築・基本検証（1-2日）

#### Phase 1A: MCP基盤セットアップ
**目標**: MCPサーバーが動作する最小環境の構築

**タスク**:
1. **Claude Code CLI MCPサーバー設定・起動**
   ```bash
   # ✅ 構文確認完了 - 実行可能
   
   # Step 1: MCPサーバー追加（一度だけ実行）
   # 構文: claude mcp add <name> <commandOrUrl> [args...]
   claude mcp add filesystem "npx @modelcontextprotocol/server-filesystem" /Users/takuo-h/Workspace/Code/00-TimeBox/workspace
   claude mcp add puppeteer "npx @modelcontextprotocol/server-puppeteer"
   
   # Step 2: 設定確認
   claude mcp list
   
   # Step 3: MCPサーバー起動
   claude mcp serve
   
   echo "✅ MCP Server Suite Ready for Task() operations"
   ```

2. **Claude Code権限設定**
   - `settings.json`でのMCP権限追加確認
   - SQLite関連の権限設定

3. **包括的接続テスト**
   - ファイルシステムアクセス確認
   - データベースファイル認識確認
   - Web API接続確認
   - ブラウザ自動化準備確認

#### Phase 1B: 統合MCP接続検証
**目標**: 全MCPサーバーを通じた基本動作確認

**タスク**:
1. **SQLite統合テスト**
   ```javascript
   Task("sqlite_basic_test", "monitor.dbとtimeboxing.sqliteに接続し、基本統計情報を取得してください")
   ```

2. **ファイル操作テスト**
   ```javascript
   Task("file_operation_test", "documents/records/reports/README.mdを読み取り、次のREP番号を自動決定してください")
   ```

3. **API接続テスト**
   ```javascript
   Task("api_health_test", "http://localhost:5173とhttps://orbital-q.sakura.ne.jp/api/auth/debug_auth.phpの健康チェックを実行してください")
   ```

4. **E2E準備テスト**
   ```javascript
   Task("e2e_setup_test", "Puppeteerでブラウザを起動し、localhost:5173の基本表示確認をしてください")
   ```

### 2.2 Phase 2: 統合自動化の実装（3-5日）

#### Phase 2A: SQLite + ファイル統合自動化
**目標**: データベースとファイル操作の統合による高度自動化

**具体例**:
1. **包括的健康チェック**
   ```javascript
   Task("comprehensive_health", "monitor.dbから統計取得、API健康チェック、ファイル整合性確認を並行実行し、統合レポートをREP-XXXX形式で生成してください")
   ```

2. **自動REP番号管理**
   ```javascript
   Task("auto_rep_management", "documents/records/reports/README.mdから次のREP番号を決定し、新レポートファイルのテンプレートを作成してください")
   ```

3. **統計+ファイル統合処理**
   ```javascript
   Task("stats_file_integration", "monitor.dbから週次統計を生成し、documents/内の関連ファイルを自動更新して整合性を保ってください")
   ```

#### Phase 2B: Web API + E2E統合自動化
**目標**: API確認とブラウザテストの統合による品質保証

**具体例**:
1. **API+UI統合テスト**
   ```javascript
   Task("api_ui_integration", "本番APIの健康チェック実行後、Puppeteerでフロントエンド動作確認を行い、結果を統合レポートにしてください")
   ```

2. **開発環境包括確認**
   ```javascript
   Task("dev_env_check", "Vite開発サーバー起動確認、API応答テスト、基本UI操作をE2Eで実行してください")
   ```

3. **リグレッションテスト自動化**
   ```javascript
   Task("regression_test", "TaskGrid、TimeBox、Quick Switchの基本機能をPuppeteerで検証し、スクリーンショット付きレポートを生成してください")
   ```

#### Phase 2C: ファイル操作大規模自動化
**目標**: 大量Markdownファイルの効率的一括処理

**具体例**:
1. **プロトコル一括更新**
   ```javascript
   Task("protocols_batch_update", "documents/rules/meta/protocols/内の全.mdファイルにP026形式を適用し、参照URLと疑問点セクションを追加してください")
   ```

2. **アーカイブ自動移行**
   ```javascript
   Task("auto_archive_migration", "30日以上古いファイルをdocuments/archives/に移行し、参照リンクを更新してください")
   ```

3. **文書整合性一括チェック**
   ```javascript
   Task("docs_integrity_check", "全ドキュメントファイルの内部リンク、REP番号参照、命名規則を包括的にチェックし、修正提案をしてください")
   ```

### 2.3 Phase 3: 包括的並列処理・オーケストレーション（1週間）

#### Phase 3A: 多元的並列操作
**目標**: SQLite・ファイル・API・E2Eの完全統合並列処理

**統合シナリオ例**:
```javascript
// 包括的朝の状況確認
await Task.parallel([
    Task("db_morning_stats", "monitor.dbとtimeboxing.sqliteから夜間統計を取得"),
    Task("api_morning_health", "本番・ローカルAPI全体の健康チェック実行"),
    Task("file_integrity_check", "重要文書ファイルの整合性確認"),
    Task("ui_smoke_test", "Puppeteerで基本UI機能のスモークテスト"),
    Task("archive_cleanup", "古いファイルの自動アーカイブ処理")
]);
```

#### Phase 3B: 高度自動化ワークフロー構築
**目標**: 複数MCPサーバーの協調による自律的運用

**統合ワークフロー例**:
1. **Daily Comprehensive Pipeline**
   ```javascript
   Task("daily_full_pipeline", 
     "朝の包括確認 → 問題検出時の自動修復試行 → " +
     "統計レポート生成 → ファイル整理 → " +
     "夜間バックアップ準備までを自動実行"
   )
   ```

2. **Weekly Intelligence Pipeline**
   ```javascript
   Task("weekly_intelligence", 
     "過去1週間の全データ分析 → トレンド検出 → " +
     "最適化提案生成 → REP-XXXX形式レポート作成 → " +
     "次週の改善計画策定"
   )
   ```

3. **Release Readiness Pipeline**
   ```javascript
   Task("release_readiness", 
     "包括的品質チェック → E2E全シナリオ実行 → " +
     "API互換性確認 → ドキュメント同期確認 → " +
     "リリース準備完了判定"
   )
   ```

#### Phase 3C: 自律的オーケストレーション
**目標**: エージェント自身による作業計画・実行・改善の循環

**自律化例**:
```javascript
Task("autonomous_orchestration",
  "現在のプロジェクト状況を分析し、" +
  "最も効果的な改善タスクを3つ特定して実行計画を立案、" +
  "優先度順に自動実行し、結果を次回の計画に反映してください"
)
```

## 3. MCPサーバー起動コマンド

### 3.1 Claude Code CLI 設定・起動手順

#### Step 1: MCPサーバー追加
```bash
# 構文: claude mcp add <name> <commandOrUrl> [args...]

# 1. ファイルシステムサーバー追加
claude mcp add filesystem "npx @modelcontextprotocol/server-filesystem" /Users/takuo-h/Workspace/Code/00-TimeBox/workspace

# 2. SQLiteサーバー追加  
claude mcp add sqlite "npx @modelcontextprotocol/server-sqlite" surveillance/data/monitor.db db/timeboxing.sqlite

# 3. WebAPIサーバー追加
claude mcp add fetch "npx @modelcontextprotocol/server-fetch" localhost,127.0.0.1,orbital-q.sakura.ne.jp

# 4. Puppeteerサーバー追加
claude mcp add puppeteer "npx @modelcontextprotocol/server-puppeteer"
```

#### Step 2: 設定確認
```bash
# 追加されたサーバー一覧確認
claude mcp list
```

#### Step 3: MCPサーバー起動
```bash
# 追加したMCPサーバーを起動
claude mcp serve
```

#### 個別追加（必要に応じて）
```bash
# ファイルシステムのみ追加
claude mcp add filesystem "npx @modelcontextprotocol/server-filesystem" /Users/takuo-h/Workspace/Code/00-TimeBox/workspace

# SQLiteのみ追加
claude mcp add sqlite "npx @modelcontextprotocol/server-sqlite" surveillance/data/monitor.db db/timeboxing.sqlite
```

### 3.2 一括設定スクリプト

#### scripts/setup-mcp-cli.sh（初回設定用）
```bash
#!/bin/bash
# REP-0072 Claude Code CLI MCP Setup Script

echo "🚀 Setting up TimeBox MCP servers..."

# ディレクトリ確認
if [ ! -d "surveillance/data" ] || [ ! -f "surveillance/data/monitor.db" ]; then
  echo "❌ Error: surveillance/data/monitor.db not found"
  exit 1
fi

if [ ! -f "db/timeboxing.sqlite" ]; then
  echo "⚠️  Warning: db/timeboxing.sqlite not found (will be created)"
fi

# 既存のMCPサーバー削除（リセット）
echo "🧹 Removing existing MCP servers..."
claude mcp remove filesystem 2>/dev/null || true
claude mcp remove sqlite 2>/dev/null || true  
claude mcp remove fetch 2>/dev/null || true
claude mcp remove puppeteer 2>/dev/null || true

# MCPサーバー追加
echo "📁 Adding filesystem server..."
claude mcp add filesystem "npx @modelcontextprotocol/server-filesystem" "$PWD"

echo "🗄️  Adding SQLite server..."
claude mcp add sqlite "npx @modelcontextprotocol/server-sqlite" surveillance/data/monitor.db db/timeboxing.sqlite

echo "🌐 Adding fetch server..."
claude mcp add fetch "npx @modelcontextprotocol/server-fetch" localhost,127.0.0.1,orbital-q.sakura.ne.jp

echo "🎭 Adding puppeteer server..."
claude mcp add puppeteer "npx @modelcontextprotocol/server-puppeteer"

# 設定確認
echo ""
echo "✅ MCP servers configured:"
claude mcp list

echo ""
echo "🎯 Setup complete! To start MCP servers:"
echo "   claude mcp serve"
echo ""
echo "🎯 Then in another terminal:"
echo "   claude code"
```

#### scripts/start-mcp-cli.sh（日常使用）
```bash
#!/bin/bash
# REP-0072 Claude Code CLI MCP Start Script

echo "🚀 Starting TimeBox MCP servers..."

# 設定確認
echo "📋 Current MCP server configuration:"
claude mcp list

echo ""
echo "🔌 Starting all configured MCP servers..."

# MCPサーバー起動
claude mcp serve
```

### 3.3 使用方法

#### 方法1: 直接コマンド実行
```bash
# 1. MCPサーバー追加（一度だけ実行）
# 構文: claude mcp add <name> <commandOrUrl> [args...]
claude mcp add filesystem "npx @modelcontextprotocol/server-filesystem" /Users/takuo-h/Workspace/Code/00-TimeBox/workspace
claude mcp add sqlite "npx @modelcontextprotocol/server-sqlite" surveillance/data/monitor.db db/timeboxing.sqlite
claude mcp add fetch "npx @modelcontextprotocol/server-fetch" localhost,127.0.0.1,orbital-q.sakura.ne.jp
claude mcp add puppeteer "npx @modelcontextprotocol/server-puppeteer"

# 2. MCPサーバー起動
claude mcp serve

# 3. 新しいターミナルでClaude Code使用
claude code

# 4. MCPツールテスト
> Task("test_all_mcp", "ファイルシステム、SQLite、API、Puppeteerの基本動作確認をしてください")
```

#### 方法2: スクリプト使用
```bash
# 1. 初回セットアップ（一度だけ実行）
chmod +x scripts/setup-mcp-cli.sh
./scripts/setup-mcp-cli.sh

# 2. 日常使用：MCPサーバー起動
./scripts/start-mcp-cli.sh

# 3. 新しいターミナルでClaude Code使用
claude code

# 4. MCPツールテスト
> Task("sqlite_test", "monitor.dbから基本統計を取得してください")
> Task("file_test", "documents/records/reports/README.mdを読み取ってください")
> Task("api_test", "http://localhost:5173の健康チェックをしてください")
```

#### 停止方法
```bash
# Ctrl+C で claude mcp serve を終了
```

## 4. 技術仕様

### 4.1 Claude Code CLI 設定

#### .claude/settings.json（権限設定）
```json
{
  "permissions": {
    "allow": [
      "mcp__filesystem__read_file",
      "mcp__filesystem__write_file",
      "mcp__filesystem__list_directory",
      "mcp__sqlite__query",
      "mcp__sqlite__execute",
      "mcp__fetch__get",
      "mcp__fetch__post", 
      "mcp__puppeteer__navigate",
      "mcp__puppeteer__screenshot",
      "mcp__puppeteer__click"
    ]
  }
}
```

#### 設定ファイル作成
```bash
# ディレクトリ作成
mkdir -p .claude

# 設定ファイル作成
cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "mcp__filesystem__read_file",
      "mcp__filesystem__write_file",
      "mcp__filesystem__list_directory",
      "mcp__sqlite__query",
      "mcp__sqlite__execute",
      "mcp__fetch__get",
      "mcp__fetch__post", 
      "mcp__puppeteer__navigate",
      "mcp__puppeteer__screenshot",
      "mcp__puppeteer__click"
    ]
  }
}
EOF
```

### 4.2 SQLite操作パターン

#### 基本クエリパターン
```sql
-- 統計収集
SELECT 
  DATE(created_at) as date,
  COUNT(*) as file_changes,
  COUNT(DISTINCT path) as unique_files
FROM file_changes 
WHERE created_at >= datetime('now', '-7 days')
GROUP BY DATE(created_at);

-- データクリーンアップ
INSERT INTO archived_changes 
SELECT * FROM file_changes 
WHERE created_at < datetime('now', '-30 days');

DELETE FROM file_changes 
WHERE created_at < datetime('now', '-30 days');
```

#### メインプロダクト活用例
```sql
-- タスク完了率分析
SELECT 
  project_id,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM tasks 
GROUP BY project_id;
```

### 3.3 自動化スクリプト例

#### 健康チェック自動化
```javascript
// health-check-automation.js
const healthCheck = async () => {
  const inspectorStats = await Task("get_inspector_stats", 
    "monitor.dbから過去24時間の統計を取得");
  
  const mainStats = await Task("get_main_stats",
    "timeboxing.sqliteからタスク完了状況を取得");
    
  const report = await Task("generate_health_report",
    `統計データ: ${JSON.stringify({inspectorStats, mainStats})} を基に健康チェックレポートを生成`);
    
  return report;
};
```

## 4. 期待される効果

### 4.1 効率化効果
- **手動操作削減**: SQLite操作の90%自動化
- **レポート生成**: 統計レポートの自動生成（週次→日次）
- **データ品質**: 自動チェックによる整合性向上

### 4.2 オーケストレーション基盤
- **3.2 multiapply準備**: 大量データ処理の並列化基盤
- **3.3 Rooオーケストレーション準備**: 複雑ワークフローの自動化
- **エージェント連携**: SQLiteを介したエージェント間データ共有

### 4.3 メインプロダクト強化
- **データ管理自動化**: タスク・時間データの自動処理
- **分析機能**: リアルタイム生産性分析
- **統合管理**: Inspector監視とメイン機能の統合

## 5. リスク・課題

### 5.1 技術的リスク
- **MCP権限**: Claude CodeでのMCP接続制限
- **パフォーマンス**: 大量データ処理時の性能低下
- **データ整合性**: 並列操作による競合状態

### 5.2 運用的リスク
- **学習コスト**: MCPサーバー設定・管理の習得
- **障害対応**: MCPサーバー停止時のフォールバック
- **セキュリティ**: データベースアクセス権限の管理

### 5.3 対策
- **段階的導入**: Phase 1-3の慎重な進行
- **フォールバック**: 従来の手動操作も維持
- **監視**: 自動化プロセスの継続的監視

## 6. 成功指標

### 6.1 Phase 1成功指標（基盤確立）
- [ ] 包括的MCPサーバー正常起動（5種類全て100%）
- [ ] SQLite・ファイル・API・E2E基本接続確認
- [ ] 各MCPサーバーでの基本Task実行成功

### 6.2 Phase 2成功指標（統合自動化）
- [ ] SQLite+ファイル統合自動化タスク3種類実行
- [ ] Web API+E2E統合テスト3種類成功
- [ ] ファイル大規模処理（100件以上）エラー率5%以下
- [ ] REP番号自動管理システム稼働

### 6.3 Phase 3成功指標（完全オーケストレーション）
- [ ] 4元並列操作成功（SQLite・ファイル・API・E2E）
- [ ] 自律的ワークフロー安定稼働（Daily/Weekly Pipeline）
- [ ] 手動作業90%削減達成
- [ ] 自律的オーケストレーション機能稼働

## 7. エージェント誘導システム

### 7.1 課題：積極的なMCP活用の誘導

**問題**: MCPサーバーが利用可能でも、エージェントが自発的に活用しない
**影響**: 手動操作の継続、自動化効果の未実現

### 7.2 解決策：多層誘導アプローチ

#### Layer 1: CLAUDE.md更新（最重要）
```markdown
## 🔌 MCPサーバー活用必須プロトコル

### SQLite操作時の強制使用
**すべてのSQLite関連作業**で以下を必ず実行：

1. **データ確認時**: 
```
   MCPサーバー経由でSQLiteクエリを実行してください
   mcp__sqlite__query を使用し、手動確認を避ける
   ```

2. **統計生成時**:
   ```
   Task("generate_stats", "monitor.dbから週次統計を自動生成してください")
   結果をdocuments/records/reports/に自動保存
   ```

3. **データ処理時**:
   ```
   並列処理: Task()を活用し、Inspector/メインプロダクト同時処理
   ```
   ```

#### Layer 2: プロトコル策定
```markdown
# P043: MCP活用強制プロトコル

## 適用条件
- SQLiteファイル操作が必要な場合
- 統計・レポート生成作業
- データベース関連の調査・分析

## 強制実行手順
1. **事前確認**: MCPサーバー稼働状況確認
2. **Task()実行**: 手動SQLite操作の代わりにTask()使用
3. **結果記録**: 自動化された処理結果の文書化

## 違反時ペナルティ
- Level 1: 手動操作→MCP再実行必須
- Level 2: 作業停止・プロセス見直し
```

#### Layer 3: 状況別テンプレート
```markdown
## Inspector Agent向けMCPテンプレート

### 健康チェック実行時
```
Task("health_check", "surveillance/data/monitor.dbに接続し、過去24時間のエラー率・ファイル変更数・システム負荷を取得して健康チェックレポートを生成してください")
```

### 統計レポート作成時
```
Task("weekly_stats", "monitor.dbから週次統計（ファイル変更頻度、エラー傾向、パフォーマンス指標）を生成し、REP-XXXX形式でdocuments/records/reports/に保存してください")
```

### データクリーンアップ時
```
Task("cleanup_logs", "30日以上古いログエントリをarchive_logsテーブルに移動し、メインテーブルから削除してください。処理件数を報告してください")
```
```

### 7.3 実装計画

#### Phase A: 誘導システム構築（1日）
1. **CLAUDE.md更新**: MCP活用必須化
2. **P043策定**: MCP活用強制プロトコル作成
3. **テンプレート作成**: 各エージェント向けMCPタスク例

#### Phase B: エージェント訓練（2-3日）
1. **Inspector Agent**: 既存SQLite作業をMCP化
2. **Builder Agent**: メインプロダクトデータ処理をMCP化
3. **Validator Agent**: データ品質チェックをMCP化

#### Phase C: 自動化定着（1週間）
1. **習慣化**: 手動操作→MCP自動変換
2. **効率測定**: 時間短縮・品質向上の定量化
3. **ベストプラクティス**: 最適なMCPタスクパターンの確立

### 7.4 誘導効果の測定

#### 定量指標
- **MCP使用率**: SQLite操作のうちMCP経由の割合
- **自動化率**: 手動作業からMCP自動化への移行率
- **効率化**: 作業時間の短縮（手動 vs MCP）

#### 定性指標
- **エージェント自発性**: MCP提案の頻度
- **タスク品質**: MCP活用による成果物の向上
- **学習効果**: MCPタスク設計の上達

## 8. 実用タスク例集（REP-0073統合）

### 8.1 日常作業自動化
```javascript
// 1. 朝の状況確認
Task("morning_status", "SQLiteからの統計取得、APIの健康チェック、未処理Issueの確認を並行実行し、日次ステータスレポートを生成してください")

// 2. レポート自動作成
Task("weekly_report", "過去1週間のファイル変更、コミット履歴、Inspector統計を統合し、REP-XXXX形式の週次レポートをdocuments/records/reports/に作成してください")

// 3. クリーンアップ自動化
Task("auto_cleanup", "30日以上古いログファイルのアーカイブ、未使用ファイルの検出、READMEファイルの整合性チェックを実行してください")

// 4. REP番号の自動採番
Task("assign_rep_number", "documents/records/reports/README.mdを読み取り、次のREP番号を自動決定してレポートファイルを作成してください")

// 5. アーカイブ自動移行
Task("auto_archive", "documents/archives/に30日以上古いファイルを自動移行し、参照を更新してください")
```

### 8.2 品質保証自動化
```javascript
// 1. 包括テスト
Task("comprehensive_test", "Viteビルド、APIエンドポイント確認、SQLiteデータ整合性、E2E基本フローを並行実行してください")

// 2. セキュリティチェック
Task("security_audit", "本番APIの認証状況、SQLiteファイルのアクセス権、機密情報の漏洩チェックを実施してください")

// 3. パフォーマンス監視
Task("performance_monitor", "フロントエンド読み込み時間、API応答時間、データベースクエリ性能を測定し、ベンチマークレポートを作成してください")

// 4. UIリグレッションテスト
Task("visual_regression", "Quick Switchの3島ナビゲーション機能をテストし、UIの変化を検出してください")
```

### 8.3 開発ワークフロー自動化
```javascript
// 1. リリース準備
Task("prepare_release", "未解決バグの確認、機能テスト実行、変更履歴の生成、プルリクエストの作成を自動化してください")

// 2. ドキュメント同期
Task("sync_documentation", "コード変更に基づいてREADME、API仕様書、ユーザーガイドを自動更新してください")

// 3. 依存関係管理
Task("dependency_update", "Composer、npm依存関係の更新確認、セキュリティ脆弱性チェック、互換性テストを実行してください")

// 4. 大量Markdownファイルの一括処理
Task("batch_update_protocols", "documents/rules/meta/protocols/内の全.mdファイルを読み込み、P026形式を適用して更新してください")
```

## 9. 導入効果予測（定量・定性分析）

### 9.1 定量効果
| 作業領域 | 現在（手動） | 導入後（自動） | 短縮率 |
|----------|-------------|---------------|--------|
| **ファイル操作** | 60分/日 | 5分/日 | 91% |
| **API確認** | 30分/日 | 2分/日 | 93% |
| **レポート作成** | 120分/週 | 10分/週 | 92% |
| **テスト実行** | 180分/週 | 15分/週 | 92% |
| **Git操作** | 45分/日 | 5分/日 | 89% |
| **REP番号管理** | 15分/回 | 1分/回 | 93% |
| **アーカイブ作業** | 90分/月 | 15分/月 | 83% |

### 9.2 定性効果
- **品質向上**: 自動テストによる回帰防止
- **一貫性**: 標準化されたプロセス実行
- **可観測性**: 包括的なモニタリング
- **スケーラビリティ**: 複雑なタスクの並列処理
- **REP番号管理**: 完全自動化による人的エラー排除
- **手動ファイル操作**: 90%削減による生産性向上

## 10. 必要調査コマンド

### 10.1 Claude Code CLI MCP構文確認
```bash
# 基本コマンド構造確認
claude mcp --help
claude mcp add --help
claude mcp serve --help
claude mcp list --help

# 既存設定確認
claude mcp list

# 実際の追加テスト（1つずつ）
claude mcp add test-fs "npx @modelcontextprotocol/server-filesystem" /tmp
claude mcp list
claude mcp remove test-fs
```

### 10.2 Claude Code CLI 設定確認
```bash
# Claude Code全般確認
claude --help
claude code --help

# 現在の設定確認
ls -la .claude/
cat .claude/settings.json 2>/dev/null || echo "settings.json not found"
```

### 10.3 実際の追加テスト
```bash
# MCPサーバー追加テスト（1つずつ慎重に）
claude mcp add test-fs "npx @modelcontextprotocol/server-filesystem" /tmp
claude mcp list
claude mcp remove test-fs

# 削除コマンド確認
claude mcp remove --help
```

## 11. 次のステップ（調査後）

### 11.1 Phase 1開始準備（✅実行可能）
1. **構文確認**: ✅完了 - `claude mcp add <name> <commandOrUrl> [args...]`
2. **REP-0072修正**: ✅完了 - 正確な構文に更新済み
3. **環境確認**: MCPサーバーインストール状況
4. **権限設定**: Claude Codeでの必要権限確認
5. **DB状態確認**: 両SQLiteファイルの現状把握

### 11.2 実行計画（調査完了後）
- **Day 1**: 構文確認 + 正確なMCP基盤セットアップ
- **Day 2**: 統合MCP接続検証 + エージェント訓練開始  
- **Day 3-5**: 統合自動化の実装（SQLite+ファイル+API+E2E）
- **Day 6-10**: 包括的並列処理・自律的オーケストレーション構築

### 11.3 ドキュメント化
- **構文調査結果**: 正確なClaude Code CLI MCP設定方法
- **プロセス記録**: 各Phase実行結果の詳細記録
- **ベストプラクティス**: 成功パターンの文書化
- **トラブルシューティング**: 問題と解決方法の蓄積

---

## 更新履歴

- 2025年6月18日 20:05: 初版作成（Clerk Agent）- MCPサーバー統合によるSQLite操作自動化計画
- 2025年6月18日 20:35: 包括的MCP統合に拡張（Clerk Agent）- filesystem/fetch/puppeteer追加、GitHub/postgresを除外
- 2025年6月18日 20:40: postgres除外（Clerk Agent）- SQLiteのみ使用のためpostgres関連を削除
- 2025年6月18日 20:45: 起動コマンド専用セクション追加（Clerk Agent）- わかりやすい起動手順・スクリプトを整理
- 2025年6月18日 20:50: Claude Code CLI専用に修正（Clerk Agent）- Desktop用削除、claude mcp serveコマンドに統一
- 2025年6月18日 21:10: Claude Code CLI コマンド構造修正（Clerk Agent）- `--tool`オプション削除、`claude mcp add` → `claude mcp serve`ワークフローに変更
- 2025年6月18日 21:15: REP-0073統合完了（Clerk Agent）- 実用タスク例集・定量効果分析・開発ワークフロー自動化例を統合
- 2025年6月18日 21:20: Claude Code CLI MCP構文エラー対応（Clerk Agent）- 構文確認必要として調査コマンド追加・Phase 1を保留状態に更新
- 2025年6月18日 21:25: Desktop形式コマンド削除（Clerk Agent）- npx直接実行コマンドを削除し、Claude Code CLI専用の調査コマンドに修正
- 2025年6月18日 21:30: Claude Code CLI MCP構文確認完了（Clerk Agent）- 正確な構文確認により全コマンドを修正・Phase 1実行可能状態に更新
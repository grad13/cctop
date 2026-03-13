# MCPとAgentic Coding - 重要コード例抽出

**元ファイル**: inputs/articles/talk-with-ChatGPT-about-mcp.txt  
**抽出日**: 2025年6月18日 07:45  
**抽出者**: Clerk Agent

## 🔑 最重要コード例

### 1. MCPでの並列タスク実行（Python）

```python
import asyncio
from mcp_agent.app import MCPApp
from mcp_agent.agents.agent import Agent

async def run_agent(name, instruction):
    app = MCPApp(name=name)
    async with app.run():
        agent = Agent(name=name, instruction=instruction, server_names=["fs", "fetch"])
        return await agent.run()

async def main():
    # 並列実行
    results = await asyncio.gather(
        run_agent("task_A", "ディレクトリ ./data にあるCSVファイルを集計して"),
        run_agent("task_B", "ウェブページ example.com の見出しを取得して")
    )
    print("A:", results[0])
    print("B:", results[1])

asyncio.run(main())
```

### 2. Claude Codeでの自律的タスク生成

```bash
claude code <<EOF
You are the orchestrator.
Goal: "data/info.txt と https://api.example.com/status を並列で処理し、結果を統合する"
Step 1: 分割タスクを3つ提案して Task(...) で起動
Step 2: 各タスク結果を待機し Then: 結果をまとめて報告
EOF
```

### 3. MCPサーバー設定（claude_desktop_config.json）

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/my/project"]
    }
  }
}
```

### 4. 対話モードでのTask実行

```bash
claude
> Task("task_A", instruction="CSVを集計してください")
> Task("task_B", instruction="example.com の見出しを取得してください")
```

### 5. permissions設定（settings.json）

```json
{
  "permissions": {
    "allow": [
      "mcp__filesystem__read_file",
      "mcp__fetch__fetch_url"
    ]
  }
}
```

## 📌 Task形式の実用例（抜粋）

### filesystem
```
Task("format_code", "プロジェクトの *.js ファイルを読み込んで Prettier でフォーマットしてください")
```

### GitHub
```
Task("create_pr", "リポジトリ foo/bar で新しいブランチを作り README を修正して PR を作成してください")
```

### Slack
```
Task("notify_slack", "開発 #channel に 'ビルドが完了しました' と投稿してください")
```

### PostgreSQL
```
Task("export_schema", "Postgres のテーブル構造を取得し Prisma スキーマとして出力してください")
```

---

**注**: これらは記事中の最も実践的なコード例です。完全なリストは元ファイルを参照してください。
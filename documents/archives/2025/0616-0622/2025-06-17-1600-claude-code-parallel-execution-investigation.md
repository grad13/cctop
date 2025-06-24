---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: Claude Code並列実行, カスタムMCPサーバー, 外部オーケストレーション, 真の並列処理, dangerously-skip-permissions, Pythonオーケストレーター, asyncio並列実行, プロセス管理, Taskツール疑似並列, spawn_claude実装, 並列度制限, タイムアウト管理, バッチ処理自動化, セキュリティリスク評価, 高度な並列化手法

---

# REP-0037: Claude Code並列実行方法の調査報告

**作成日**: 2025年6月17日 16:00  
**作成者**: Clerk Agent  
**ステータス**: 調査完了  
**参照URL**: 
- REP-0032: データ並列型処理プロトコル（基本実装）
- https://www.anthropic.com/engineering/claude-code-best-practices
- https://zenn.dev/mizchi/articles/claude-code-orchestrator

**関連文書**:
- REP-0032では基本的なTaskツール実装を扱い、本文書では高度な並列化手法を扱う

## 疑問点・決定事項
- [x] Claude Code内からの直接起動は不可能
- [x] カスタムMCPサーバー方式は技術的に可能
- [x] 外部オーケストレーション方式が最も現実的
- [x] Taskツールは疑似並列（順次バッチ処理）
- [ ] 実装優先順位の決定
- [ ] セキュリティリスクの評価

---

## 1. 概要

Claude Codeで真の並列処理を実現する方法を調査。現在のTaskツールは順次実行であり、真の並列実行には外部メカニズムが必要。

## 2. 並列実行方法の分類

### 2.1 不可能な方法

#### 直接コマンド実行
```bash
# Claude Code内から
claude -p "別のタスクを実行"
```
**結果**: ❌ 不可能
- Claude CLIは対話型設計
- バックグラウンド実行非対応

#### 標準MCPサーバー
```bash
npx @modelcontextprotocol/server-filesystem
```
**結果**: ❌ 不可能
- MCPは通信プロトコルのみ
- プロセス管理機能なし

### 2.2 部分的に可能な方法

#### Headlessモード
```bash
claude -p "タスク" --json
```
**制限**:
- 単一の質問-回答のみ
- 継続的対話不可
- 複雑なタスク困難

### 2.3 実現可能な方法

## 3. カスタムMCPサーバー方式

### 3.1 実装概要

カスタムMCPサーバーを開発し、プロセス起動機能を追加する方法。

```javascript
// custom-mcp-orchestrator.js
import { Server } from '@modelcontextprotocol/sdk';
import { spawn } from 'child_process';

const server = new Server({
  name: 'claude-orchestrator',
  version: '1.0.0',
});

// Claude起動ツールの定義
server.setRequestHandler('tools/list', () => ({
  tools: [{
    name: 'spawn_claude',
    description: 'Spawn a new Claude Code instance',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        prompt: { type: 'string' },
        workdir: { type: 'string' },
        timeout: { type: 'number', default: 300000 } // 5分
      },
      required: ['taskId', 'prompt']
    }
  }]
}));

// 起動処理の実装
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'spawn_claude') {
    const { taskId, prompt, workdir, timeout } = request.params.arguments;
    
    // 結果ファイルパス
    const resultPath = `handoffs/results/${taskId}.json`;
    
    // Claude起動
    const claude = spawn('claude', [
      '-p', prompt,
      '--json',
      '--dangerously-skip-permissions'
    ], {
      cwd: workdir || process.cwd(),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // タイムアウト設定
    const timeoutHandle = setTimeout(() => {
      claude.kill('SIGTERM');
    }, timeout);
    
    // 結果収集
    let stdout = '';
    let stderr = '';
    
    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    claude.on('close', (code) => {
      clearTimeout(timeoutHandle);
      
      // 結果保存
      const result = {
        taskId,
        status: code === 0 ? 'completed' : 'failed',
        exitCode: code,
        output: stdout,
        error: stderr,
        timestamp: new Date().toISOString()
      };
      
      require('fs').writeFileSync(resultPath, JSON.stringify(result, null, 2));
    });
    
    return {
      toolResult: {
        output: `Started Claude task ${taskId} with PID: ${claude.pid}`
      }
    };
  }
});

// サーバー起動
server.listen();
```

### 3.2 使用方法

1. **MCPサーバー設定**（.claude/mcp.json）
```json
{
  "servers": {
    "orchestrator": {
      "command": "node",
      "args": ["custom-mcp-orchestrator.js"]
    }
  }
}
```

2. **Claude Codeから呼び出し**
```javascript
// 並列タスク起動
const tasks = [
  { id: 'batch-001', prompt: 'protocols/p001-p010.mdにP026適用' },
  { id: 'batch-002', prompt: 'protocols/p011-p020.mdにP026適用' },
  { id: 'batch-003', prompt: 'protocols/p021-p030.mdにP026適用' }
];

for (const task of tasks) {
  await spawn_claude(task.id, task.prompt, '/workspace');
}
```

### 3.3 メリット・デメリット

**メリット**:
- Claude Code内から制御可能
- 真の並列実行
- 結果の自動収集

**デメリット**:
- カスタムサーバー開発必要
- デバッグ複雑
- MCPプロトコルの理解必要

## 4. 外部オーケストレーション方式

### 4.1 Python実装例

```python
#!/usr/bin/env python3
# claude-orchestrator.py

import asyncio
import subprocess
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

class ClaudeOrchestrator:
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.results_dir = Path('handoffs/results')
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
    async def run_claude_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """個別のClaude Codeタスクを実行"""
        async with self.semaphore:
            start_time = time.time()
            
            cmd = [
                'claude',
                '-p', task['prompt'],
                '--json'
            ]
            
            # 権限スキップが必要な場合
            if task.get('skip_permissions', False):
                cmd.append('--dangerously-skip-permissions')
            
            # 作業ディレクトリ
            cwd = task.get('workdir', '.')
            
            print(f"[{datetime.now()}] Starting task: {task['id']}")
            
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            stdout, stderr = await proc.communicate()
            
            elapsed = time.time() - start_time
            
            result = {
                'task_id': task['id'],
                'status': 'completed' if proc.returncode == 0 else 'failed',
                'exit_code': proc.returncode,
                'output': stdout.decode('utf-8'),
                'error': stderr.decode('utf-8'),
                'elapsed_seconds': elapsed,
                'timestamp': datetime.now().isoformat()
            }
            
            # 結果保存
            result_file = self.results_dir / f"{task['id']}.json"
            result_file.write_text(json.dumps(result, indent=2))
            
            print(f"[{datetime.now()}] Completed task: {task['id']} in {elapsed:.2f}s")
            
            return result
    
    async def orchestrate(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """複数タスクを並列実行"""
        print(f"Starting orchestration of {len(tasks)} tasks")
        start_time = time.time()
        
        # 並列実行
        results = await asyncio.gather(
            *[self.run_claude_task(task) for task in tasks],
            return_exceptions=True
        )
        
        # エラーハンドリング
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Task {tasks[i]['id']} failed with exception: {result}")
                results[i] = {
                    'task_id': tasks[i]['id'],
                    'status': 'error',
                    'error': str(result)
                }
        
        elapsed = time.time() - start_time
        
        # サマリー作成
        summary = {
            'total_tasks': len(tasks),
            'completed': sum(1 for r in results if r.get('status') == 'completed'),
            'failed': sum(1 for r in results if r.get('status') in ['failed', 'error']),
            'total_elapsed_seconds': elapsed,
            'timestamp': datetime.now().isoformat(),
            'results': results
        }
        
        summary_file = self.results_dir / 'orchestration-summary.json'
        summary_file.write_text(json.dumps(summary, indent=2))
        
        print(f"\nOrchestration completed in {elapsed:.2f}s")
        print(f"Success: {summary['completed']}/{summary['total_tasks']}")
        
        return results

# P026適用の並列実行例
async def apply_p026_parallel():
    """P026を全プロトコルファイルに並列適用"""
    
    # バッチ定義
    batches = []
    for i in range(0, 90, 10):
        batch_id = f"batch-{i//10 + 1:03d}"
        batches.append({
            'id': batch_id,
            'prompt': f"""
以下のファイルにP026メタデータ標準を適用してください：
- protocols/p{i+1:03d}.md から p{i+10:03d}.md

各ファイルに：
1. 作成日・作成者・ステータスヘッダーを追加
2. 疑問点・決定事項セクションを追加
3. 更新履歴セクションを追加

結果をhandoffs/results/{batch_id}-report.mdに保存してください。
""",
            'workdir': '/workspace',
            'skip_permissions': True
        })
    
    # オーケストレーター実行
    orchestrator = ClaudeOrchestrator(max_concurrent=5)
    await orchestrator.orchestrate(batches)

if __name__ == "__main__":
    # 実行
    asyncio.run(apply_p026_parallel())
```

### 4.2 シェルスクリプト実装例

```bash
#!/bin/bash
# parallel-claude.sh

# 並列実行数の制限
MAX_PARALLEL=5
current_jobs=0

# 結果ディレクトリ
RESULTS_DIR="handoffs/results"
mkdir -p "$RESULTS_DIR"

# ジョブ実行関数
run_claude_job() {
    local task_id=$1
    local prompt=$2
    local workdir=${3:-.}
    
    echo "[$(date)] Starting task: $task_id"
    
    # Claude実行
    claude -p "$prompt" --json --dangerously-skip-permissions \
        > "$RESULTS_DIR/${task_id}.json" 2>&1
    
    local exit_code=$?
    echo "[$(date)] Completed task: $task_id (exit code: $exit_code)"
    
    return $exit_code
}

# バッチ処理
for i in {0..8}; do
    batch_num=$((i + 1))
    task_id=$(printf "batch-%03d" $batch_num)
    start_file=$((i * 10 + 1))
    end_file=$((start_file + 9))
    
    prompt="protocols/p$(printf "%03d" $start_file).mdからp$(printf "%03d" $end_file).mdにP026を適用"
    
    # 並列数制限
    while [ $(jobs -r | wc -l) -ge $MAX_PARALLEL ]; do
        sleep 1
    done
    
    # バックグラウンドで実行
    run_claude_job "$task_id" "$prompt" "/workspace" &
done

# 全ジョブ完了待ち
wait

echo "All tasks completed"
```

### 4.3 メリット・デメリット

**メリット**:
- 真の並列実行
- 柔軟な制御
- エラーハンドリング容易
- 進捗モニタリング可能

**デメリット**:
- Claude Code外部での実装
- `--dangerously-skip-permissions`のセキュリティリスク
- リソース管理が必要

## 5. 実装推奨順位

### Phase 1: Taskツール（疑似並列）
- **利点**: 安全、簡単、即実装可能
- **欠点**: 順次実行、速度向上限定的
- **推奨**: 初期実装として最適

### Phase 2: 外部オーケストレーション
- **利点**: 真の並列、柔軟な制御
- **欠点**: 外部スクリプト必要、セキュリティ考慮
- **推奨**: パフォーマンスが課題になった場合

### Phase 3: カスタムMCPサーバー
- **利点**: Claude内制御、エレガント
- **欠点**: 開発コスト高、複雑
- **推奨**: 長期的な解決策として

## 6. セキュリティ考慮事項

### --dangerously-skip-permissions使用時
1. **信頼できるスクリプトのみ実行**
2. **サンドボックス環境推奨**
3. **入力検証必須**
4. **ログ監査の実施**

### リソース制限
1. **同時実行数制限**（5-10推奨）
2. **タイムアウト設定**（5分/タスク）
3. **メモリ監視**
4. **ディスク容量確認**

## 7. 結論

1. **現状**: Taskツールは疑似並列（順次バッチ処理）
2. **真の並列**: 外部オーケストレーションが現実的
3. **将来**: カスタムMCPサーバーで統合的解決

REP-0032の初期実装では、Taskツールでの効率化から始め、必要に応じて段階的に高度化することを推奨。

---

## 更新履歴

- 2025年6月17日 16:00: 初版作成（Clerk Agent）- Claude Code並列実行方法の調査結果
---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: externalsディレクトリ最適化, キャッシュシステム設計, 大容量ファイル効率化, inputs cache分離, エージェント間情報共有, 要約抽出メタデータ, アクセス効率改善, 379KB HTML処理, 権限管理明確化, キャッシュヒット率, 30日ルール, 100MB上限, ファイル解析コスト削減, 情報共有効率化, ストレージ最適化

---

# REP-0025: externalsディレクトリ最適化計画

**作成日**: 2025年6月16日 23:33  
作成者: Clerk Agent  
ステータス: 計画・承認待ち  

## 1. 概要

externalsディレクトリの構造を最適化し、大容量ファイルへの効率的なアクセスとエージェント間の情報共有を改善する提案。

## 2. 現状の課題

### 2.1 アクセス効率の問題
- **情報量の多さ**: HTMLファイル等、数百KBのファイルが存在
- **毎回の解析コスト**: 379.1KBのHTMLを毎回全文検索する非効率性
- **検索履歴の消失**: 同じ検索を繰り返す無駄

### 2.2 権限管理の曖昧さ
- ユーザー提供ファイルとエージェント生成ファイルの区別がない
- エージェントが誤って元ファイルを編集するリスク

### 2.3 情報共有の非効率
- あるエージェントが抽出した情報を他エージェントが活用できない
- 重複した解析作業の発生

## 3. 提案する構造

### 3.1 ディレクトリ構成

```
externals/
├── inputs/                    # ユーザー専用（エージェント読取専用）
│   ├── articles/             # 記事・ドキュメント
│   ├── screenshots/          # スクリーンショット
│   ├── logs/                 # デバッグログ等
│   └── README.md             # ユーザー向け説明
├── cache/                    # エージェント用キャッシュ（読み書き可能）
│   ├── summaries/            # inputs/の要約
│   │   └── {input-file}-summary.md
│   ├── extracts/             # 重要部分の抽出
│   │   └── {input-file}-extract.md
│   ├── metadata/             # メタ情報
│   │   └── {input-file}-meta.json
│   └── README.md             # キャッシュ運用ルール
└── README.md                 # 全体説明
```

### 3.2 権限設定

| ディレクトリ | ユーザー | Builder | Validator | Clerk | Architect | Inspector |
|------------|----------|---------|-----------|-------|-----------|---------|
| externals/inputs/ | 全権限 | 読取 | 読取 | 読取 | 読取 | 読取 |
| externals/cache/ | 読取 | 読み書き | 読み書き | 読み書き | 読み書き | 読み書き |

## 4. キャッシュシステム設計

### 4.1 要約ファイル（summaries/）

```markdown
# reddit-multi-agent-summary.md

生成日: 2025-06-16 04:30
生成者: Clerk Agent
元ファイル: inputs/articles/reddit-multi-agent.html
ファイルサイズ: 379.1KB

## 検索履歴
1. 2025-06-16 04:30 - "MCP server communication" → 0件
2. 2025-06-16 04:31 - "agent handoff" → 15件
3. 2025-06-16 04:32 - "file-based communication" → 8件

## 文書概要
Redditユーザーによるマルチエージェントシステムの実装記録。4エージェント体制（Architect, Builder, Validator, Scribe）でfile-basedの通信を実現。

## 主要トピック
1. **通信方式**: MULTI_AGENT_PLAN.mdを中心としたファイル共有
2. **エージェント構成**: 4つの専門化されたエージェント
3. **課題と解決**: コンテキスト喪失、作業重複への対処

## 重要な発見
- MCPへの言及なし（file-based中心）
- 手動での再読み込みが前提
- Architectが調停役として機能

## 関連セクション
- エージェント定義: Section 3.2
- 通信プロトコル: Section 4.1
- トラブルシューティング: Section 7

## 次回アクセス推奨
最初にこの要約を読み、必要に応じてextractsの詳細版を参照。
```

### 4.2 抽出ファイル（extracts/）

```markdown
# reddit-multi-agent-extract.md

生成日: 2025-06-16 04:35
生成者: Clerk Agent
元ファイル: inputs/articles/reddit-multi-agent.html

## エージェント間通信の詳細

### MULTI_AGENT_PLAN.mdの構造
```
## Current Sprint
- Task 1: [In Progress - Agent 2] Implement user authentication
- Task 2: [Pending - Agent 3] Write tests for auth module
- Task 3: [Completed] Design database schema
```

### 引き継ぎプロセス
1. エージェントAが作業完了をマーク
2. MULTI_AGENT_PLAN.mdを更新
3. 次のエージェントが定期的にファイルを確認
4. タスクを認識して作業開始

### 重要な引用
> "The key insight was that agents don't need real-time communication. 
> They just need a reliable way to know what's been done and what needs doing."

[その他の重要部分を抽出...]
```

### 4.3 メタデータ（metadata/）

```json
{
  "file_info": {
    "original_path": "inputs/articles/reddit-multi-agent.html",
    "size_bytes": 388198,
    "size_readable": "379.1KB",
    "mime_type": "text/html",
    "created_at": "2025-06-16T04:23:22Z"
  },
  "access_history": [
    {
      "timestamp": "2025-06-16T04:30:00Z",
      "agent": "Clerk",
      "action": "full_scan",
      "duration_ms": 2500
    },
    {
      "timestamp": "2025-06-16T04:35:00Z",
      "agent": "Clerk", 
      "action": "extract_sections",
      "duration_ms": 1200
    }
  ],
  "cache_files": {
    "summary": "cache/summaries/reddit-multi-agent-summary.md",
    "extract": "cache/extracts/reddit-multi-agent-extract.md",
    "last_updated": "2025-06-16T04:35:00Z"
  },
  "key_findings": {
    "topics": ["multi-agent", "file-based", "orchestration"],
    "has_mcp_reference": false,
    "agent_count": 4,
    "communication_method": "file-based"
  }
}
```

## 5. 運用ルール

### 5.1 キャッシュ生成タイミング
1. **初回アクセス時**: 256KB以上のファイルは自動的にキャッシュ生成
2. **検索実行時**: 新しい検索パターンは要約に追記
3. **定期更新**: 元ファイルの更新を検知したら再生成

### 5.2 キャッシュ利用フロー
```
1. アクセス要求
   ↓
2. metadata確認（キャッシュ存在チェック）
   ↓
3. キャッシュあり → summary読み込み
   キャッシュなし → 元ファイル読み込み → キャッシュ生成
   ↓
4. 必要に応じてextractやoriginalにアクセス
```

### 5.3 メンテナンス
- **30日ルール**: 30日間アクセスのないキャッシュは削除候補
- **サイズ制限**: cache/全体で100MBを上限とする
- **更新検知**: 元ファイルのタイムスタンプと比較

## 6. 実装計画

### Phase 1: 基本構造（即時実施）
1. ディレクトリ作成
   ```bash
   mkdir -p externals/inputs/{articles,screenshots,logs}
   mkdir -p externals/cache/{summaries,extracts,metadata}
   ```

2. 既存ファイル移動
   ```bash
   mv externals/*.html externals/inputs/articles/
   ```

3. README作成
   - 各ディレクトリにREADME.mdを配置
   - 運用ルールを明記

### Phase 2: 初期キャッシュ（1-2時間）
1. 大容量ファイルの要約作成
2. メタデータファイル生成
3. 最初の抽出ファイル作成

### Phase 3: 自動化（将来）
1. キャッシュ生成スクリプト
2. 更新検知メカニズム
3. 統計レポート生成

## 7. 期待効果

### 7.1 定量的効果
- **アクセス時間**: 2500ms → 500ms（80%削減）
- **ファイルサイズ**: 379KB → 5-10KB（95%削減）
- **検索効率**: 重複検索の完全排除

### 7.2 定性的効果
- **知識の蓄積**: 検索履歴が次回の作業を加速
- **協調作業**: エージェント間での発見共有
- **安全性向上**: 元ファイルの誤編集防止

## 8. 成功指標

1. **短期（1週間）**
   - すべての大容量ファイルにキャッシュ生成
   - 平均アクセス時間50%以上削減

2. **中期（1ヶ月）**
   - キャッシュヒット率80%以上
   - エージェント間での情報再利用事例5件以上

3. **長期（3ヶ月）**
   - 完全自動化の実現
   - 他プロジェクトへの展開

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| キャッシュの陳腐化 | 高 | タイムスタンプ比較による自動検知 |
| ストレージ増大 | 中 | 30日ルールと容量制限 |
| 誤ったキャッシュ | 高 | 元ファイルへの参照を常に保持 |

## 10. 次のステップ

1. **承認取得**: ユーザーからの実装承認
2. **Phase 1実施**: ディレクトリ構造の作成
3. **試験運用**: 1ファイルでの効果測定
4. **本格展開**: 全ファイルへの適用

---

## 参照URL

**関連レポート**:
- REP-0024: MCPサーバー統合調査レポート（externals関連の提案を本レポートへ分離）

**参考情報**:
- 大容量ファイルの処理パターン
- キャッシュシステムの設計原則

---

## 疑問点・決定事項

### 決定事項
1. **ディレクトリ構成**: inputs/（ユーザー専用）とcache/（エージェント用）の分離
2. **キャッシュ管理**: summaries/、extracts/、metadata/の3層構造
3. **メンテナンスルール**: 30日ルールと100MB上限
4. **キャッシュ生成基準**: 256KB以上のファイルは自動的にキャッシュ生成

### 疑問点（実装時の調整事項）
1. **キャッシュ更新タイミング**: 元ファイル更新の検知方法
2. **キャッシュヒット率の測定**: 統計収集の実装方法
3. **自動化スクリプト**: Python/Node.jsの選択
4. **ストレージ管理**: 100MBを超えた場合の削除優先度
5. **他プロジェクトへの展開**: 汎用テンプレート化の可能性

---
以上
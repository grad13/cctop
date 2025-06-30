# 並列Agent Status管理システム提案

**作成日**: 2025-06-30  
**作成者**: Clerk Agent  
**ステータス**: ドラフト  
**関連**: container/worktree導入に伴うstatus管理改善  

## 1. 背景と課題

### 現状の問題点
- **1Agent = 1statusファイル**の現行設計
- container/worktreeによる同一Agentの並列実行時の競合
- gitコンフリクトによる作業記録の消失リスク

### 新要件
- 同一Agentの複数インスタンス並列実行
- 各インスタンスの独立した進捗管理
- 全体の統合ビュー提供

## 2. 提案するソリューション

### 2.1 ハイブリッド方式（推奨）

```
documents/agents/status/
├── builder.md              # 統合ステータス（read-only）
├── instances/
│   ├── builder-main.md     # mainブランチ作業
│   ├── builder-worktree-{commit}.md
│   └── builder-container-{id}.md
└── archive/
    └── 2025-06-30/
        └── builder-session-*.md
```

### 2.2 実装詳細

#### ファイル構造
1. **統合ステータス（{agent}.md）**
   - 各インスタンスの要約を自動集約
   - 手動編集禁止（自動生成のみ）
   - 全体の進捗状況を一覧化

2. **インスタンスステータス（instances/）**
   - 各環境固有の作業記録
   - 命名規則：`{agent}-{environment}-{identifier}.md`
   - 通常のstatus更新はここに記録

3. **セッションアーカイブ（archive/）**
   - 完了したセッションの移動先
   - 日付ベースの階層管理

#### 自動化スクリプト案
```bash
#!/bin/bash
# status-manager.sh

# 現在の環境を検出
detect_environment() {
    if [ -n "$CONTAINER_ID" ]; then
        echo "container-$CONTAINER_ID"
    elif git rev-parse --git-dir > /dev/null 2>&1; then
        if [ -f "$(git rev-parse --git-dir)/gitdir" ]; then
            echo "worktree-$(git rev-parse --short HEAD)"
        else
            echo "main"
        fi
    else
        echo "unknown"
    fi
}

# statusファイルパスを生成
get_status_file() {
    local agent=$1
    local env=$(detect_environment)
    echo "documents/agents/status/instances/${agent}-${env}.md"
}
```

## 3. 移行計画

### Phase 1: 準備（1日）
- [ ] instances/ディレクトリ作成
- [ ] 既存statusファイルのバックアップ
- [ ] 自動化スクリプトの作成

### Phase 2: 試験運用（3日）
- [ ] 1つのAgentで試験実装
- [ ] 並列実行のテスト
- [ ] 統合ビュー生成の検証

### Phase 3: 全面移行（1週間）
- [ ] 全Agentへの適用
- [ ] CLAUDE.md更新
- [ ] 運用ドキュメント作成

## 4. 考慮事項

### メリット
- **競合回避**: 各インスタンスが独立ファイル
- **履歴保存**: セッション単位の記録保持
- **統合ビュー**: 全体状況の把握が容易
- **段階的移行**: 既存システムとの共存可能

### デメリット
- **ファイル数増加**: 管理対象の増加
- **複雑性**: 初期学習コストの上昇
- **自動化依存**: スクリプトのメンテナンス必要

## 5. 代替案

### 代替案1: データベース方式
- SQLiteでstatus管理
- 利点：高度なクエリ、競合完全回避
- 欠点：テキストエディタでの直接編集不可

### 代替案2: Git Submodule方式
- 各インスタンスを別リポジトリ
- 利点：完全な独立性
- 欠点：管理の複雑化

## 6. 推奨事項

1. **段階的実装**: まずBuilderで試験運用
2. **後方互換性**: 既存の単一status運用も継続可能に
3. **自動化優先**: 手動管理の負担を最小化
4. **定期的な統合**: 1日1回は統合ステータスを更新

## 7. 次のステップ

1. この提案へのフィードバック収集
2. 実装方針の決定
3. プロトコル（P0XX）として正式化
4. 試験実装の開始

---

**注記**: この提案は、システムの成長に伴う自然な進化として、並列実行環境への対応を目指しています。実装の詳細は、実際の運用経験を踏まえて調整されることを想定しています。
---
**アーカイブ情報**
- アーカイブ日: 2025-06-16
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: MCPサーバー統合調査, Model Context Protocol, エージェント間通信実現可能性, Anthropic社MCP開発, サーバークライアント型アーキテクチャ, file-based通信handoffs比較, リアルタイム変更検知, 自動同期状態管理一元化, Claude Code独立セッション制約, 永続サーバープロセス管理, MULTI_AGENT_PLANファイル共有, 非同期処理ポーリングアプローチ, filesystem-server接続権限, TimeBoxプロジェクト適用検討

---

# REP-0024: MCPサーバー統合調査レポート

**作成日**: 2025年6月16日 nodata  
作成者: Clerk Agent  
ステータス: 調査完了  

## 1. 概要

本レポートは、MCP（Model Context Protocol）サーバーを使用したエージェント間通信の実現可能性を調査したものである。

**関連文書**: REP-0025（externalsディレクトリ最適化計画）にて、externals関連の提案を分離

## 2. MCPサーバー統合の可能性

### 2.1 現状分析

#### Reddit記事のアプローチ
- **file-based通信**: MULTI_AGENT_PLAN.mdを中心とした共有ファイル方式
- **手動再読み込み**: 各エージェントが明示的にファイルを再読み込み
- **非同期処理**: リアルタイム性はなく、ポーリング的なアプローチ

#### 現在のTimeBoxプロジェクト
- **handoffs/ディレクトリ**: REP-0022で設計されたファイルベース通信
- **同期的制約**: 同時に複数のエージェントがアクティブにならない前提

### 2.2 MCPサーバーの技術的検討

#### MCPとは
- Anthropic社が開発したModel Context Protocol
- LLMとツール間の標準化されたインターフェース
- サーバー・クライアント型のアーキテクチャ

#### 技術的要件
```bash
# MCPサーバーの基本的な起動例
npx @modelcontextprotocol/server-filesystem \
  --directory /path/to/project \
  --watch
```

#### 統合の可能性
1. **メリット**
   - リアルタイムな変更検知
   - エージェント間の自動同期
   - 状態管理の一元化

2. **課題**
   - Claude Codeの現在の制約（各セッションが独立）
   - MCPサーバーへの接続権限
   - 永続的なサーバープロセスの管理

### 2.3 実現可能性評価

#### 短期的（現実的でない）
- Claude Codeの各インスタンスが独立して動作
- MCPサーバーへの直接接続は権限的に困難
- 永続的なバックグラウンドプロセスの管理が必要

#### 長期的（条件付きで可能）
以下の条件が満たされれば実現可能：
1. Claude CodeがMCPクライアントとして動作する機能追加
2. ローカルMCPサーバーへの接続権限
3. プロジェクト専用のMCPサーバー設定

### 2.4 代替案：擬似MCPシステム

```bash
# 監視スクリプトの例
#!/bin/bash
# watch-handoffs.sh
while true; do
  inotifywait -e modify,create handoffs/*/inbox/
  # 変更検知時の処理
  echo "New handoff detected at $(date)"
done
```

このようなスクリプトをユーザー側で実行し、変更を検知して通知する仕組みが現実的。

## 3. 現状の対案

### 3.1 file-basedシステムの継続

現在、REP-0022で設計されたhandoffs/ディレクトリを使用したfile-basedのエージェント間通信が最も現実的である。

### 3.2 擬似リアルタイム通知の検討

上記の監視スクリプトをユーザー側で実行することで、部分的にリアルタイム性を実現できる可能性がある。

## 4. 将来の展望

### 4.1 Claude CodeのMCP対応

Claude CodeがMCPクライアント機能をサポートした場合、以下が可能になる：
- リアルタイムなエージェント間通信
- 自動的な変更検知と同期
- より高度なオーケストレーション

### 4.2 必要な機能

1. **MCPクライアントAPI**: Claude Code内でのMCP接続機能
2. **権限管理**: ローカルMCPサーバーへの接続許可
3. **永続的プロセス**: セッション間でのサーバー状態保持

## 5. 結論

MCPサーバー統合は技術的に興味深いが、現時点では実現困難。主な理由：

1. **技術的制約**: Claude Codeの各インスタンスが独立動作
2. **権限制約**: MCPサーバーへの接続権限が不足
3. **アーキテクチャ**: 永続的なバックグラウンドプロセス管理が困難

現状では、REP-0022で設計されたfile-basedのhandoffs/システムが最も現実的なソリューションである。

### 推奨事項

1. **短期**: file-basedシステムの最適化に注力
2. **中期**: 監視スクリプトによる擬似リアルタイム化
3. **長期**: Claude CodeのMCP対応を待つ

---

## 参照URL

**関連レポート**:
- REP-0022: エージェント間受け渡しシステム設計書（現在のfile-basedシステム）
- REP-0025: externalsディレクトリ最適化計画（externals関連の提案）

**インスピレーション元**:
- [How I built a multi-agent orchestration system using Claude Code and MCP](https://www.reddit.com/r/ClaudeAI/comments/1l11fo2/how_i_built_a_multiagent_orchestration_system/) - Reddit記事

**MCP関連**:
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP公式サイト

---

## 疑問点・決定事項

### 決定事項
1. **MCP統合の現実性**: 現時点では実現困難と判断
2. **代替案**: file-basedシステム（handoffs/）の継続使用
3. **擬似リアルタイム通知**: ユーザー側での監視スクリプト実行
4. **externals関連**: REP-0025へ分離

### 疑問点（将来的な課題）
1. **Claude CodeのMCP対応時期**: ロードマップが不明
2. **MCPサーバーの権限管理**: セキュリティの確保方法
3. **永続的プロセスの管理**: セッション間での状態保持
4. **パフォーマンス影響**: MCPサーバーのオーバーヘッド
5. **既存システムとの統合**: file-basedからMCPへの移行方法

---
以上
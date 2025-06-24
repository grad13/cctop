# REP-0092: Handoffs Pendingディレクトリ構造調査報告

**作成日**: 2025年6月24日  
**作成者**: Clerk Agent  
**カテゴリ**: システム調査・分析  
**ステータス**: 調査完了  

## 概要

passage/handoffs/のディレクトリ構造について、当初設計（inbox/outbox）と実際の実装（pending/in-progress）の違いを調査した結果を報告する。

## 調査結果

### 1. 当初の設計（REP-0022）
```
handoffs/
├── {agent}/
│   ├── inbox/     # 受信ボックス
│   └── outbox/    # 送信ボックス
```

**設計思想**：
- 各エージェントが独自のinbox/outboxを持つ
- エージェント間の直接通信を禁止
- ファイルベースの非同期通信

### 2. 実際の実装（現在）
```
handoffs/
├── pending/
│   ├── to-builder/     # Builder向け処理待ち
│   ├── to-validator/   # Validator向け処理待ち
│   ├── to-clerk/       # Clerk向け処理待ち
│   └── to-inspector/   # Inspector向け処理待ち
├── in-progress/
│   └── {agent}/        # 処理中のタスク
├── {agent}/            # 各エージェント完了タスク
└── user/outbox/        # ユーザーからの指示
```

### 3. 設計と実装の違い

#### 主要な変更点
1. **pending/ディレクトリの導入**
   - 全エージェントの処理待ちタスクを集約
   - より明確な状態管理（pending → in-progress → completed）
   - 一目で未処理タスクが把握可能

2. **in-progress/ディレクトリの追加**
   - 処理中のタスクを明示的に管理
   - 進行状況の可視化

3. **inbox/outboxの廃止**
   - より直感的なディレクトリ名
   - ワークフローステートに基づく構造

### 4. 現在の実装の利点

1. **状態管理の明確化**
   - pending: 未処理
   - in-progress: 処理中
   - {agent}/: 完了・アーカイブ

2. **管理の簡素化**
   - 新規タスクは全て`pending/to-{agent}/`に配置
   - 処理開始時に`in-progress/{agent}/`に移動
   - 完了後は各エージェントディレクトリに保存

3. **検索性の向上**
   - 未処理タスクがpending/に集約
   - エージェントごとのフィルタリングが容易

### 5. ドキュメントの不整合

以下のドキュメントが古い設計（inbox/outbox）を参照している：
- passage/handoffs/README.md
- passage/handoffs/builder/README.md
- passage/handoffs/shared/quick-start-guide.md
- documents/archives/2025/0616-0622/2025-06-16-2333-agent-handoff-communication-system-design.md（REP-0022）

## 推奨事項

1. **ドキュメント更新**
   - 現在の実装に合わせてREADMEを更新
   - pending/in-progressワークフローの明文化

2. **移行ガイド作成**
   - inbox/outbox思考からpending/in-progress思考への転換
   - 実践的な使用例の追加

3. **completed/ディレクトリの検討**
   - 現在は各エージェントディレクトリに完了タスクを保存
   - 統一的なcompleted/ディレクトリの必要性を検討

## 結論

pending/ディレクトリを使った現在の構造は、当初のinbox/outbox設計より実用的で管理しやすい。ただし、ドキュメントが古い設計を参照しているため、実装に合わせた更新が必要。

## アーカイブ情報
- **カテゴリ**: システム調査
- **関連**: passage/handoffs/, エージェント間通信, pending構造
- **キーワード**: handoffs調査, pending/ディレクトリ, inbox/outbox廃止, 設計実装差異, ワークフロー状態管理, in-progress追加, ドキュメント不整合, REP-0022更新必要, 実用的構造, 状態可視化
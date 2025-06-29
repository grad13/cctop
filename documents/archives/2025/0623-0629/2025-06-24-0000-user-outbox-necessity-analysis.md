---
archived: 2025-06-24
keywords: handoffs, user/outbox, ディレクトリ構造, 対称性, Producer-Consumer, 設計判断, Clerk分析
---

# User Outbox Directory Necessity Analysis

**作成日**: 2025-06-24  
**作成者**: Inspector Agent  
**対象**: passage/handoffs/user/outbox/ ディレクトリ  
**関連文書**: passage/handoffs/README.md, passage/handoffs/user/README.md

## 調査結果サマリー

`user/outbox/` ディレクトリの廃止について調査した結果、**現状維持を推奨**します。user も他のエージェントと同様に扱うことは概念的には魅力的ですが、実装上の特殊性を考慮する必要があります。

## 現在のディレクトリ構造

```
handoffs/
├── pending/{agent}/        # エージェント向け処理待ち
├── in-progress/{agent}/    # エージェント処理中
├── completed/YYYY-MM-DD/{agent}/ # 完了（user含む）
└── user/
    ├── inbox/             # 設計にあるが未実装
    └── outbox/            # ユーザーからの発信
```

## user/outbox/ の現在の役割

### 1. ユーザー起点タスクの初期配置場所
- `task-001-favicon-logging-improvement.md` 
- `builder-agent-takeoff-phase1a.md`
- これらはユーザーが作成し、各エージェントのpending/にコピーされる

### 2. ユーザー決定の発信場所
- エージェントからの質問（question）への回答（decision）
- 新規プロジェクトの開始指示
- システム全体への指令（directive）

### 3. 特殊な権限の表現
- ユーザーは全ディレクトリへの読み書き権限を持つ
- エージェントは指定されたディレクトリのみアクセス可能
- この非対称性を表現する構造として機能

## 他のファイルベース通信システムとの比較

### UNIXメールシステム
- `/var/mail/{user}/` - 受信メール
- `/var/spool/mail/` - 送信待ち
- **類似点**: inbox/outbox の分離

### メッセージキューシステム
- `queue/{consumer}/` - 各コンシューマー向けキュー
- `dlq/` - デッドレターキュー
- **類似点**: pending/{agent}/ の構造

### プロセス間通信
- 名前付きパイプ: `/tmp/{process}.pipe`
- ソケット: `/var/run/{service}.sock`
- **相違点**: 双方向通信が前提

## user/outbox/ 廃止の影響分析

### 廃止した場合の代替案

#### 案1: pending/user/ を使用
```
User creates → pending/user/task-001.md
System copies → pending/builder/task-001.md
```
**問題点**: 
- ユーザーが自分のpending/にタスクを作成する違和感
- 「誰から誰へ」の流れが不明瞭

#### 案2: 直接各エージェントのpending/に配置
```
User creates → pending/builder/task-001.md
```
**問題点**:
- 複数エージェントへの同時配布が困難
- ユーザー作成タスクとエージェント間タスクの区別不可

#### 案3: shared/user-tasks/ を新設
```
User creates → shared/user-tasks/task-001.md
System copies → pending/builder/task-001.md
```
**問題点**:
- shared/ の役割が曖昧になる
- 実質的にuser/outbox/の別名

### 廃止によるメリット
1. ディレクトリ構造の簡略化
2. user を特別扱いしない一貫性
3. エージェント間通信との統一

### 廃止によるデメリット
1. **ユーザー権限の特殊性が不明瞭に**
   - ユーザーは全体を俯瞰し指示を出す特別な存在
   - エージェントとは本質的に異なる役割

2. **ワークフローの起点が不明確に**
   - 現在: user/outbox/ → pending/{agent}/ の明確な流れ
   - 廃止後: どこからタスクが発生したか追跡困難

3. **既存の実装との整合性**
   - REP-0071等の設計文書（現在は見つからないが参照あり）
   - 既に配置されているタスクファイル
   - Quick Start Guideとの不整合（既に存在）

## 推奨事項

### 1. 現状維持を推奨
user/outbox/ は以下の理由で維持すべき：
- ユーザーの特別な役割を明示的に表現
- ワークフローの起点として機能
- 既存実装との互換性

### 2. 改善提案
現在の実装で不足している部分の補完：
- **user/inbox/ の実装**
  - エージェントからの報告・質問を集約
  - ユーザーの意思決定を支援

### 3. 命名の明確化
ディレクトリ名を役割に応じて改善：
```
user/
├── decisions/    # outbox相当：ユーザーの決定・指示
├── reports/      # inbox相当：エージェントからの報告
└── README.md
```

## 結論

`user/outbox/` はユーザーとエージェントの本質的な違いを表現する重要な構造です。廃止よりも、不足している `user/inbox/` の実装や、より直感的な命名への改善を検討することを推奨します。

概念的な一貫性（全員を同じに扱う）よりも、実用的な明確性（役割の違いを構造で表現）を優先すべきです。
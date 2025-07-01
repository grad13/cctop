# PLAN-20250701-033: Code Directory Restructure Plan

**作成日**: 2025年7月1日  
**作成者**: Clerk Agent  
**カテゴリ**: 🏗️ システム移行  
**優先度**: High  
**ステータス**: 計画書作成完了・実行承認待ち  

## 📋 概要

06-cctop/配下のコード関連ディレクトリ（cctop/, worktrees/, containers/）を06-cctop/code/配下に統合し、Agent位置認識エラーと参照の不便さを解消する。

## 🎯 背景・問題

### 現状の問題点
1. **[Agent位置認識エラー]**
   - Agentが`06-cctop/`直下や`06-cctop/cctop/`への誤配置を頻発
   - worktreesが親git管理領域にあることでP045分離原則との混乱
   
2. **[参照の不便さ]**
   - `06-cctop/cctop/`の頻繁な入力が面倒
   - 統一的な呼称（main directory等）がない

### 提案解決策
```
06-cctop/
├── documents/       (親git - ドキュメント管理)
├── passage/         (Agent連携)
└── code/           (コード関連すべて)
    ├── main/        (メインコードベース - 旧cctop/)
    ├── worktrees/   (並行開発 - 旧worktrees/)
    ├── containers/  (コンテナ環境 - 旧containers/)
    └── releases/    (リリースパッケージ - 旧releases/)
```

## 🔄 移行対象

| 移行前 | 移行後 | 説明 |
|--------|--------|------|
| `06-cctop/cctop/` | `06-cctop/code/main/` | メインコードベース |
| `06-cctop/worktrees/` | `06-cctop/code/worktrees/` | Git worktree環境 |
| `06-cctop/containers/` | `06-cctop/code/containers/` | Dockerコンテナ環境 |
| `06-cctop/releases/` | `06-cctop/code/releases/` | リリースパッケージ管理 |

## 📋 実行手順

### Phase 1: 事前準備・調査（実行時間: 30分）

#### 1.1 Builder作業状況確認
- [ ] Builder Agentの現在作業状況確認
- [ ] worktree環境での作業有無確認
- [ ] 作業中断・調整タイミング決定

#### 1.2 参照調査・影響分析
- [ ] CLAUDE.md内の参照パス洗い出し
- [ ] documents/配下の参照パス洗い出し  
- [ ] scripts/設定ファイル内の参照パス洗い出し
- [ ] 外部ツール（Docker Compose等）の設定確認

#### 1.3 バックアップ作成
- [ ] 移行対象ディレクトリの完全バックアップ作成
- [ ] Git状態のスナップショット保存
- [ ] ロールバック手順の準備

### Phase 2: ディレクトリ移行実行（実行時間: 20分）

#### 2.1 新構造作成
- [ ] `06-cctop/code/` ディレクトリ作成
- [ ] `06-cctop/code/main/` ディレクトリ作成
- [ ] `06-cctop/code/worktrees/` ディレクトリ作成
- [ ] `06-cctop/code/containers/` ディレクトリ作成

#### 2.2 段階的移行実行
- [ ] `containers/` → `code/containers/` 移行（影響最小）
- [ ] `worktrees/` → `code/worktrees/` 移行（Builder作業影響あり）
- [ ] `cctop/` → `code/main/` 移行（メインコード）

#### 2.3 移行後確認
- [ ] 各ディレクトリの内容完全性確認
- [ ] Git状態の整合性確認
- [ ] symlink・参照の破損確認

### Phase 3: 参照更新・文書修正（実行時間: 45分）

#### 3.1 Core文書更新
- [ ] **CLAUDE.md**: パス参照・検索ヒント更新
- [ ] **P045プロトコル**: Git管理分離の構造定義更新
- [ ] **CHK006チェックリスト**: 判定ルール・確認項目更新

#### 3.2 Agent関連文書
- [ ] `documents/agents/roles/` 配下の参照パス更新
- [ ] `documents/agents/status/` 配下の参照パス更新
- [ ] handoffs/配下の参照パス更新

#### 3.3 設定ファイル更新
- [ ] `containers/` 配下の設定ファイルパス修正
- [ ] `scripts/` 配下のスクリプトパス修正
- [ ] Docker Compose・Dockerfile内パス修正

### Phase 4: 動作検証・完了処理（実行時間: 15分）

#### 4.1 機能検証
- [ ] メインコード（`code/main/`）の動作確認
- [ ] worktree環境の動作確認
- [ ] container環境の起動確認

#### 4.2 Agent検証
- [ ] 各AgentによるP045判定テスト
- [ ] Git操作前確認（CHK006）テスト
- [ ] 新しい呼称での参照確認

#### 4.3 完了処理
- [ ] 移行完了レポート作成（REP-形式）
- [ ] PLAN-20250701-033をcompleted移行
- [ ] 関連Agent status更新

## 🔧 更新が必要なファイル一覧

### Core Protocol Files（必須更新）
1. **P045プロトコル** (`documents/rules/meta/protocols/p045-git-management-separation-protocol.md`)
   - Git管理構造定義: `code/main/`, `code/worktrees/`, `code/containers/`追加
   
2. **CHK006チェックリスト** (`documents/rules/meta/checklists/chk006-git-operation-verification.md`)
   - 判定ルール更新: 新パス対応

3. **CLAUDE.md**
   - ファイル検索ヒント: cctop/→code/main/
   - Git管理分離説明: 新構造反映

### Configuration Files（要確認・更新）
4. **Docker関連設定**
   - `containers/docker-compose.*.yml`
   - `containers/*/Dockerfile`
   - 相対パス・マウントパス修正

5. **Scripts**
   - `code/main/scripts/` 配下のスクリプト
   - `containers/*/` 配下のスクリプト
   - パス参照の修正

### Documentation Files（要確認・更新）
6. **Agent Status Files**
   - Builder: worktree環境パス参照
   - 他Agent: code/参照がある場合

7. **README.md Files**
   - `containers/README.md`
   - `worktrees/README.md`
   - ディレクトリ構造説明の更新

## ⚠️ リスク・注意事項

### 高リスク項目
1. **Builder作業中断リスク**
   - worktree移行でBuilder作業が中断される可能性
   - 事前調整・適切なタイミング選択必須

2. **Git状態破損リスク**
   - worktree環境移行でGit参照破損の可能性
   - 完全バックアップ・段階的移行で軽減

3. **外部依存関係**
   - Docker Compose、外部スクリプトの設定破損
   - 事前調査・テスト環境での検証必須

### 軽減策
- **段階的実行**: containers→worktrees→main の順で影響最小から実施
- **完全バックアップ**: 全対象ディレクトリの事前バックアップ
- **ロールバック準備**: 各Phase完了後の復旧手順準備
- **Builder調整**: 作業中断・再開の事前調整

## 📊 期待効果

### 即座の効果
1. **Agent混乱解消**: `code/`配下集約で位置関係明確化
2. **参照簡素化**: `code/main/`による言及の簡素化
3. **構造理解向上**: コード関連の論理的集約

### 長期的効果
1. **開発効率向上**: ディレクトリ構造の直感性向上
2. **新規参加者体験**: プロジェクト構造の理解容易性
3. **保守性向上**: 一元化による管理負荷軽減

## 🎯 完了判定基準

### 必須完了条件
- [ ] 全移行対象ディレクトリの正常移行完了
- [ ] P045・CHK006の更新完了・検証済み
- [ ] CLAUDE.mdの参照更新完了
- [ ] 主要機能（main/worktrees/containers）の動作確認完了

### 品質確認項目
- [ ] 各AgentによるP045判定の正常動作
- [ ] Builder Agentによる新worktree環境での作業確認
- [ ] Container環境の正常起動確認
- [ ] 外部スクリプト・設定の正常動作確認

---

**実行承認**: ユーザー承認後、Clerk Agentが段階的実行を開始します。  
**実行時間**: 合計約110分（事前準備30分+移行20分+更新45分+検証15分）  
**影響範囲**: プロジェクト全体（特にBuilder/worktree環境）  
**後戻り可能性**: Phase 2完了まではロールバック容易、Phase 3以降は段階的復旧  
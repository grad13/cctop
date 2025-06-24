# PLAN-20250624-003: Handoffsディレクトリ構造移行計画

**作成日**: 2025年6月24日  
**作成者**: Clerk Agent  
**カテゴリ**: システム移行  
**優先度**: Medium  
**推定作業時間**: 2-3時間  

## 目的

REP-0093に基づき、passage/handoffs/のディレクトリ構造を改善し、completed/ディレクトリを導入する。

## 現状分析

### 現在のファイル配置
```
handoffs/
├── builder/
│   └── fix-object-fingerprint-unique-constraint.md  # 完了タスク？
├── in-progress/
│   └── validator/
│       └── complete-002-test-fixes-batch.md        # 名前は"complete"だが処理中？
├── pending/
│   └── to-clerk/
│       └── claude-md-update-request.md
│   └── to-inspector/
│       ├── P044-L1L2-migration-protocol-improvement-notice.md
│       └── roles-status-separation-notice.md
└── user/outbox/
    ├── builder-agent-takeoff-phase1a.md
    └── task-001-favicon-logging-improvement.md
```

### 移行対象の判定
1. **builder/fix-object-fingerprint-unique-constraint.md** → 完了タスクとして移行
2. **in-progress/validator/complete-002-test-fixes-batch.md** → ファイル内容確認が必要

## 移行計画

### Phase 1: 事前準備（30分）

#### 1.1 バックアップ作成
```bash
# handoffs全体のバックアップ
cd /Users/takuo-h/Workspace/Code/06-cctop/passage
cp -r handoffs handoffs.backup.20250624
```

#### 1.2 移行対象ファイルの確認
- 各エージェントディレクトリ内のファイルを確認
- README.md以外のファイルをリストアップ
- ファイル内容から完了/未完了を判定

#### 1.3 completed/ディレクトリ構造の作成
```bash
cd /Users/takuo-h/Workspace/Code/06-cctop/passage/handoffs
mkdir -p completed/2025-06-24/{builder,validator,clerk,inspector,user}
```

### Phase 2: ファイル移行（1時間）

#### 2.1 完了タスクの移行
```bash
# Builderの完了タスク
mv builder/fix-object-fingerprint-unique-constraint.md completed/2025-06-24/builder/

# Validatorの完了タスク（内容確認後）
# mv in-progress/validator/complete-002-test-fixes-batch.md completed/2025-06-24/validator/
```

#### 2.2 エージェントディレクトリのクリーンアップ
```bash
# README.mdのみ残して、空のディレクトリは削除
# ただし、builder/, validator/, clerk/, inspector/は完全削除の方針
```

#### 2.3 completed/README.md作成
```markdown
# Completed Handoffs

完了したすべてのhandoffタスクを日付別・エージェント別に保管します。

## ディレクトリ構造
completed/
└── YYYY-MM-DD/
    ├── builder/
    ├── validator/
    ├── clerk/
    ├── inspector/
    └── user/

## アーカイブポリシー
- 30日経過後：archive/へ移動
- 90日経過後：圧縮保存
```

### Phase 3: ドキュメント更新（1時間）

#### 3.1 passage/handoffs/README.md更新
- 新しいディレクトリ構造の説明
- ワークフローの更新（pending → in-progress → completed）
- 各ディレクトリの役割明確化

#### 3.2 shared/quick-start-guide.md更新
- 新しいワークフローの説明
- completedディレクトリの使い方
- 具体例の更新

#### 3.3 各エージェントrole文書の更新
- documents/agents/roles/{agent}.mdのhandoffs参照を更新
- 新しいディレクトリ構造に合わせた説明

### Phase 4: 検証とテスト（30分）

#### 4.1 構造検証
- すべてのファイルが適切な場所に配置されているか確認
- README.mdが各必要な場所に存在するか確認
- 権限設定が正しいか確認

#### 4.2 ワークフローテスト
- 新規タスクの作成（pending/to-builder/test-task.md）
- in-progressへの移動テスト
- completedへの移動テスト
- アーカイブプロセスのテスト

### Phase 5: 切り替えと周知（30分）

#### 5.1 CLAUDE.md更新
- passage/handoffs/の新構造について追記
- エージェント向けの注意事項追加

#### 5.2 移行完了報告
- REP-0094として移行完了報告を作成
- 問題点と改善点の記録

## リスク管理

### リスク1: 進行中タスクの誤移動
**対策**: in-progress/内のファイルは内容を確認してから移動

### リスク2: 参照エラー
**対策**: 全ドキュメントの参照を事前にgrepで検索・リストアップ

### リスク3: バックアップからの復旧
**対策**: handoffs.backup.20250624を7日間保持

## チェックリスト

### 事前準備
- [ ] バックアップ作成完了
- [ ] 移行対象ファイルのリストアップ
- [ ] completed/ディレクトリ構造作成

### ファイル移行
- [ ] builder/の完了タスク移行
- [ ] validator/の完了タスク移行
- [ ] 不要なエージェントディレクトリ削除
- [ ] completed/README.md作成

### ドキュメント更新
- [ ] passage/handoffs/README.md更新
- [ ] shared/quick-start-guide.md更新
- [ ] 各エージェントrole文書更新
- [ ] CLAUDE.md更新

### 検証
- [ ] ディレクトリ構造確認
- [ ] ワークフローテスト実施
- [ ] 権限設定確認

### 完了
- [ ] バックアップの保持期間設定
- [ ] 移行完了報告作成
- [ ] チーム周知

## スケジュール案

1. **10:00-10:30**: Phase 1 事前準備
2. **10:30-11:30**: Phase 2 ファイル移行
3. **11:30-12:30**: Phase 3 ドキュメント更新
4. **13:30-14:00**: Phase 4 検証とテスト
5. **14:00-14:30**: Phase 5 切り替えと周知

## 次のステップ

1. このPLANのレビューと承認
2. バックアップ作成から開始
3. 段階的に実行し、各Phaseで問題がないか確認

---

**注**: この移行は可逆的であり、問題が発生した場合はバックアップから復旧可能。
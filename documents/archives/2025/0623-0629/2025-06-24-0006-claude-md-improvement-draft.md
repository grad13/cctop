---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/reports/REP-0090-claude-md-improvement.md
Keywords: claudemd-improvement, documentation-fixes, filepath-correction, protocol-references, git-section-consolidation, tech-stack-integration, readme-targets, protocol-standardization, clerk-agent, draft-proposal
---

# DRAFT: CLAUDE.md改善提案

**作成日**: 2025年6月24日  
**作成者**: Clerk Agent  
**ステータス**: Draft  
**目的**: CLAUDE.mdの不整合修正と改善  

## 📋 発見された問題点と改善案

### 1. ファイルパスの修正

#### 問題点
- 139行目: `documents/agents/role/{agent}.md` （誤）
- 正しいパス: `documents/agents/roles/{agent}.md` （"roles"が正しい）

#### 改善案
```markdown
# 修正前（139行目）
1. **documents/agents/role/{agent}.md読了**（20秒）

# 修正後
1. **documents/agents/roles/{agent}.md読了**（20秒）
```

### 2. P030プロトコルの説明統一

#### 問題点
- 220行目: 「P030: 統合状況管理プロトコル（統合版）」
- 225行目: 「P030（命名規則強制）」← 誤った説明
- 実際のP030は統合状況管理であり、命名規則はP006が担当

#### 改善案
```markdown
# 修正前（223-225行目）
- Bashコマンド実行時: P018（確立済み）
- 開発作業時: P033（開発品質保証）
- file操作時: P030（命名規則強制）

# 修正後
- Bashコマンド実行時: P018（確立済み）
- 開発作業時: P033（開発品質保証）
- file操作時: P006（命名規則強制）
```

### 3. P044プロトコルの正式名称明記

#### 問題点
- 39行目で「P044プロトコル」と記載されているが、正式ファイル名が不明確

#### 改善案
```markdown
# 修正前（39行目）
- **L1→L2移行はP044プロトコルに従って実行**

# 修正後
- **L1→L2移行はP044プロトコルに従って実行** (`p044-l1-l2-migration-protocol.md`)
```

### 4. Git操作セクションの統合

#### 問題点
- Git操作に関する内容が2箇所に分散（104-129行目、131-161行目）

#### 改善案：統合して1つのセクションに
```markdown
## Git操作ポリシー

### 基本ポリシー
- **許可される操作**: コミット、プッシュ、ブランチ作成、マージ、リベース、タグ作成など
- **禁止される操作**: 履歴を破壊的に変更する操作（force push、履歴書き換え等）
- **コミット方針**: 適切なコミットメッセージで変更内容を明記

### 🚨 Git操作前の強制確認（P035適用）

**git commit実行前に必ず以下を自問し、全てYESでなければコミット禁止**：

1. **「documents/agents/status/{agent}.mdは更新済みか？」**
   - 完了作業を記録
   - 次の作業計画を更新
   - 最終更新日時を更新

2. **「タスク完了チェックリストを確認したか？」**
   - `documents/rules/meta/checklists/chk005-task-completion.md`の全項目確認
   - 特にGit操作セクション（5.1）の必須項目

3. **「reports切り出しは完了したか？」**（該当する場合）
   - 完了作業の詳細をreportsへ記録
   - documents/agents/status/{agent}.mdから詳細をreportsに移動

**違反時**: documents/agents/status/{agent}.md未更新でのコミットはincident扱い

### セッション開始時の強制実行手順（P030統合済み）
[以下、既存の内容を継続]
```

### 5. 技術スタック情報の配置改善

#### 問題点
- 技術スタック情報（233-237行）が文書の最後に唐突に配置

#### 改善案：cctopプロジェクト概要セクションに統合
```markdown
## 📦 cctopプロジェクト概要

**cctop (Code Change Top)** は、リアルタイムでファイルの変更を監視し、コード構造の分析を提供する高機能なファイルモニタリングツールです。

### 主要機能
- **リアルタイム監視**: chokidarによる高性能ファイル変更検出
- **イベント追跡**: Find/Create/Modify/Deleteの全イベントを記録
- **メタデータ収集**: ファイルサイズ、行数、タイムスタンプ、inode情報
- **永続化**: SQLite3による全イベントのデータベース保存

### 技術スタック
- **監視ライブラリ**: chokidar@3.5.3
- **データベース**: sqlite3@5.1.6
- **UI Framework**: ink@3.2.0（React Terminal UI）
- **実行環境**: Node.js v24.2.0
```

### 6. README.md更新対象の明確化

#### 問題点
- 「protocols/, records/incidents/, records/reports/等の重要directory」の「等」が曖昧

#### 改善案
```markdown
### 📁 directory操作時のREADME.md更新（必須）
**README.mdは各directoryのメタデータfile**：
1. **file追加/削除/改名** → 即座にREADME.md更新
2. **チェックリスト参照** - `documents/rules/meta/checklists/chk001-directory-operation.md`
3. **.DS_Storeと同じ扱い** - directory状態を常に反映

**更新必須ディレクトリ**:
- `documents/rules/meta/protocols/`
- `documents/rules/meta/checklists/`
- `documents/records/reports/`
- `documents/records/incidents/`
- `documents/visions/specifications/`
- `documents/visions/blueprints/`
- 各エージェントディレクトリ（agents/roles/, agents/status/）

**理念**: 「directory操作 = README.md更新」を一体の作業として扱う
```

### 7. プロトコル参照の標準化

#### 問題点
- プロトコル参照の形式が不統一

#### 改善案：すべてのプロトコルに統一形式を適用
```markdown
### 最重要プロトコル（常時意識）
1. **P000**: システム最上位原則 - 過剰改善防止【永続検証】
2. **P031**: プロセス遵守強制プロトコル（統合版）
3. **P030**: 統合状況管理プロトコル（統合版）

### 状況別適用プロトコル
- Bashコマンド実行時: **P018**（bash実行前確認）
- 開発作業時: **P033**（開発品質保証）
- file操作時: **P006**（命名規則強制）
- バグ・問題対応時: **P028**（技術的負債防止）
- デバッグ・調査時: **P020**（包括的デバッグアプローチ）
- セキュリティ: **P040**（不変要素保護）- `p040-invariant-protection-protocol.md`
- Builder/Validator/Architectエージェント: **P013**（patternsコマンド使用禁止）
- Inspectorエージェント: **P014**（documentsディレクトリでのpatternsコマンド使用禁止）
- アーカイブ管理: **DDD2**（階層メモリメンテナンス原則）
```

## 📝 実装時の注意事項

1. **Dominantセクションは編集禁止**: P040に従い、Dominantセクションへの変更は一切行わない
2. **段階的実装**: 一度にすべて変更せず、セクションごとに確認しながら実装
3. **事前バックアップ**: 編集前に現在のCLAUDE.mdをバックアップ
4. **ユーザー確認**: 大きな構造変更（セクション統合など）は事前にユーザー確認

## 次のステップ

1. このドラフトのレビューと承認
2. 承認された項目から順次CLAUDE.mdへ反映
3. 変更後の動作確認（特にファイルパス修正）
4. documents/agents/status/clerk.mdへの作業記録

---

**注**: このドラフトは改善提案であり、実際の変更にはユーザーの承認が必要です。
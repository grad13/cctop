# PLAN-20250708-001: v0.3.0リリース後改善計画

**作成日**: 2025年7月8日  
**作成者**: Builder Agent  
**Version**: v0.3.0.0対応  
**優先度**: High  

## 📊 現状認識

v0.3.0.0がリリースされ、基本機能（`cctop`フルオートモード、`cctop view`、`cctop daemon`コマンド）は動作確認済み。
しかし、実用性向上とプロジェクト品質向上のために以下の課題が特定された。

## 🎯 特定された課題

### 1. 配色問題 (優先度: Medium)
**症状**: UIの配色が視認性に問題がある箇所が残存  
**影響**: ユーザビリティの低下  
**対象**: blessed UIコンポーネント  

### 2. 重複find問題 (優先度: High)
**症状**: 起動時に既存DBのファイルを再度findイベントとして大量追加  
**影響**: DB肥大化、パフォーマンス低下、データ品質問題  
**対象**: daemon初期スキャンロジック

### 2.5. **Git操作イベント取りこぼし問題** (優先度: **Critical**)
**症状**: git merge/checkout等で大量ファイルが変更されてもcctopが検出しない  
**影響**: 監視ツールとしての信頼性が致命的に損なわれる  
**根本原因**: 
- Git操作は「削除→新規作成（tmp→rename）」でファイル置き換え
- OS側では`unlink + rename`として通知される  
- Chokidarは`change`ではなく`unlink/add`を受信
- 個別ファイル監視時、元inode消失でウォッチャが外れ後続`add`を受信不可
- 結果として「イベントが来ない」状態になる

**技術詳細**:
- [StackOverflow: inotifywait stops working after git checkout](https://stackoverflow.com/questions/59971067/why-does-inotifywait-stop-working-consistently-after-a-git-checkout-on-the-files)
- [StackOverflow: Linux inotify events for rename with overwrite](https://stackoverflow.com/questions/26932459/linux-inotify-events-for-rename-with-overwrite?utm_source=chatgpt.com)
- [GitHub chokidar README.md](https://github.com/paulmillr/chokidar/blob/main/README.md?utm_source=chatgpt.com)
- [GitHub chokidar repository](https://github.com/paulmillr/chokidar?utm_source=chatgpt.com)
- [GitHub chokidar Issue #303](https://github.com/paulmillr/chokidar/issues/303?utm_source=chatgpt.com)

**対策**:
1. **ディレクトリ単位で再帰監視**に変更（個別ファイル監視を停止）
2. **add・unlink・changeの全イベントタイプ**を適切にハンドル  
3. **atomic設定（既定100ms）**を活用し「削除＋再追加」を単一changeとして扱う
4. Git操作特有のファイル置換パターンに対応したイベント処理ロジック実装  

### 3. 仕様乖離問題 (優先度: Medium)
**症状**: 変数名、関数名等がFUNC仕様と乖離している箇所  
**影響**: 保守性、仕様準拠性の低下  
**対象**: コードベース全体  

### 4. README不整合問題 (優先度: High)
**症状**: 現在のREADME.mdがv0.2.x時代の内容でv0.3.0.0と完全不整合  
**影響**: ユーザー混乱、プロジェクト信頼性低下  
**対象**: プロジェクトルートREADME.md  

### 5. GitHub戦略未定義問題 (優先度: Medium)
**症状**: リリース戦略、ブランチ戦略、issue管理戦略が未定義  
**影響**: プロジェクト継続性、コミュニティ形成の阻害  
**対象**: プロジェクト運用全体  

## 📋 解決アクションプラン

### Phase 1: 緊急対応 (1-3日)

#### 1.1 Git操作イベント取りこぼし問題修正 (優先度: **Critical**)
- **担当**: Builder Agent
- **調査項目**:
  - 現在のchokidar設定確認（個別ファイル vs ディレクトリ監視）
  - atomic設定の現在値確認
  - unlink/add/changeイベントハンドリング状況
- **修正方針**:
  - ディレクトリ単位再帰監視への変更
  - atomic設定最適化（100ms調整）
  - Git操作特有パターン対応ロジック追加
  - 全イベントタイプの適切なハンドリング実装

#### 1.2 README更新 (優先度: High)
- **担当**: Builder/Clerk Agent
- **内容**: 
  - v0.3.0.0対応の正確なREADME作成
  - FUNC-104仕様準拠のコマンド説明
  - モジュールアーキテクチャ説明更新
  - インストール・使用方法更新

#### 1.3 重複find問題調査・修正 (優先度: High)
- **担当**: Builder Agent  
- **調査項目**:
  - daemon起動時初期スキャンロジック確認
  - DB既存ファイル確認メカニズム実装状況
  - findイベント重複防止ロジックの有無
- **修正方針**:
  - 既存DBファイル確認→新規ファイルのみfindイベント追加
  - 初期スキャン最適化

### Phase 2: 品質向上 (3-5日)

#### 2.1 配色問題修正 (優先度: Medium)
- **担当**: Builder Agent
- **対象**: blessed UI配色設定
- **方針**: FUNC-108テーマ仕様準拠、視認性優先

#### 2.2 仕様乖離修正 (優先度: Medium)  
- **担当**: Builder/Validator Agent
- **方法**:
  - FUNC仕様との差分分析
  - 段階的リネーミング実施
  - 単体テスト更新

### Phase 3: 戦略策定 (1週間)

#### 3.1 GitHub戦略策定 (優先度: Medium)
- **担当**: Architect/Clerk Agent
- **策定項目**:
  - リリースサイクル（semantic versioning準拠）
  - ブランチ戦略（main/feature/hotfix）
  - Issue/PR管理ルール
  - コミュニティガイドライン

## 🎯 成功指標

### Phase 1 完了指標
- [ ] **Git操作イベント取りこぼし問題が解決済み**
- [ ] git merge/checkout等で全ファイル変更が正確に検出される
- [ ] README.mdがv0.3.0.0仕様と完全一致
- [ ] 重複findイベント問題が解決済み
- [ ] 起動時DBパフォーマンスが改善

### Phase 2 完了指標  
- [ ] 配色問題が全て解決
- [ ] 変数名がFUNC仕様準拠
- [ ] テスト通過率維持

### Phase 3 完了指標
- [ ] GitHub戦略文書作成完了
- [ ] リリースプロセス確立
- [ ] 次期version roadmap策定

## 🔧 実装優先順序

1. **Git操作イベント取りこぼし問題修正** (**Critical** - 即座対応)
2. **README更新** (即座)
3. **重複find問題修正** (優先)  
4. **配色修正** (並行可能)
5. **仕様乖離修正** (段階的)
6. **GitHub戦略策定** (背景タスク)

## 📝 関連文書

- **FUNC-104**: CLI引数・起動挙動仕様
- **FUNC-108**: テーマシステム仕様  
- **FUNC-000**: SQLiteデータベース基盤仕様
- **P017**: ディレクトリ配置ガイドライン

## ⚠️ リスク・制約

- **時間制約**: 早期の品質改善が必要
- **互換性**: 既存DBとの後方互換性維持必須
- **仕様準拠**: FUNC仕様からの逸脱禁止

---

**Next Actions**: Phase 1から順次着手、日次で進捗更新
# P013: 全エージェントpatternsコマンド使用制限プロトコル

**Protocol ID**: P013  
**作成日**: 2025年6月18日 04:00  
**更新日**: 2025年6月18日  
**背景**: patternsコマンド使用による思い込み行動・README.md無視問題の対策  
**適用対象**: Clerk Agent以外の全エージェント  
**前身**: 旧P013（Coder専用）、旧P014（Inspector専用）を統合  

## 📋 概要

Clerk Agent以外のすべてのエージェント（Coder、Inspector、および将来追加される新エージェント）によるpatternsコマンド使用を制限し、適切なREADME.md確認を義務化することで、思い込みに基づく不正確な実装や操作を防ぐ。

## 🚫 制限事項

### patternsコマンド使用の原則禁止
- **制限コマンド**: `patterns`, `find . -name "*.pattern"`, パターン検索系コマンド
- **適用範囲**: Clerk Agent以外のすべてのエージェント
- **例外**: 
  - Clerk Agent: 制限なし（文書管理責務のため）
  - Inspector Agent: surveillance/ディレクトリ内のみ使用可能

### エージェント別詳細

#### 1. Coder Agent
- **制限範囲**: すべてのディレクトリでpatterns使用禁止
- **理由**: 思い込みによる不正確な実装防止
- **代替**: README.md確認、Glob、Read、LS使用

#### 2. Inspector Agent  
- **制限範囲**: documentsディレクトリでのpatterns使用禁止
- **例外**: surveillance/ディレクトリ内では使用可能（自己管理領域）
- **理由**: 統計精度向上、適切なアクセス制御

#### 3. 将来のエージェント（Builder、Validator、Architect）
- **制限範囲**: 原則としてすべてのディレクトリでpatterns使用禁止
- **例外**: 各エージェントの専用ディレクトリ内での使用は個別に定義

## ✅ 必須代替手段

### 1. README.md優先確認
```bash
# 必須手順（すべてのエージェント）
find . -name "README.md" | head -5
cat ./README.md  # 作業ディレクトリのREADME
cat ./<target-directory>/README.md  # 対象ディレクトリのREADME
```

### 2. 適切なツール使用
```bash
# patternsの代わりに使用すべきツール
Glob: ファイルパターンマッチング
Read: ファイル内容確認
LS: ディレクトリリスト
Grep: 内容検索（Inspector Agentはdocuments/で使用禁止）
```

### 3. ディレクトリ構造の理解
```bash
# ディレクトリ構造確認
ls -la <target-directory>/
tree <target-directory>/ -L 2  # 2階層まで表示
```

## ⚠️ 違反時の対応

### 違反検出時
1. **即座停止**: 作業を直ちに中断
2. **ユーザー報告**: 違反内容と理由を報告
3. **代替手段提示**: 適切な代替方法を提案

### 違反パターン
- `patterns src/` → Glob使用を提案
- `patterns documents/` → README.md確認を指示
- `find . -name "*.pattern"` → 具体的なファイル名での検索を提案

## 🎯 期待効果

### 品質向上
- 思い込みによる誤った実装の防止
- README.mdの内容に基づく正確な作業
- ディレクトリ構造の適切な理解

### 効率性
- 無駄な探索時間の削減
- 明確な作業手順の確立
- エージェント間の一貫性確保

## 📚 関連文書

- **P016**: Agent権限マトリックス（エージェント別権限定義）
- **DDD1**: Agent役割必須システム（役割定義）
- **各status/{agent}.md**: エージェント別詳細権限

## 🔄 移行措置

### 旧プロトコルからの移行
1. **旧P013**: Coder専用 → 本プロトコルに統合
2. **旧P014**: Inspector専用 → 本プロトコルに統合
3. **P014番号**: 欠番として管理

### 周知期間
- 2025年6月18日より即時適用
- 各エージェントのstatus/{agent}.mdに反映済み

---

**制定**: 2025年6月18日  
**承認**: ユーザー指示による統合  
**発効**: 即時
---
**アーカイブ情報**
- アーカイブ日: 2025-06-17（プロトコル統合）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/rules/meta/protocols/
- 検索キーワード: P014 Inspector patternsコマンド使用禁止, surveillanceディレクトリ例外, documents README強制確認, エージェント権限制限, 思い込み行動防止, 3レベルエスカレーション, 統計精度向上, patterns禁止プロトコル

---

# P014: Inspectorエージェントpatternsコマンド使用禁止プロトコル

**Protocol ID**: P014  
**作成日**: 2025年6月15日 nodata  
**背景**: Coderと同様の思い込み行動防止、documentsディレクトリへの不適切なアクセス防止  
**適用対象**: Inspector Agent限定  

## 📋 概要

Inspectorエージェントがdocumentsディレクトリでpatternsコマンドを使用することを禁止し、適切なREADME.md確認を義務化する。ただし、surveillance/ディレクトリ内では制約外とする。

## 🚫 禁止事項

### patternsコマンド使用の条件付き禁止
- **禁止コマンド**: `patterns documents/`等、documentsディレクトリに対するpatternsコマンド
- **禁止範囲**: documentsディレクトリおよびそのサブディレクトリに対する操作時
- **例外**: surveillance/ディレクトリ内では使用可能

### 代替手段の強制（documentsディレクトリ操作時）
Inspectorは以下の手順を必ず実行：

1. **README.md優先確認**
   ```bash
   # 必須手順（documentsディレクトリ操作時）
   cat documents/README.md
   cat documents/<target-directory>/README.md
   ```

2. **ディレクトリ構造の理解**
   ```bash
   ls -la documents/<target-directory>/
   ```

3. **必要に応じて具体的ファイル確認**
   ```bash
   ls documents/<target-directory>/*.md
   head -20 documents/<target-directory>/specific-file.md
   ```

### surveillance/ディレクトリ内での自由な操作
surveillance/ディレクトリ内では制約なし：
```bash
# surveillance/内では以下すべて許可
patterns surveillance/
find surveillance/ -name "*.pattern"
# その他すべてのコマンド使用可能
```

## ⚠️ 違反時の対応

### 検出方法
- Inspectorが以下のコマンドを使用した場合は即座違反
  - `patterns documents/`を含むコマンド
  - documentsディレクトリ内でのパターン検索
  - documentsのREADME.md確認なしでの統計分析開始

### エスカレーション
1. **Level 1**: ⚠️ 即座停止・P014再確認・README.md確認義務
2. **Level 2**: 🛑 作業強制停止・Clerkによる手順確認
3. **Level 3**: 🚫 documents統計権限一時制限

## 📈 期待効果

### 直接効果
- **誤統計防止**: documentsの正確な構造理解に基づく統計
- **権限遵守**: Inspector権限範囲の明確化と遵守
- **品質向上**: 正確なドキュメント統計の提供

### 間接効果
- **役割分離**: Inspector/Clerk間の責任範囲明確化
- **効率向上**: surveillance/内での自由な作業による生産性維持
- **信頼性**: documentsに対する正確な分析結果

## 🔍 実装例

### ❌ 禁止される行動パターン
```bash
# documentsに対するこれらは禁止
patterns documents/
patterns documents/rules/meta/
find documents/ -name "*.pattern"
# documentsのREADME.mdを読まずに統計開始
```

### ✅ 推奨される行動パターン
```bash
# documents操作時の必須手順
cat documents/README.md
ls -la documents/
cat documents/rules/meta/README.md

# surveillance/内では自由
patterns surveillance/
find surveillance/ -name "*.js"
# surveillance/内での任意の操作
```

## 📊 効果測定

### 成功指標
- **documents README確認率**: 100%（統計前の必須確認）
- **誤統計発生**: 0件（構造誤解による統計ミス）
- **surveillance/内作業効率**: 現状維持（制約なし）

### 改善指標
- **統計精度**: documentsの正確な構造把握
- **権限遵守率**: 100%（権限外アクセス0）
- **作業効率**: surveillance/内での高い生産性維持

## 🔄 運用ルール

### 適用開始
- **即時適用**: 2025年6月15日より即座に適用開始
- **通知**: Inspectorエージェント起動時の必須確認事項に追加

### 定期見直し
- **月次評価**: 効果測定・改善点の特定
- **プロトコル改善**: 必要に応じた手順の最適化

### 特記事項
- **surveillance/内例外**: surveillance/ディレクトリはInspectorの主管轄のため完全な自由を保証
- **documentsアクセス**: 統計収集時のみ、適切な手順を踏んでアクセス

---

**重要**: このプロトコルはInspectorの統計精度向上と権限遵守を目的としています。surveillance/内での作業効率は維持しつつ、documentsへの適切なアクセスを確保します。
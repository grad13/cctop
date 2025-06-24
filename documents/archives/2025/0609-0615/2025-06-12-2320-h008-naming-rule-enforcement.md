---
**アーカイブ情報**
- アーカイブ日: 2025-06-17（統合移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/rules/meta/hypotheses/
- 検索キーワード: H008命名規則遵守強制メカニズム, design-specification.md畳語違反事例, ファイル操作前必須チェックリスト, ディレクトリ名重複禁止システム, kebab-case形式自動検証, 認知バイアス防止自然な重複感覚, 操作後検証スクリプト実装, 英語のみ簡潔明確命名原則

---

# H008: 命名規則遵守の強制メカニズム

**作成日時**: 2025年6月12日 23:20  
**仮説ID**: H008  
**カテゴリ**: プロセス改善  
**ステータス**: 検証中

## 背景・問題

2025年6月12日、`problem-solution.md`を`design-specification.md`にリネームした際、specificationという単語がディレクトリ名（specifications/）と重複する畳語違反を犯した。

**問題の詳細**:
- ファイル: `specifications/taskgrid/design-specification.md`
- 違反内容: "specification"の重複使用
- 正しい名前: `design.md`または`design-document.md`

## 原因分析

### 直接原因
1. **チェック漏れ**: リネーム時に畳語チェックを実施しなかった
2. **コンテキスト喪失**: 大量のファイル処理中に命名規則への意識が薄れた

### 根本原因
1. **手動チェックの限界**: 人為的なチェックに依存している
2. **実行時検証の欠如**: ファイル作成・リネーム時の自動検証がない
3. **ルール適用の非一貫性**: 同じセッション内でもルール適用に濃淡がある
4. **コンテキスト認識の欠如**: ディレクトリ名を意識せずにファイル名を決定する傾向
5. **一般的な命名パターンへの過度な依存**: 「authentication-roadmap」のような一般的に見える名前を無批判に採用

## 仮説

**「ファイル操作前の強制チェックリストと、操作後の自動検証により、命名規則違反をゼロにできる」**

## 解決策

### 1. ファイル操作前チェックリスト（必須化）
```
新規作成/リネーム前に必ず確認：
□ 英語のみか？
□ kebab-case形式か？
□ ディレクトリ名との重複はないか？
□ 同じ単語の繰り返しはないか？
□ 意味は明確で簡潔か？
```

### 2. 操作後の自動検証スクリプト
```bash
# ファイル名検証スクリプト（例）
check_filename() {
  filename=$1
  dirname=$(dirname $filename)
  
  # 畳語チェック
  if [[ $filename == *specification*specification* ]]; then
    echo "ERROR: 畳語違反"
  fi
  
  # ディレクトリ名との重複チェック
  if [[ $dirname == *specification* && $filename == *specification* ]]; then
    echo "WARNING: ディレクトリ名と重複"
  fi
}
```

### 3. CLAUDE.mdへのルール追加
ファイル操作時の必須プロセスとして追加

## 検証方法

### 測定指標
- 命名規則違反の発生件数
- チェックリスト実行率
- 違反検出から修正までの時間

### 検証期間
2025年6月12日〜2025年6月19日（1週間）

### 成功基準
- 新規違反発生: 0件
- チェックリスト実行率: 100%
- 既存違反の完全修正

## 実行ログ

### 2025年6月12日 23:20
- 仮説設定
- `design-specification.md`を`design.md`に修正完了

### 2025年6月12日 23:40
- 追加の畳語違反を発見・修正：
  - `specifications/authentication/authentication-implementation-specification.md` → `implementation-details.md`
  - `specifications/authentication/authentication-system-overview.md` → `system-overview.md`
  - `specifications/authentication/registration-flow-specification.md` → `registration-flow.md`
  - `roadmaps/taskgrid/taskgrid-roadmap.md` → `roadmap.md`
  - `roadmaps/authentication/authentication-roadmap.md` → `roadmap.md`
- 全関連ドキュメントのリンク更新完了
- **発見**: 新規作成したファイルでも畳語違反が発生していた

## 期待される効果

1. **即時**: 命名規則違反の即座の発見と修正
2. **短期**: 違反発生率の大幅削減
3. **長期**: 命名規則の完全な定着と自動化

## リスクと対策

### リスク
- チェックリストの形骸化
- 自動化スクリプトの保守負担

### 対策
- 定期的なプロセス監査
- スクリプトの段階的な改良

---

### 2025年6月12日 23:50
- CLAUDE.mdにファイル操作時必須チェックリストを追加
- 検証期間開始（2025年6月19日まで）
- **重要な学び**: ディレクトリ名を含めたファイル名を「自然」と感じてしまう認知バイアスの存在

**次のアクション**: 
1. ✅ `design-specification.md`を`design.md`に修正
2. ✅ CLAUDE.mdにファイル操作時チェックリストを追加
3. 簡易検証スクリプトの作成（保留）
4. 1週間の検証実施とデータ収集
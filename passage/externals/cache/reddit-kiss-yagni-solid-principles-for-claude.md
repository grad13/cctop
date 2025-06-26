# Pro Tip: KISS, YAGNI, SOLID - Making Claude Write Better Code

**Source**: Reddit r/ClaudeAI  
**URL**: https://www.reddit.com/r/ClaudeAI/comments/1gqcsn6/pro_tip_these_3_magic_words_will_make_claude/  
**Saved**: 2025-06-26 15:00:12 JST  

## 記事概要

Claudeが冗長で過度に設計されたソリューションを生成する問題を解決するため、3つの開発原則（KISS、YAGNI、SOLID）をプロンプトに追加することで、コードのサイズが半分になり、実際の問題解決に集中したソリューションが得られたという体験談。

## 主要な内容

### 背景となる問題
- Claudeが不要な「what-if」機能を含む肥大化した、過度に設計されたソリューションを生成する
- 実際に必要な機能以外の余分な機能が含まれる

### 解決策：3つの魔法の言葉

#### 1. KISS (Keep It Simple, Stupid)
- **目的**: Claudeに直接的で複雑でないソリューションを書かせる
- **効果**:
  - 過度な設計と不要な複雑さを回避
  - より読みやすく保守しやすいコードの生成

#### 2. YAGNI (You Aren't Gonna Need It)
- **目的**: 憶測的な機能追加を防ぐ
- **効果**:
  - 現在必要なもののみの実装に集中
  - コードの肥大化とメンテナンスオーバーヘッドの軽減

#### 3. SOLID Principles
- **Single Responsibility Principle** (単一責任原則)
- **Open-Closed Principle** (開放閉鎖原則)
- **Liskov Substitution Principle** (リスコフ置換原則)
- **Interface Segregation Principle** (インターフェース分離原則)
- **Dependency Inversion Principle** (依存関係逆転原則)

## 実践的なアドバイス

### 基本戦略
1. **要件の明確化に合意する**
2. **テストと並行してコードを書く**
3. **テストが失敗したらすぐに修正を促す**
4. **技術的負債を避けるためSOLID、YAGNI、KISSの原則に従う**

### 重要な追加指示
```
Claudeに対してコードを書く前に要求を待つよう指示し、
要件が正しく整理されるまでソリューションに飛び込まないよう促す。
人間の開発者と同じように扱う。
```

## 高度なプロンプト構造例

### 要件検証プロトコル
```
REQUIREMENT VALIDATION
Before generating any solution, automatically:
{
  IDENTIFY {
    - Core functionality required
    - Immediate use cases  
    - Essential constraints
  }
  QUESTION when detecting {
    - Ambiguous requirements
    - Speculative features
    - Premature optimization attempts
    - Mixed responsibilities
  }
}
```

### ソリューション生成プロトコル
```
SOLUTION GENERATION PROTOCOL
When generating solutions:
{
  ENFORCE {
    Single_Responsibility: "Each component handles exactly one concern"
    Open_Closed: "Extensions yes, modifications no"
    Liskov_Substitution: "Subtypes must be substitutable"
    Interface_Segregation: "Specific interfaces over general ones"
    Dependency_Inversion: "Depend on abstractions only"
  }
  
  VALIDATE_AGAINST {
    Complexity_Check: "Could this be simpler?"
    Necessity_Check: "Is this needed now?"
    Responsibility_Check: "Is this the right component?"
    Interface_Check: "Is this the minimum interface?"
  }
}
```

### コード生成ルール
```
CODE GENERATION RULES
When writing code:
{
  PRIORITIZE {
    Clarity > Cleverness
    Simplicity > Flexibility
    Current_Needs > Future_Possibilities
    Explicit > Implicit
  }
  
  ENFORCE {
    - Single responsibility per unit
    - Clear interface boundaries
    - Minimal dependencies
    - Explicit error handling
  }
}
```

## 品質管理チェックリスト

ソリューション提示前の確認項目:
- **Simplicity**: これは可能な限り最もシンプルなソリューションか？
- **Necessity**: すべてのコンポーネントが必要か？
- **Responsibility**: 関心事が適切に分離されているか？
- **Extensibility**: 変更なしに拡張可能か？
- **Dependency**: 依存関係が適切に抽象化されているか？

## まとめ

3つの原則（KISS、YAGNI、SOLID）をプロンプトに組み込むことで：
- **コードサイズが半分に削減**
- **実際の問題解決に集中したソリューション**
- **Claudeとの対話が人間の開発者チームメンバーとのマネジメントのように感じられる**

## 実装時の注意点

- 要件が曖昧な場合は質問を促す
- 憶測的機能の追加を防ぐ
- 時期尚早な最適化を避ける
- テスト駆動開発を採用する
- 明確な責任分界を維持する
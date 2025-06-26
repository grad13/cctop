# reddit-kiss-yagni-solid-extract.md

**生成日**: 2025年6月26日 15:00  
**生成者**: Clerk Agent  
**元ファイル**: inputs/articles/reddit-kiss-yagni-solid-principles.html  

## 重要部分抽出

### 核心となる3原則

#### KISS (Keep It Simple, Stupid)
```
目的: Claudeに直接的で複雑でないソリューションを書かせる
効果:
- 過度な設計と不要な複雑さを回避
- より読みやすく保守しやすいコードの生成
```

#### YAGNI (You Aren't Gonna Need It)
```
目的: 憶測的な機能追加を防ぐ
効果:
- 現在必要なもののみの実装に集中
- コードの肥大化とメンテナンスオーバーヘッドの軽減
```

#### SOLID原則
- Single Responsibility Principle (単一責任原則)
- Open-Closed Principle (開放閉鎖原則)
- Liskov Substitution Principle (リスコフ置換原則)
- Interface Segregation Principle (インターフェース分離原則)
- Dependency Inversion Principle (依存関係逆転原則)

### 実用的プロンプト構造

#### 要件検証プロトコル
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

#### ソリューション生成プロトコル
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

#### コード生成ルール
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

### 品質管理チェックリスト

ソリューション提示前の確認項目:
- **Simplicity**: これは可能な限り最もシンプルなソリューションか？
- **Necessity**: すべてのコンポーネントが必要か？
- **Responsibility**: 関心事が適切に分離されているか？
- **Extensibility**: 変更なしに拡張可能か？
- **Dependency**: 依存関係が適切に抽象化されているか？

### 重要な指示文
```
Claudeに対してコードを書く前に要求を待つよう指示し、
要件が正しく整理されるまでソリューションに飛び込まないよう促す。
人間の開発者と同じように扱う。
```

### 実証された効果
- **コードサイズが半分に削減**
- **実際の問題解決に集中したソリューション**
- **Claudeとの対話が人間の開発者チームメンバーとのマネジメントのように感じられる**
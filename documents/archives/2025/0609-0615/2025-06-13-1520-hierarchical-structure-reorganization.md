---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: Documents階層構造再編成, dominants meta concrete階層明確化, dominants ディレクトリ新規作成, meta統合ディレクトリ作成, hypotheses directions移動, CLAUDE.md GUIDELINES.md更新, 階層レベル重要度明確化

---

# Documents階層構造再編成

**作成日時**: 2025年6月13日 15:20

## 実施内容

### 1. 階層構造の明確化
プロジェクトの階層原則に合わせてdocumentsディレクトリを再編成。

**階層定義**:
- **dominant**: 最高位の規則・原則（変更なし）
- **meta**: 仮説や運用規則（hypotheses/directions）
- **concrete**: コード改善やドキュメント保守

### 2. ディレクトリ構造の変更

#### 新規作成
- `/documents/rules/dominants/` - 最高位原則を格納
- `/documents/rules/meta/` - メタレベルの内容を統合

#### 移動
- `documents/hypotheses/h-dominant-*` → `documents/rules/dominants/`
- `documents/hypotheses/` → `documents/rules/meta/hypotheses/`
- `documents/directions/` → `documents/rules/meta/directions/`

### 3. 文書更新

#### CLAUDE.md
- Dominant原則を冒頭に配置
- ファイルパス参照をすべて更新（meta/を追加）

#### GUIDELINES.md
- 新しいディレクトリ構造を反映
- 文書配置ガイドに階層を追加

#### dominants/README.md
- 新規作成
- 最高位原則の説明と運用ルール

### 4. 結果
**階層化されたディレクトリ構造**:
```
documents/
├── dominants/      # 最高位原則（不変）
├── meta/           # メタレベル
│   ├── hypotheses/ # 検証中の仮説
│   └── directions/ # 確立済み方法論
├── specifications/ # 現在の定義
├── roadmaps/      # 将来の計画
├── rules/         # 開発ルール
├── daily/         # 作業記録
└── archive/       # 過去資料
```

## 効果
- プロジェクトの階層原則とディレクトリ構造の一致
- より直感的な文書管理
- 階層レベルによる重要度の明確化
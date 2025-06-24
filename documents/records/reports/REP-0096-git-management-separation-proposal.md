# REP-0096: Git管理分離提案 - 06-cctop vs cctop独立化

**作成日**: 2025年6月24日  
**作成者**: Clerk Agent  
**関連**: Git管理の分離、プロジェクト構造改善  

## 現状分析

### 現在のGit構造
```
06-cctop/                    # 親gitリポジトリ
├── .git/                    # 親git管理
├── CLAUDE.md
├── documents/              # ドキュメント系（親gitで管理）
├── passage/               # エージェント協調（親gitで管理）
├── VERSIONs/              # バージョン履歴（親gitで管理）
└── cctop/                 # コード系ディレクトリ
    ├── .git/              # 子gitリポジトリ（既存）
    ├── src/               # ソースコード（子gitで管理）
    ├── test/              # テスト（子gitで管理）
    └── package.json       # Node.js設定（子gitで管理）
```

### 問題点
- **管理境界の曖昧さ**: 一部ファイルが親gitでコミットされている
- **関心の分離不足**: ドキュメント変更とコード変更が混在
- **責任範囲の不明確さ**: どちらのgitでコミットすべきか判断が困難

## 提案：完全分離アーキテクチャ

### 🎯 目標構造
```
06-cctop/                    # メタプロジェクト管理
├── .git/                    # ドキュメント・管理系専用git
├── CLAUDE.md               # プロジェクト指針
├── documents/              # 全ドキュメント
├── passage/               # エージェント協調システム
├── VERSIONs/              # プロジェクト履歴
└── cctop/                 # 独立したツールプロジェクト
    ├── .git/              # ツール開発専用git（既存）
    ├── src/               # 完全独立したコード
    ├── test/              # 独立したテスト
    └── README.md          # 独立したドキュメント
```

## 実装アプローチ

### ✅ Phase 1: 現状確認（完了済み）
- **親git**: documents/, passage/, CLAUDE.md, VERSIONs/管理
- **子git**: cctop/src/, cctop/test/, cctop/package.json管理
- **重複なし**: .gitignoreで適切に分離済み

### 🔧 Phase 2: 境界の明確化
1. **親git責任範囲**:
   - プロジェクト管理（CLAUDE.md, 全documents/）
   - エージェント協調（passage/）
   - 履歴管理（VERSIONs/, archives/）

2. **子git責任範囲**:
   - ツール開発（src/, test/, package.json）
   - ツール固有設定（jest.config.js, scripts/）
   - ツールドキュメント（cctop/README.md, cctop/docs/）

### 🚀 Phase 3: .gitignore最適化
#### 親git (.gitignore)
```gitignore
# cctopツール全体を除外（子gitが管理）
cctop/

# ただし、プロジェクト履歴は例外
!VERSIONs/
```

#### 子git (cctop/.gitignore)
```gitignore
# Node.js標準除外
node_modules/
*.log
.env

# 親gitが管理する領域を除外
../documents/
../passage/
../CLAUDE.md
../VERSIONs/
```

## 利点・価値

### 🎯 **明確な関心の分離**
- **ドキュメント変更**: 親gitでコミット
- **コード変更**: 子gitでコミット
- **混在なし**: 迷いなく適切なリポジトリを選択

### 🔄 **独立したリリース管理**
- **cctopツール**: 独自のバージョニング・リリース
- **プロジェクト管理**: 独自の履歴・ドキュメント管理
- **相互独立**: それぞれの進化速度で開発可能

### 👥 **エージェント責任の明確化**
- **Builder/Validator**: cctop/内の子gitで作業
- **Architect/Clerk/Inspector**: 親gitでドキュメント管理
- **権限境界**: より明確なagent分担

### 🚀 **将来拡張性**
- **他ツール追加**: cctop以外のツールも同様に独立管理
- **サブプロジェクト**: 複数の独立したツールプロジェクト管理
- **スケーラビリティ**: 大規模プロジェクトへの対応

## 実装手順

### Step 1: 現状の確認・整理
```bash
# 親gitの確認
git status
git log --oneline -5

# 子gitの確認  
cd cctop
git status
git log --oneline -5
```

### Step 2: .gitignore調整
```bash
# 親git: cctop/を除外追加
echo "cctop/" >> .gitignore
echo "!VERSIONs/" >> .gitignore

# 子git: 親git管理領域を除外
cd cctop
echo "../documents/" >> .gitignore
echo "../passage/" >> .gitignore
echo "../CLAUDE.md" >> .gitignore
```

### Step 3: 既存コミットの整理
- 最近の子git対象ファイルが親gitにコミットされていれば移動
- Cherry-pickで適切なリポジトリに移行

### Step 4: CLAUDE.md更新
- Git管理分離の新しいワークフロー記載
- Agent別の使い分け指針追加

## リスク・考慮事項

### ⚠️ **学習コスト**
- **エージェント**: どちらのgitを使うか判断が必要
- **軽減策**: CLAUDE.mdに明確なガイドライン記載

### 🔄 **ワークフロー変更**
- **現在**: 曖昧な使い分け
- **将来**: 明確な境界による使い分け
- **移行期**: 一時的な混乱の可能性

### 🛠️ **ツール連携**
- **CI/CD**: 2つのリポジトリでの設定
- **依存関係**: 相互参照の管理
- **同期**: リリースタイミングの調整

## 結論・推奨

### ✅ **実装推奨**
Git管理の分離は**技術的に完全実現可能**で、以下の理由で強く推奨：

1. **既存構造活用**: 現在の子gitを拡張するだけ
2. **明確な境界**: 迷いのない責任分担
3. **将来性**: スケーラブルなプロジェクト管理
4. **リスク低**: 段階的移行で安全に実装可能

### 📋 **Next Actions**
1. ユーザー承認後、Phase 2の境界明確化から開始
2. .gitignore調整による完全分離実現
3. CLAUDE.md更新でワークフロー確立
4. エージェント向けガイドライン整備

---

**最終判断**: この分離により、プロジェクト管理とツール開発の独立性が確保され、より効率的で明確な開発体制が実現されます。
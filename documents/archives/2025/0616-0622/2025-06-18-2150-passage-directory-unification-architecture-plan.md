---
**アーカイブ情報**
- アーカイブ日: 2025-06-18
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: passageディレクトリ統合, externals-handoffs統合, 通信境界処理統一, アーキテクチャ改善, ディレクトリ構造再設計, 静的vs動的分離, documents静的記録, passage動的通信, エージェント間通信, ユーザー間通信, 外部システム連携, 境界を越える通路, 抽象度統一, 重複問題解決, 用語選定過程, communication境界概念, interface抽象化, channels技術的

---

# REP-0075: passageディレクトリ統合計画

**作成日時**: 2025年6月18日 21:50  
**作成者**: Clerk Agent  
**カテゴリ**: アーキテクチャ改善  
**優先度**: Medium  

## 概要

externals/とhandoffs/を新設の`passage/`ディレクトリに統合し、プロジェクトの通信・境界処理を統一管理する。

## 背景・動機

### 議論の経緯
1. **重複問題**: externals/とhandoffs/が両方ともroot直下にあり、機能的に近い
2. **抽象度の統一**: documents/やsrc/と同レベルの抽象度として通信の場を整理
3. **静的vs動的の区別**: documents/（静的記録）とpassage/（動的通信）の明確な分離

### 用語選定の過程
- `communication/` → 動的だが曖昧
- `boundaries/` → 境界概念だが動的性不足
- `interface/` → 抽象的すぎる
- `channels/` → 技術的だが一般的
- **`passage/`** → 境界を越える動的な通路・経路として最適

## 提案する構造

### 現在
```
workspace/
├── externals/          # 外部システム連携設定
├── handoffs/          # エージェント間・ユーザー間通信
├── documents/         # 静的ドキュメント管理
├── src/              # アプリケーション実装
└── surveillance/     # 監視システム
```

### 変更後
```
workspace/
├── passage/          # 通信・境界処理統合
│   ├── handoffs/     # エージェント間・ユーザー間通信
│   └── externals/    # 外部システム連携（現externals）
├── documents/        # 静的ドキュメント管理
├── src/             # アプリケーション実装
└── surveillance/    # 監視システム
```

## 設計原則

### passageディレクトリの定義
**「境界を越える動的な通信・やり取りの場」**

- **動的性**: リアルタイムなメッセージング・データ交換
- **境界性**: 異なる主体間（エージェント間、システム間）の接続点
- **通路性**: 情報・タスク・メッセージが通り抜ける経路

### handoffs vs external の区別
- **handoffs/**: 内部通信（エージェント間、ユーザー・エージェント間）
- **externals/**: 外部システム連携（Git hooks、外部API等）

## 実装計画

### Phase 1: ディレクトリ構造変更
1. `passage/`ディレクトリ作成
2. `externals/` → `passage/externals/` 移動
3. `handoffs/` → `passage/handoffs/` 移動

### Phase 2: 参照更新
1. **CLAUDE.md**: passage/の説明追加・参照更新
2. **REP-0022**: handoffsパス変更（workspace/handoffs/ → workspace/passage/handoffs/）
3. **P016**: Agent権限マトリックス更新・passage/externals/追加
4. **各status/*.md**: handoffsパス参照更新
5. **documents/README.md**: プロジェクト構造説明更新

### Phase 3: 検証・最適化
1. 全参照の動作確認
2. REP-0070との関係整理
3. DDD2階層メモリメンテナンスとの整合性確認

## 影響を受ける文書リスト

### 🚨 Critical更新必須
- **CLAUDE.md**: passage/概念説明・Agent権限範囲
- **REP-0022**: エージェント間ハンドオフシステム（パス変更）
- **P016**: Agent権限マトリックス（handoffsパス更新）

### 📄 Documentation更新
- **documents/README.md**: プロジェクト構造説明
- **documents/agents/status/coder.md**: handoffsパス参照
- **documents/agents/status/clerk.md**: handoffsパス参照
- **documents/agents/status/inspector.md**: handoffsパス参照
- **documents/agents/status/builder.md**: handoffsパス参照（新規エージェント）
- **documents/agents/status/validator.md**: handoffsパス参照（新規エージェント）

### 🔄 関連レポート更新
- **REP-0070**: handoffsディレクトリ統合（passage統合との関係整理）
- **REP-0071**: 5エージェント体制Take-off計画（handoffsパス更新）

## 期待効果

### アーキテクチャ改善
- **一元管理**: 通信関連機能の統一的管理
- **概念整理**: 静的記録（documents）vs 動的通信（passage）の明確化
- **拡張性**: 新しい通信方式の追加時の配置先明確化

### 運用改善
- **直感性**: "passage"として通信の場の概念が明確
- **保守性**: 通信関連設定の一箇所集約
- **文書化**: 統一的な説明・参照の実現

## リスク・対策

### リスク
- **参照切れ**: 移動によるパス参照エラー
- **混乱**: 新しいディレクトリ構造への適応期間

### 対策
- **段階的移行**: Phase分割による影響最小化
- **完全検証**: 全参照の動作確認
- **文書化**: 変更理由・新構造の明確な説明

## 成功指標

- [ ] 全参照が新パスで正常動作
- [ ] 新規タスクがpassage/handoffs/で正常処理
- [ ] 外部システム連携がpassage/external/で正常動作
- [ ] Agent権限システムが新構造で正常動作

---

**結論**: passageディレクトリ統合により、プロジェクトの通信アーキテクチャが明確化され、保守性・拡張性が向上する。segment化された実装により、安全な移行を実現する。
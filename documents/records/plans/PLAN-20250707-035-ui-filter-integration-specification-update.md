# PLAN-20250707-035: UI Filter Integration仕様統合更新計画

**作成日**: 2025年7月7日  
**作成者**: Architect Agent  
**優先度**: High  
**カテゴリ**: 🏗️ システム移行  
**ステータス**: 計画書作成完了・実行承認待ち  

## 📋 計画概要

conversation-20250707.logで確定したUI Filter統合仕様（集合論的アプローチ）を既存のFUNC仕様書群に反映し、一貫性のある仕様体系を構築する包括的更新計画。

## 🎯 背景・目的

### 問題認識
1. **FUNC-208作成済みだが実装詳細混入**: 仕様書に実装詳細が記載されている
2. **関連仕様書の未更新**: FUNC-202, FUNC-203, FUNC-300が新仕様と整合していない  
3. **集合論的アプローチの未反映**: 確定した新しいフィルタ動作原理が他仕様書に反映されていない
4. **実装ガイドの不在**: supplementary/にCG-005実装ガイドが未作成

### 解決目標
- 集合論的アプローチによる一貫したフィルタ仕様の確立
- 「unique処理=各ファイルの先頭(=最新のevent)を表示する」定義の全仕様書反映
- 処理順序問題の根本解決（順序非依存の実現）
- 実装詳細と仕様の適切な分離

## 📊 確定仕様（conversation-20250707.log）

### 核心的定義
1. **集合論的アプローチ**:
   - table = 現在時点の集合を表現
   - 操作(all/unique, event filter, keyword filter) → 集合の変化
   - CLI表示 = 最終集合

2. **unique処理の確定定義**: 「各ファイルの先頭(=最新のevent)を表示する」

3. **処理順序非依存性**: event filter → unique と unique → event filter は同じ結果

### 動作仕様詳細
- **状態管理**: メモリで操作履歴（FilterState）を管理
- **更新フロー**: vanilla table更新 → 操作履歴apply → 新要素あれば画面反映
- **動的読み込み**: 画面不足時・選択位置・100msポーリング
- **適用タイミング**: リアルタイム更新（keyword DB検索のみ[Enter]時）
- **ESC制御**: 編集モード破棄 / normal mode全クリア
- **状態可視化**: all/unique色分け、keyword filter最上部表示

## 🔧 更新対象ファイルと作業内容

**全FUNC調査結果**: 26ファイル全て確認完了。直接関連ファイル9件、間接関連ファイル6件を特定。

### Phase 1: 仕様書体系更新（Architect実行）

#### 1.1 FUNC-208 UI Filter Integration 更新
**ファイル**: `documents/visions/functions/FUNC-208-ui-filter-integration.md`
**作業内容**:
- 実装詳細（SQL、TypeScript）を完全除去
- 集合論的アプローチの詳細化
- unique処理確定定義の強調
- ESC操作・状態可視化仕様の追加
- CG-005実装ガイドへの参照追加

#### 1.2 FUNC-202 CLI Display Integration 更新 ⭐核心
**ファイル**: `documents/visions/functions/FUNC-202-cli-display-integration.md`  
**具体的改変箇所**:
- **行162-170**: Uniqueモード仕様を完全書き換え
  - 現在: 表面的な動作説明
  - 新仕様: 「各ファイルの最新イベントのみ表示。最新イベントがevent filter対象外の場合、**そのファイル全体が非表示**」
- **行282-448**: キーワード検索仕様（2段階検索）を集合論的アプローチに統合
  - vanilla table概念の追加
  - 操作履歴apply フローの明記
- **行9-11**: 関連仕様にFUNC-208追加
- **新セクション追加**: 集合論的動作原理（table=集合、操作=集合変化）

#### 1.3 FUNC-203 Event Type Filtering 更新 ⭐核心
**ファイル**: `documents/visions/functions/FUNC-203-event-type-filtering.md`
**具体的改変箇所**:
- **関連仕様**: FUNC-208 UI Filter Integration追加
- **新セクション追加**: 「unique modeとの統合動作」
  - unique処理との組み合わせ時の動作定義
  - 「最新イベントがフィルタ対象外の場合、ファイル全体非表示」の明記
- **機能境界**: 集合論的フィルタ動作の追加（「集合の絞り込み操作」として定義）
- **適用タイミング**: 「リアルタイム更新」の明確化（keyword検索以外）

#### 1.4 FUNC-300 Key Input Manager 更新 ⭐核心
**ファイル**: `documents/visions/functions/FUNC-300-key-input-manager.md`
**具体的改変箇所**:
- **行77-90**: 既存stateMapsにESC操作追加
  - normal mode ESC: 全フィルタクリア（all mode + no filters状態へ）
  - 編集mode ESC: 編集破棄（前の状態に戻る）
- **行61-71**: InputState構造にFilterState管理追加
- **新セクション追加**: 「フィルタ状態可視化制御」
  - all/unique選択状態の色分け制御仕様
  - フィルタ適用状態の視覚的表現制御

#### 1.5 FUNC-104 CLI Interface Specification 更新
**ファイル**: `documents/visions/functions/FUNC-104-cli-interface-specification.md`
**具体的改変箇所**:
- **行97-103**: Interactive Controlsセクション更新
  - 現在: 基本的なevent filters列挙
  - 新仕様: keyword filter/search操作の追加（"/ - Keyword search"）
- **行97-109**: Examples追加
  - keyword filter使用例: `[/] → "*.ts" → [Enter]`
- **新項目追加**: ESCキー動作説明
  - "Esc - Clear filters / Cancel edit"

#### 1.6 FUNC-205 Status Display Area 更新
**ファイル**: `documents/visions/functions/FUNC-205-status-display-area.md`
**具体的改変箇所**:
- **行46-48**: 既存レイアウト例の更新
  - all/unique状態表示の色分け反映
  - フィルタ適用状態の表示追加
- **新セクション追加**: 「フィルタ状態表示仕様」
  - 現在適用中のevent filter状態表示
  - keyword filter適用時の表示方法
- **関連仕様**: FUNC-208追加

#### 1.7 FUNC-107 CLI Configuration Management 更新
**ファイル**: `documents/visions/functions/FUNC-107-cli-configuration-management.md`
**具体的改変箇所**:
- **CLI設定項目追加**: フィルタ関連設定の管理仕様
  - FilterState保持設定（セッション永続化の可否）
  - all/unique色分け設定の管理
  - keyword filter検索履歴設定
- **関連仕様**: FUNC-208追加

#### 1.8 FUNC-108 Color Theme Configuration 更新
**ファイル**: `documents/visions/functions/FUNC-108-color-theme-configuration.md`
**具体的改変箇所**:
- **行47-50**: current-theme.jsonスキーマ追加
  - `"filterStates"`: フィルタ状態色分け設定
  - `"allUniqueSelection"`: all/unique選択状態色設定
  - `"eventTypeHighlight"`: イベントタイプ別色設定
- **関連仕様**: FUNC-207, FUNC-208追加

#### 1.9 FUNC-207 Color Rendering System 更新
**ファイル**: `documents/visions/functions/FUNC-207-color-rendering-system.md`
**具体的改変箇所**:
- **機能境界**: 「フィルタ状態色レンダリング」追加
  - all/unique選択状態の色適用
  - event filter適用状態の色表現
- **新セクション追加**: 「リアルタイム色反映」
  - フィルタ状態変更時の即座な色更新
- **関連仕様**: FUNC-108, FUNC-208追加

#### 1.0 FUNC-208 UI Filter Integration 仕様精緻化
**ファイル**: `documents/visions/functions/FUNC-208-ui-filter-integration.md`
**具体的改変箇所**:
- **行375-391**: SQL実装例完全除去
- **行309-312**: TypeScript実装コード完全除去  
- **行111**: 「技術詳細はCG-005実装ガイド参照」に変更
- **集合論的アプローチ強化**: 仕様レベルでの集合操作定義詳細化
- **動作原理明確化**: 「何をするか」に集中、「どうするか」は除去

### Phase 2: 実装ガイド作成（Architect実行）

#### 2.1 CG-005実装ガイド作成
**ファイル**: `documents/visions/supplementary/CG-005-ui-filter-integration-implementation.md`
**作業内容**:
- FilterState状態管理実装パターン
- vanilla table + 操作履歴apply アルゴリズム
- 動的データ読み込み実装詳細
- SQL統合クエリの実装例
- パフォーマンス最適化指針
- テスト戦略・エラーハンドリング

### Phase 3: 整合性確認（Architect実行）

#### 3.1 仕様書間参照の整合性確認
- FUNC-208 ← → FUNC-202, FUNC-203, FUNC-300の相互参照確認
- 技術用語・定義の統一確認
- バージョン情報の整合性確認

#### 3.2 README.md更新
**ファイル**: `documents/visions/functions/README.md`
**作業内容**:
- FUNC-208統合仕様の位置づけ明記
- 3つのフィルタ機能の関係性説明
- CG-005実装ガイドの概要追加

## ⚠️ リスクと対策

### 主要リスク
1. **仕様変更の影響範囲**: 3つの機能に跨る大規模変更
2. **実装との乖離**: 既存実装との整合性問題
3. **文書間の不整合**: 更新漏れによる矛盾発生

### 対策
1. **段階的更新**: Phase分けによる影響制御
2. **実装確認**: 仕様更新後の実装検証必須
3. **クロスチェック**: 全FUNC仕様書の整合性確認

## 📅 実行スケジュール

| Phase | 作業内容 | 推定工数 | 担当 |
|-------|---------|---------|------|
| Phase 1 | 4つのFUNC仕様書更新 | 2-3時間 | Architect |
| Phase 2 | CG-005実装ガイド作成 | 1-2時間 | Architect |
| Phase 3 | 整合性確認・README更新 | 30分 | Architect |
| **総計** | | **3-5時間** | |

## ✅ 完了条件

1. **FUNC-208, FUNC-202, FUNC-203, FUNC-300**: 新仕様反映完了
2. **CG-005実装ガイド**: 作成完了・FUNC-208から参照
3. **整合性確認**: 4つの仕様書間の矛盾なし
4. **実装詳細分離**: 仕様書から実装詳細完全除去
5. **README更新**: functions/README.mdの統合仕様説明追加

## 🔗 関連文書

- **基盤資料**: `passage/externals/inputs/logs/conversation-20250707.log`
- **更新対象**: FUNC-202, FUNC-203, FUNC-208, FUNC-300
- **新規作成**: CG-005実装ガイド
- **参考**: 既存のCG-001〜004実装ガイド形式

## 📝 実行後の確認事項

1. **仕様の一貫性**: 3つのフィルタ機能の動作が一貫している
2. **処理順序非依存**: unique処理定義により順序問題が解決されている
3. **集合論的動作**: table=集合、操作=集合変化の原理が明確
4. **実装支援**: CG-005により実装者が迷わない詳細度

---

**承認後実行**: このPLANはArchitect Agentによる承認後実行開始
# Blueprints - バージョン別設計図

**最終更新**: 2025年6月24日  
**管理者**: Architect Agent  
**目的**: バージョン目標ごとの統合設計図管理

## 📋 概要

blueprintsディレクトリは、cctopプロジェクトのバージョン別実装設計図を管理します。各バージョンに対して1つの設計図を作成し、specifications/の部品を組み合わせた全体設計を定義します。

## 🎯 管理原則

### 1バージョン1ファイル原則
- **v0.1.0.0**: 1つの設計図のみ
- **v0.2.0.0**: 1つの設計図のみ（v0.1.0.0完了後作成）
- **重複禁止**: 同じバージョンについて複数の設計図は作成しない

### 命名規則
```
BP-XXX-for-versionYYYY-description.md

例:
BP-000-for-version0100-confirm-foundation.md
BP-001-for-version0200-selection-detail-mode.md
BP-002-for-version0300-plugin-system.md
```

### 設計図の純粋性
- **進捗情報禁止**: 「Phase 1完了✅」等の進捗は記載しない
- **クリーン保持**: 設計・仕様・計画のみを記載
- **進捗管理**: 実装進捗はAgent statusで管理（`documents/agents/status/builder.md`等）

## 📁 現在のファイル

### BP-000-for-version0100-confirm-foundation.md
- **目標**: v0.1.0.0 - 100%信頼性のあるファイル監視基盤確立
- **スコープ**: chokidar → DB → CLI表示の完全動作
- **参照specifications**: 
  - db001-schema-design.md（データベース基盤）
  - ui001-cli-baseline.md（CLI表示）
  - a002-configuration-system.md（設定システム）
- **除外機能**: プラグインシステム、Selection/Detailモード、高度Filter

## 🔄 バージョン進行管理

### 現在の状況
1. **v0.1.0.0**: 設計完了、実装準備段階
2. **v0.2.0.0**: 未着手（v0.1.0.0完了後に設計開始）

### 次期予定機能
- **Selection/Detailモード**: vis007-tracer-analysis-vision.md参照
- **プラグインシステム**: vis006-metrics-plugin-system-vision.md参照
- **高度Filter/Sort**: vis008-viewer-innovations-vision.md参照

## 📊 設計図の構成要素

### 必須セクション
1. **目標**: バージョンで実現する具体的目標
2. **実装スコープ**: 含まれるもの・含まれないもの
3. **システムアーキテクチャ**: 全体構成図
4. **技術仕様参照**: specifications/への具体的参照
5. **成功基準**: 定量的・定性的な達成指標

### 推奨セクション
- **実装フェーズ**: 段階的実装計画
- **リスクと対策**: 想定される課題と対応策
- **パフォーマンス目標**: 具体的な性能指標

## 🔗 specifications/との関係

### 参照関係
- **blueprints** → **specifications** (一方向参照)
- 設計図は部品仕様を参照して全体を設計
- 部品仕様は設計図を意識せず独立性を保つ

### 典型的な参照パターン
```markdown
## データベース実装（db001準拠）
specifications/database/db001-schema-design.md の5テーブル構成を採用

## CLI表示（ui001準拠）
specifications/ui/ui001-cli-baseline.md のAll/Uniqueモードを実装
```

## ⚠️ 重要な注意事項

### 設計図の更新
- **実装中の改善**: 積極的に設計図を更新
- **仕様の詰め**: 曖昧な部分があれば設計図で明確化
- **参照の追加**: 新しいspecificationsが必要な場合は追加作成

### 進捗情報の分離
- **進捗記録**: Agent statusで管理（`documents/agents/status/builder.md`）
- **課題・ブロッカー**: handoffsで連携（`passage/handoffs/`）
- **実装ログ**: Builder/Validatorのstatus.mdで時系列記録

### バージョン移行
- **完了確認**: 前バージョンの完全実装確認後に次バージョン設計開始
- **継続性**: 前バージョンの設計を参考にした発展的設計
- **アーカイブ**: 完了した設計図は参考資料として保持

## 🎯 品質基準

### 設計図の完成度
- **具体性**: 実装者が迷わない詳細度
- **実現可能性**: 技術的制約を考慮した現実的計画
- **測定可能性**: 成功/失敗が明確に判定可能

### 文書品質
- **明確性**: 曖昧な表現を避けた明確な記述
- **構造化**: 論理的で読みやすい構成
- **参照正確性**: specifications/への正確な参照

---

**理念**: クリーンで実用的な設計図により、確実なバージョン実装を実現する
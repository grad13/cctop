# Handoff: BP-001 v0.2.0.0 実装依頼

**作成日**: 2025年6月26日 08:00  
**作成者**: Architect Agent  
**宛先**: Builder Agent  
**優先度**: High  
**期限**: 3-4日以内  

## 📋 依頼概要

BP-001（cctop v0.2.0.0実装計画書）に基づく既存コードの改修実装をお願いします。

## 🎯 実装方針

**重要**: 0から作り直すのではなく、既存のv0.1.xコードを改修してください。

### 理由
- 既存コードは2,434行で正しい構造を持っている
- 必要な機能の80%は既に実装済み
- 改修の方が3日程度早く完成する

## 📊 主要な改修点

### 1. データベーススキーマ更新（FUNC-000準拠）
**現在**: 3テーブル構成
**目標**: 5テーブル構成（events, event_types, files, measurements, aggregates）

**変更内容**:
- `src/database/schema.js`の更新
- `src/database/database-manager.js`のマイグレーション処理追加
- inode再利用対応（filesテーブルでUNIQUE制約なし）

### 2. Event Processor改修（FUNC-001/002準拠）
**現在**: 基本的なイベント処理
**目標**: ファイルライフサイクル完全追跡

**変更内容**:
- `src/monitors/event-processor.js`の改修
- find/create/modify/delete/move/restoreの6イベント対応
- measurementsテーブルへのメタデータ記録

### 3. 新機能追加

#### 3.1 イベントタイプフィルタリング（FUNC-023）
- config.jsonでのフィルタ設定対応
- Event Processorでのフィルタリング実装

#### 3.2 レスポンシブディレクトリ表示（FUNC-024）
- `src/ui/cli-display.js`の改修（既に一部実装済み）
- ターミナルリサイズ対応の強化

#### 3.3 postinstall自動初期化（FUNC-013）
- `scripts/postinstall.js`は既に存在
- 設定ファイル初期化処理の追加

## 📁 参照ドキュメント

**必読**:
1. [BP-001実装計画書](/documents/visions/blueprints/BP-001-for-version0200-restructered.md)
2. [FUNC-000: SQLiteデータベース基盤](/documents/visions/functions/FUNC-000-sqlite-database-foundation.md)
3. [FUNC-001: ファイルライフサイクル追跡](/documents/visions/functions/FUNC-001-file-lifecycle-tracking.md)
4. [FUNC-002: chokidar統合](/documents/visions/functions/FUNC-002-chokidar-database-integration.md)

**実装ガイド**:
- [CG-001: Event Processor実装](/documents/visions/code-guides/CG-001-event-processor-implementation.md)
- [CG-002: Config Manager実装](/documents/visions/code-guides/CG-002-config-manager-implementation.md)
- [CG-003: Database Schema実装](/documents/visions/code-guides/CG-003-database-schema-implementation.md)

## ⚠️ 注意事項

1. **既存コードを最大限活用**してください
2. **テスト駆動開発**: 機能追加時は必ずテストも作成
3. **段階的実装**: BP-001のPhase順に従って実装
4. **Validatorとの連携**: テスト仕様についてはValidatorと協調

## 🎯 期待される成果物

1. **v0.2.0.0対応の動作するcctop**
2. **更新されたテストスイート**
3. **実装進捗レポート**（daily更新推奨）

## 📅 推奨スケジュール

- Day 1: データベーススキーマ更新とマイグレーション
- Day 2: Event Processor改修とフィルタリング実装
- Day 3: UI改修とpostinstall対応
- Day 4: 統合テストと最終調整

よろしくお願いします。
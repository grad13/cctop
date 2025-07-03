# PLAN-20250629-002: Large TypeScript Files Refactoring Plan

**作成日**: 2025年6月29日  
**作成者**: Builder Agent  
**ステータス**: 計画書作成完了・実行承認待ち  
**カテゴリ**: 🔧 開発プロセス改善  
**優先度**: High  
**影響範囲**: 全TypeScriptファイル構造

## 📋 概要

400行を超える大きなTypeScriptファイルを適切なサイズに分割し、保守性・可読性を向上させる。特に1,106行のcommon.tsは緊急度が高い。

## 🎯 対象ファイル

| ファイル | 現在行数 | 目標行数 | 優先度 |
|---------|----------|----------|--------|
| src/types/common.ts | 1,106 | 200以下×6ファイル | 最高 |
| src/ui/cli-display-legacy.ts | 564 | 300以下×2ファイル | 高 |
| src/database/database-manager/DatabaseManager.ts | 415 | 300以下×2ファイル | 中 |
| src/monitors/monitor-process.ts | 405 | 300以下×2ファイル | 中 |
| src/color/ColorManager-old.ts | 402 | 削除（新実装済み） | 低 |

## 📊 現状分析

### common.ts（1,106行）の内容分析
```typescript
// 現在の構造
- Event型定義群（約200行）
- Database型定義群（約150行）
- Config型定義群（約180行）
- UI関連型定義群（約250行）
- Process関連型定義群（約150行）
- Utility型定義群（約176行）
```

### cli-display-legacy.ts（564行）の内容分析
```typescript
// 現在の構造
- 初期化処理（約100行）
- イベント表示ロジック（約200行）
- ヘッダー/フッター表示（約150行）
- 入力処理（約114行）
```

## 🔄 リファクタリング戦略

### Phase 1: common.ts分割（優先度：最高）

#### 1.1 ファイル分割計画
```
src/types/
├── common.ts (削除予定)
├── event.types.ts      // Event関連型定義
├── database.types.ts   // Database関連型定義
├── config.types.ts     // Config関連型定義
├── ui.types.ts         // UI関連型定義
├── process.types.ts    // Process関連型定義
├── utility.types.ts    // Utility型定義
└── index.ts           // 再エクスポート用
```

#### 1.2 移行手順
1. 各型定義グループを新規ファイルに切り出し
2. 循環参照の確認と解消
3. index.tsで再エクスポート設定
4. 全import文の一括更新
5. common.ts削除

### Phase 2: cli-display-legacy.ts分割（優先度：高）

#### 2.1 ファイル分割計画
```
src/ui/legacy/
├── cli-display-legacy.ts    // メインクラスのみ（約200行）
├── legacy-event-renderer.ts // イベント表示ロジック
├── legacy-header-footer.ts  // ヘッダー/フッター
└── legacy-input-handler.ts  // 入力処理
```

### Phase 3: DatabaseManager.ts分割（優先度：中）

#### 3.1 ファイル分割計画
```
src/database/database-manager/
├── DatabaseManager.ts      // コア機能のみ（約200行）
├── QueryBuilder.ts        // クエリ構築ロジック
└── SchemaValidator.ts     // スキーマ検証ロジック
```

### Phase 4: monitor-process.ts分割（優先度：中）

#### 4.1 ファイル分割計画
```
src/monitors/
├── monitor-process.ts      // メインプロセス（約200行）
├── event-watcher.ts       // イベント監視ロジック
└── file-scanner.ts        // ファイルスキャンロジック
```

### Phase 5: ColorManager-old.ts処理（優先度：低）

- 新実装が存在する場合は削除
- 必要な機能があれば新実装に移植後、削除

## 📝 実装詳細

### 共通作業手順

1. **依存関係分析**
   ```bash
   # 対象ファイルの依存関係を確認
   grep -r "from.*common" src/ | wc -l
   ```

2. **型定義の分類**
   - 関連する型定義をグループ化
   - 循環参照のチェック
   - 共通依存の抽出

3. **段階的移行**
   - 新規ファイル作成
   - 型定義の移動
   - import文の更新
   - テスト実行確認

4. **後方互換性維持**
   - index.tsで既存のimportパスを維持
   - 段階的なdeprecation警告

## ⚠️ リスク分析

### 技術的リスク
1. **循環参照**: 型定義の相互依存による循環参照の可能性
2. **ビルドエラー**: import文の更新漏れによるビルドエラー
3. **型の不整合**: 分割時の型定義の不整合

### 対策
1. **循環参照対策**: 共通インターフェースの抽出
2. **自動化ツール**: import文更新の自動化スクリプト
3. **段階的実行**: 1ファイルずつ確実に移行

## 📅 実行スケジュール

| Phase | 対象 | 推定作業時間 | 完了条件 |
|-------|------|------------|----------|
| 1 | common.ts | 2-3時間 | 全型定義の分割完了 |
| 2 | cli-display-legacy.ts | 1-2時間 | 機能別分割完了 |
| 3 | DatabaseManager.ts | 1時間 | 責務分離完了 |
| 4 | monitor-process.ts | 1時間 | 機能分割完了 |
| 5 | ColorManager-old.ts | 30分 | ファイル削除 |

## ✅ 完了条件

- [ ] 全対象ファイルが400行以下
- [ ] ビルドエラーなし
- [ ] 全テストがパス
- [ ] import文の最適化完了
- [ ] 不要ファイルの削除

## 🔗 関連文書

- PLAN-20250629-001-code-duplication-refactoring.md
- PLAN-20250628-003-typescript-refactoring-overview.md
- REP-0143-typescript-migration-phase3-20250628.md

## 📋 承認事項

このリファクタリング計画の実行には以下の承認が必要です：

1. common.ts分割による全プロジェクトへの影響
2. 段階的実行アプローチ
3. 後方互換性維持の方針

---

**次のアクション**: Phase 1（common.ts分割）から実行開始
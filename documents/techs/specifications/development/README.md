# Specifications Documentation

**作成日**: 2025-06-21  
**管理者**: Inspector Agent  
**対象**: cctop MVP仕様定義

## 📋 仕様決定の必要性

実装前に以下の仕様を確定する必要があります：

### 🏗️ アーキテクチャ仕様
| 項目 | 内容 | 相互依存 | 状態 |
|------|------|----------|------|
| **1. Directory構造** | src/内のモジュール構成・責務分離 | 全体設計の基盤 | ⏳ 要定義 |
| **2. 画面構成** | CLI UI・表示モード・ナビゲーション | filter, sort と連携 | ✅ 完了 |
| **3. Test流れ** | テストアーキテクチャ・実行戦略 | 全モジュールテスト | ✅ 完了 |

### 🔧 機能仕様
| 項目 | 内容 | 相互依存 | 状態 |
|------|------|----------|------|
| **4. Scan** | 初期スキャン・ファイル検出・除外ルール | cache, filter と連携 | ⏳ 要定義 |
| **5. Sort** | 統計ソート・表示順序・ランキング | 画面構成と連携 | ⏳ 要定義 |
| **6. Cache** | キャッシュ戦略・更新タイミング・パフォーマンス | scan, sort と連携 | ✅ 完了 |
| **7. Filter** | フィルタリング・検索・表示制御 | 画面構成, sort と連携 | ⏳ 要定義 |

## 🔄 相互依存関係

```
Directory構造 ←→ Test流れ (モジュール構成がテスト構造を決定)
     ↓
画面構成 ←→ Sort (表示モードが必要なソート機能を決定)
     ↓
Filter ←→ Sort (フィルタ結果をソート)
     ↓
Scan ←→ Cache (スキャン結果をキャッシュ)
     ↓
Cache ←→ Filter (キャッシュされたデータをフィルタ)
```

## 📚 仕様書構成

以下の仕様書を作成予定：

| ファイル | 内容 | 優先順位 |
|---------|------|----------|
| [directory-structure.md](directory-structure.md) | src/内のモジュール構成・責務分離 | 🔥 最高 |
| [cli-ui/](cli-ui/) | CLI UI構成・表示モード・操作方法・検索機能 | ✅ 完了 |
| [test-strategy.md](test-strategy.md) | テスト戦略・実行フロー・品質保証 | ✅ 完了 |
| [scan-functionality.md](scan-functionality.md) | ファイルスキャン・検出・除外ルール | 🟡 中 |
| [sort-functionality.md](sort-functionality.md) | 統計ソート・ランキング・表示順序 | 🟡 中 |
| [cache-strategy.md](cache-strategy.md) | キャッシュ戦略・更新・パフォーマンス | ✅ 完了 |
| [filter-functionality.md](filter-functionality.md) | フィルタリング・検索・表示制御 | 🟡 中 |
| [configuration-system.md](configuration-system.md) | 設定システム・階層的設定管理 | 🔥 高 |

## 🎯 仕様決定の流れ

### Phase 1: アーキテクチャ基盤
1. **Directory構造** → モジュール責務の明確化
2. **画面構成** → UI要件の確定 ✅ 完了
3. **Test流れ** → 品質保証戦略の策定 ✅ 完了

### Phase 2: 機能詳細
4. **Scan** → ファイル検出・除外ルール
5. **Cache** → パフォーマンス戦略
6. **Sort** → 統計表示・ランキング
7. **Filter** → フィルタリング・検索

### Phase 3: 統合・調整
- 相互依存の調整
- 競合・矛盾の解決
- 最終仕様の確定

---

*実装開始前に、これらの仕様をすべて確定してから database/indexes.js に進みます。*

## 📁 ディレクトリ構造

```
specifications/
├── README.md                    # このファイル
├── database/                    # データベース設計仕様
│   ├── README.md                # DB設計の概要・ナビゲーション
│   ├── schema-design.md         # 5テーブル構成・正規化設計
│   ├── triggers-and-indexes.md  # トリガー・インデックス定義
│   ├── queries-and-views.md     # 主要クエリパターン・ビュー
│   ├── implementation-guide.md  # 実装ガイド・コード例
│   └── next-phase-period-statistics.md  # 期間統計（将来拡張）
├── cli-ui/                      # CLI UI関連仕様
│   ├── README.md                # CLI UI仕様の概要
│   ├── cli-ui-baseline.md       # previous-v01ベースライン
│   ├── overview.md              # 新版全体設計
│   ├── search-feature.md        # 検索機能詳細
│   ├── stream-display.md        # ストリーム表示詳細
│   ├── detail-view.md           # 詳細表示モード
│   ├── rendering-update.md      # レンダリング・更新処理
│   └── configuration.md         # 設定管理
├── test-strategy.md             # テスト戦略・品質保証
├── t000-checklist.md            # テスト実装チェックリスト
└── (その他の仕様書予定)
```
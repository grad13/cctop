# HO-20250711-001: EventTableモジュール化実装

**作成日**: 2025-07-11 13:30  
**作成者**: Clerk  
**実装者**: Builder  
**優先度**: Medium  
**関連仕様**: FUNC-202-cli-display-integration.md

## 📋 概要

現在、イベント表示のテーブル機能が複数のクラスに分散しています。これをEventTableモジュールとして独立させ、保守性と再利用性を向上させます。

## 🎯 実装要件

### 1. ディレクトリ構造の作成

```
src/cli/src/ui/components/EventTable/
├── index.ts           # メインエクスポート
├── EventTable.ts      # メインクラス（コーディネーター）
├── types.ts           # 型定義
├── formatters/        # フォーマッター
│   ├── index.ts
│   ├── ColumnFormatter.ts
│   ├── TimeFormatter.ts
│   ├── EventTypeFormatter.ts
│   └── FileSizeFormatter.ts
├── renderers/         # レンダリング
│   ├── index.ts
│   ├── RowRenderer.ts
│   ├── HeaderRenderer.ts
│   └── SelectionRenderer.ts
└── utils/             # ユーティリティ
    ├── index.ts
    ├── stringUtils.ts
    └── columnConfig.ts
```

### 2. 移行対象のコード

以下のクラスから関連機能を抽出・移行：

- `UIDataFormatter.ts`
  - `formatEventList()` メソッド
  - 各種フォーマット関数（timestamp, elapsed, fileSize等）
  - カラー処理

- `UILayoutManager.ts`
  - eventListボックスの管理
  - ヘッダー生成（テーブル部分のみ）

- `UIState.ts`
  - テーブル関連の状態管理部分

### 3. 主要クラスの設計

#### EventTable.ts
```typescript
export class EventTable {
  private box: blessed.Widgets.BoxElement;
  private formatter: EventTableFormatter;
  private renderer: EventTableRenderer;
  
  constructor(options: EventTableOptions, uiState: UIState) {
    // 初期化
  }
  
  update(events: EventRow[]): void {
    // イベントリストの更新
  }
  
  getHeader(): string {
    // ヘッダー行の取得
  }
}
```

### 4. 特に注意すべき点

1. **blessedのダブルバッファリング活用**
   - 不要なrender()呼び出しを避ける
   - コンテンツの差分チェック

2. **カラー処理の保持**
   - イベントタイプ別の色分け
   - 選択行の青背景
   - 非選択行の緑文字

3. **パフォーマンス考慮**
   - 大量イベントでの高速描画
   - メモリ効率的な実装

4. **既存機能の完全互換性**
   - 現在の表示が変わらないこと
   - キー操作との連携維持

## 🔧 実装手順

1. **新規ブランチ作成**
   ```bash
   git checkout -b feature/event-table-module
   ```

2. **ディレクトリ構造作成**

3. **段階的移行**
   - まず型定義とユーティリティ
   - 次にフォーマッター
   - 最後にメインクラス

4. **既存コードのリファクタリング**
   - UILayoutManagerからEventTable使用に変更
   - UIDataFormatterの該当部分を削除

5. **テスト**
   - 表示の一致確認
   - パフォーマンステスト
   - キー操作との連携確認

## 🎯 完了条件

- [ ] EventTableモジュールが独立して動作
- [ ] 既存の表示と完全に一致
- [ ] パフォーマンスが劣化していない
- [ ] コードの重複が削除されている
- [ ] 適切なドキュメントとコメント

## 📝 備考

- blessed.tableを使わない理由：
  1. セル単位の色制御が困難
  2. カスタマイズの制限
  3. パフォーマンスの問題

- 将来の拡張性を考慮：
  - ソート機能
  - カラムの表示/非表示
  - 仮想スクロール
# HO-20250711-002: EventTableテスト修正依頼

**作成日**: 2025-07-11 16:45  
**作成者**: Builder  
**実装者**: Validator  
**優先度**: High  
**関連**: HO-20250711-001-event-table-module.md

## 📋 概要

EventTableモジュールのリファクタリングに伴い、以下の改善を実施しました：
- カラム幅処理の統一化（normalizeColumn関数）
- スタイル処理の統一化（styleFormatter）
- ファイル名が長い場合のレイアウト崩れ修正

これらの変更により、既存のテストが失敗しています。

## 🎯 実装内容

### 1. 追加したファイル
- `src/cli/src/ui/components/EventTable/EventRow.ts` - 個別行管理クラス
- `src/cli/src/ui/components/EventTable/utils/columnNormalizer.ts` - カラム正規化関数
- `src/cli/src/ui/utils/styleFormatter.ts` - スタイル統一化関数
- `src/cli/src/ui/components/EventTable/EventRow.md` - EventRowクラス仕様書

### 2. 修正したファイル
- `EventTable.ts` - EventRowインスタンス管理に変更
- `RowRenderer.ts` - normalizeColumn、styleFormatterを使用するよう変更
- `EventTypeFormatter.ts` - styleFormatterを使用、6文字幅対応、restore→back
- `columnConfig.ts` - normalizeColumnを使用するよう変更
- `types.ts` - カラム幅調整（Blocks→Blks 4文字、Event 6文字）
- `README.md` - 新アーキテクチャとテストガイドライン追加

## 🔧 テスト修正要件

### 失敗しているテスト（11件）
1. **HeaderRenderer関連**（2件）
   - カラムヘッダーのスペーシング問題
   
2. **RowRenderer関連**（4件）
   - ディレクトリカラム幅の不一致（33 vs 40 chars）
   - ファイルサイズフォーマット
   - イベントタイプカラーのパターンマッチング

3. **stringUtils関連**（2件）
   - truncateDirectoryPath関数の期待値

4. **integration tests関連**（3件）
   - enterSearchModeメソッドエラー（UIState関連）

### 修正方針
- normalizeColumn関数の動作に合わせてテストの期待値を更新
- styleFormatter使用による出力形式の変更に対応
- 正確なカラム幅（パディング含む）の検証

## 📝 備考

- ビルドは成功しています
- 実装の意図：すべてのカラムで統一的な幅・配置処理を実現
- レイアウト崩れの問題は解決済み
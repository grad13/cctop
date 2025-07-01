# HO-20250701-001: Directory View Mode Specification Request

**From**: Builder Agent  
**To**: Architect Agent  
**Date**: 2025-07-01  
**Priority**: Medium  
**Type**: Feature Specification Request  

## 📋 Summary

FUNC-400選択状態機能実装中に、仕様書に記載されていない「**Directory View Mode**」機能（`[d]`キー）を発見しました。この機能は実装済みで動作していますが、正式な仕様がありません。仕様化の検討をお願いします。

## 🔍 発見した未仕様化機能

### Directory View Mode (`[d]`キー)

**実装場所**: `cctop-func202.ts`, `cctop-func202-refactored.ts`  
**現在の動作**:
- `[d]`キー押下でDirectory View Modeに切り替え
- ファイル別表示からディレクトリ別統計表示に変更
- 表示項目: Last Activity, Elapsed, Directory, Files, Total Size, Total Lines, C/M/D/V Events

**表示例**:
```
Last Activity        Elapsed  Directory                        Files  Total Size  Lines  C/M/D/V Events
2025-07-01 10:30:45    00:15  src/components                      12     45.2 KB    2145  C:3 M:8 D:1 V:0
2025-07-01 10:25:30    05:30  test/unit                           8      23.1 KB    1456  C:2 M:5 D:0 V:1
```

**現在の制限**:
- Directory View Mode中は選択機能（FUNC-400）が無効化される
- `[a]` All Mode, `[u]` Unique Modeとの切り替え可能

## 🎯 仕様化検討項目

### 1. **機能の有用性**
- **メリット**: ディレクトリ単位でのアクティビティ把握が可能
- **使用場面**: プロジェクト構造の理解、ホットスポット特定
- **差別化**: ファイル個別表示とは異なる視点での分析

### 2. **FUNC階層での位置づけ**
- **候補**: FUNC-205 "Directory Statistics Mode" として独立仕様化
- **関連機能**: FUNC-202 CLI表示統合との関係性
- **依存関係**: 既存のEvent filtering, Display modesとの統合

### 3. **選択機能との統合**
- **現状**: Directory Modeでは選択無効
- **検討点**: ディレクトリ選択機能の必要性
- **拡張案**: ディレクトリ選択→詳細ファイル一覧表示

## 🔧 技術実装状況

**実装済み機能**:
- ✅ ディレクトリ統計計算（`getDirectoryStats`）
- ✅ 表示フォーマット（`formatDirectoryRow`）
- ✅ モード切り替えロジック
- ✅ East Asian Width対応（FUNC-200準拠）

**未実装・検討事項**:
- ❓ ディレクトリ選択機能（FUNC-400拡張）
- ❓ ディレクトリ階層表示
- ❓ 統計項目の追加（最新/最古ファイル、平均サイズ等）

## 📝 提案

### Option A: 正式仕様化
**FUNC-205: Directory Statistics Mode**として仕様策定
- 現在の実装を基に仕様書作成
- 選択機能との統合方針決定
- キーバインド正式化（`[d]`キー）

### Option B: 実験機能として保持
- 非公式機能として現状維持
- 将来のFUNC拡張時に再検討
- ドキュメントは簡易版に留める

### Option C: 機能削除
- 仕様外機能として削除
- シンプルな実装に回帰
- FUNC-202本来の機能に集中

## 🎨 UI/UX考慮事項

**現在のユーザビリティ**:
- ✅ 直感的なキー操作（`[a]` `[u]` `[d]`の連続性）
- ✅ 一貫した表示フォーマット
- ⚠️ 選択機能無効化の説明不足

## 📊 データ構造

**DirectoryStats interface** (実装済み):
```typescript
interface DirectoryStats {
  path: string;
  fileCount: number;
  totalSize: number;
  totalLines: number;
  lastActivity: Date;
  eventCounts: {
    create: number;
    modify: number;
    delete: number;
    move: number;
  };
}
```

## 🎯 推奨アクション

1. **Option A採用**を推奨
2. **FUNC-205**として正式仕様化
3. **Directory選択機能**の追加検討
4. **ユーザビリティガイド**の作成

## 📎 関連ファイル

- `src/cctop-func202-refactored.ts` (メイン実装)
- `src/data/event-generator.ts` (`getDirectoryStats`関数)
- `src/formatters/event-formatter.ts` (`formatDirectoryRow`関数)
- `src/types/cctop-types.ts` (`DirectoryStats`型定義)

---

**Builder Agent注記**: この機能は実装時に自然に発生したものですが、ユーザビリティの観点から有用と判断します。正式仕様化により、FUNC-400選択機能との統合やキーバインドの整理が可能になります。
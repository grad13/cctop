# FUNC-202: CLI表示統合機能

**作成日**: 2025年6月24日 10:00  
**更新日**: 2025年6月30日  
**作成者**: Architect Agent  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-000, FUNC-200, FUNC-201, FUNC-203, FUNC-204, FUNC-205, FUNC-300  

## 📊 機能概要

FUNC-000のデータベースから取得したファイルイベントを、リアルタイムで表示するCLIインターフェース。All/Uniqueモード切り替えにより、用途に応じた最適な表示を提供する。

**ユーザー価値**:
- 直感的なファイル変更監視
- 効率的な情報表示
- キーボードショートカットによる高速操作

## 🎯 機能境界

### ✅ **実行する**
- データベースからのイベント取得・表示
- All/Uniqueモード切り替え
- FUNC-201（二重バッファ）による描画
- FUNC-200（East Asian Width）対応
- 基本的な表示状態管理（待機状態）

### ❌ **実行しない**
- ファイル監視（FUNC-002の責務）
- データベース管理（FUNC-000の責務）
- 設定管理（FUNC-101/105の責務）
- **キーボード入力処理（FUNC-300の責務）**
- バックグラウンド監視（FUNC-003 Daemon Processの責務）
- イベントフィルタリング（FUNC-023の責務）

## 📋 必要な仕様

### **表示レイアウト仕様**

#### **カラム構成**
| カラム | 幅 | 配置 | 説明 |
|--------|-----|------|------|
| Event Timestamp | 19 | 左寄せ | イベント発生時刻 |
| Elapsed | 9 | 右寄せ | 経過時間 |
| File Name | 35 | 左寄せ | ファイル名（省略表示） |
| Event | 8 | 左寄せ | イベントタイプ |
| Lines | 6 | 右寄せ | 行数 |
| Blocks | 8 | 右寄せ | ブロック数 |
| Directory | 可変 | 左寄せ | ディレクトリパス |

#### **表示例**
```
Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
2025-06-25 19:07:51    00:04  FUNC-112-cli-display-inte...       modify     197      16  documents/visions/functions
2025-06-25 19:07:33    00:22  FUNC-001-file-lifecycle-t...       modify     207      16  documents/visions/functions
2025-06-25 19:07:13    00:42  FUNC-112-cli-display-inte...       modify     233      24  documents/visions/functions
2025-06-25 19:06:49    01:07  FUNC-112-cli-display-inte...       modify     235      16  documents/visions/functions
────────────────────────────────────────────────────
All Activities  (4/156)
[a] All  [u] Unique  [q] Exit
```

### **表示モード仕様**

#### **Allモード**
- **概要**: 全イベントを時系列順で表示
- **データ取得**: 
  - eventsテーブルから最新順に取得
  - JOINでfiles情報とmeasurements情報を結合
  - 削除済みファイルも表示
- **更新頻度**: 100ms毎（FUNC-021による二重バッファ）

#### **Uniqueモード**
- **概要**: ファイル毎の最新状態のみ表示
- **データ取得**:
  - 各file_idの最新イベントを取得
  - 削除済みファイルは除外（is_deleted=0）
  - 最新の測定値を表示
- **更新頻度**: 100ms毎（Allモードと同じ）

### **FUNC-300連携によるキー処理**

**基本方針**: キーボード入力はFUNC-300が一元管理し、待機状態時にFUNC-202が処理を受け取る

| キー | 機能 | 説明 | 登録優先度 |
|------|------|------|-----------|
| `a` | Allモード | 全イベント表示に切り替え | 低(10) |
| `u` | Uniqueモード | ユニークファイル表示に切り替え | 低(10) |
| `q` | 終了 | アプリケーション終了 | 低(10) |

**FUNC-300登録例**:
```javascript
KeyInputManager.register({
  id: 'display-mode-control',
  mode: 'waiting',
  keys: ['a', 'u', 'q'],
  priority: 10,
  callback: (key) => FUNC202.handleDisplayMode(key)
});
```

### **色分け仕様**

イベント種別の色分けは、config.jsonで設定可能。デフォルト値は **[FUNC-101: 階層的設定管理](./FUNC-101-hierarchical-config-management.md)** で定義。

## 🔧 実装ガイドライン

### **DisplayManager設計**

1. **DataFetcher クラス**
   - データベースクエリ実行
   - All/Uniqueモードに応じたSQL生成
   - 結果セットのキャッシュ管理

2. **Formatter クラス**
   - カラム幅計算（FUNC-200対応）
   - 時刻・サイズのフォーマット
   - パス名の省略表示

3. **Renderer クラス**
   - FUNC-021の二重バッファ活用
   - 色分け適用
   - ステータス行更新

### **East Asian Width対応**

- FUNC-200の文字幅計算を使用
- ファイル名の省略表示（...で終端）
- 日本語ファイル名の正確な幅計算

## 🧪 テスト要件

1. **基本動作確認**
   - All/Uniqueモード切り替え
   - キーボード操作の応答性
   - データベースとの同期

2. **表示確認**
   - East Asian Width文字の正しい表示
   - 色分けの適用
   - レイアウトの崩れなし

3. **パフォーマンス確認**
   - 100ms更新間隔の維持
   - 大量イベント時の安定性
   - メモリ使用量の監視

## 💡 使用シナリオ

### **開発中のファイル監視**
```bash
# プロジェクトディレクトリで実行
cctop

# Uniqueモードで現在のファイル状態を確認
# Allモードで変更履歴を追跡
```

### **ビルドプロセスの監視**
```bash
# ビルド出力ディレクトリを監視
cctop ./dist

# 生成されるファイルをリアルタイムで確認
```

## 🔗 他機能との連携

### FUNC-003: Background Activity Monitor
- **標準モード**: FUNC-202単独でCLI表示実行
- **バックグラウンド監視モード**: FUNC-202をViewer Process内で実行
- **責務継承**: Viewer ProcessはFUNC-202の表示機能を完全継承
- **プロセス分離**: Monitor（データ書き込み）とViewer（FUNC-202ベース表示）の分離

## 🎯 成功指標

1. **使いやすさ**: 直感的な操作で学習コストゼロ
2. **視認性**: East Asian Width対応による正確な表示
3. **パフォーマンス**: ちらつきなしのスムーズな更新
4. **信頼性**: データベースとの完全な同期
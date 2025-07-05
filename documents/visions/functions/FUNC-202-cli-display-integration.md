# FUNC-202: CLI表示統合機能

**作成日**: 2025年6月24日 10:00  
**更新日**: 2025年7月3日  
**作成者**: Architect Agent  
**Version**: 0.3.1.0  
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

### **画面構成（4エリア構造）**

画面は以下の4つのエリアで構成される：

1. **Header Area**: システム状態表示
2. **Event Rows Area**: イベントリスト表示
3. **Command Keys Area**: 操作ガイド（2行固定）
4. **Dynamic Control Area**: 状態に応じて切り替わる3行目

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

#### **画面状態と表示**

##### **1. 初期状態（Normal Mode）**
```
cctop v1.0.0.0 Daemon: ●RUNNING
Event Timestamp      Elapsed  File Name                           Event  Lines Blocks  Directory
────────────────────────────────────────────────────
2025-06-25 19:07:51    00:04  FUNC-112-cli-display-inte...       modify    197     16  documents/visions/functions
2025-06-25 19:07:33    00:22  FUNC-001-file-lifecycle-t...       modify    207     16  ...ments/visions/blueprints
2025-06-25 19:07:13    00:42  FUNC-112-cli-display-inte...       modify    233     24  documents/visions/functions
2025-06-25 19:06:49    01:07  FUNC-112-cli-display-inte...       modify    235     16  documents/visions/functions
────────────────────────────────────────────────────
[q] Exit [space] Pause  [x] Refresh [a] All  [u] Unique  
[↑↓] Select an event　[Enter] Show Details
[f] Filter Events　[/] Quick search　[ESC] Clear
```

##### **2. イベントフィルタモード（fキー押下後）**
```
cctop v1.0.0.0 Daemon: ●RUNNING
Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
[Event rows with filters applied]
────────────────────────────────────────────────────
[q] Exit [space] Pause  [x] Refresh [a] All  [u] Unique  
[↑↓] Select an event　[Enter] Show Details
[f] Find [c] Create [m] Modify [d] Delete [v] Move [r] Restore [ESC] Back
```

##### **3. クイックサーチモード（/キー押下後）**
```
cctop v1.0.0.0 Daemon: ●RUNNING
Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
[Filtered event rows based on search]
────────────────────────────────────────────────────
[q] Exit [space] Pause  [x] Refresh [a] All  [u] Unique  
[↑↓] Select an event　[Enter] Show Details
Search: [_________________________________] [Enter] Apply [ESC] Cancel
```

##### **4. Stream一時停止状態（spaceキー押下後）**
```
cctop v1.0.0.0 Daemon: ●RUNNING
Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
[Frozen event rows - stream display paused]
────────────────────────────────────────────────────
[q] Exit [space] Resume  [x] Refresh [a] All  [u] Unique  
[↑↓] Select an event　[Enter] Show Details
[f] Filter Events　[/] Quick search　[ESC] Clear
```
注：Daemon状態は変わらず、Stream表示のみ一時停止

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

**基本方針**: キーボード入力くFUNC-300が一元管理し、状態に応じてFUNC-202が表示処理を実行

#### **状態管理（FUNC-300統合版）**
FUNC-202の表示状態はFUNC-300の入力状態と連動：

| FUNC-300入力状態 | FUNC-202表示状態 | 説明 |
|-------------------|-------------------|------|
| `waiting` | `normal` | 通常表示モード（Stream動作中） |
| `filtering` | `filter` | イベントフィルタ選択モード |
| `searching` | `search` | クイックサーチ入力モード |
| `selecting` | `normal` | 選択モード（通常表示維持） |
| `paused` | `paused` | Stream一時停止（Daemonは動作継続） |
| `detail` | `detail` | 詳細情報表示モード |

#### **キーバインド定義（FUNC-300統合版）**

**重要**: 全てのキー入力はFUNC-300が一元管理。FUNC-202は表示更新のみ実行。

##### **Waiting Mode（通常状態）**
| キー | FUNC-300処理 | FUNC-202処理 |
|------|-------------|-------------|
| `q` | アプリケーション終了 | - |
| `space` | `paused`状態へ遷移 | 表示更新停止 |
| `x` | - | 手動リフレッシュ |
| `a` | - | All Mode表示 |
| `u` | - | Unique Mode表示 |
| `f` | `filtering`状態へ遷移 | Dynamic Area更新 |
| `/` | `searching`状態へ遷移 | Dynamic Area更新 |
| `ESC` | - | フィルタ・検索クリア |
| `↑/↓` | `selecting`状態へ遷移 | 選択表示開始 |

##### **Filtering Mode（fキー押下後）**
| キー | FUNC-300処理 | FUNC-202処理 |
|------|-------------|-------------|
| `f` | FUNC-203呼び出し | フィルタ表示更新 |
| `c` | FUNC-203呼び出し | フィルタ表示更新 |
| `m` | FUNC-203呼び出し | フィルタ表示更新 |
| `d` | FUNC-203呼び出し | フィルタ表示更新 |
| `v` | FUNC-203呼び出し | フィルタ表示更新 |
| `r` | FUNC-203呼び出し | フィルタ表示更新 |
| `ESC` | `waiting`状態へ遷移 | Dynamic Area更新 |

##### **Searching Mode（/キー押下後）**
| キー | FUNC-300処理 | FUNC-202処理 |
|------|-------------|-------------|
| `[text]` | 文字入力バッファ管理 | 検索欄表示更新 |
| `Enter` | 検索実行 | 検索結果表示 |
| `ESC` | `waiting`状態へ遷移 | Dynamic Area更新 |

##### **Paused Mode（spaceキー押下後）**
| キー | FUNC-300処理 | FUNC-202処理 |
|------|-------------|-------------|
| `space` | `waiting`状態へ遷移 | 表示更新再開 |
| 他のキー | 通常通り処理 | 通常通り処理 |

#### **FUNC-300連携実装例**:
```javascript
// FUNC-300の状態遷移ハンドラー登録
KeyInputManager.initializeStateMaps() {
  // Waiting Modeのキー登録
  this.registerToState('waiting', 'q', FUNC202.exit);
  this.registerToState('waiting', 'a', FUNC202.setAllMode);
  this.registerToState('waiting', 'u', FUNC202.setUniqueMode);
  this.registerToState('waiting', 'x', FUNC202.refresh);
  
  // 状態遷移キー（FUNC-300が管理）
  this.registerToState('waiting', 'space', () => {
    this.setState('paused');
    FUNC202.updateDisplayState({ mode: 'paused', streamActive: false });
  });
  this.registerToState('waiting', 'f', () => {
    this.setState('filtering');
    FUNC202.updateDisplayState({ mode: 'filter' });
  });
  this.registerToState('waiting', '/', () => {
    this.setState('searching');
    FUNC202.updateDisplayState({ mode: 'search' });
  });
  
  // Filtering Modeのキー登録
  this.registerToState('filtering', 'f', () => {
    FUNC203.toggleFind();
    FUNC202.updateFilterDisplay();
  });
  this.registerToState('filtering', 'Escape', () => {
    this.setState('waiting');
    FUNC202.updateDisplayState({ mode: 'normal' });
  });
  
  // Searching Modeのキー登録
  this.registerToState('searching', 'Enter', () => {
    FUNC202.applySearch(this.getInputBuffer());
  });
  this.registerToState('searching', 'Escape', () => {
    this.setState('waiting');
    FUNC202.updateDisplayState({ mode: 'normal' });
  });
}

// FUNC-202側の表示状態更新ハンドラー
FUNC202.updateDisplayState = function(displayState) {
  this.currentDisplayState = displayState;
  this.updateDynamicArea(displayState.mode);
  if (displayState.streamActive !== undefined) {
    this.setStreamActive(displayState.streamActive);
  }
};
```

### **色分け仕様**

イベント種別の色分けは、config.jsonで設定可能。デフォルト値は **[FUNC-101: 階層的設定管理](./FUNC-101-hierarchical-config-management.md)** で定義。

## 🔧 実装ガイドライン

### **DisplayManager設計**

1. **DataFetcher クラス**
   - データベースクエリ実行
   - All/Uniqueモードに応じたSQL生成
   - 結果セットのキャッシュ管理
   - フィルタ・検索条件の適用

2. **Formatter クラス**
   - カラム幅計算（FUNC-200対応）
   - 時刻・サイズのフォーマット
   - パス名の省略表示
   - 検索キーワードのハイライト

3. **Renderer クラス**
   - FUNC-201の二重バッファ活用
   - 色分け適用
   - 4エリア構造の描画管理
   - Dynamic Control Areaの切り替え

4. **StateManager クラス**
   - 表示状態の管理（normal/filter/search/paused）
   - フィルタ条件の保持
   - 検索キーワードの保持
   - FUNC-300との状態同期

### **East Asian Width対応**

- FUNC-200の文字幅計算を使用
- ファイル名の省略表示（...で終端）
- 日本語ファイル名の正確な幅計算

## 🧪 テスト要件

1. **基本動作確認**
   - All/Uniqueモード切り替え
   - Pause/Resume機能の動作
   - 手動リフレッシュの動作
   - データベースとの同期

2. **状態遷移テスト**
   - Normal → Filter → Normalの遷移
   - Normal → Search → Normalの遷移
   - Pause状態での各種操作
   - ESCキーによる状態リセット

3. **フィルタ・検索機能**
   - イベントタイプフィルタのトグル動作
   - 複数フィルタの組み合わせ
   - 正規表現検索の動作
   - フィルタ・検索結果の表示更新

4. **表示確認**
   - East Asian Width文字の正しい表示
   - 色分けの適用
   - Dynamic Control Areaの切り替え
   - ヘッダーのフィルタ状態表示

5. **パフォーマンス確認**
   - 100ms更新間隔の維持（通常時）
   - Pause時の更新停止確認
   - 大量イベント時の安定性
   - フィルタ適用時のレスポンス

## 💡 使用シナリオ

### **開発中のファイル監視**
```bash
# プロジェクトディレクトリで実行
cctop

# 基本操作フロー
1. [u]キー: Uniqueモードで現在のファイル状態を確認
2. [a]キー: Allモードで変更履歴を追跡
3. [f]キー → [m][c]: Modify/Createイベントのみ表示
4. [/]キー → "*.ts": TypeScriptファイルのみ検索
5. [space]キー: 特定の変更を詳しく見たい時に一時停止
```

### **ビルドプロセスの監視**
```bash
# ビルド出力ディレクトリを監視
cctop ./dist

# ビルド監視フロー
1. [f]キー → [c]: Createイベントのみ表示（新規生成ファイル）
2. [space]キー: ビルド完了時に一時停止して確認
3. [x]キー: 手動リフレッシュで最新状態を確認
```

### **デバッグ時の活用**
```bash
# ログディレクトリを監視
cctop ./logs

# デバッグフロー
1. [/]キー → "error": エラー関連ファイルを検索
2. [↑↓]キー: 特定のイベントを選択
3. [Enter]キー: 詳細情報を表示（FUNC-401連携）
```

## 🔗 他機能との連携

### 必須連携機能

#### FUNC-300: Key Input Manager
- **状態管理**: normal/filter/search/pausedの4状態を連携
- **キー処理**: 状態に応じたキーハンドラーの切り替え
- **動的登録**: フィルタ・検索モードでの動的キー登録

#### FUNC-203: Event Type Filtering  
- **フィルタ処理**: イベントタイプのトグル機能を提供
- **状態共有**: 現在のフィルタ状態をFUNC-202と共有
- **表示更新**: フィルタ変更時の即時反映

#### FUNC-400: Interactive Selection Mode
- **選択連携**: ↑↓キーでの選択機能開始
- **状態遷移**: 選択モード時の表示制御
- **詳細表示**: Enterキーでの詳細表示連携

### 任意連携機能

#### FUNC-003: Background Activity Monitor
- **標準モード**: FUNC-202単独でCLI表示実行
- **バックグラウンド監視モード**: FUNC-202をViewer Process内で実行
- **責務継承**: Viewer ProcessはFUNC-202の表示機能を完全継承
- **プロセス分離**: Monitor（データ書き込み）とViewer（FUNC-202ベース表示）の分離

#### FUNC-500: Runtime Control Mode（将来実装）
- **Pause/Resume**: より高度な一時停止制御
- **Speed Control**: 更新頻度の動的変更
- **Buffer Management**: イベントバッファ管理

## 🎯 成功指標

1. **使いやすさ**: 
   - 直感的な操作で学習コストゼロ
   - 3行目の動的切り替えによる段階的機能開示
   - vimライクな操作体系（/で検索、ESCで戻る）

2. **視認性**: 
   - East Asian Width対応による正確な表示
   - 4エリア構造による情報の整理
   - フィルタ・検索状態のヘッダー表示

3. **パフォーマンス**: 
   - ちらつきなしのスムーズな更新
   - Pause機能による制御可能性
   - フィルタ・検索の即時反映

4. **信頼性**: 
   - データベースとの完全な同期
   - 状態遷移の一貫性
   - エラー時の適切なフォールバック

## 📝 変更履歴

### v0.3.1.0 (2025-07-03)
- **状態管理統合**: FUNC-202の状態管理をFUNC-300に統合
- **キー処理統一**: 全てのキー入力をFUNC-300が一元管理
- **表示状態連動**: FUNC-300の入力状態とFUNC-202の表示状態を連動
- **整合性向上**: キーバインドと状態遷移の一貫性を実現

### v0.3.0.0 (2025-07-03)
- 4エリア構造の導入（Header/Event Rows/Command Keys/Dynamic Control）
- Dynamic Control Area（3行目）の動的切り替え機能
- Stream Pause/Resume機能の追加（spaceキー、Daemonは動作継続）
- 手動リフレッシュ機能の追加（xキー）
- イベントフィルタモードの実装（fキー）
- クイックサーチモードの実装（/キー）
- FUNC-300との状態管理連携強化

### v0.2.0.0 (2025-06-30)
- 初版リリース
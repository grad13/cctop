# BP-M2: Filter Mode Architecture

**作成日**: 2025年7月7日  
**更新日**: 2025年7月7日  
**作成者**: Architect Agent  
**Version**: 2.0.0  

## 📊 概要

**フィルタモード**は、streamモード（M1）に続く第2段階のマイルストーンで、**3つのフィルター機能の統合実装**を提供します。Display Mode、Event Filter、Keyword Filterを集合論的アプローチで統合し、直感的で予測可能なフィルタリング体験を実現します。

**核心価値**: ノイズ除去と関心イベントへの集中による効率的ファイル監視

## 🎯 マイルストーン目標

### 3層フィルター統合の実現
- **Display Mode**: All/Uniqueモード切り替え
- **Event Filter**: イベントタイプ別フィルタリング  
- **Keyword Filter**: ファイル名・パス検索

### 集合論的アプローチの実装
- **処理順序統一**: Unique First → Filter Check パターン
- **削除ファイル統一処理**: 最新イベントがfilter対象外なら全体非表示
- **予測可能な動作**: 複数フィルタ組み合わせ時の一貫性

### 高速レスポンス実現
- **リアルタイム検索**: JavaScript即座ローカル検索
- **DB検索**: Enter時の包括的データベース検索
- **段階的取得**: 効率的なデータロード戦略

## 📋 対象FUNC仕様（200-300番台）

### コア基盤（M1継承）
**[FUNC-202: CLI Display Integration](../functions/FUNC-202-cli-display-integration.md)**
- M2での拡張: 4エリア構造による動的フィルタUI
- Dynamic Control Area: フィルタ状態に応じた3行目切り替え
- Filter状態表示: ヘッダーでのアクティブフィルタ可視化

**[FUNC-300: Key Input Manager](../functions/FUNC-300-key-input-manager.md)**  
- M2での拡張: フィルタモード用キーバインド追加
- 状態管理拡張: filtering/searching状態の追加
- 動的キー登録: フィルタモードでの専用キーハンドラー

### フィルター機能群
**[FUNC-203: Event Type Filtering](../functions/FUNC-203-event-type-filtering.md)**
- イベントタイプ別フィルタリング（find/create/modify/delete/move/restore）
- キーボードショートカット（f/c/m/d/v/r）によるトグル操作
- FUNC-301への状態変更通知

**[FUNC-301: Filter State Management](../functions/FUNC-301-filter-state-management.md)**  
- 3層フィルター状態の統合管理
- 集合論的フィルタリングロジック
- Display Modeとの統合制御

**[FUNC-208: UI Filter Integration](../functions/FUNC-208-ui-filter-integration.md)**
- 3フィルター統合仕様の実装方針
- 「unique処理=各ファイルの最新eventを表示する」定義
- 処理順序問題の根本解決

## 🏗️ アーキテクチャ構成

### フィルター統合システム図

```
┌─────────────────────────────────────────────────────────┐
│                  Filter Mode Architecture               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │           User Input Layer (FUNC-300)               │ │
│ │  [f] Filter  [/] Search  [a] All  [u] Unique       │ │
│ └─────────────────┬───────────────────────────────────┘ │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │         Filter State Manager (FUNC-301)            │ │
│ │  ┌───────────┬─────────────┬──────────────────┐   │ │
│ │  │Display    │Event Filter │Keyword Filter    │   │ │
│ │  │Mode       │(FUNC-203)   │(Local + DB)      │   │ │
│ │  │All/Unique │f/c/m/d/v/r  │Real-time Search  │   │ │
│ │  └───────────┴─────────────┴──────────────────┘   │ │
│ └─────────────────┬───────────────────────────────────┘ │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │      Filtering Logic (FUNC-208 Integration)        │ │
│ │                                                     │ │
│ │  Step 1: Unique Processing (if enabled)            │ │
│ │  ├─ Pattern: Get latest event per file             │ │
│ │  └─ Rule: Latest event must pass filter check      │ │
│ │                                                     │ │
│ │  Step 2: Event Type Filtering                      │ │
│ │  ├─ Apply active event filters                     │ │
│ │  └─ Set intersection with display candidates       │ │
│ │                                                     │ │
│ │  Step 3: Keyword Filtering                         │ │
│ │  ├─ Local search (real-time)                       │ │
│ │  └─ DB search (on Enter)                           │ │
│ └─────────────────┬───────────────────────────────────┘ │
│                   ▼                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │        Display Output (FUNC-202)                   │ │
│ │  ┌─ Header ─────────────────────────────────────┐  │ │
│ │  │ cctop v1.0.0 [Filter: c,m] [Search: *.ts]   │  │ │
│ │  ├─ Event Rows ──────────────────────────────────┤  │ │
│ │  │ [Filtered event display]                     │  │ │
│ │  ├─ Command Keys ────────────────────────────────┤  │ │
│ │  │ [q] Exit [f] Filter [/] Search [ESC] Clear   │  │ │
│ │  └─ Dynamic Area ────────────────────────────────┘  │ │
│ │    Filter Mode: [f][c][m][d][v][r] toggle events   │ │
│ │    Search Mode: Search: [___________] [Enter] DB    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │        Database Layer (M1 Foundation)              │ │
│ │   SQLite DB + aggregates/events tables             │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 情報フロー

```
[ユーザーキー入力]
    ↓ FUNC-300
[キー処理・状態遷移]  
    ↓ 状態変更通知
[FUNC-301: Filter State]
    ↓ フィルタ条件
[FUNC-208: 統合フィルタリング]
    ↓ 処理順序: Unique → Event → Keyword
[Database Query with Filters]
    ↓ 結果セット
[FUNC-202: 表示更新]
```

### M1基盤との連携

```
M1 (Stream Mode) - 基盤提供
├── FUNC-000: Database Foundation → フィルタ対象データの供給源
├── FUNC-202: CLI Display → 4エリア構造による動的UI  
├── FUNC-300: Key Input Manager → フィルタキー処理の基盤
└── FUNC-201: Double Buffer → フィルタ結果の滑らかな更新

M2 (Filter Mode) - フィルタ機能拡張
├── FUNC-203: Event Type Filtering → イベント別フィルタリング
├── FUNC-301: Filter State Management → 統合状態管理
├── FUNC-208: UI Filter Integration → 3層フィルタ統合
└── Filter-specific enhancements → リアルタイム検索・DB検索
```

## 🔧 技術実装戦略

### 1. 集合論的フィルタリング実装

#### 処理順序統一（FUNC-208準拠）

```typescript
// Unique First → Filter Check パターンの実装
class IntegratedFilterProcessor {
  applyFilters(events: EventData[], filterState: FilterState): EventData[] {
    let candidates = events;
    
    // Step 1: Unique処理（有効な場合）
    if (filterState.displayMode === 'unique') {
      candidates = this.getLatestEventPerFile(candidates);
      // 重要: 最新イベントがevent filter条件を満たすファイルのみ残す
      candidates = candidates.filter(event => 
        this.passesEventFilter(event, filterState.eventFilters)
      );
    } else {
      // Step 2: Event Type Filtering (All Modeの場合)
      candidates = candidates.filter(event =>
        this.passesEventFilter(event, filterState.eventFilters)
      );
    }
    
    // Step 3: Keyword Filtering
    if (filterState.keywordFilter) {
      candidates = this.applyKeywordFilter(candidates, filterState.keywordFilter);
    }
    
    return candidates;
  }

  private getLatestEventPerFile(events: EventData[]): EventData[] {
    const fileMap = new Map<number, EventData>();
    
    // 時系列順（新しい順）でイベントを処理
    events.forEach(event => {
      if (!fileMap.has(event.fileId)) {
        fileMap.set(event.fileId, event); // 最新のもののみ保持
      }
    });
    
    return Array.from(fileMap.values());
  }
}
```

### 2. 2段階検索システム実装

#### リアルタイム検索 + DB検索

```typescript
// FUNC-202での2段階検索実装
class TwoStageSearchSystem {
  private localSearchResults: EventData[] = [];
  private dbSearchCache = new Map<string, EventData[]>();

  // Stage 1: リアルタイムローカル検索
  onKeywordInput(keyword: string, currentEvents: EventData[]) {
    this.localSearchResults = currentEvents.filter(event =>
      event.fileName.includes(keyword) || 
      event.directoryPath.includes(keyword)
    );
    
    // 即座に表示更新
    this.updateDisplay(this.localSearchResults);
  }

  // Stage 2: データベース包括検索
  async onEnterKeyPressed(keyword: string, filterState: FilterState) {
    if (this.dbSearchCache.has(keyword)) {
      return this.dbSearchCache.get(keyword)!;
    }

    const dbResults = await this.searchDatabase(keyword, filterState);
    this.dbSearchCache.set(keyword, dbResults);
    
    // DB検索結果で表示更新
    this.updateDisplay(dbResults);
    return dbResults;
  }

  private async searchDatabase(keyword: string, filterState: FilterState): Promise<EventData[]> {
    // フィルタ連携の段階的取得（FUNC-202準拠）
    return await this.stageWiseDataRetrieval(keyword, filterState);
  }
}
```

### 3. 動的UI制御実装

#### FUNC-202 4エリア構造の活用

```typescript
// Dynamic Control Area の実装
class DynamicControlAreaManager {
  updateControlArea(mode: 'normal' | 'filter' | 'search') {
    const dynamicArea = this.screen.getDynamicControlArea();
    
    switch (mode) {
      case 'filter':
        dynamicArea.setContent(
          '[f] Find [c] Create [m] Modify [d] Delete [v] Move [r] Restore [ESC] Back'
        );
        break;
        
      case 'search':
        const searchInput = this.getSearchInput();
        dynamicArea.setContent(
          `Search: [${searchInput.padEnd(35)}] [Enter] Search DB [ESC] Cancel`
        );
        break;
        
      case 'normal':
      default:
        dynamicArea.setContent(
          '[f] Filter Events　[/] Quick search　[ESC] Clear'
        );
        break;
    }
    
    this.screen.render();
  }
}
```

## 🎯 ユーザー価値

### ノイズ除去機能
**問題解決**: 大量のファイル変更から関心事項のみを抽出
- 特定イベントタイプのみ表示（Create/Modifyのみ等）
- キーワード検索による即座の絞り込み
- Uniqueモードでの最新状態フォーカス

### 直感的操作体験
**操作性向上**: vim/emacs的なキーボード主導操作
- [f]キー → フィルタモード → [c][m][d]でイベント選択
- [/]キー → 検索モード → リアルタイム絞り込み
- [ESC]キー → 常に前状態への復帰

### 集合論的予測可能性
**動作一貫性**: 複数フィルタ組み合わせ時の論理的動作
- UniqueとEventフィルタの組み合わせで削除ファイルが適切に処理
- 検索結果とフィルタの交集合による直感的結果
- 処理順序統一による予測可能なフィルタリング

## 📊 実装戦略

### Phase 1: Event Type Filtering基盤
**実装**: FUNC-203, FUNC-301の基本機能
- イベントタイプ別フィルタリング実装
- Filter State管理システム構築
- FUNC-300との基本連携

### Phase 2: UI統合・Dynamic Area
**実装**: FUNC-202拡張, FUNC-208統合仕様
- 4エリア構造の動的切り替え実装
- フィルタ状態の視覚的表示
- キー操作フローの統合

### Phase 3: Keyword Search・DB統合
**実装**: 2段階検索システム
- リアルタイムローカル検索
- Enter時DB検索・段階的取得
- 検索結果キャッシュシステム

### Phase 4: 集合論的統合・最適化
**実装**: FUNC-208完全仕様
- Unique First → Filter Check実装
- 削除ファイル統一処理
- パフォーマンス最適化

## 🔄 M1・M3への連携

### M1 (Stream Mode) からの発展
**基盤活用**:
- FUNC-202の4エリア構造 → フィルタUIの動的表示基盤
- FUNC-300のキー管理 → フィルタキーの追加登録
- Database Foundation → フィルタ対象データの効率的取得

### M3 (Detail Mode) への基盤提供
**発展準備**:
- フィルタ結果からの直接選択 → FUNC-400連携
- 絞り込み状態の保持 → 詳細表示後の復帰機能
- キーバインド体系 → 選択・詳細表示への拡張

## 💡 使用シナリオ

### 開発監視での活用
```bash
# 1. 修正系イベントのみ監視
[f] → [m] → Modifyイベントのみ表示

# 2. 特定ファイル検索
[/] → "component" → リアルタイム絞り込み → [Enter] → DB包括検索

# 3. 最新状態確認
[u] → Uniqueモード → 各ファイルの最新状態のみ表示

# 4. 複合フィルタ
[u] → [f] → [c][m] → 各ファイルの最新Create/Modifyのみ
```

### ビルド監視での活用
```bash
# 1. 新規生成ファイル監視
[f] → [c] → Create/Findイベントのみ表示

# 2. ビルド出力検索
[/] → "dist" → ビルド出力ディレクトリのみ

# 3. エラー調査
[/] → "error" → [Enter] → エラー関連ファイルのDB検索
```

## 🎯 成功指標

### 機能性指標
**フィルタリング正確性**: 100%（集合論的動作確保）
**検索レスポンス**: ローカル検索50ms以内、DB検索500ms以内
**UI応答性**: キー操作→表示更新100ms以内

### ユーザー体験指標
**操作習得**: 基本フィルタ操作2分以内で習得可能
**効率向上**: ノイズ除去により監視効率70%向上
**直感性**: 複合フィルタ動作の予測可能性95%以上

---

**核心価値**: 集合論的アプローチによる直感的で予測可能なフィルタリングにより、ファイル監視における関心事項への効率的な集中を実現する
# BP-005: FUNC Dependencies Diagram

**作成日**: 2025年7月7日 22:00  
**更新日**: 2025年7月7日 22:00  
**作成者**: Architect Agent  
**Version**: 1.0.0  
**関連仕様**: All FUNC specifications

## 📊 概要

cctopプロジェクトの全24 Active機能間の**依存関係を体系的に図示**し、実装順序・設計判断・影響範囲分析のための指針を提供します。

## 🎯 依存関係の定義

### 依存関係の種類

1. **必須依存（Must-have）**: 機能Aが機能Bなしでは動作不可能
2. **参照依存（Reference）**: 機能Aが機能Bの仕様・データを参照
3. **連携依存（Collaboration）**: 機能Aと機能Bが協調して動作
4. **設定依存（Configuration）**: 機能Aが機能Bの設定に依存

## 🏗️ 階層別依存関係

### Level 0: 基盤層（Foundation）- 000番台

```
FUNC-000 (SQLite Database Foundation)
    ↑ 必須依存
    ├── FUNC-001 (File Lifecycle Tracking)
    ├── FUNC-002 (Chokidar Database Integration)
    ├── FUNC-003 (Background Activity Monitor)
    └── FUNC-202 (CLI Display Integration)
```

### Level 1: 設定管理層（Configuration）- 100番台

```
FUNC-101 (Hierarchical Config Management)
    ↑ 設定依存
    ├── FUNC-106 (Daemon Configuration)
    ├── FUNC-107 (CLI Configuration)
    ├── FUNC-108 (Color Theme Configuration)
    └── FUNC-105 (Local Setup Initialization)

FUNC-104 (CLI Interface Specification)
    ↑ 参照依存
    ├── FUNC-003 (Background Activity Monitor)
    └── FUNC-202 (CLI Display Integration)

FUNC-102 (File Watch Limit Management)
    ↑ 設定依存
    └── FUNC-002 (Chokidar Database Integration)
```

### Level 2: 表示層（Display）- 200番台

```
FUNC-200 (East Asian Width Display)
    ↑ 必須依存
    └── FUNC-202 (CLI Display Integration)

FUNC-201 (Double Buffer Rendering)
    ↑ 必須依存
    └── FUNC-202 (CLI Display Integration)

FUNC-202 (CLI Display Integration) ← 【中核ハブ】
    ↑ 依存元
    ├── FUNC-000 (Database Foundation)
    ├── FUNC-301 (Filter State Management)
    ├── FUNC-107 (CLI Configuration)
    └── FUNC-206 (Progressive Loading)

FUNC-203 (Event Type Filtering)
    ↑ 連携依存
    ├── FUNC-300 (Key Input Manager)
    └── FUNC-301 (Filter State Management)

FUNC-204 (Responsive Directory Display)
    ↑ 参照依存
    └── FUNC-202 (CLI Display Integration)

FUNC-206 (Progressive Loading)
    ↑ 連携依存
    ├── FUNC-003 (Background Activity Monitor)
    ├── FUNC-202 (CLI Display Integration)
    └── FUNC-301 (Filter State Management)

FUNC-208 (UI Filter Integration)
    ↑ 連携依存
    ├── FUNC-202 (CLI Display Integration)
    ├── FUNC-203 (Event Type Filtering)
    ├── FUNC-300 (Key Input Manager)
    └── FUNC-301 (Filter State Management)
```

### Level 3: 入力管理層（Input）- 300番台

```
FUNC-300 (Key Input Manager) ← 【入力ハブ】
    ↑ 連携依存
    ├── FUNC-203 (Event Type Filtering)
    ├── FUNC-208 (UI Filter Integration)
    ├── FUNC-400 (Interactive Selection)
    └── FUNC-401-404 (Detail Modes)

FUNC-301 (Filter State Management) ← 【状態ハブ】
    ↑ 必須依存
    ├── FUNC-202 (CLI Display Integration)
    ├── FUNC-203 (Event Type Filtering)
    ├── FUNC-206 (Progressive Loading)
    └── FUNC-208 (UI Filter Integration)
```

### Level 4: インタラクション層（Interactive）- 400番台

```
FUNC-400 (Interactive Selection Mode)
    ↑ 連携依存
    ├── FUNC-300 (Key Input Manager)
    ├── FUNC-202 (CLI Display Integration)
    └── FUNC-401-404 (Detail Modes)

FUNC-401 (Detailed Inspection Mode)
    ↑ 参照依存
    ├── FUNC-400 (Interactive Selection)
    └── FUNC-202 (CLI Display Integration)

FUNC-402 (Aggregate Display Module)
    ↑ 参照依存
    ├── FUNC-000 (Database Foundation)
    └── FUNC-202 (CLI Display Integration)

FUNC-403 (History Display Module)
    ↑ 参照依存
    ├── FUNC-000 (Database Foundation)
    └── FUNC-202 (CLI Display Integration)

FUNC-404 (Dual Pane Detail View)
    ↑ 参照依存
    ├── FUNC-400 (Interactive Selection)
    ├── FUNC-402 (Aggregate Display)
    └── FUNC-403 (History Display)
```

## 🔄 重要な依存関係パターン

### 1. 中核ハブ機能

**FUNC-202 (CLI Display Integration)**
- システムの表示中核として多数の機能から依存される
- 実装優先度: 🟥 最高（他機能の基盤）

**FUNC-301 (Filter State Management)**
- フィルタリング関連機能の状態管理中核
- 実装優先度: 🟨 高（フィルタ機能の基盤）

**FUNC-300 (Key Input Manager)**
- ユーザー入力の中核管理機能
- 実装優先度: 🟨 高（インタラクション機能の基盤）

### 2. 基盤機能チェーン

```
FUNC-000 → FUNC-001/002/003 → FUNC-202 → FUNC-20X/30X/40X
```

この順序での実装が必須。

### 3. 設定管理チェーン

```
FUNC-101 → FUNC-105/106/107/108 → 各機能
```

設定基盤の確立後に個別設定を実装。

### 4. フィルタ機能クラスター

```
FUNC-301 ↔ FUNC-203 ↔ FUNC-208
     ↑          ↑          ↑
FUNC-300 ← FUNC-202 ← FUNC-206
```

相互依存が強く、まとめて実装が効率的。

## 📊 実装順序の推奨

### Phase 1: 基盤確立（必須）
```
1. FUNC-000 (Database Foundation)
2. FUNC-101 (Config Management)
3. FUNC-105 (Local Setup)
4. FUNC-001 (File Lifecycle)
5. FUNC-002 (Chokidar Integration)
```

### Phase 2: 表示基盤（基本）
```
6. FUNC-200 (East Asian Width)
7. FUNC-201 (Double Buffer)
8. FUNC-202 (CLI Display) ← 【重要】
9. FUNC-107 (CLI Configuration)
10. FUNC-300 (Key Input Manager) ← 【重要】
```

### Phase 3: フィルタシステム（拡張）
```
11. FUNC-301 (Filter State) ← 【重要】
12. FUNC-203 (Event Type Filter)
13. FUNC-206 (Progressive Loading)
14. FUNC-208 (UI Filter Integration)
```

### Phase 4: 拡張機能（高度）
```
15. FUNC-003 (Background Monitor)
16. FUNC-106 (Daemon Configuration)
17. FUNC-204 (Responsive Directory)
18. FUNC-400 (Interactive Selection)
19. FUNC-401-404 (Detail Modes)
20. FUNC-102/108 (Advanced Configuration)
```

## ⚠️ 循環依存の回避

### 特に注意すべき組み合わせ

1. **FUNC-202 ↔ FUNC-301**
   - 解決: FUNC-301をFUNC-202より先に実装
   - FUNC-202はFUNC-301の状態を読み取る一方向依存に

2. **FUNC-300 ↔ FUNC-203/208**
   - 解決: FUNC-300をコールバック機構で実装
   - 個別フィルタ機能がFUNC-300に登録する構造

3. **FUNC-20X ↔ FUNC-30X**
   - 解決: 表示機能を先行実装
   - 入力機能は表示状態を参照する構造

## 🎯 影響範囲分析

### 変更影響度（高→低）

1. **FUNC-000**: 全システムに影響（データベーススキーマ変更）
2. **FUNC-202**: 全表示機能に影響（レンダリングエンジン変更）
3. **FUNC-301**: 全フィルタ機能に影響（状態管理変更）
4. **FUNC-300**: 全入力機能に影響（キー処理変更）
5. **FUNC-101**: 全設定機能に影響（設定形式変更）

### 独立性の高い機能

- **FUNC-204**: ディレクトリ表示（独自実装可能）
- **FUNC-401-404**: 詳細表示系（独立性高）
- **FUNC-102/108**: 高度設定（他への影響少）

## 📋 開発チーム配分の提案

### Builder（主担当: Shared Library + CLI基盤）
- FUNC-101, 105, 107, 200, 201, 202, 300

### Validator（主担当: Daemon + Database）
- FUNC-000, 001, 002, 003, 106

### 協調開発エリア
- FUNC-301, 203, 206, 208（フィルタシステム）
- FUNC-400, 401-404（インタラクションシステム）

## 🎯 成功指標

1. **依存順序の遵守**: 実装順序が依存関係に従っている
2. **循環依存ゼロ**: 相互依存のない清潔な設計
3. **影響範囲の最小化**: 変更時の影響が予測範囲内
4. **並行開発効率**: チーム間の作業阻害要因がない

---

**核心価値**: 明確な依存関係定義により、効率的な実装順序と保守性の高いシステム設計を実現する
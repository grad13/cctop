# Tests-to-Code Diagnosis Summary

Generated: 2026-03-14

## Overall Results

| Module | Total Files | Pass | Fail | Tests Pass | Tests Fail |
|--------|-------------|------|------|------------|------------|
| shared | 9 | 9 | 0 | 222 | 0 |
| daemon/unit | 7 | 7 | 0 | 43 | 0 |
| daemon/integration:1 | 3 | 1 | 2 | 11 | 5 |
| daemon/integration:2 | 3 | 1 | 2 | 12 | 4 |
| daemon/integration:3 | 3 | 0 | 3 | 0 | 9+ |
| daemon/integration:4 | 1 | 0 | 1 | 0 | 12 |
| daemon/integration:5 | 2 | 0 | 2 | 0 | 0 (load fail) |
| daemon/integration:6 | 2 | 2 | 0 | 28 | 0 |
| daemon/e2e | 3 | 1 | 2 | 1 | 3 |
| view/unit | 43 | 38 | 5 | 666 | 15 |
| view/functional:1 | 5 | 0 | 5 | 22 | 20 |
| view/functional:2 | 6 | 1 | 5 | 3 | 2 |
| view/functional:3 | 13 | 1 | 12 | 7 | 11 |
| view/integration | 6 | 1 | 5 | 27 | 20 |

**Total: ~103 test files, ~1042 tests passed, ~101 tests failed**

---

## Classified Failures

### Class A1: テスト側importパス不整合（テスト修正）

#### A1-1 (旧C2-1): Config `cli` → `view` リネーム追従漏れ
- **影響**: view/functional:1 (20 fail), view/integration (20 fail), view/functional:3 (一部)
- **テスト**: `config.cli.display.maxRows`, `config.cli.database.path` 等を期待
- **実態**: `loadConfiguration()` は `view` プロパティを返す。テストが旧名 `cli` を参照
- **対処**: テスト側で `config.cli` → `config.view`、プロパティ名も対応修正

#### A1-2 (旧C2-3): `projectName` → `project.name` 移行追従漏れ
- **影響**: local-setup-core.test.ts, local-setup-initializer.test.ts, func-105-setup-flow.test.ts
- **テスト**: `expect(sharedConfig).toHaveProperty('projectName')`
- **実態**: `project.name` に移行済み。テストが旧フィールド参照
- **対処**: テスト側で `projectName` → `project.name`

#### A1-3 (旧C2-4): UIState 旧API参照
- **影響**: refactor-protection.test.ts (7 fail), navigation-behavior.test.ts (2 fail)
- **旧メソッド**: `getEventFilters()`, `getPreviousDisplayMode()`, `enterFilterMode()`, `enterSearchMode()`, `isNearBottom()`
- **実態**: 新APIに移行済み（`getEventTypeFilters()`, `startEditing('event_type_filter')` 等）
- **対処**: テスト側で旧メソッド → 新API書き換え

#### A1-4 (旧C2-5): Database/DatabaseAdapter import パス不整合
- **影響**: daemon/integration (3ファイル), view/functional (9ファイル), view/integration (一部)
- **詳細**:
  - daemon側: `Database` → `FileEventRecorder` に分割済み（3ファイルのみ修正必要、残り18ファイルは既移行 or 間接使用）
  - view側: `DatabaseAdapter` → `FileEventReader` + `EventQueryAdapter` + `QueryBuilder` に分割済み
  - 未実装ソース参照（DynamicDataLoader, ESCOperationManager, DemoDataGenerator, SearchResultCache）→ カテゴリ3として別途対処
  - `BlessedFramelessUISimple` → `BlessedFramelessUI` にリネーム済み
- **対処**: テスト側のimportパス書き換え

### Class A6: テスト側データ/モック問題（テスト修正）

#### A6-1 (旧C2-2): version ハードコード `0.3.0.0`
- **影響**: config-loader-core.test.ts (L40, L135), config-loader-initialization.test.ts (L156)
- **テスト**: `expect(config.shared.version).toBe('0.3.0.0')`
- **実態**: SharedConfig は `0.5.2.6`。テストがハードコード値を期待
- **対処**: テスト側 `'0.3.0.0'` → `'0.5.2.6'` + ソース側バグ修正（ViewConfig.ts L61, daemon/src/config/DaemonConfig.ts L24）

#### A6-2 (旧C2-6): QueryBuilder テストのアサーションバグ
- **影響**: query-builder.test.ts (1 fail)
- **テスト**: `expect(result).not.toContain('e.id')` — `'le.id'` にもマッチしてしまう
- **実態**: コードは正しい。テストのアサーションが不正確
- **対処**: `not.toContain('e.id')` → `not.toMatch(/\be\.id/)`

#### A6-3 (旧C2-7): ColumnNormalizer テスト期待値誤り
- **影響**: supplement-column-normalizer.test.ts (1 fail)
- **テスト**: 期待値 20文字幅
- **実態**: コードは正しく21文字幅を返す
- **対処**: テスト期待値を21文字に修正

#### A6-4 (旧C2-8): FileEventReader テストの期待誤り
- **影響**: supplement-file-event-reader.test.ts (3 fail)
- **テスト**: QueryBuilder メソッドが呼ばれることを期待
- **実態**: FileEventReader は QueryBuilder を正しく使用している。テストの期待が不正確
- **対処**: 修正不要（実態を再調査の結果、問題なしと判明）

#### A6-5 (旧C2-9): UILayoutManager モック構造不一致
- **影響**: supplement-ui-layout-manager.test.ts (7 fail)
- **テスト**: `blessed.default.box`, `blessed.default.parseTags` 等を期待
- **実態**: blessed のモック構造が実コードと不一致
- **対処**: テストのモック構造を実コードに合わせて修正

#### A6-6 (旧C2-10): process.exit モック/セットアップ問題
- **影響**: supplement-index.test.ts (3 fail)
- **テスト**: `CCTOPCli.start()` がprocess.exitを呼ぶことを期待
- **対処**: テストのモック/セットアップを修正

### Class B: コードの問題（実行診断・報告のみ）

#### B4-1: daemon integration テストのタイミング問題
- **影響**: daemon/integration:1 (5 fail), integration:2 (4 fail), integration:3 (9+ fail), e2e (3 fail)
- **詳細**: chokidarのファイル検知タイミングに依存するテストが不安定
  - `basic-aggregates.test.ts`: aggregatesが0件 — イベント未記録
  - `move-detection.test.ts`: moveイベント未検出
  - `restore-detection.test.ts`: restore/find イベント未検出
  - `startup-delete-detection.test.ts`: delete イベント0件
  - `statistics-tests.test.ts`: events空配列
  - `performance-tests.test.ts`: aggregates不足
  - `production-integration.test.ts`: 30秒タイムアウト
- **根本原因**: daemon起動後のイベント検知にタイミング依存あり。CIや負荷環境で不安定
- **対象**: daemon全体のイベントハンドリング — 報告のみ

#### B4-2: func000-compliance.test.ts の外部依存
- **影響**: view/functional:2 (2 fail), functional:3 (2 fail)
- **詳細**: `scripts/dummy_data_generator.py` が存在しない
- **対象**: view/tests/functional/database/func000-compliance.test.ts

#### B4-3: Permission error handling
- **影響**: func-105-setup-flow.test.ts (1 fail)
- **テスト**: `await expect(context.initializer.initialize()).resolves.not.toThrow()`
- **実態**: `EACCES` で throw する（graceful handling されない）
- **対象コード**: shared/src/config/LocalSetupInitializer

---

## Classification Summary (再分類後)

| クラス | 件数 | アクション |
|--------|------|-----------|
| **A1** (import/パス) | 4項目 | テスト側import/参照修正（20ファイル） |
| **A6** (モック/データ) | 6項目 | テスト側アサーション/モック修正 + version ソース修正2箇所 |
| **カテゴリ3** (未実装ソース) | 5ファイル | テスト削除 or skip or 実装（方針未決定） |
| **B4** (報告のみ) | 3項目 | 報告のみ |

注: 旧C2分類は全てA1/A6/修正不要に再分類。コード修正が必要なのはversion更新漏れ（2箇所）のみ。

## Priority Order (修正対象)

### Phase 2: アサーション修正（A6 — 影響小・確実）
1. **A6-1**: version `0.3.0.0` → `0.5.2.6`（テスト2ファイル + ソース2ファイル）
2. **A6-2**: QueryBuilder アサーション修正 — 1テスト
3. **A6-3**: ColumnNormalizer 期待値修正 — 1テスト
4. **A6-5**: UILayoutManager モック修正 — 7テスト
5. **A6-6**: process.exit モック修正 — 3テスト

### Phase 3: import/参照修正（A1 — 影響大）
6. **A1-4**: BlessedFramelessUISimple → BlessedFramelessUI — 4ファイル
7. **A1-2**: projectName → project.name — 5ファイル
8. **A1-3**: UIState 旧メソッド → 新API — 2ファイル
9. **A1-1**: Config cli → view — 3ファイル
10. **A1-4**: DatabaseAdapter → FileEventReader 等 — 9ファイル
11. **A1-4**: Database → FileEventRecorder — 3ファイル

### Phase 4: 未実装ソースのテスト（方針未決定）
12. DynamicDataLoader, ESCOperationManager, DemoDataGenerator, SearchResultCache, database-adapter-func000

### Report Only (B4)
13. **B4-1**: daemon タイミング問題
14. **B4-2**: dummy_data_generator.py 欠落
15. **B4-3**: Permission error handling

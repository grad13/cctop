---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-209-keyword-search-management.md
---

# Specification: Keyword Search Management

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/search/ | Node.js |

| Field | Value |
|-------|-------|
| Related | view-display-integration.md, ui-filter-integration.md, filter-state-management.md |
| Test Type | Unit |

## 1. Overview

包括的なキーワード検索機能を提供する。入力文字の正規化、複数キーワード検索、2段階検索処理、検索結果キャッシュ管理を統合し、効率的で使いやすい検索体験を実現する。

Key files:
- `view/src/search/KeywordSearchManager.ts`
- `view/src/search/MultiKeywordProcessor.ts`
- `view/src/search/TextNormalizer.ts`

**Scope (in)**:
- 入力文字の正規化処理（制御文字・空白・多言語対応）
- 複数キーワード検索（AND検索）
- 2段階検索処理（ローカル + データベース）
- 検索結果キャッシュ管理
- 段階的データ取得アルゴリズム
- 検索クエリ最適化

**Scope (out)**:
- キーボード入力処理（FUNC-300の責務）
- 検索結果の表示・描画（FUNC-202の責務）
- フィルタリング機能（FUNC-203/208の責務）
- データベース基盤管理（FUNC-000の責務）

## 2. Input Normalization

### Normalization Steps

1. **Control character processing**: convert ASCII control chars (0x00-0x1F, 0x7F) to space
2. **Whitespace normalization**: trim + collapse consecutive spaces to single space
3. **Multilingual support**: full UTF-8 support (Japanese, emoji, etc.)

### Examples

| Input | Output | Notes |
|-------|--------|-------|
| `test\n` | `test` | newline → space → trimmed |
| `hello\tworld` | `hello world` | tab → space |
| `  test   debug  ` | `test debug` | trim + collapse |
| `日本語　テスト` | `日本語 テスト` | full-width space normalized |

### Implementation

```javascript
function normalizeSearchText(text: string): string {
  // a. convert control characters to space
  let normalized = text.replace(/[\x00-\x1F\x7F]/g, ' ');

  // b. trim leading/trailing whitespace
  normalized = normalized.trim();

  // c. collapse consecutive spaces
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}
```

## 3. Multi-Keyword Search

### Keyword Splitting

- Delimiter: space
- Search type: AND (all keywords must match)
- Target fields: file name and directory path

### Search Logic

```javascript
const keywords = normalizedText.split(' ').filter(k => k.length > 0);
filteredEvents = filteredEvents.filter(event =>
  keywords.every(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return (event.filename || '').toLowerCase().includes(lowerKeyword) ||
           (event.directory || '').toLowerCase().includes(lowerKeyword);
  })
);
```

### Examples

| Search String | Split Result | Behavior |
|--------------|-------------|----------|
| `test` | `["test"]` | single keyword |
| `test debug` | `["test", "debug"]` | AND search |
| `日本語 テスト` | `["日本語", "テスト"]` | multilingual AND |
| `🔍 file.md` | `["🔍", "file.md"]` | emoji supported |

## 4. Two-Stage Search

### Stage 1: Local Search (real-time)

- Triggered by each character input
- Searches events currently in memory
- Immediately highlights matching rows
- Target fields: filename, directory path
- Multi-keyword: AND search over normalized keyword array

### Stage 2: Database Search (Shift+Enter)

- Triggers SQLite search
- Trigger: `Shift+Enter` key press
- Fetch strategy: progressive, filter-aware
- Multi-keyword: each keyword applied as AND condition in SQL

## 5. Search Result Cache (future)

### Retention Strategy

- Cache per keyword, up to 3 entries (LRU)
- Eviction triggers:
  - New search executed (keyword changed)
  - Mode switch (All ↔ Unique)
  - ESC exits search mode
  - Memory usage exceeds threshold

## 6. Progressive Fetch Algorithm (future)

```javascript
async function searchWithFilterConsideration(keywords, activeFilters) {
  const INITIAL_FETCH = 100;
  const MAX_FETCH = 1000;
  const TARGET_DISPLAY = 50;

  let offset = 0;
  let displayableEvents = [];

  while (displayableEvents.length < TARGET_DISPLAY && offset < MAX_FETCH) {
    const events = await db.searchEvents({
      keywords: keywords,
      filters: activeFilters,
      limit: INITIAL_FETCH,
      offset: offset
    });

    const filtered = events.filter(e => passesClientFilters(e));
    displayableEvents.push(...filtered);

    if (events.length < INITIAL_FETCH) break;
    offset += INITIAL_FETCH;
  }

  return displayableEvents.slice(0, TARGET_DISPLAY);
}
```

## 7. Database Query

```sql
SELECT e.*, f.file_path, f.file_name, m.*
FROM events e
JOIN files f ON e.file_id = f.file_id
LEFT JOIN measurements m ON e.event_id = m.event_id
WHERE
  (f.file_name LIKE '%keyword1%' OR f.file_path LIKE '%keyword1%')
  AND (f.file_name LIKE '%keyword2%' OR f.file_path LIKE '%keyword2%')
ORDER BY e.event_timestamp DESC;
```

## 8. Integration

- **FUNC-300**: receives character input in search mode
- **FUNC-202**: receives normalized search string for display

## 9. Test Requirements

- Control character normalization (Enter, Tab, etc.)
- Multi-keyword AND search
- Single keyword search (backward compatibility)
- Enter key not appearing as search character (control char fix)

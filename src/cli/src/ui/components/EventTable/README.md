# EventTable Module Specification

## Overview
EventTable is a display-only component responsible for rendering event lists in a table format with optimized performance through intelligent diff detection.

## Core Principles
- **Display-only responsibility**: No data management, filtering, or scrolling logic
- **Performance optimization**: Internal state tracking for minimal re-rendering
- **Simple interface**: Clean API that hides complexity

## Public API

### Constructor
```typescript
constructor(options: EventTableOptions, screenWidth: number)
```
- `options`: Configuration for blessed.box (parent, position, style)
- `screenWidth`: Terminal width for dynamic column sizing

### Primary Method
```typescript
render(events: EventRow[], selectedIndex: number): void
```
- `events`: Array of events to display (already filtered/sorted)
- `selectedIndex`: Currently selected row index (-1 for none)

### Utility Methods
```typescript
getHeader(): string        // Returns formatted header line
getColumnHeader(): string  // Returns column names only
getBox(): blessed.Box     // Access to underlying blessed element
destroy(): void           // Cleanup
```

## Internal Optimization

### State Tracking
```typescript
private previousEvents: EventRow[] = [];
private previousSelectedIndex: number = -1;
private formattedRowsCache: Map<number, string> = new Map();
```

### Diff Detection Strategy
1. **Selection-only change**: Re-render only 2 rows (old and new selection)
2. **Same events, different data**: Update changed rows only
3. **Completely different events**: Full re-render

### Performance Characteristics
- Selection change: O(1) - only 2 rows updated
- Append new events: O(n) where n = new events count
- Complete refresh: O(n) where n = total events

## Column Definition (Fixed)
| Column | Width | Alignment | Format |
|--------|-------|-----------|---------|
| Timestamp | 19 | left | YYYY-MM-DD HH:MM:SS |
| Elapsed | 9 | right | Dynamic (mm:ss, hh:mm:ss, days, months) |
| Filename | 35 | left | Truncate with ellipsis |
| Event Type | 8 | left | Colored by type |
| Lines | 6 | right | Numeric |
| Blocks | 8 | right | Numeric |
| Size | 7 | right | Dynamic (B, K, M, G) |
| Directory | * | left | Tail-first truncation |

*Directory width = terminal width - fixed columns - spacing

## Styling
- Selected row: Blue background (`{blue-bg}`)
- Non-selected rows: Green text (`{green-fg}`)
- Event types: Colored by type (cyan=find, green=create, etc.)
- End of data: Centered white text

## Limitations
1. **blessed.js constraint**: Even with diff detection, full content string must be rebuilt
2. **No partial updates**: Cannot update individual lines in blessed.box
3. **Memory overhead**: Stores previous state for comparison
4. **Fixed columns**: No dynamic column configuration

## Usage Example
```typescript
const eventTable = new EventTable({
  parent: screen,
  top: 3,
  height: '100%-7',
  style: { fg: 'white', bg: 'transparent' }
}, 180);

// In render loop
eventTable.render(visibleEvents, selectedIndex);
```

## Future Enhancements
- [ ] Row-level caching with content hash
- [ ] Smart diff algorithm for mid-list changes
- [ ] Column configuration support
- [ ] Theme/style customization
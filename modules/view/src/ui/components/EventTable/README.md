# EventTable Module Specification

## Overview
EventTable is a display-only component responsible for rendering event lists in a table format with optimized performance through intelligent diff detection. It manages EventRow instances for each event, providing efficient updates and rendering.

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

## Internal Architecture

### Class Structure
- **EventTable**: Main coordinator class that manages the overall table
- **EventRow**: Individual row instances that handle their own state and rendering
- **Renderers**: Static utility classes for headers and special messages
- **Formatters**: Type-specific formatting (time, file size, event type)
- **Utils**: Shared utilities (columnNormalizer, styleFormatter)

### State Management
```typescript
// EventTable state
private rows: Map<number, EventRow> = new Map(); // key: event.id
private rowOrder: number[] = []; // ordered event IDs
private selectedId: number | null = null;
private directoryWidth: number = 40;

// EventRow state
private data: EventRowData;
private selected: boolean = false;
private directoryWidth: number;
private cachedRender?: string;
private isDirty: boolean = true;
```

### Update Flow
1. `update(events, selectedIndex)` called with new data
2. EventTable compares event IDs to detect changes
3. Removes EventRow instances for deleted events
4. Updates existing EventRow instances with new data
5. Creates new EventRow instances for new events
6. Updates selection state on affected rows
7. Calls `render()` on each EventRow in order
8. Concatenates results and updates blessed box

### Diff Detection Strategy
1. **Event-level diff**: Compare event IDs to detect additions/removals
2. **Row-level updates**: EventRow handles its own dirty checking
3. **Selection changes**: Only affected rows (old/new) are marked dirty
4. **Data changes**: EventRow compares data deeply before marking dirty

### Performance Characteristics
- Selection change: O(1) - only affected EventRow instances re-render
- Event updates: O(n) where n = changed events
- Full refresh: O(n) where n = total events
- Memory: O(n) for EventRow instance storage
- Cache hit rate: High for stable lists with selection changes

## Column Definition (Fixed)

### Header Configuration
| Column | Header Text | Width | Header Alignment |
|--------|------------|-------|------------------|
| timestamp | Event Timestamp | 19 | left |
| elapsed | Elapsed | 8 | right |
| filename | File Name | 35 | left |
| event_type | Event | 6 | left |
| lines | Lines | 5 | right |
| blocks | Blks | 4 | right |
| size | Size | 7 | right |
| directory | Directory | * | left |

### Value Configuration
| Column | Width | Value Alignment | Format |
|--------|-------|-----------------|---------|
| Timestamp | 19 | left | YYYY-MM-DD HH:MM:SS |
| Elapsed | 8 | right | Dynamic (mm:ss, hh:mm:ss, days, months) |
| Filename | 35 | left | Truncate with ellipsis |
| Event Type | 6 | left | Colored by type (back for restore) |
| Lines | 5 | right | Numeric |
| Blocks | 4 | right | Numeric |
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

## Testing Guidelines

### EventTable Tests Should Cover:
1. **Update Method**
   - Correct EventRow instance management
   - Proper row ordering
   - Event ID-based diff detection
   - Selection state propagation

2. **Row Management**
   - EventRow creation for new events
   - EventRow removal for deleted events
   - EventRow update for changed events
   - Instance reuse based on ID

3. **Rendering**
   - Correct concatenation of EventRow outputs
   - Header generation
   - blessed box content updates
   - Screen width calculations

4. **Performance**
   - Minimal EventRow renders on selection change
   - Efficient diff detection
   - Memory management (row cleanup)

### Integration Points
- See `EventRow.md` for EventRow-specific test cases
- Mock blessed box for rendering tests
- Test with various event list sizes (0, 1, 100, 1000)
- Test rapid updates and selection changes

## Future Enhancements
- [ ] Row-level caching with content hash
- [ ] Smart diff algorithm for mid-list changes
- [ ] Column configuration support
- [ ] Theme/style customization
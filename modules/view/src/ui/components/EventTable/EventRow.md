# EventRow Class Specification

## Overview
EventRow is a class that manages the state and rendering of an individual event row in the EventTable. Each instance represents a single event and handles its own rendering logic.

## Constructor
```typescript
constructor(data: EventRowData, directoryWidth: number = 40)
```
- `data`: Event data object containing all event information
- `directoryWidth`: Width of the directory column (default: 40)

## Public Methods

### update(data: EventRowData): void
Updates the event data and marks the row for re-rendering.
- Only marks as dirty if data actually changed (deep comparison)
- Cached render is invalidated

### getId(): number
Returns the unique ID of the event.

### setSelected(selected: boolean): void
Sets the selection state of the row.
- Changes background color when selected (blue background)
- Only marks as dirty if selection state changed

### isSelected(): boolean
Returns the current selection state.

### setDirectoryWidth(width: number): void
Updates the directory column width.
- Only marks as dirty if width changed
- Used when terminal is resized

### render(): string
Generates the formatted string for display.
- Returns cached result if not dirty
- Formats all columns according to specifications
- Applies colors and selection highlighting
- Updates cache after rendering

### invalidate(): void
Forces re-render on next render() call by marking as dirty.

## Internal State
- `data`: Current event data
- `selected`: Selection state (boolean)
- `directoryWidth`: Current directory column width
- `cachedRender`: Cached render result (string)
- `isDirty`: Whether re-render is needed (boolean)

## Rendering Logic

### Column Formatting
Uses `normalizeColumn` for consistent width and alignment:
- Timestamp: 19 chars, left aligned
- Elapsed: 8 chars, right aligned  
- Filename: 35 chars, left aligned, tail truncation
- Event Type: 6 chars, left aligned, colored
- Lines: 5 chars, right aligned
- Blocks: 4 chars, right aligned
- Size: 7 chars, right aligned
- Directory: dynamic width, left aligned, head truncation

### Color Application
- Selected row: Blue background on entire row
- Non-selected row: Green text except event type
- Event type: Colored based on type (cyan/green/yellow/red/magenta/blue)

### Performance Optimization
- Caches rendered output when not dirty
- Only re-renders when:
  - Event data changes
  - Selection state changes
  - Directory width changes
  - Explicitly invalidated

## Example Usage
```typescript
// Create new row
const row = new EventRow(eventData, 40);

// Update selection
row.setSelected(true);

// Render
const output = row.render();
// Returns: "{blue-bg}2025-01-01 12:00:00 ... {/blue-bg}"

// Update data
row.update(newEventData);

// Change directory width
row.setDirectoryWidth(50);
```

## Testing Considerations

### Unit Tests Should Cover:
1. **Constructor**
   - Proper initialization with data
   - Default directory width

2. **Update Method**
   - Dirty flag set when data changes
   - No dirty flag when data is same
   - Deep comparison of data

3. **Selection**
   - Toggle selection state
   - Dirty flag behavior
   - Background color application

4. **Directory Width**
   - Width changes trigger dirty flag
   - No change when same width

5. **Rendering**
   - Correct column widths
   - Proper alignment (left/right)
   - Color tags for selected/non-selected
   - Event type coloring
   - Cache behavior (returns same string when not dirty)
   - Truncation (filename tail, directory head)

6. **Edge Cases**
   - Missing/null values in event data
   - Very long filenames/directories
   - Unicode characters in text
   - Zero/negative values
# HO-20250704-001 Display Mode Selector Implementation

## Handoff Information
- **Date**: 2025-07-04
- **From**: User
- **To**: Runner
- **Priority**: High
- **Type**: Feature Implementation

## Objective
Implement all/unique mode selection with SQLite database integration for cctop display.

## Requirements

### Functional Requirements
1. **Key Bindings**
   - `[a]` key: Switch to "all" mode (show all events)
   - `[u]` key: Switch to "unique" mode (show unique files only)
   - Immediate response to key press
   - Visual feedback of current mode

2. **Database Integration**
   - Read events from SQLite database using existing DatabaseAdapter
   - Apply unique filtering at database query level (not in-memory)
   - Optimize queries for performance

3. **UI Updates**
   - Update status display to show current mode
   - Clear visual indicator of active mode
   - Maintain current scroll position when switching modes

### Technical Specifications

#### Database Layer
```javascript
// Modify DatabaseAdapter to support mode-based queries
class DatabaseAdapter {
  async getEvents(limit, offset, mode = 'all') {
    if (mode === 'unique') {
      // Query for unique files only
      // GROUP BY filepath, show latest event per file
    } else {
      // Query for all events (current behavior)
    }
  }
}
```

#### Key Handling
```javascript
// Add to KeyInputManager
case 'a':
  this.switchMode('all');
  break;
case 'u':
  this.switchMode('unique');
  break;
```

#### Status Display
```javascript
// Update status line to show mode
`Mode: ${this.currentMode === 'all' ? 'All Events' : 'Unique Files'} | Events: ${count}`
```

## Implementation Plan

### Phase 1: Database Layer
1. Extend DatabaseAdapter with mode parameter
2. Implement unique query logic
3. Test query performance

### Phase 2: UI Integration
1. Add mode state to main application
2. Implement key bindings
3. Update status display

### Phase 3: Testing
1. Unit tests for database queries
2. Integration tests for mode switching
3. Performance testing with large datasets

## Dependencies
- Existing DatabaseAdapter class
- KeyInputManager for key bindings
- UI rendering system

## Success Criteria
- [ ] [a]/[u] keys switch modes instantly
- [ ] Unique mode shows only latest event per file
- [ ] Status display clearly shows current mode
- [ ] No performance degradation
- [ ] Tests pass with 100% coverage

## Notes
- Consider caching query results for performance
- Maintain backward compatibility with existing features
- Follow TDD approach as per project guidelines
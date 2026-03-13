---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-107-view-configuration-management.md
---

# Specification: View Configuration Management

## 0. Meta

| Source | Runtime |
|--------|---------|
| modules/view/src/config/ViewConfig.ts, modules/view/src/config/ViewConfigManager.ts, modules/view/src/config/config-loader.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | hierarchical-config-management.md, local-setup-initialization.md |
| Test Type | Unit |

## 1. Overview

View process-specific configuration management. Manages settings for screen display, rendering, and interactive operations.

**User value**:
- Display customization
- Color theme settings
- Interactive operation adjustment
- User experience optimization

## 2. Scope

**In scope**:
- View-specific config file loading
- Display parameter management
- Color/theme settings management
- Interactive feature settings
- User preference management

**Out of scope**:
- Daemon monitoring settings (daemon-configuration-management responsibility)
- Common settings management (hierarchical-config-management responsibility)
- Config file initialization (local-setup-initialization responsibility)

## 3. view-config.json Schema

```json
{
  "version": "0.3.0.0",
  "display": {
    "maxEvents": 20,
    "refreshRateMs": 100,
    "dateFormat": "YYYY-MM-DD HH:mm:ss",
    "columns": {
      "timestamp": { "label": "Event Timestamp", "width": 19, "visible": true, "align": "left" },
      "elapsed":   { "label": "Elapsed",          "width": 9,  "visible": true, "align": "right" },
      "fileName":  { "label": "File Name",        "width": 35, "visible": true, "align": "left" },
      "event":     { "label": "Event",            "width": 8,  "visible": true, "align": "left" },
      "lines":     { "label": "Lines",            "width": 6,  "visible": true, "align": "right" },
      "blocks":    { "label": "Blks",             "width": 8,  "visible": true, "align": "right" },
      "size":      { "label": "Size",             "width": 7,  "visible": true, "align": "right" },
      "directory": { "label": "Directory",        "width": "auto", "visible": true, "align": "left" }
    },
    "directoryMutePaths": [],
    "columns-order": ["timestamp", "elapsed", "fileName", "event", "size", "lines", "blocks"]
  },
  "colors": {
    "find":    "cyan",
    "create":  "green",
    "modify":  "yellow",
    "move":    "blue",
    "delete":  "red",
    "restore": "magenta"
  },
  "interactive": {
    "keyRepeatDelay":    500,
    "keyRepeatInterval": 100,
    "selectionHighlight": "inverse"
  },
  "locale": {
    "language": "en",
    "timezone": "system"
  }
}
```

## 4. Config Parameter Descriptions

### 4.1 display

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxEvents` | integer | `20` | Maximum number of displayed events |
| `refreshRateMs` | integer | `100` | Screen refresh interval (ms) |
| `dateFormat` | string | `"YYYY-MM-DD HH:mm:ss"` | Date/time display format |
| `directoryMutePaths` | string[] | `[]` | Base paths to omit in directory display |
| `columns-order` | string[] | see above | Column display order (directory always rightmost) |

### 4.2 display.columns

Each column has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Column header label |
| `width` | integer \| `"auto"` | Column width (characters), or auto for remaining space |
| `visible` | boolean | Column visibility |
| `align` | `"left"` \| `"right"` | Text alignment |

### 4.3 colors

Event type to terminal color name mapping:

| Event | Default color |
|-------|---------------|
| `find` | `cyan` |
| `create` | `green` |
| `modify` | `yellow` |
| `move` | `blue` |
| `delete` | `red` |
| `restore` | `magenta` |

### 4.4 interactive

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `keyRepeatDelay` | integer | `500` | Key repeat start delay (ms) |
| `keyRepeatInterval` | integer | `100` | Key repeat interval (ms) |
| `selectionHighlight` | string | `"inverse"` | Selection highlight method |

### 4.5 locale

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | string | `"en"` | Display language |
| `timezone` | string | `"system"` | Timezone |

## 5. Config File Layout

```
.cctop/config/
├── view-config.json      # View-specific settings (this spec)
├── daemon-config.json    # Daemon-specific settings
└── shared-config.json    # common settings
```

## 6. Config Loading Order on View Startup

1. `shared-config.json` (common settings)
2. `view-config.json` (View-specific settings)
3. `~/.cctoprc` in user home (personal settings)
4. Command-line arguments (override)

## 7. Functional Requirements

### 7.1 User preferences

1. Support for personal settings file (`~/.cctoprc`)
2. Theme preset function
3. Settings export/import

### 7.2 Dynamic settings changes

- Settings changes while running (colors, column widths, etc.)
- Immediate reflection of changes
- Settings persistence option

### 7.3 Config validation

1. Confirm color value validity
2. Range check numeric parameters
3. Confirm total column width

## 8. Test Coverage

Tests are located at:
- `modules/view/tests/functional/config/config-loader.test.ts`
- `modules/view/tests/functional/config/config-loader-core.test.ts`
- `modules/view/tests/functional/config/config-loader-initialization.test.ts`
- `modules/view/tests/integration/func-105-config-loading.test.ts`

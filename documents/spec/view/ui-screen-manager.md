---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-NEW-002
title: UI Screen Manager
version: 2.1
status: draft
source:
  - path: code/view/src/ui/UIScreenManager.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UI Screen Manager

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/UIScreenManager.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
class UIScreenManager {
  /** Create and configure blessed screen instance */
  initializeScreen(): blessed.Widgets.Screen;

  /** Get the current screen instance */
  getScreen(): blessed.Widgets.Screen;

  /** Destroy screen with safe error handling */
  destroy(): void;
}
```

## Logic

### initializeScreen

1. **Suppress stderr warnings**: Intercept `process.stderr.write` to filter out blessed terminal compatibility warnings (xterm errors, Setulc capability issues, stack/out parser messages)
2. **Force TERM type**: Set `process.env.TERM = 'xterm'` to avoid Setulc capability issues
3. **Monkey-patch blessed**: Remove `Setulc`/`setulc` from terminfo after parsing to prevent runtime errors
4. **Create screen**: Initialize `blessed.screen` with:
   - `smartCSR: true`, `fullUnicode: true`
   - `title: 'CCTOP v0.5.0.0'`
   - `terminal: 'xterm'`, `disableUnderline: true`
   - No auto-padding, no dock borders, no warnings

### destroy

- Wraps `screen.destroy()` in try/catch
- Logs errors to stderr without propagating (terminal may already be detached)

## Side Effects

| Effect | Description |
|--------|-------------|
| stderr interception | Replaces `process.stderr.write` with filtered version |
| TERM environment | Mutates `process.env.TERM` |
| blessed monkey-patch | Modifies blessed's `_parseTerminfo` prototype |
| Terminal control | Creates/destroys blessed screen (allocates terminal) |

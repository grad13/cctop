---
updated: 2026-03-17 12:08
checked: -
id: SPEC-D10
title: "Supplement: Daemon Log Management"
version: 2.1
status: draft
source:
  - path: code/app/daemon/src/logging/LogManager.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: background-activity-monitor.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Supplement: Daemon Log Management

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/daemon/src/logging/LogManager.ts` | TypeScript (Node.js ESM) |

**Supplements**: `background-activity-monitor.md` -- covers the logging subsystem referenced in section 4 (Process State Management) and section 9 (Configuration).

## Scope of Supplement

The background activity monitor spec defines log file path (`.cctop/logs/daemon.log`) and `logLevel` configuration. This supplement specifies the logging implementation:
- Log level filtering with priority system
- Dual output (console + file)
- Synchronous file writing
- Debug log with structured data support

## Contract

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class LogManager {
  constructor(logFilePath: string, logLevel?: LogLevel);
  log(level: string, message: string): void;
  debugLog(message: string, data?: any): void;
}
```

### Public API

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `log` | `level: string`, `message: string` | `void` | Log with level filtering |
| `debugLog` | `message: string`, `data?: any` | `void` | Debug-level log with optional structured data |

## State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `logFilePath` | `string` | (constructor param) | Absolute path to log file |
| `logLevel` | `LogLevel` | `'error'` | Minimum level for file output |

## Logic

### Log Level Priority

| Level | Priority | Description |
|-------|----------|-------------|
| `debug` | 0 | Detailed diagnostic information |
| `info` | 1 | General operational information |
| `warn` | 2 | Warning conditions |
| `error` | 3 | Error conditions |

### Output Decision Table

| Action | Condition | Always? |
|--------|-----------|---------|
| Console output (`console.log`) | Any `log()` or `debugLog()` call | Yes |
| File output | `level priority >= configured logLevel priority` | Conditional |

Default `logLevel` is `'error'`, meaning only error-level messages are written to file by default.

### Log Entry Format

```
{ISO-8601 timestamp} [{LEVEL}] {message}
```

For `debugLog` with data:
```
{ISO-8601 timestamp} [DEBUG] {message} {JSON.stringify(data, null, 2)}
```

### File Writing

- Synchronous write via `fs.appendFileSync`
- Auto-creates log directory if missing (`fs.mkdirSync recursive`)
- On write failure: falls back to `console.error` (no throw)

## Side Effects

- Console output on every log call
- File system writes (synchronous) when level meets threshold
- Directory creation if log directory does not exist

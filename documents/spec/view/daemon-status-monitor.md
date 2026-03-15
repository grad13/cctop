---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-NEW-005
title: Daemon Status Monitor
version: 2.1
status: draft
source:
  - path: code/view/src/utils/daemon-status-monitor.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Daemon Status Monitor

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/utils/daemon-status-monitor.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
interface DaemonStatus {
  isRunning: boolean;
  pid?: number;
  status: 'running' | 'stopped' | 'unknown';
}

class DaemonStatusMonitor {
  constructor(cctopDir?: string);  // default: process.cwd() + '/.cctop'
  async checkStatus(): Promise<DaemonStatus>;
  async getStatusString(): Promise<string>;
}
```

## Logic

### checkStatus Decision Table

| PID file exists | PID parseable | Process alive | Result |
|----------------|--------------|---------------|--------|
| No | - | - | { isRunning: false, status: 'stopped' } |
| Yes | No (plain text) | - | Try JSON parse |
| Yes | No (JSON too) | - | { isRunning: false, status: 'unknown' } |
| Yes | Yes | No | { isRunning: false, status: 'stopped' } |
| Yes | Yes | Yes | { isRunning: true, pid, status: 'running' } |
| Error | - | - | { isRunning: false, status: 'unknown' } |

### PID File Location

`{cctopDir}/runtime/daemon.pid`

### PID File Format

Supports two formats:
1. Plain text: just the PID number
2. JSON: `{ "pid": <number> }`

### Process Alive Check

Uses `process.kill(pid, 0)` (Unix signal 0) to check process existence without sending a signal. Throws `ESRCH` if process does not exist.

### getStatusString Output

| Status | Output |
|--------|--------|
| running | `running (PID: {pid})` |
| stopped | `stopped` |
| unknown | `unknown` |

## Side Effects

| Effect | Description |
|--------|-------------|
| File read | Reads PID file from filesystem (synchronous) |
| Process signal | Sends signal 0 to check process existence |

---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-007
title: CLI Argument Parser (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/cli/argument-parser.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-interface-specification.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# CLI Argument Parser (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/cli/argument-parser.ts` | TypeScript (Node.js ESM) |

Supplements: view-interface-specification.md (Section 5: Options Reference)

## Contract

```typescript
interface CLIArguments {
  view?: boolean;
  help?: boolean;
  verbose?: boolean;
  directory?: string;
  timeout?: number;
}

function parseArguments(args: string[]): CLIArguments;
function showHelp(): void;
```

## Logic

### parseArguments - not covered by existing spec

The existing spec defines options at specification level. This supplement documents the parsing implementation:

| Argument | Parsing Rule |
|----------|-------------|
| `--view` | Sets `view: true` |
| `-h`, `--help` | Sets `help: true` |
| `--verbose` | Sets `verbose: true` |
| `--timeout` | Consumes next arg as integer (`parseInt(args[++i], 10)`) |
| Non-flag without `-` prefix | First positional arg becomes `directory` |

Note: Current implementation uses `--view` flag style. The existing spec documents subcommand style (`view`, `daemon start`). This is an implementation deviation.

### showHelp

Outputs formatted help text to stdout via `console.log`. Includes sections: Usage, Options (Watching/Display/Output/System/Help), Interactive Controls, Examples.

## Side Effects

| Effect | Description |
|--------|-------------|
| stdout | `showHelp()` writes to stdout |

---
updated: 2026-03-14 15:42
checked: -
Deprecated: -
Format: spec-v2.1
Source: N/A (architecture)
---

# Specification: Module Dependency Diagram

## 0. Meta

| Source | Runtime |
|--------|---------|
| N/A (architecture) | Node.js |

| Field | Value |
|-------|-------|
| Related | architecture/component-architecture-overview.md, architecture/stream-mode-architecture.md |
| Test Type | N/A |

## Dependency Types

| Type | Definition |
|------|------------|
| Must-have | Function A cannot operate without Function B |
| Reference | Function A references specs or data from Function B |
| Collaboration | Function A and B cooperate to operate |
| Configuration | Function A depends on configuration from Function B |

## Dependency Layers

### Layer 0: Foundation (000-series)

```
FUNC-000 (SQLite Database Foundation)
    ^ must-have dependency from:
    +-- FUNC-001 (File Lifecycle Tracking)
    +-- FUNC-002 (Chokidar Database Integration)
    +-- FUNC-003 (Background Activity Monitor)
    +-- FUNC-202 (CLI Display Integration)
```

### Layer 1: Configuration Management (100-series)

```
FUNC-101 (Hierarchical Config Management)
    ^ configuration dependency from:
    +-- FUNC-106 (Daemon Configuration)
    +-- FUNC-107 (CLI Configuration)
    +-- FUNC-108 (Color Theme Configuration)
    +-- FUNC-105 (Local Setup Initialization)

FUNC-104 (CLI Interface Specification)
    ^ reference dependency from:
    +-- FUNC-003 (Background Activity Monitor)
    +-- FUNC-202 (CLI Display Integration)

FUNC-102 (File Watch Limit Management)
    ^ configuration dependency from:
    +-- FUNC-002 (Chokidar Database Integration)
```

### Layer 2: Display (200-series)

```
FUNC-200 (East Asian Width Display)
    ^ must-have dependency from:
    +-- FUNC-202 (CLI Display Integration)

FUNC-201 (Double Buffer Rendering)
    ^ must-have dependency from:
    +-- FUNC-202 (CLI Display Integration)

FUNC-202 (CLI Display Integration)  [central hub]
    ^ depends on:
    +-- FUNC-000 (Database Foundation)
    +-- FUNC-301 (Filter State Management)
    +-- FUNC-107 (CLI Configuration)
    +-- FUNC-206 (Progressive Loading)

FUNC-203 (Event Type Filtering)
    ^ collaboration dependency with:
    +-- FUNC-300 (Key Input Manager)
    +-- FUNC-301 (Filter State Management)

FUNC-204 (Responsive Directory Display)
    ^ reference dependency from:
    +-- FUNC-202 (CLI Display Integration)

FUNC-206 (Progressive Loading)
    ^ collaboration dependency with:
    +-- FUNC-003 (Background Activity Monitor)
    +-- FUNC-202 (CLI Display Integration)
    +-- FUNC-301 (Filter State Management)

FUNC-208 (UI Filter Integration)
    ^ collaboration dependency with:
    +-- FUNC-202 (CLI Display Integration)
    +-- FUNC-203 (Event Type Filtering)
    +-- FUNC-300 (Key Input Manager)
    +-- FUNC-301 (Filter State Management)
```

### Layer 3: Input Management (300-series)

```
FUNC-300 (Key Input Manager)  [input hub]
    ^ collaboration dependency with:
    +-- FUNC-203 (Event Type Filtering)
    +-- FUNC-208 (UI Filter Integration)
    +-- FUNC-400 (Interactive Selection)
    +-- FUNC-401-404 (Detail Modes)

FUNC-301 (Filter State Management)  [state hub]
    ^ must-have dependency from:
    +-- FUNC-202 (CLI Display Integration)
    +-- FUNC-203 (Event Type Filtering)
    +-- FUNC-206 (Progressive Loading)
    +-- FUNC-208 (UI Filter Integration)
```

### Layer 4: Interaction (400-series)

```
FUNC-400 (Interactive Selection Mode)
    ^ collaboration dependency with:
    +-- FUNC-300 (Key Input Manager)
    +-- FUNC-202 (CLI Display Integration)
    +-- FUNC-401-404 (Detail Modes)

FUNC-401 (Detailed Inspection Mode)
    ^ reference dependency from:
    +-- FUNC-400 (Interactive Selection)
    +-- FUNC-202 (CLI Display Integration)

FUNC-402 (Aggregate Display Module)
    ^ reference dependency from:
    +-- FUNC-000 (Database Foundation)
    +-- FUNC-202 (CLI Display Integration)

FUNC-403 (History Display Module)
    ^ reference dependency from:
    +-- FUNC-000 (Database Foundation)
    +-- FUNC-202 (CLI Display Integration)

FUNC-404 (Dual Pane Detail View)
    ^ reference dependency from:
    +-- FUNC-400 (Interactive Selection)
    +-- FUNC-402 (Aggregate Display)
    +-- FUNC-403 (History Display)
```

## Key Dependency Patterns

### Central Hub Functions

| Function | Role | Implementation Priority |
|----------|------|------------------------|
| FUNC-202 (CLI Display Integration) | Central display hub; many functions depend on it | Highest |
| FUNC-301 (Filter State Management) | Central state hub for all filter-related functions | High |
| FUNC-300 (Key Input Manager) | Central input hub for all interaction functions | High |

### Foundation Implementation Chain

```
FUNC-000 -> FUNC-001/002/003 -> FUNC-202 -> FUNC-20X/30X/40X
```

This ordering is mandatory.

### Configuration Chain

```
FUNC-101 -> FUNC-105/106/107/108 -> individual functions
```

Establish the config foundation before implementing individual configs.

### Filter Function Cluster

```
FUNC-301 <-> FUNC-203 <-> FUNC-208
     ^             ^             ^
FUNC-300 <- FUNC-202 <- FUNC-206
```

High mutual dependency; implementing as a group is efficient.

## Recommended Implementation Order

### Phase 1: Foundation

```
1. FUNC-000 (Database Foundation)
2. FUNC-101 (Config Management)
3. FUNC-105 (Local Setup)
4. FUNC-001 (File Lifecycle)
5. FUNC-002 (Chokidar Integration)
```

### Phase 2: Display Foundation

```
6.  FUNC-200 (East Asian Width)
7.  FUNC-201 (Double Buffer)
8.  FUNC-202 (CLI Display)       [critical]
9.  FUNC-107 (CLI Configuration)
10. FUNC-300 (Key Input Manager) [critical]
```

### Phase 3: Filter System

```
11. FUNC-301 (Filter State)      [critical]
12. FUNC-203 (Event Type Filter)
13. FUNC-206 (Progressive Loading)
14. FUNC-208 (UI Filter Integration)
```

### Phase 4: Advanced Features

```
15. FUNC-003 (Background Monitor)
16. FUNC-106 (Daemon Configuration)
17. FUNC-204 (Responsive Directory)
18. FUNC-400 (Interactive Selection)
19. FUNC-401-404 (Detail Modes)
20. FUNC-102/108 (Advanced Configuration)
```

## Circular Dependency Prevention

### Combinations Requiring Attention

| Pair | Resolution |
|------|-----------|
| FUNC-202 <-> FUNC-301 | Implement FUNC-301 first; FUNC-202 reads FUNC-301 state (one-directional) |
| FUNC-300 <-> FUNC-203/208 | Implement FUNC-300 with a callback mechanism; individual filter functions register with FUNC-300 |
| FUNC-20X <-> FUNC-30X | Implement display functions first; input functions reference display state |

## Change Impact Analysis

### High to Low Impact Order

| Rank | Function | Impact Scope |
|------|----------|-------------|
| 1 | FUNC-000 | Entire system (database schema change) |
| 2 | FUNC-202 | All display functions (rendering engine change) |
| 3 | FUNC-301 | All filter functions (state management change) |
| 4 | FUNC-300 | All input functions (key processing change) |
| 5 | FUNC-101 | All configuration functions (config format change) |

### High-Independence Functions

- **FUNC-204**: Directory display (independently implementable)
- **FUNC-401-404**: Detail display group (high independence)
- **FUNC-102/108**: Advanced configuration (minimal impact on others)

# Handoffs System - Autonomous Agent Orchestration

## Overview

The handoffs system enables autonomous agent collaboration through asynchronous file-based communication. It provides a structured way for agents to exchange work items, questions, and decisions while maintaining clear boundaries and user oversight.

## Core Principles

1. **Autonomous Operation**: Agents operate independently within their permissions
2. **User Decision Points**: Critical decisions are escalated to user
3. **Asynchronous Communication**: No direct agent-to-agent communication
4. **File-Based Exchange**: All handoffs are tracked through files
5. **Clear Ownership**: Each file has a clear owner and recipient

## Directory Structure

```
handoffs/
├── pending/        # Tasks awaiting processing
│   ├── builder/
│   ├── validator/
│   ├── clerk/
│   ├── architect/
│   └── inspector/
├── in-progress/    # Tasks being worked on
│   ├── builder/
│   ├── validator/
│   ├── architect/
│   ├── clerk/
│   └── inspector/
├── completed/      # Finished tasks
│   └── YYYY-MM-DD/
│       ├── builder/
│       ├── validator/
│       ├── clerk/
│       ├── architect/
│       ├── inspector/
│       └── user/
└── shared/         # Shared resources
    └── templates/
```

## Workflow States

Tasks move through three clear states:

1. **Pending** → Tasks waiting in `pending/{agent}/`
2. **In Progress** → Active tasks in `in-progress/{agent}/`
3. **Completed** → Finished tasks in `completed/YYYY-MM-DD/{agent}/`

## Workflow Patterns

### 1. User-Initiated Task
```
User creates → pending/builder/task-001.md
Builder picks up → in-progress/builder/task-001.md
Builder completes → completed/2025-06-24/builder/task-001.md
```

### 2. Agent Escalation
```
Builder needs decision → pending/user/question-001.md
User picks up → in-progress/user/question-001.md
User responds → pending/builder/decision-001.md
Builder continues → in-progress/builder/decision-001.md
```

### 3. Multi-Agent Workflow
```
User initiates → pending/builder/project-001.md
              → pending/validator/project-001.md
              → pending/clerk/project-001.md
Each agent processes through their own workflow
```

## File Naming Conventions

### Format: `{type}-{id}-{description}.md`

**Types**:
- `task` - New work to be done
- `complete` - Completed work report
- `question` - Decision needed
- `decision` - Decision made
- `report` - Status or analysis
- `request` - Resource or permission request

**Examples**:
- `task-001-implement-login.md`
- `question-002-api-design-choice.md`
- `decision-003-use-rest-api.md`
- `complete-004-login-implemented.md`

## Agent Workflow

### Session Start
1. Check `pending/{agent}/` for new tasks
2. Review `in-progress/{agent}/` for ongoing work
3. Move selected pending tasks to in-progress

### During Work
1. Update task files with progress
2. Create new handoffs as needed
3. Ask questions via pending/user/

### Task Completion
1. Update file with final results
2. Move to `completed/YYYY-MM-DD/{agent}/`
3. Create any follow-up tasks

## Best Practices

1. **Single Purpose**: One topic per file
2. **Self-Contained**: Include all context needed
3. **Clear Actions**: Specify what needs to be done
4. **Outcome Focused**: Define success criteria
5. **Timely Processing**: Check pending at session start

## Archive Policy

- **7 days**: Tasks remain in completed/
- **30 days**: Move to archive/monthly/
- **90 days**: Compress and long-term storage

## Security Considerations

1. **Agent Permissions**: Agents access only their designated directories
2. **User Authority**: Only user can access all directories
3. **Audit Trail**: All file movements are tracked
4. **No Direct Execution**: Handoffs cannot contain executable code

## Template Resources

See `shared/templates/` for:
- `builder-to-validator-template.md`
- `validator-to-builder-template.md`
- Task and question templates

## Quick Start

New to handoffs? See [Quick Start Guide](shared/quick-start-guide.md)

## Future Enhancements

1. **Priority Levels**: High/Medium/Low in file names
2. **Dependency Tracking**: Link related handoffs
3. **Automation**: Scripts for common operations
4. **Metrics**: Task completion statistics
5. **Notifications**: Alert on new pending tasks
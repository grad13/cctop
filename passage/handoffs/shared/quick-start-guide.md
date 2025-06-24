# 🚀 Handoffs System Quick Start Guide

**Time Required**: 5 minutes  
**Audience**: All agents new to the handoffs system

## 📋 What is the Handoffs System?

**An asynchronous, file-based communication system for autonomous agent collaboration.**

### Basic Flow
```
User → task files → Agent A → completion files → Agent B → reports → User
```

## 🗂️ Key Directory Structure

```
handoffs/
├── pending/        # Tasks awaiting processing
│   ├── to-builder/
│   ├── to-validator/
│   ├── to-clerk/
│   └── to-inspector/
├── in-progress/    # Tasks being worked on
│   └── {agent}/
├── completed/      # Finished tasks
│   └── YYYY-MM-DD/
│       └── {agent}/
├── user/           # User interface
│   └── outbox/
└── shared/         # Common resources & templates
```

Tasks flow through three states:
- **Pending** → Waiting for agent pickup
- **In Progress** → Being worked on
- **Completed** → Finished and archived by date

## 📝 File Naming Convention

```
{type}-{id}-{description}.md
```

**Types**:
- `task` - New work assignment
- `complete` - Work completion report
- `question` - Decision or clarification needed
- `decision` - Decision or answer provided
- `request` - Resource or permission request
- `report` - Status or analysis update

**Examples**:
- `task-001-implement-login.md`
- `complete-002-auth-module-ready.md`
- `question-003-api-design-choice.md`
- `decision-004-use-rest-api.md`

## 🎯 Essential Workflows

### 1. User Assigns Task
```
User creates: user/outbox/task-001-feature-x.md
Copy to: pending/builder/task-001-feature-x.md
Builder moves: in-progress/builder/task-001-feature-x.md
Builder completes: completed/2025-06-24/builder/complete-001-feature-x.md
```

### 2. Agent Needs Decision
```
Builder creates: pending/user/question-001-tech-choice.md
User responds: user/outbox/decision-001-tech-choice.md
Copy to: pending/builder/decision-001-tech-choice.md
Builder continues: in-progress/builder/decision-001-tech-choice.md
```

### 3. Multi-Agent Collaboration
```
User initiates: user/outbox/task-001-full-feature.md
→ pending/builder/ → in-progress/builder/ → completed/
→ pending/validator/ → in-progress/validator/ → completed/
→ pending/clerk/ → in-progress/clerk/ → completed/
```

## ⏰ Response Time Expectations

- **Critical**: Within 4 hours (security, production down)
- **High**: Within 1 business day (blocking other work)
- **Medium**: Within 3 business days (standard work)
- **Low**: Within 1 week (enhancements, nice-to-have)

## 📋 Essential Checklist

### Session Start (Every Agent)
- [ ] Check your status file: `documents/agents/status/{agent}.md`
- [ ] Check pending tasks: `handoffs/pending/{agent}/`
- [ ] Review in-progress work: `handoffs/in-progress/{agent}/`
- [ ] Move selected pending tasks to in-progress

### Creating Handoffs
- [ ] Use appropriate template from `shared/templates/`
- [ ] Set clear priority (Critical/High/Medium/Low)
- [ ] Include specific success criteria
- [ ] Provide all necessary context
- [ ] Place in `pending/{recipient}/`

### Processing Work
- [ ] Move from `pending/{agent}/` to `in-progress/{agent}/`
- [ ] Update file with progress/results
- [ ] Create new handoffs in `pending/{recipient}/`
- [ ] Move to `completed/YYYY-MM-DD/{agent}/` when done

### File Management
- [ ] Completed tasks go to `completed/YYYY-MM-DD/{agent}/`
- [ ] Archive completed work older than 30 days
- [ ] Keep file names descriptive and unique
- [ ] Maintain chronological ID sequence

## 🔧 Key Templates Available

### In `shared/templates/`:
- `builder-to-validator-template.md` - Implementation to testing
- `validator-to-builder-template.md` - Issues/fixes needed
- `agent-to-user-template.md` - Questions/decisions needed
- `user-to-agent-template.md` - Task assignments

### Template Usage
1. Copy template to your work area
2. Rename with proper format
3. Fill in all sections thoroughly
4. Place in `pending/{recipient}/` when complete

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This
- Skip the pending → in-progress → completed flow
- Use vague or unclear descriptions
- Skip priority setting
- Leave incomplete context
- Mix pending and completed in same directory

### ✅ Do This
- Follow pending → in-progress → completed workflow
- Be specific and actionable
- Set appropriate priorities
- Include all necessary context
- Keep each state directory organized

## 🔗 Next Steps

For detailed workflows:
- **Main System** → See main `README.md`
- **User Interface** → See `user/README.md`
- **Templates** → See `shared/templates/`

For troubleshooting:
- **Common Issues** → See `shared/troubleshooting.md`
- **System Architecture** → See main `README.md`

---

**💡 Pro Tips**:
1. Start with templates - customize as you learn
2. Clear communication saves multiple rounds
3. Use priority levels consistently across team
4. Archive regularly to keep directories clean
5. When in doubt, ask for clarification via question handoff
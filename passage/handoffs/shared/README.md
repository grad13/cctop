# Shared Resources

## Purpose

The shared directory contains resources, templates, and references accessible by all agents. This promotes consistency, efficiency, and knowledge sharing across the autonomous agent system.

## Directory Structure

```
shared/
├── templates/      # Reusable document templates (P045対応済み)
├── standards/      # Coding and documentation standards
├── references/     # Quick reference guides
├── tools/          # Shared scripts and utilities
└── README.md       # This file
```

## Content Categories

### 1. Templates

Standardized templates for common handoff types (P045 Git管理分離対応済み):

#### Available Templates
- **builder-to-validator-template.md** - Builder→Validator実装完了報告
- **validator-to-builder-template.md** - Validator→Builder修正依頼  
- **general-handoff-template.md** - 全Agent間汎用テンプレート

**P045対応**: 全テンプレートにGit Repository指定・CHK006確認が組み込み済み

#### Task Template
```markdown
# {type}-{id}-{description}

**From**: {Agent}
**To**: {Agent}
**Date**: {YYYY-MM-DD}
**Priority**: {High|Medium|Low}

## Objective
{Clear description of what needs to be done}

## Context
{Background information and why this is needed}

## Requirements
1. {Specific requirement}
2. {Specific requirement}
3. {Specific requirement}

## Success Criteria
- [ ] {Measurable outcome}
- [ ] {Measurable outcome}
- [ ] {Measurable outcome}

## Resources
- {Link to relevant documentation}
- {Link to related code/files}

## Timeline
{Expected completion date or urgency}

## Notes
{Any additional information}
```

#### Report Template
```markdown
# report-{id}-{topic}

**From**: {Agent}
**To**: {Agent(s)}
**Date**: {YYYY-MM-DD}
**Type**: {Completion|Analysis|Status}

## Summary
{Brief overview of findings/results}

## Details

### Section 1
{Detailed information}

### Section 2
{Detailed information}

## Recommendations
1. {Actionable recommendation}
2. {Actionable recommendation}

## Next Steps
- {Concrete next action}
- {Concrete next action}

## Attachments
- {Links to supporting materials}
```

### 2. Standards

#### Code Standards
- **Naming Conventions**: Consistent across all agents
- **Documentation Requirements**: JSDoc, inline comments
- **Testing Standards**: Coverage requirements, test patterns
- **Performance Budgets**: Load times, memory usage

#### Document Standards
- **Markdown Formatting**: Heading hierarchy, link formats
- **Metadata Requirements**: Date, author, version
- **File Naming**: Consistent patterns across handoffs
- **Archive Policies**: Retention periods by type

### 3. References

#### Quick Command Reference
```bash
# Git commands for Inspector
git log --since="1 week ago" --author="Builder"
git diff HEAD~5..HEAD --stat
git show --name-status {commit}

# Performance commands for Validator
npm run test:coverage
npm run test:performance
lighthouse https://localhost:5173 --budget-path=./budgets.json

# Build commands for Builder
npm run dev
npm run build
npm run preview
```

#### API Endpoints Reference
```javascript
// Authentication
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/status

// Tasks
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}

// Settings
GET    /api/settings
PUT    /api/settings
```

### 4. Tools

#### Handoff Automation Script
```javascript
// create-handoff.js
// Usage: node create-handoff.js task "Implement feature" Builder High

const type = process.argv[2];
const description = process.argv[3];
const recipient = process.argv[4];
const priority = process.argv[5];

// ... implementation
```

#### Status Check Script
```bash
#!/bin/bash
# check-handoffs.sh
# Shows pending handoffs for all agents

echo "=== Handoff Status ==="
for agent in user builder validator clerk inspector; do
  count=$(ls -1 handoffs/$agent/inbox/*.md 2>/dev/null | wc -l)
  echo "$agent: $count pending"
done
```

## Usage Guidelines

### 1. Template Usage
- Start with appropriate template
- Customize for specific needs
- Maintain consistent structure
- Don't remove required fields

### 2. Standards Compliance
- Review relevant standards before work
- Update standards through proposals
- Ensure backward compatibility
- Document deviations with rationale

### 3. Reference Materials
- Keep references up-to-date
- Add new patterns as discovered
- Remove obsolete information
- Version significant changes

### 4. Tool Sharing
- Document tool usage clearly
- Include error handling
- Make tools agent-agnostic
- Test across environments

## Maintenance

### Weekly Tasks
- Review and update templates
- Verify reference accuracy
- Test shared tools
- Archive old materials

### Monthly Tasks
- Standards revision review
- Tool effectiveness audit
- Usage pattern analysis
- Optimization opportunities

### Quarterly Tasks
- Major template updates
- Standards overhaul
- Tool deprecation review
- Knowledge base expansion

## Contributing

### Adding New Resources
1. Determine appropriate category
2. Follow existing patterns
3. Document thoroughly
4. Test/verify accuracy
5. Update this README

### Updating Existing Resources
1. Create proposal in user/outbox
2. Include rationale for changes
3. Consider backward compatibility
4. Get consensus if major change
5. Update with version notes

## Best Practices

### 1. Keep It Simple
- Clear over clever
- Explicit over implicit
- Consistent patterns
- Minimal dependencies

### 2. Document Everything
- Purpose and usage
- Examples
- Common pitfalls
- Update history

### 3. Think System-Wide
- Consider all agents
- Maintain flexibility
- Enable automation
- Support scaling

## Access Control

- **Read**: All agents
- **Write**: Through proposals only
- **Execute**: Tools accessible to all
- **Archive**: Clerk manages

## Version History

### 2025-06-18 v1.0
- Initial shared resources setup
- Basic templates created
- Core standards defined
- Essential tools added

## Future Enhancements

1. **Template Generator**: Interactive template creation
2. **Standards Linter**: Automated compliance checking
3. **Reference API**: Searchable reference system
4. **Tool Library**: Expanded automation tools
5. **Knowledge Graph**: Connected resource network
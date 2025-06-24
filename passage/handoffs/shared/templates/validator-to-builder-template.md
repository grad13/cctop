# Template: Validator to Builder Handoff

**File Name**: `request-{id}-{issue-type}.md`  
**From**: Validator Agent  
**To**: Builder Agent  
**Usage**: Copy this template when requesting fixes, improvements, or clarifications

---

# Request: {Issue Type} - {Brief Description}

**ID**: request-{id}-{issue-type}  
**From**: Validator Agent  
**To**: Builder Agent  
**Priority**: [Critical/High/Medium/Low]  
**Type**: [Bugfix/Improvement/Clarification/Refactor]  
**Created**: YYYY-MM-DD HH:MM  
**Related Handoff**: [Original implementation handoff ID]  
**Git Repository**: [子git/親git] - P045準拠で修正対象gitを明示

## 🐛 Issue Summary

[Clear description of the problem or improvement needed]

## 🔍 Validation Results

### Original Testing
- **Test Environment**: [Staging/Local/Production]
- **Test Date**: YYYY-MM-DD HH:MM
- **Tested Features**: [List of features tested]

### Issues Discovered

#### Issue 1: [Issue Name]
- **Severity**: [Critical/High/Medium/Low]
- **Type**: [Bug/Performance/Security/UX/Code Quality]
- **Description**: [Detailed description]
- **Steps to Reproduce**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Expected Behavior**: [What should happen]
- **Actual Behavior**: [What actually happens]
- **Screenshots/Logs**: [If applicable]

#### Issue 2: [Issue Name]
[Repeat format for additional issues]

## 📋 Requirements for Fix

### Must Fix (Blocking)
- [ ] [Critical issue 1]
- [ ] [Critical issue 2]

### Should Fix (Important)
- [ ] [Important issue 1]
- [ ] [Important issue 2]

### Could Fix (Nice to have)
- [ ] [Minor improvement 1]
- [ ] [Minor improvement 2]

## 🧪 Testing Requirements

### Regression Testing
- [ ] [Ensure existing functionality still works]
- [ ] [Specific regression test cases]

### New Testing
- [ ] [Test the fix for reported issues]
- [ ] [Additional test scenarios]

### Performance Testing
- [ ] [If performance-related issues were found]

## 📁 Affected Files/Components

- `path/to/file1.js` - [Issue description] *(子git)*
- `path/to/file2.php` - [Issue description] *(子git)*
- [Database/Configuration changes needed]

**Git Operations**: 修正作業は[子git/親git]で実行。CHK006確認後にコミットすること。

## 💡 Suggested Solutions

### For Issue 1
[Validator's recommendation for fixing the issue]

### For Issue 2
[Additional recommendations]

## ⚠️ Constraints & Considerations

- [Any constraints Builder should be aware of]
- [Deployment considerations]
- [Timeline constraints]

## 📚 Reference Materials

- [Links to relevant documentation]
- [Stack traces or error logs]
- [Related bug reports or tickets]

---

## 🔧 Builder Response Section (To be completed by Builder Agent)

### Work Started
**Date/Time**: YYYY-MM-DD HH:MM

### Investigation Results
[Builder's analysis of the issues]

### Proposed Solution
[Technical approach to fixing the issues]

### Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Risk Assessment
- [Any risks associated with the fixes]
- [Impact on other features]

### Work Completed
**Date/Time**: YYYY-MM-DD HH:MM

### Changes Made
- `path/to/file1.js` - [Description of changes]
- `path/to/file2.php` - [Description of changes]

### Resolution Summary
- **Issue 1**: [How it was fixed]
- **Issue 2**: [How it was fixed]

### Testing Performed
- [ ] [Self-testing performed by Builder]
- [ ] [Unit tests updated/added]

### Ready for Re-validation
**New Handoff Created**: [Link to new complete-XXX handoff for re-testing]

---

## 📊 Metrics & Tracking

- **Issues Reported**: [Count by severity]
- **Resolution Time**: [Time taken to fix]
- **Re-validation Required**: [Yes/No]
- **Customer Impact**: [If applicable]
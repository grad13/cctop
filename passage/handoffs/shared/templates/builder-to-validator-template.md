# Template: Builder to Validator Handoff

**File Name**: `complete-{id}-{feature-name}.md`  
**From**: Builder Agent  
**To**: Validator Agent  
**Usage**: Copy this template when requesting validation/testing/deployment

---

# Complete: {Feature Name} Implementation

**ID**: complete-{id}-{feature-name}  
**From**: Builder Agent  
**To**: Validator Agent  
**Priority**: [High/Medium/Low]  
**Type**: [Feature/Bugfix/Enhancement/Hotfix]  
**Created**: YYYY-MM-DD HH:MM  
**Deadline**: [If applicable]

## 📋 Implementation Summary

[Brief description of what was implemented]

## 🔧 Technical Changes

### Modified Files
- `path/to/file1.js` - [Description of changes]
- `path/to/file2.php` - [Description of changes]

### Added Files
- `path/to/newfile.js` - [Purpose and functionality]

### Deleted Files
- `path/to/oldfile.js` - [Reason for deletion]

### Database Changes
- [Any schema changes, migrations, or data updates]

## 🧪 Testing Instructions

### Basic Functionality Tests
- [ ] [Test step 1]
- [ ] [Test step 2]
- [ ] [Test step 3]

### Edge Cases & Error Handling
- [ ] [Edge case 1]
- [ ] [Edge case 2]
- [ ] [Error scenario testing]

### Performance Testing
- [ ] [Performance benchmark or criteria]

### Security Testing
- [ ] [Security-specific tests if applicable]

## 🚀 Deployment Instructions

### Prerequisites
- [Any required setup or conditions before deployment]

### Deployment Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Post-Deployment Verification
- [ ] [Verification item 1]
- [ ] [Verification item 2]

## ✅ Expected Outcomes

[Description of expected behavior and results]

## ⚠️ Known Issues & Limitations

[Any known limitations, technical debt, or future improvements needed]

## 📚 Documentation Updates

- [ ] Code comments updated
- [ ] API documentation updated
- [ ] User documentation updated
- [ ] README changes needed

---

## 🔍 Validator Section (To be completed by Validator Agent)

### Work Started
**Date/Time**: YYYY-MM-DD HH:MM

### Code Quality Review
- [ ] Code standards compliance
- [ ] Security review passed
- [ ] Performance review passed
- [ ] Documentation adequate

### Test Results
- [ ] Unit tests: PASS/FAIL - [Details]
- [ ] Integration tests: PASS/FAIL - [Details]
- [ ] E2E tests: PASS/FAIL - [Details]
- [ ] Manual testing: PASS/FAIL - [Details]

### Deployment Results
- [ ] Staging deployment: Success/Failed - [Details]
- [ ] Production deployment: Success/Failed - [Details]
- [ ] Post-deployment verification: PASS/FAIL - [Details]

### Issues Found
[List any issues discovered during validation, with severity and recommendations]

### Work Completed
**Date/Time**: YYYY-MM-DD HH:MM

### Final Decision
- [ ] ✅ **APPROVED** - Ready for production release
- [ ] ❌ **REJECTED** - Requires fixes (return to Builder)
- [ ] ⚠️ **CONDITIONAL** - Minor issues, can proceed with monitoring

### Return Handoff
[If rejected, create new handoff file for Builder with specific issues to address]

---

## 📊 Metrics & Tracking

- **Implementation Time**: [Hours spent by Builder]
- **Validation Time**: [Hours spent by Validator]
- **Issues Found**: [Count and severity]
- **Deployment Success**: [Success/Failure rate]
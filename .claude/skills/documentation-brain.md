---
name: Documentation Brain
description: Central knowledge base - auto-reviews, documents changes, maintains context across sessions
category: meta
triggers:
  - documentation review
  - update docs
  - what changed
  - document this
  - knowledge base
  - context refresh
  - after implementation
dependencies:
  - docs/
  - .claude/skills/
  - CLAUDE.md
version: "1.1"
auto_trigger: after_significant_changes
---

# Skill: Documentation Brain

The central nervous system for project documentation. Maintains context, reviews changes, and keeps documentation synchronized with code.

## Purpose

This skill acts as the "brain" of the project documentation:
1. **Knows where everything is** - Complete file/skill reference
2. **Auto-updates** - Triggers documentation updates after changes
3. **Cross-references** - Links related documents and skills
4. **Context preservation** - Helps recover context between sessions

## Knowledge Map

### Documents by Purpose

| Need | Document | Skills |
|------|----------|--------|
| Start a session | `docs/SESSION_WORKFLOW.md` | - |
| Understand architecture | `docs/MASTER_ROADMAP.md` | `chirp-architecture.md`, `chirp-system-design.md` |
| Implement a feature | `docs/SPRINT_TICKETS.md` | Feature-specific skill |
| Understand requirements | `docs/USER_STORIES.md` | - |
| API integration | `docs/API.md` | `chirp-api-contracts.md` |
| Database changes | - | `chirp-database.md` |
| Testing | - | `chirp-testing.md` |
| UI components | - | `chirp-design-system.md` |
| Multi-platform | `docs/PROTOCOL_ROADMAP.md` | `chirp-connector-framework.md` |
| Future vision | - | `chirp-open-social-hub.md` |
| Create/update skills | - | `skill-management.md` |

### MVP Milestones Quick Reference

| MVP | Sprint | Deliverable | User Value |
|-----|--------|-------------|------------|
| **MVP1** | 9 | Working cleanup + search | "I can delete old tweets" |
| **MVP2** | 13 | Full Next.js dashboard | "Modern, fast UI" |
| **MVP3** | 18 | Multi-platform support | "All my social in one place" |
| **MVP4** | 21 | Team collaboration | "My team can use this" |
| **MVP5** | 26 | Protocol federation | "True data ownership" |

**Critical Path**: Sprint 8 (P0) → Sprint 10 → Sprint 12 → Sprint 16 → MVP3

### Skills Reference

```
.claude/skills/
├── chirp-architecture.md       # System layers, design principles
├── chirp-api-contracts.md      # API endpoints, schemas
├── chirp-api-design.md         # API design patterns
├── chirp-connector-framework.md # Platform connectors
├── chirp-database.md           # Schema, migrations, queries
├── chirp-design-system.md      # UI tokens, components
├── chirp-multi-platform.md     # Multi-platform concepts
├── chirp-nextjs-migration.md   # Frontend migration guide
├── chirp-open-social-hub.md    # Vision, Feed Lab, future
├── chirp-system-design.md      # Component mapping, config
├── chirp-testing.md            # Test patterns, coverage
├── documentation-brain.md      # THIS FILE - meta documentation
└── skill-management.md         # How to create/update skills
```

## Auto-Documentation Protocol

### After Code Changes

When significant code changes are made, this protocol triggers:

```markdown
## Documentation Check

### Files Modified
- [ ] List changed files

### Documentation Updates Needed
- [ ] SPRINT_TICKETS.md - Mark task complete
- [ ] USER_STORIES.md - Update acceptance criteria
- [ ] Relevant skill - Add new patterns
- [ ] API docs - If endpoints changed
- [ ] Database skill - If schema changed

### Cross-References to Update
- [ ] Skills that reference changed files
- [ ] Documents that depend on changed functionality
```

### Change Categories

| Change Type | Documents to Update | Skills to Update |
|-------------|---------------------|------------------|
| New API endpoint | API.md, SPRINT_TICKETS | chirp-api-contracts |
| Schema change | - | chirp-database |
| New component | - | chirp-design-system |
| Bug fix | SPRINT_TICKETS | - |
| New feature | USER_STORIES, SPRINT_TICKETS | Feature-specific |
| Architecture change | MASTER_ROADMAP | chirp-architecture, chirp-system-design |
| New platform | PROTOCOL_ROADMAP | chirp-connector-framework |

## Context Recovery

### Quick Context Refresh

When starting a new session or recovering from context loss:

```bash
# 1. Read session workflow
docs/SESSION_WORKFLOW.md

# 2. Check current sprint status
docs/SPRINT_TICKETS.md → "Progress Tracking" section

# 3. Understand recent changes
git log --oneline -10

# 4. Load relevant skills based on task
.claude/skills/[relevant-skill].md
```

### Full Context Recovery

For complete context restoration:

```markdown
1. CLAUDE.md                    # Project overview, communication
2. docs/MASTER_ROADMAP.md       # Full roadmap, phases
3. docs/SESSION_WORKFLOW.md     # How to work
4. docs/SPRINT_TICKETS.md       # Current tasks
5. docs/USER_STORIES.md         # Requirements
6. .claude/skills/chirp-system-design.md  # Component map
```

## Documentation Quality Rules

### Every Document Must Have

- [ ] Clear purpose statement
- [ ] Version number
- [ ] Last updated date
- [ ] Related documents/skills
- [ ] Actionable content

### Every Skill Must Have

- [ ] Triggers that match use cases
- [ ] Dependencies listing
- [ ] Quick reference table
- [ ] Code examples
- [ ] Related skills

## Update Triggers

This skill should be invoked when:

1. **Sprint completed** - Update progress, mark tasks done
2. **Feature shipped** - Document new functionality
3. **Bug fixed** - Note the fix pattern if recurring
4. **Architecture changed** - Update diagrams, component maps
5. **New skill needed** - Create and cross-reference
6. **Session ending** - Capture any undocumented changes

## Documentation Templates

### New Feature Documentation

```markdown
## Feature: [Name]

### Overview
[Brief description]

### User Story
US-XXX: [Title]

### Implementation
- Files: [list]
- Database: [tables]
- API: [endpoints]

### Usage
[How to use]

### Related
- Skills: [list]
- Docs: [list]
```

### Change Log Entry

```markdown
## [Date] - [Change Type]

### Changed
- [What changed]

### Files
- [File list]

### Documentation Updated
- [ ] Doc 1
- [ ] Skill 1

### Breaking Changes
- [None / Description]
```

## Review Checklist

Before ending a session, verify:

- [ ] SPRINT_TICKETS.md reflects completed work
- [ ] New patterns added to relevant skills
- [ ] No orphaned documentation (references to deleted code)
- [ ] Cross-references are valid
- [ ] Version numbers updated if significant changes

## Self-Improvement

This skill should evolve to include:

1. Links to new documents as they're created
2. New triggers based on common questions
3. Updated templates based on what works
4. Pruned outdated references

## Related Documents

| Document | When to Use |
|----------|-------------|
| `skill-management.md` | Creating/updating skills |
| `SESSION_WORKFLOW.md` | Understanding session flow |
| `MASTER_ROADMAP.md` | Big picture context |
| All skills | Domain-specific knowledge |

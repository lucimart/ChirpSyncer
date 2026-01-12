---
name: Skill Management
description: Meta-skill for creating, updating, and improving skills based on project context
category: meta
triggers:
  - crear skill
  - actualizar skill
  - mejorar skill
  - nueva skill
  - skill obsoleta
  - documentar patrón
  - after significant work
dependencies:
  - .claude/skills/
  - docs/SESSION_WORKFLOW.md
version: "1.0"
auto_trigger: true
---

# Skill: Skill Management

This is a meta-skill that manages other skills. Use it to create, update, and improve skills based on project evolution.

## Auto-Improvement Protocol

### When to Update Skills

After completing significant work, evaluate if skills need updating:

1. **New Pattern Discovered**: If you implemented something in a new way
2. **API Changed**: If endpoints, schemas, or contracts changed
3. **Architecture Evolved**: If system design changed
4. **New Component**: If a new module/component was added
5. **Bug Pattern**: If a recurring bug pattern was identified
6. **Best Practice**: If a better approach was found

### Update Checklist

```markdown
[ ] Read the relevant skill file
[ ] Identify outdated information
[ ] Add new patterns/examples
[ ] Update version number
[ ] Update "last updated" date
[ ] Add cross-references to related skills
```

## Creating New Skills

### When to Create

- New major feature area (e.g., Feed Lab, Connectors)
- New technology integration
- Complex recurring pattern
- Domain-specific knowledge

### Skill Template

```markdown
---
name: [Descriptive Name]
description: [One-line purpose]
category: [architecture|api|frontend|testing|integration|meta]
triggers:
  - [keyword 1]
  - [keyword 2]
dependencies:
  - [file path 1]
  - [file path 2]
version: "1.0"
---

# Skill: [Name]

[Brief description of when to use this skill]

## Quick Reference

| Aspect | Value |
|--------|-------|
| ... | ... |

## [Main Content Sections]

## Related Skills

- `skill-name.md` - Description
```

### Naming Convention

```
chirp-[domain].md

Examples:
- chirp-architecture.md
- chirp-api-contracts.md
- chirp-connector-framework.md
- chirp-feed-lab.md (future)
```

## Skill Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| architecture | System design, patterns | chirp-architecture.md |
| api | Endpoints, contracts | chirp-api-contracts.md |
| frontend | UI, components | chirp-design-system.md |
| testing | Test patterns | chirp-testing.md |
| integration | External services | chirp-connector-framework.md |
| database | Schema, queries | chirp-database.md |
| migration | Migration guides | chirp-nextjs-migration.md |
| vision | Future roadmap | chirp-open-social-hub.md |
| meta | Skill management | skill-management.md |

## Auto-Update Triggers

Skills should be reviewed when:

```python
# Pseudo-code for auto-update logic
triggers = [
    "file_modified in skill.dependencies",
    "sprint_completed",
    "major_bug_fixed",
    "new_module_created",
    "api_endpoint_changed",
    "schema_migration_run",
    "architecture_decision_made"
]
```

## Skill Quality Checklist

When reviewing a skill, verify:

- [ ] **Accuracy**: Information matches current codebase
- [ ] **Completeness**: All important aspects covered
- [ ] **Examples**: Code examples are runnable
- [ ] **Cross-refs**: Related skills linked
- [ ] **Triggers**: Keywords match use cases
- [ ] **Version**: Updated after changes

## Improvement Suggestions

After using a skill, consider:

1. Was information missing?
2. Was anything outdated?
3. Could examples be clearer?
4. Are there new patterns to document?
5. Should this be split into multiple skills?

## Session Integration

At the end of significant work sessions:

```markdown
## Skill Updates Needed

After this session, consider updating:

1. `chirp-[skill].md`:
   - Add: [new pattern/info]
   - Update: [outdated section]
   - Remove: [deprecated info]
```

## Related Documents

- `docs/SESSION_WORKFLOW.md` - Session management
- `docs/MASTER_ROADMAP.md` - Project roadmap
- `.claude/skills/` - All skills location

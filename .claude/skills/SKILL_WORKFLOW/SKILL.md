---
name: Skill Workflow
description: Master document defining how skills interact, trigger, and flow together
---

# Skill Workflow & Orchestration

This document defines how all skills work together as a cohesive system.

## Skill Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SKILL ECOSYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │ documentation-  │────►│ skill-          │────►│ All Skills      │      │
│  │ brain.md        │     │ management.md   │     │ Auto-improve    │      │
│  │ (Central Hub)   │     │ (Meta-skill)    │     │                 │      │
│  └────────┬────────┘     └─────────────────┘     └─────────────────┘      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    ARCHITECTURE LAYER                               │   │
│  │  chirp-architecture ◄──► chirp-system-design ◄──► chirp-open-hub   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    IMPLEMENTATION LAYER                             │   │
│  │  chirp-database ◄──► chirp-api-design ◄──► chirp-api-contracts     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    PLATFORM LAYER                                   │   │
│  │  chirp-connector-framework ◄──► chirp-multi-platform               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND LAYER                                   │   │
│  │  chirp-nextjs-migration ◄──► chirp-design-system                   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                       │
│  │ chirp-testing   │                                                       │
│  │ (Quality Gate)  │                                                       │
│  └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Skill Dependency Graph

```
documentation-brain (hub)
    ├── skill-management (creates/updates)
    │
    ├── chirp-architecture (high-level)
    │   ├── chirp-system-design (detailed)
    │   └── chirp-open-social-hub (vision)
    │
    ├── chirp-api-design (patterns)
    │   └── chirp-api-contracts (specs)
    │
    ├── chirp-database (schema)
    │
    ├── chirp-connector-framework (abstraction)
    │   └── chirp-multi-platform (implementations)
    │
    ├── chirp-nextjs-migration (frontend)
    │   └── chirp-design-system (UI)
    │
    └── chirp-testing (quality)
```

## Trigger Matrix

### Manual Triggers (User Request)

| User Says | Primary Skill | Also Load |
|-----------|---------------|-----------|
| "new endpoint" | chirp-api-design | chirp-api-contracts, chirp-database |
| "database change" | chirp-database | chirp-api-design |
| "UI component" | chirp-design-system | chirp-nextjs-migration |
| "add platform" | chirp-connector-framework | chirp-multi-platform |
| "write tests" | chirp-testing | (context-dependent) |
| "architecture" | chirp-architecture | chirp-system-design |
| "roadmap/vision" | chirp-open-social-hub | documentation-brain |
| "documentation" | documentation-brain | skill-management |

### Auto-Triggers (After Actions)

| Action Completed | Auto-Trigger | Purpose |
|-----------------|--------------|---------|
| Sprint completed | documentation-brain | Update progress docs |
| Schema changed | chirp-database | Document migration |
| API endpoint added | chirp-api-contracts | Update specs |
| New component | chirp-design-system | Document component |
| Tests written | chirp-testing | Update coverage |
| New platform | chirp-connector-framework | Document capabilities |
| Major refactor | chirp-system-design | Update component map |
| Session ending | skill-management | Check skill updates |

## Skill Chains by Task Type

### 1. New Feature Implementation

```
Session Start
    │
    ▼
documentation-brain ──► Context recovery
    │
    ▼
chirp-architecture ──► Understand where feature fits
    │
    ▼
chirp-database ──► Schema changes needed?
    │
    ▼
chirp-api-design ──► Design endpoints
    │
    ▼
chirp-api-contracts ──► Document contracts
    │
    ▼
chirp-design-system ──► UI components needed?
    │
    ▼
chirp-testing ──► Write tests
    │
    ▼
skill-management ──► Update skills if patterns changed
```

### 2. Bug Fix

```
Session Start
    │
    ▼
documentation-brain ──► Find relevant context
    │
    ▼
chirp-system-design ──► Locate affected components
    │
    ▼
chirp-testing ──► Write regression test
    │
    ▼
(Fix the bug)
    │
    ▼
chirp-testing ──► Verify fix
```

### 3. Add New Platform (Sprint 16+)

```
chirp-open-social-hub ──► Understand vision
    │
    ▼
chirp-connector-framework ──► Use base abstractions
    │
    ▼
chirp-multi-platform ──► Define capabilities
    │
    ▼
chirp-database ──► Schema for platform
    │
    ▼
chirp-api-contracts ──► Platform endpoints
    │
    ▼
chirp-design-system ──► Platform UI
    │
    ▼
chirp-testing ──► Platform tests
```

### 4. Frontend Migration (Sprint 10-13)

```
chirp-nextjs-migration ──► Migration guide
    │
    ▼
chirp-design-system ──► Component specs
    │
    ▼
chirp-api-contracts ──► API integration
    │
    ▼
chirp-testing ──► E2E tests (Playwright)
```

## Auto-Improvement Protocol

After every significant change, this checklist runs:

```markdown
## Post-Change Skill Review

### 1. Code Changes
- [ ] Files modified: [list]
- [ ] Patterns introduced: [describe]

### 2. Skill Updates Needed?
- [ ] chirp-architecture: [ ] Yes [ ] No
- [ ] chirp-database: [ ] Yes [ ] No
- [ ] chirp-api-contracts: [ ] Yes [ ] No
- [ ] chirp-design-system: [ ] Yes [ ] No
- [ ] chirp-testing: [ ] Yes [ ] No
- [ ] Other: ___________

### 3. Documentation Updates
- [ ] SPRINT_TICKETS.md - Mark tasks
- [ ] USER_STORIES.md - Update acceptance criteria
- [ ] MASTER_ROADMAP.md - If architecture changed

### 4. Version Bump
If skill updated, increment version in metadata.
```

## Skill Quick Reference Card

| Skill | When to Use | Key Content |
|-------|-------------|-------------|
| **documentation-brain** | Start of session, context lost | Knowledge map, recovery steps |
| **skill-management** | Creating/updating skills | Templates, quality checklist |
| **chirp-architecture** | System design decisions | Layer diagram, principles |
| **chirp-system-design** | Component analysis | Config map, dependencies |
| **chirp-open-social-hub** | Vision, future features | CanonicalPost, Feed Lab |
| **chirp-database** | Schema changes | Tables, migrations, FTS5 |
| **chirp-api-design** | New endpoints | Patterns, conventions |
| **chirp-api-contracts** | API integration | Full endpoint specs |
| **chirp-connector-framework** | Platform abstraction | Connector interface |
| **chirp-multi-platform** | Add platforms | Capabilities, handlers |
| **chirp-nextjs-migration** | Frontend work | Migration steps, providers |
| **chirp-design-system** | UI components | Tokens, components |
| **chirp-testing** | Writing tests | Templates, coverage |

## Metadata Standards

Every skill must have this metadata block:

```yaml

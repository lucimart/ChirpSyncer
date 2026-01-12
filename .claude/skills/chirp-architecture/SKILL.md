---
name: ChirpSyncer Architecture
description: Architectural analysis and planning for ChirpSyncer platform
---

# Skill: ChirpSyncer Architecture Analysis

Use this skill when planning architectural changes, reviewing system design, or evaluating new features for ChirpSyncer.

> **Evolution**: ChirpSyncer → Open Social Hub (see `chirp-open-social-hub.md`)

## Quick Reference

| Aspect | Value |
|--------|-------|
| Architecture | Handler-based, multi-tenant |
| Database | SQLite + FTS5 |
| Frontend | Flask (legacy) → Next.js (migration) |
| Background | APScheduler |
| Auth | JWT in HttpOnly cookie |

## Context

ChirpSyncer is a multi-user Twitter ↔ Bluesky sync platform with:
- Handler-based architecture
- SQLite + FTS5 database
- Flask dashboard (migrating to Next.js)
- APScheduler for background tasks

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│           Web Layer (Flask/Next.js)         │
├─────────────────────────────────────────────┤
│           Service Layer                      │
│  (task_scheduler, notifications, stats)      │
├─────────────────────────────────────────────┤
│           Feature Layer                      │
│  (analytics, cleanup, search, scheduler)     │
├─────────────────────────────────────────────┤
│           Connector Framework (Future)       │
│  (Twitter, Bluesky, Mastodon, Instagram)     │
│  See: chirp-connector-framework.md           │
├─────────────────────────────────────────────┤
│           Integration Layer                  │
│  (twitter_scraper, bluesky_handler, media)   │
├─────────────────────────────────────────────┤
│           Core Layer                         │
│  (db_handler, config, logger, auth)          │
└─────────────────────────────────────────────┘
```

## Key Files to Review

| File | Purpose |
|------|---------|
| `app/core/db_handler.py` | Database schema and migrations |
| `app/auth/credential_manager.py` | Encrypted credential storage (AES-256-GCM) |
| `app/features/` | Feature implementations |
| `app/services/task_scheduler.py` | Background task management |
| `docs/architecture/` | Architecture decisions (ADRs) |

## Design Principles Checklist

When evaluating changes, verify:

- [ ] **Capabilities-first**: No assumed platform features
- [ ] **User-in-control**: Explicit confirmation for actions
- [ ] **Backend enforcement**: Permissions checked in API
- [ ] **Audit trail**: Actions logged with correlation_id
- [ ] **Multi-tenant isolation**: User data properly scoped
- [ ] **Observability**: Logging, metrics, tracing ready

## Analysis Steps

1. Read relevant source files in `app/`
2. Check database schema in `db_handler.py`
3. Review existing ADRs in `docs/architecture/decisions/`
4. Identify integration points with existing features
5. Evaluate security implications
6. Consider migration path from current state

## Output Format

Produce architectural analysis as:

```markdown
## Component: [Name]

### Current State
[Description of existing implementation]

### Proposed Changes
[What needs to change]

### Integration Points
- [List of affected components]

### Migration Strategy
1. [Step-by-step migration]

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| ... | ... |
```

## Related Skills

- `chirp-api-design.md` - API endpoint design
- `chirp-database.md` - Schema changes
- `chirp-nextjs-migration.md` - Frontend migration
- `chirp-open-social-hub.md` - Vision and future roadmap
- `chirp-connector-framework.md` - Multi-platform connectors

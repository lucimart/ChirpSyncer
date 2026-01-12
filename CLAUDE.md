# ChirpSyncer → Open Social Hub

## Session Protocol

**ALWAYS** follow the workflow in `docs/SESSION_WORKFLOW.md` when starting a new session.

### Quick Start
1. State your intent clearly: "Continuar Sprint X, tarea Y"
2. Reference docs if needed: "Según MASTER_ROADMAP.md..."
3. I will track tasks with TodoWrite

### Key Documents
| Document | Purpose |
|----------|---------|
| `docs/MASTER_ROADMAP.md` | Full roadmap, phases, sprints |
| `docs/SESSION_WORKFLOW.md` | How to work together |
| `docs/USER_STORIES.md` | Requirements and acceptance criteria |
| `docs/SPRINT_TICKETS.md` | Technical tasks |

### Skills Auto-Loaded
Skills in `.claude/skills/` are loaded by context triggers:
- `chirp-architecture.md` - System design
- `chirp-api-contracts.md` - API specs
- `chirp-database.md` - Schema design
- `chirp-testing.md` - Test patterns
- `chirp-design-system.md` - UI components
- `chirp-nextjs-migration.md` - Frontend migration
- `chirp-open-social-hub.md` - Vision & future
- `chirp-connector-framework.md` - Multi-platform
- `skill-management.md` - Meta-skill for updates

### Skill Auto-Improvement
After significant work, I should:
1. Evaluate if skills need updating
2. Add new patterns discovered
3. Update outdated information
4. Create new skills if needed

See `skill-management.md` for the full protocol.

## Project Context

**Current State**: 85% complete, 408 tests (97.8% passing)
**Current Sprint**: 8 (Cleanup Engine)
**Next.js Migration**: 0% (not started)

### Critical Files
```
app/features/cleanup/cleanup_engine.py  # Cleanup implementation
app/integrations/twitter_scraper.py     # Twitter via twscrape
app/core/db_handler.py                  # Database schema
tests/                                  # Test suite
```

### Known Issues
- `_fetch_user_tweets()` is a stub
- `_delete_tweet()` is a stub
- 10 tests failing (schema mismatches)

## Communication

- Responde en español (código/docs en inglés)
- Concisa y directa, sin explicaciones obvias
- Usa TodoWrite para trackear progreso
- Referencias a file:line para código

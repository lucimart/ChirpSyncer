# ChirpSyncer Session Workflow
> How to continue work across sessions with context loss

## Quick Start for New Sessions

```bash
# 1. Start session - Claude will auto-read skills
claude

# 2. State your intent clearly
"Continuar con Sprint 8: implementar _fetch_user_tweets en cleanup_engine.py"

# 3. Or ask for status
"¿Cuál es el estado actual del proyecto? Consulta docs/MASTER_ROADMAP.md"
```

---

## Session Types

### Type A: Continue Sprint Work
**When**: You want to implement specific tasks

```
User: "Trabajar en Sprint 8 - tarea: implementar _fetch_user_tweets"

Claude will:
1. Read docs/sprints/IMPLEMENTATION_ROADMAP.md
2. Read app/features/cleanup/cleanup_engine.py
3. Implement the function
4. Run tests: pytest tests/unit/test_cleanup_engine.py
5. Update STATUS.md if needed
```

### Type B: Architecture/Planning
**When**: You need to design or plan new features

```
User: "Diseñar el Connector Framework para multi-plataforma"

Claude will:
1. Read .claude/skills/chirp-connector-framework.md
2. Read docs/MASTER_ROADMAP.md (Phase D section)
3. Create technical design document
4. Define interfaces and data models
5. Create implementation plan
```

### Type C: Debug/Fix Issues
**When**: Tests are failing or bugs found

```
User: "Hay 10 tests fallando, arreglarlos"

Claude will:
1. Run pytest tests/ -v to identify failures
2. Analyze each failure
3. Fix issues one by one
4. Verify all tests pass
5. Update docs if root cause was architectural
```

### Type D: Review/Refactor
**When**: Code review or improvement needed

```
User: "Revisar el código de cleanup engine"

Claude will:
1. Read relevant files
2. Use code-reviewer agent
3. Identify improvements
4. Propose changes with rationale
5. Implement approved changes
```

---

## Key Files to Reference

### Always-Read Files (Auto-loaded as skills)
```
.claude/skills/
├── chirp-architecture.md       # System overview
├── chirp-api-contracts.md      # API specifications
├── chirp-database.md           # Schema design
├── chirp-testing.md            # Test patterns
├── chirp-design-system.md      # UI components
├── chirp-nextjs-migration.md   # Frontend migration
├── chirp-open-social-hub.md    # Vision & future
└── chirp-connector-framework.md # Multi-platform
```

### Manual Reference Files
```
docs/
├── MASTER_ROADMAP.md           # Full roadmap + phases
├── SESSION_WORKFLOW.md         # This file
├── USER_STORIES.md             # Detailed user stories
├── SPRINT_TICKETS.md           # Technical tasks
├── migration/
│   ├── CHIRP_NEXT_DASHBOARD_SPEC.md  # Next.js spec
│   └── STATUS.md                      # Progress
└── sprints/
    └── IMPLEMENTATION_ROADMAP.md      # Current sprint
```

---

## Sprint Work Commands

### Check Status
```
"Estado actual del proyecto"
"¿Qué queda por hacer en Sprint 8?"
"¿Cuántos tests están pasando?"
```

### Implement Task
```
"Implementar [TASK_ID] del Sprint [N]"
"Trabajar en la función _fetch_user_tweets"
"Crear el componente Button siguiendo el Design System"
```

### Run Tests
```
"Ejecutar tests de cleanup"
"Verificar que los tests pasan"
"Correr los 10 tests fallando"
```

### Create Documentation
```
"Actualizar STATUS.md con el progreso"
"Documentar el nuevo endpoint /api/v1/connectors"
"Crear skill para el nuevo módulo"
```

---

## Context Preservation Strategy

### Skills (.claude/skills/)
Skills are auto-loaded based on triggers. They contain:
- Architecture patterns
- API contracts
- Code conventions
- Design system tokens

### Documentation (docs/)
Long-form documentation for:
- Roadmaps and plans
- User stories
- Technical specifications
- Progress tracking

### Code Comments
Critical functions include inline documentation:
```python
def _fetch_user_tweets(self, user_id: int, credential_id: int) -> List[Dict]:
    """
    Fetch user tweets for cleanup evaluation.

    Implementation Notes (Sprint 8):
    - Uses twscrape API for Twitter
    - Rate limit: 900 requests/15min
    - Returns normalized tweet format
    - See: docs/sprints/IMPLEMENTATION_ROADMAP.md

    Args:
        user_id: Internal user ID
        credential_id: ID of credential to use

    Returns:
        List of tweet dicts with: id, text, created_at, likes, retweets
    """
```

---

## Troubleshooting

### "No sé cuál es el estado actual"
```
Lee docs/MASTER_ROADMAP.md y docs/migration/STATUS.md
```

### "No encuentro dónde está X"
```
Usa el Task tool con subagent_type=Explore para buscar
```

### "Los tests fallan pero no sé por qué"
```
pytest tests/ -v --tb=long 2>&1 | head -100
```

### "Necesito contexto de sesiones anteriores"
```
Los skills en .claude/skills/ contienen el contexto esencial
```

---

## Sprint Progress Tracking

After completing work, update these files:

1. **STATUS.md** - Overall progress percentages
2. **SPRINT_TICKETS.md** - Mark tasks complete
3. **MASTER_ROADMAP.md** - Only if major changes

### Update Format
```markdown
## Sprint 8 Progress
- [x] TASK-001: Implement _fetch_user_tweets
- [ ] TASK-002: Implement _delete_tweet
- [ ] TASK-003: Fix failing tests
```

---

## Communication Protocol

### Asking Claude
- Be specific: "Implementar X en archivo Y"
- Reference documents: "Según MASTER_ROADMAP.md, Sprint 8..."
- State constraints: "Sin modificar la API pública"

### Claude's Responses
- Uses TodoWrite to track tasks
- References specific file:line locations
- Runs tests after changes
- Updates documentation when needed

---

## Emergency Recovery

If context is completely lost:

```bash
# 1. Read master roadmap
cat docs/MASTER_ROADMAP.md

# 2. Check current sprint
cat docs/sprints/IMPLEMENTATION_ROADMAP.md

# 3. See migration status
cat docs/migration/STATUS.md

# 4. Run tests to see state
pytest tests/ -v --tb=no | tail -20
```

---

## Related Documents

| Document | Use When |
|----------|----------|
| MASTER_ROADMAP.md | Planning, understanding big picture |
| USER_STORIES.md | Understanding requirements |
| SPRINT_TICKETS.md | Finding specific tasks |
| Skills | Technical implementation details |

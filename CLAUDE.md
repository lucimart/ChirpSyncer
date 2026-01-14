# ChirpSyncer → Open Social Hub

## Session Protocol

**ALWAYS** read `docs/MASTER_ROADMAP.md` at session start to understand:
- Current phase and sprint
- Architecture decisions
- Implementation priorities

### Quick Start
1. State your intent clearly: "Continuar Sprint X, tarea Y"
2. Reference docs if needed: "Según MASTER_ROADMAP.md..."
3. I will track tasks with TodoWrite

### Key Documents
| Document | Purpose |
|----------|---------|
| `docs/MASTER_ROADMAP.md` | Full roadmap, phases, sprints, architecture |
| `docs/SESSION_WORKFLOW.md` | How to work together |
| `docs/USER_STORIES.md` | Requirements and acceptance criteria |
| `docs/SPRINT_TICKETS.md` | Technical tasks |
| `ARCHITECTURE.md` | System design decisions |

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

## Development Methodology: TDD-First

### Test-Driven Development Protocol
**MANDATORY**: Write tests BEFORE implementation code.

1. **Scenario First**: Define test scenarios as product decisions
2. **Red**: Write failing tests that describe expected behavior
3. **Green**: Implement minimum code to pass tests
4. **Refactor**: Clean up while keeping tests green

### Test Hierarchy
```
tests/
├── unit/           # Isolated component tests
├── integration/    # Service interaction tests
└── e2e/            # Full user journey tests
```

### Test Naming Convention
```typescript
// Unit: describe what the unit does
test('ScheduledPost_whenEngagementPredictionRequested_returnsScoreBasedOnTimeSlot')

// Integration: describe service interaction
test('SchedulerService_withBlueskyConnector_publishesPostAtOptimalTime')

// E2E: describe user journey
test('User_schedulesPostForMultiplePlatforms_seesConfirmationAndPrediction')
```

### Sprint Test Requirements
Before implementing ANY sprint feature:
1. Write unit test scenarios (component behavior)
2. Write integration test scenarios (service contracts)
3. Write e2e test scenarios (user journeys)
4. Get scenarios approved as "product decisions"
5. THEN implement code to satisfy tests

## Project Context

**Current State**: Frontend Sprints 14-18 complete, build passing
**Current Branch**: `gracious-boyd`
**Last Sprint**: 18 (Mastodon + Instagram)
**Next Sprint**: 19 (Feed Lab Foundation)

### Completed Sprints (Frontend)
- Sprint 14: WebSocket Real-Time
- Sprint 15: ML Scheduling
- Sprint 16: Connector Framework
- Sprint 17: Bluesky AT Protocol
- Sprint 18: Mastodon + Instagram

### Critical Paths
```
Frontend: frontend/src/
├── app/dashboard/     # Next.js pages
├── components/        # UI components
├── lib/               # Hooks and utilities
└── providers/         # Context providers

Tests (TDD): frontend/src/__tests__/  # TO BE CREATED
├── unit/
├── integration/
└── e2e/
```

### Architecture Decisions
- Platform-agnostic `CanonicalPost` format
- Connector-based multi-platform support
- Capabilities-first platform design
- Real-time updates via WebSocket

## Communication

- Responde en español (código/docs en inglés)
- Concisa y directa, sin explicaciones obvias
- Usa TodoWrite para trackear progreso
- Referencias a file:line para código
- **Tests son decisiones de producto**: Los escenarios de test definen el comportamiento esperado

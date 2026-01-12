---
name: memory-management
description: Store, retrieve, and manage context across sessions using claude-mem and openmemory
---

# Skill: Memory Management

Centralized memory operations using claude-mem and openmemory MCP tools.

## Quick Reference

| System | Purpose | Best For |
|--------|---------|----------|
| claude-mem | Observation timeline search | Code decisions, file changes, errors |
| openmemory | Semantic HSG + temporal facts | Preferences, patterns, project state |

## When to Store

### Auto-Trigger (session_end)
- Architecture decisions
- User preferences discovered
- Recurring patterns identified
- Error resolutions found
- Feature completions

### Manual Store
- User says "remember this"
- Important context for future sessions
- Cross-project learnings

## claude-mem Operations

### 3-Layer Workflow (Always Follow)

```
1. search(query) -> Get index with IDs (~50-100 tokens/result)
2. timeline(anchor=ID) -> Get context around interesting results
3. get_observations([IDs]) -> Fetch full details ONLY for filtered IDs
```

### Search Examples

```python
# Find recent work on a feature
mcp__plugin_claude-mem_mcp-search__search(
    query="cleanup engine",
    project="ChirpSyncer",
    limit=10
)

# Find errors from today
mcp__plugin_claude-mem_mcp-search__search(
    query="error",
    dateStart="2026-01-12",
    type="observation"
)

# Get timeline context
mcp__plugin_claude-mem_mcp-search__timeline(
    anchor=12345,  # observation ID
    depth_before=5,
    depth_after=5
)
```

## openmemory Operations

### Query Types

| Type | Use Case |
|------|----------|
| contextual | Semantic search (preferences, patterns) |
| factual | Temporal facts (user_id works_on project) |
| unified | Both systems |

### Store Patterns

```python
# Store a preference
mcp__openmemory__openmemory_store(
    content="User prefers concise responses, code over explanations",
    type="contextual",
    tags=["preference", "communication"]
)

# Store a fact
mcp__openmemory__openmemory_store(
    content="Sprint 8 cleanup engine implementation",
    type="both",
    facts=[{
        "subject": "Sprint8",
        "predicate": "implemented",
        "object": "CleanupEngine real API",
        "confidence": 1.0
    }],
    tags=["sprint", "feature"]
)
```

### Query Patterns

```python
# Find user preferences
mcp__openmemory__openmemory_query(
    query="user preferences communication style",
    type="contextual",
    k=5
)

# Find project facts
mcp__openmemory__openmemory_query(
    query="sprint implementation",
    type="factual",
    fact_pattern={
        "subject": "Sprint8",
        "predicate": "implemented"
    }
)
```

## Session Workflow

### Session Start
1. Query openmemory for user preferences
2. Search claude-mem for recent project context
3. Load relevant memories into working context

### During Session
- Store significant decisions immediately
- Update facts when state changes
- Reinforce important memories on re-access

### Session End
- Store summary of work completed
- Update project state facts
- Store any new preferences discovered

## Memory Categories

| Category | Storage | Example |
|----------|---------|---------|
| User Preferences | openmemory contextual | "Prefers Spanish responses" |
| Project State | openmemory factual | "Sprint 8 complete" |
| Code Decisions | claude-mem observation | "Chose twscrape over tweepy for read" |
| Error Resolutions | claude-mem observation | "Fixed import by adding asyncio" |
| Architecture | both | "Rate limiter pattern for API" |

## Checklist

### Before Starting Work
- [ ] Query recent session context
- [ ] Load user preferences
- [ ] Check project state facts

### After Significant Changes
- [ ] Store architecture decisions
- [ ] Update project state
- [ ] Record error resolutions

### Session End
- [ ] Summarize completed work
- [ ] Store new learnings
- [ ] Update facts

## Anti-Patterns

- Storing every file read (too noisy)
- Storing conversation verbatim (use summaries)
- Not filtering search results before get_observations
- Storing sensitive data (credentials, tokens)

## Related Skills

- `documentation-brain.md` - Document structure
- `skill-management.md` - Skill updates

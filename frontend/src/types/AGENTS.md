# FRONTEND TYPES

## OVERVIEW
Core shared TypeScript types and API response shapes.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Core types | frontend/src/types/index.ts | User, Session, Credential
| API types | frontend/src/lib/api.ts | Domain API shapes
| Theme types | frontend/src/styles/tokens/ | Token types

## CONVENTIONS
- Use interface for object shapes, type for unions.
- Import via @/types for shared types.

## ANTI-PATTERNS
- Avoid defining shared domain models inside component files.

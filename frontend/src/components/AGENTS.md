# FRONTEND COMPONENTS

## OVERVIEW
Shared UI kit plus feature-specific component groups.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| UI kit | frontend/src/components/ui/ | Button, Card, Modal, etc.
| Layout | frontend/src/components/layout/ | Sidebar + dashboard shell
| Providers | frontend/src/components/providers/ | Theme/Query/Realtime
| Feature groups | frontend/src/components/feed-lab/ | Domain components

## CONVENTIONS
- styled-components is primary styling; Tailwind appears in some features.
- Barrel exports from index.ts files are common.

## ANTI-PATTERNS
- Avoid mixing Tailwind and styled-components in the same component.

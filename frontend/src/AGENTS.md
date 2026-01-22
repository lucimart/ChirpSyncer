# FRONTEND SRC

## OVERVIEW
Source code for the Next.js App Router UI and shared logic.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Routes/layouts | frontend/src/app/ | App Router pages + layouts
| UI components | frontend/src/components/ | UI kit + feature components
| API + domain logic | frontend/src/lib/ | ApiClient and platform helpers
| Hooks | frontend/src/hooks/ | Data fetching and realtime hooks
| Types | frontend/src/types/ | Core app types

## CONVENTIONS
- Styled-components theme tokens live in frontend/src/styles/tokens/.
- Realtime updates via RealtimeProvider in components/providers.

## ANTI-PATTERNS
- Avoid defining shared types inside component files when reusable.

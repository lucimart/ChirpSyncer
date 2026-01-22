# FRONTEND

## OVERVIEW
Next.js 14 app (App Router) using styled-components and TypeScript.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App routes | frontend/src/app/ | App Router pages
| Shared UI | frontend/src/components/ | UI kit + feature components
| API client | frontend/src/lib/api.ts | Central ApiClient
| Hooks | frontend/src/hooks/ | Manual + react-query hooks
| Design tokens | frontend/src/styles/tokens/ | Colors, spacing, typography

## CONVENTIONS
- Imports use @/ aliases from frontend/tsconfig.json.
- Global auth state uses zustand in frontend/src/lib/auth.ts.

## ANTI-PATTERNS
- Avoid calling fetch directly in pages; use lib/api.ts or hooks.

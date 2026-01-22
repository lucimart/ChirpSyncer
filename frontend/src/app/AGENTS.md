# FRONTEND APP ROUTES

## OVERVIEW
Next.js App Router pages and layouts for public and dashboard views.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Root layout | frontend/src/app/layout.tsx | Global providers
| Public auth | frontend/src/app/login/ | Login page
| Dashboard layout | frontend/src/app/dashboard/layout.tsx | Sidebar shell
| Admin routes | frontend/src/app/dashboard/admin/ | User management
| Dynamic pages | frontend/src/app/dashboard/cleanup/[id]/ | Dynamic route

## CONVENTIONS
- Dashboard routes share layout.tsx for sidebar/header.
- Route components use ApiClient + hooks from lib/ and hooks/.

## ANTI-PATTERNS
- Avoid heavy logic in page components; push to hooks/lib.

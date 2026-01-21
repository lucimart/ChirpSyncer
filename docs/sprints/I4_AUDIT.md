# Sprint I4 Audit Report

Date: 2026-01-21

## Commands Run

- `npx --prefix frontend ts-unused-exports frontend/tsconfig.json`
- `npx unimported` (run from `frontend/`)

## Summary

The automated audit tools report many unused exports and unimported files, but both tools include false positives for Next.js App Router pages and `.next` generated types. The results below capture the raw output and highlight likely candidates for cleanup once product decisions are made.

## ts-unused-exports Findings (High-level)

- Workspace feature exports flagged as unused:
  - `frontend/src/components/workspace/*`
  - `frontend/src/hooks/useWorkspace.ts`
  - `frontend/src/hooks/useWorkspaceMembers.ts`
  - `frontend/src/hooks/useActivityFeed.ts`
- Algorithm dashboard exports flagged as unused:
  - `frontend/src/components/algorithm-dashboard/*`
  - `frontend/src/hooks/useAlgorithmStats.ts`
- Feed lab extras flagged as unused:
  - `frontend/src/components/feed-lab/RuleContributionChart.tsx`
  - `frontend/src/components/feed-lab/WhyAmISeeingThis.tsx`
- Type and helper exports flagged as unused:
  - `frontend/src/types/index.ts`
  - `frontend/src/lib/*` (bluesky, mastodon, instagram, scheduling, connectors)
- Note: `.next/types/*` were also flagged; these should be ignored.

## unimported Findings (Raw)

Unused dependencies (reported):
- `@tanstack/react-query`
- `lucide-react`
- `styled-components`
- `zod`
- `zustand`

These are likely false positives for a Next.js app; the dependencies are used via App Router pages and component imports.

Unimported files (reported, 71):
- All App Router pages under `src/app/**` were flagged as unimported.
- UI components, layout components, workspace components, hooks, and most libs were flagged as unimported.

## Recommended Next Steps (Pending Decisions)

Decisions recorded in Integration Sprint I4:

- Workspace feature: keep and implement.
- Algorithm dashboard: integrate as `/dashboard/algorithm`.

Next actions:

- Re-run audit with updated ignore lists for App Router files.
- Execute cleanup once workspace and algorithm integrations land.

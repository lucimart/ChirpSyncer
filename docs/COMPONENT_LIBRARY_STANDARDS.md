# Component Library Standards

This document defines the required structure and quality bar for all frontend components.

## Folder Structure (Required)

Every component must live in its own folder with co-located stories and tests.

```
src/components/<scope>/<Component>/
├── <Component>.tsx
├── <Component>.stories.tsx
├── <Component>.test.tsx
└── index.ts
```

## Definition of Done (DoD)

- Component is exported through an index file.
- Story covers all variants, sizes, and states.
- Story includes interaction testing (`play`) for critical behavior.
- A11y checks pass in Storybook (`@storybook/addon-a11y`).
- Unit test covers core logic and edge cases.
- Uses design tokens from `src/styles` instead of hardcoded values.
- Reuses shared UI primitives (Button, Input, Card, etc.) instead of duplicating.

## Story Requirements

- Include stories for:
  - Variants (primary, secondary, danger, etc.)
  - Sizes (sm, md, lg)
  - Disabled/loading states
  - Full-width/layout behavior if supported
- Use `play` to validate:
  - Accessible name and role
  - Disabled/interactive behavior
  - Critical interactions (click, input, etc.)

## Unit Test Requirements

- Use React Testing Library.
- Wrap with `ThemeProvider` for styled-components.
- Verify:
  - Rendering
  - Key interactions
  - Disabled/loading states

## Reuse & Deduplication

Before adding new UI, confirm:

- There is no existing component providing the same behavior.
- You are using primitives from `src/components/ui` when applicable.
- Styles align with the theme in `src/styles/theme.ts` and `src/styles/ThemeContext.tsx`.

## Storybook Workflow

- Local dev: `npm run storybook`
- Build: `npm run build-storybook`
- Interaction tests: `npm run test-storybook`

The CI workflow runs Storybook build + interaction tests for regression checks.

## A11y Automation

- `test-storybook` runs automated a11y checks via Playwright + axe.
- If a story must skip a11y for a justified reason, set:
  `parameters: { a11y: { disable: true } }` on that story and document why.

## Visual Regression (Chromatic)

- Set `CHROMATIC_PROJECT_TOKEN` as a GitHub Actions secret.
- Run locally: `npm run chromatic` (uses the env token).
- CI workflow: `.github/workflows/chromatic.yml`.

## Docker (Storybook)

- `docker compose -f docker-compose.dev.yml --profile storybook up`
- Storybook available at `http://localhost:6006`.

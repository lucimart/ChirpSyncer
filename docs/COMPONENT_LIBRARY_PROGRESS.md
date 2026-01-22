# Component Library Progress Log

## 2026-01-22

### Storybook
- Switched Storybook framework to `@storybook/react-webpack5` to avoid Next compiled webpack hook errors.
- Added TS/TSX loader via `babel-loader` + `next/babel` in `frontend/.storybook/main.ts`.
- Build verified: `npm run build-storybook` succeeds.
- Added a11y automation via `.storybook/test-runner.ts` (axe + Playwright).
- Added Chromatic workflow and local `npm run chromatic`.
- Added Storybook docker profile in `docker-compose.dev.yml`.

### Button Dedup (Safe Replacements)
- Evolved `ui/Button` with new variants: `outline`, `soft`, `danger-soft`, `dashed`; size: `icon`.
- Replaced local buttons with `ui/Button` in:
  - `frontend/src/components/widgets/WidgetGrid.tsx`
  - `frontend/src/components/notifications/NotificationSettings.tsx`
  - `frontend/src/components/flow/FlowDiagram.tsx`
  - `frontend/src/components/widgets/ListWidget.tsx`
  - `frontend/src/components/feed-lab/RuleList.tsx`
  - `frontend/src/components/ui/ErrorResolution.tsx`
  - `frontend/src/app/dashboard/feed-lab/page.tsx`

### Deferred (Risky)
- `frontend/src/components/layout/Sidebar.tsx` (hover/active states tied to layout)
- `frontend/src/components/widgets/Widget.tsx` (icon-only sizing)
- Tabs/option cards (not true buttons)

### Component Migration
- `Badge` moved to subfolder and documented with story + unit test:
  - `frontend/src/components/ui/Badge/Badge.tsx`
  - `frontend/src/components/ui/Badge/Badge.stories.tsx`
  - `frontend/src/components/ui/Badge/Badge.test.tsx`
  - `frontend/src/components/ui/Badge/index.ts`
- `Input` moved to subfolder and documented with story + unit test:
  - `frontend/src/components/ui/Input/Input.tsx`
  - `frontend/src/components/ui/Input/Input.stories.tsx`
  - `frontend/src/components/ui/Input/Input.test.tsx`
  - `frontend/src/components/ui/Input/index.ts`
- `Card` moved to subfolder and documented with story + unit test:
  - `frontend/src/components/ui/Card/Card.tsx`
  - `frontend/src/components/ui/Card/Card.stories.tsx`
  - `frontend/src/components/ui/Card/Card.test.tsx`
  - `frontend/src/components/ui/Card/index.ts`

### Card Dedup (Auth)
- Auth pages now use `Card.Content` with `padding="none"` on Card for consistent layout:
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/register/page.tsx`
  - `frontend/src/app/forgot-password/page.tsx`
  - `frontend/src/app/reset-password/page.tsx`

### Input Dedup (Safe Replacements)
- Extended `ui/Input` with `startIcon` and `textAlign` props.
- Replaced local inputs in `frontend/src/components/notifications/NotificationSettings.tsx`:
  - Number inputs → `StyledNumberInput` (width 80px, textAlign center).
  - Time inputs → `Input` type="time".
- Replaced WidgetPicker search input with `StyledSearchInput` using `ui/Input` and `startIcon`.
- Replaced Connectors modal form inputs with `SpacedInput` (using `ui/Input` label/hint).

### Modal Dedup (Safe Replacements)
- Replaced custom modal in `frontend/src/components/widgets/WidgetPicker.tsx` with `ui/Modal`.
- Replaced custom modal in `frontend/src/components/sync/SyncPreviewModal.tsx` with `ui/Modal`.

### Tailwind Removal
- Replaced Tailwind classes in `frontend/src/components/feed-lab/WhyAmISeeingThis.tsx` with styled-components (layout preserved).

### Badge Dedup (Safe Replacements)
- Added `neutral` and `success-soft` variants to `ui/Badge`.
- Added `neutral-soft` and `warning-soft` variants to `ui/Badge` for connectors badges.
- Added `text`, `status-success`, `status-warning`, `status-danger` variants, plus `xs` size and `dotColor` prop.
- Added `status-primary` variant to match tab badge styling.
- Replaced local badges in `frontend/src/app/dashboard/webhooks/page.tsx`:
  - Status badge → `Badge` with `variant="success-soft"`/`"neutral"`, `size="sm"`.
  - Event badge pills → `Badge` with `variant="default"`, `size="sm"`.
- Replaced capability badges in `frontend/src/app/dashboard/connectors/page.tsx` with `Badge`:
  - Enabled → `variant="success"`, disabled → `variant="neutral-soft"`, `size="sm"`.
- Replaced "Coming Soon" badge in `frontend/src/app/dashboard/connectors/page.tsx` with `Badge` (`warning-soft`) preserving absolute position.
- Replaced `TimingHeatmap` data quality badge with `Badge` using `variant="text"`, `dot`, and custom `dotColor`.
- Replaced `SyncEdge` status badge with `Badge` using `status-*` variants.
- Replaced `RuleList` rule-type badges with `Badge` (success/warning/danger) and explicit icon sizing.
- Replaced `ErrorResolution` recommended badge with positioned `Badge` (`status-success`).
- Replaced Feed Lab tab badge with `Badge` (`status-primary`) in `frontend/src/app/dashboard/feed-lab/page.tsx`.
- Deferred (risk/shape differences):

### Known Constraints
- LSP TypeScript diagnostics unavailable (typescript-language-server not installed).

### Switch & Tabs Refinement
- **Switch**:
  - Added `label` prop support (renders alongside switch).
  - Added `size` support: `sm` (36x20), `md` (44x24), `lg` (52x28).
  - Preserved original `md` dimensions (44x24 with 20px slider).
  - Updated stories to show all sizes and label usage.
  - Added unit tests for label and sizes.
  - Created index export.

### Switch Dedup (Additional)
- Replaced RuleList toggle with `ui/Switch` in `frontend/src/components/feed-lab/RuleList.tsx`.

### Alert
- Added `ui/Alert` with variants (error/success/warning/info), title and icon support.
- Replaced auth error blocks with `Alert` in:
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/register/page.tsx`
  - `frontend/src/app/forgot-password/page.tsx`
  - `frontend/src/app/reset-password/page.tsx`
- Replaced dev warning note in `frontend/src/app/forgot-password/page.tsx` with `Alert` (warning).

### EmptyState Dedup (Additional)
- Replaced empty states with `ui/EmptyState` in:
  - `frontend/src/components/widgets/WidgetPicker.tsx`
  - `frontend/src/components/flow/FlowDiagram.tsx`
  - `frontend/src/components/scheduler/TimingHeatmap.tsx`
- **Tabs**:
  - Added `variant` prop: `soft` (default, for workspaces), `accent` (for feed-lab).
  - Added `badgeVariant` to `TabItem` to support custom badge styles per tab.
  - Integrated `ui/Badge` inside `Tabs`, allowing consistent badge styling.
  - Implemented `accent` variant styles and configured `feed-lab` usage to use `accent` variant with `status-primary` badges.
  - Configured `workspaces` usage to use `soft` variant.
  - Updated stories to show variants and badge customization.
  - Added unit tests for variants and badges.
  - Created index export.

### Backend + Hooks
- Added feed rule reorder endpoint and position support:
  - DB: `feed_rules.position` column with migration in `app/models/feed_rule.py`.
  - API: `POST /api/v1/feed-rules/reorder` in `app/web/api/v1/feed.py`.
- Replaced optimistic-only reorder with API call in `frontend/src/lib/feed-rules.ts`.
- Added notifications API + hook and removed mock notifications:
  - Backend: `app/web/api/v1/notifications.py` and `app/models/notification.py`.
  - Frontend: `frontend/src/lib/notifications.ts` + DashboardLayout wiring.

### Component Integration into Pages
Integrated existing components that were implemented but not wired into pages:

- **TimingHeatmap** → `/dashboard/scheduler`
  - Added `useHeatmapData` hook in `frontend/src/lib/scheduling.ts` to transform optimal times data.
  - Integrated as "Engagement Heatmap" section below scheduler content.
  - Cell selection triggers optimal time selection.

- **FlowDiagram** → `/dashboard/connectors`
  - Added "Flow View" tab to connectors page with `variant="soft"` tabs.
  - Transforms connections data to FlowDiagram format with hub node.
  - Node/edge click handlers available for future expansion.

- **RecipeGallery** → `/dashboard/feed-lab`
  - Already integrated as "Recipes" tab (verified, no changes needed).

- **WidgetGrid** → `/dashboard`
  - Replaced static StatsGrid with customizable WidgetGrid.
  - Added localStorage persistence for widget configuration.
  - Default widgets show same stats as before (synced today/week/total, platforms).
  - Add/remove/settings handlers connected.

- **NotificationCenter** → `DashboardLayout`
  - Added to both mobile and desktop headers.
  - Mock notifications for demo (success/warning/info types).
  - Mark as read, mark all read, and dismiss handlers wired.

### UX Enhancements

- **Page Transitions** (`PageTransition`)
  - Created `frontend/src/components/layout/PageTransition.tsx` using framer-motion.
  - Uses `AnimatePresence` with fade + slide animation (200ms).
  - Integrated into `DashboardLayout` wrapping children.
  - Exported from `frontend/src/components/layout/index.ts`.

- **Drag & Drop Rule Reordering** (`RuleList`)
  - Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
  - Rewrote `frontend/src/components/feed-lab/RuleList.tsx` with drag & drop support.
  - Added `SortableRuleItem` component with `useSortable` hook.
  - Added `onReorder?: (rules: Rule[]) => void` prop.
  - Added `useReorderFeedRules` hook in `frontend/src/lib/feed-rules.ts` with optimistic updates.
  - Connected `onReorder` in `frontend/src/app/dashboard/feed-lab/page.tsx`.

### Component Migration (Storybook Standards)

Migrated remaining ui/ components to standard folder structure with stories + tests:

- **Modal** (`ui/Modal/`)
  - Moved to `Modal/Modal.tsx` with `index.ts` export.
  - Created `Modal.stories.tsx` with demos: default, with footer, sizes, no title, form example.
  - Created `Modal.test.tsx` covering rendering, close behavior, keyboard, a11y.

- **Toast** (`ui/Toast/`)
  - Moved to `Toast/Toast.tsx` with `index.ts` export.
  - Created `Toast.stories.tsx` with all types, custom durations, multiple toasts.
  - Created `Toast.test.tsx` covering add/remove, auto-dismiss, manual dismiss, provider error.

- **Progress** (`ui/Progress/`)
  - Moved to `Progress/Progress.tsx` with `index.ts` export.
  - Created `Progress.stories.tsx` with variants, sizes, animated, with details.
  - Created `Progress.test.tsx` covering percentage calculation, custom max, details rendering.

- **EmptyState** (`ui/EmptyState/`)
  - Moved to `EmptyState/EmptyState.tsx` with `index.ts` export.
  - Created `EmptyState.stories.tsx` with icons, actions, sizes, various use cases.
  - Created `EmptyState.test.tsx` covering icon, description, action, size variations.

- **Spinner** (`ui/Spinner/`) - NEW
  - Created centralized spinner component to deduplicate @keyframes spin patterns.
  - Supports sizes: `xs`, `sm`, `md`, `lg`, `xl`.
  - Supports colors: `primary`, `secondary`, `white`, `current`.
  - Created `Spinner.stories.tsx` with all sizes, colors, button integration, loading state.
  - Created `Spinner.test.tsx` covering rendering, a11y, size/color variations.

### Migration Status

**Completed (folder structure + story + test):**
- Button ✅
- Badge ✅
- Input ✅
- Card ✅
- Switch ✅
- Tabs ✅
- Alert ✅
- Modal ✅
- Toast ✅
- Progress ✅
- EmptyState ✅
- Spinner ✅ (new)

- DataTable ✅
- DangerConfirm ✅
- ConnectionStatus ✅
- CollapsibleMenu ✅

**Pending migration (complex components):**
- CommandPalette
- ErrorResolution

### Spinner Deduplication

Replaced local @keyframes spin patterns with centralized `ui/Spinner`:

| File | Old | New |
|------|-----|-----|
| `layout/DashboardLayout.tsx` | Local styled Spinner | `<Spinner size="lg" />` |
| `app/page.tsx` | Local styled Spinner | `<Spinner size="lg" />` |
| `feed-lab/WhyAmISeeingThis.tsx` | InlineSpinner + ContentSpinner | `<Spinner size="xs" />` + `<Spinner size="md" />` |
| `sync/SyncPreviewModal.tsx` | Styled Loader2 with spin keyframes | `<Spinner size="md" />` |
| `widgets/Widget.tsx` | Local LoadingSpinner | `<Spinner size="md" />` |

### Atomic Component Extraction

Created new atomic components by extracting duplicate patterns from dashboard pages:

- **PageHeader** (`ui/PageHeader/`)
  - Reusable page header with title, description, and optional actions slot.
  - Props: `title`, `description?`, `actions?`.
  - Created `PageHeader.stories.tsx` with basic, with actions, minimal variants.
  - Created `PageHeader.test.tsx` covering rendering, actions, className.

- **StatCard** (`ui/StatCard/`)
  - Stats display card with icon, value, label, and optional trend indicator.
  - Props: `value`, `label`, `icon?`, `color?`, `trend?`, `variant?` (default/centered).
  - Created `StatCard.stories.tsx` with variants, trends, icons, colors.
  - Created `StatCard.test.tsx` covering all props and variants.

- **PlatformIcon** (`ui/PlatformIcon/`)
  - Colored circular icon for platform branding (Twitter, Bluesky, etc).
  - Props: `icon`, `color`, `size?` (sm/md/lg).
  - Created `PlatformIcon.stories.tsx` with sizes, platforms, custom colors.
  - Created `PlatformIcon.test.tsx` covering sizes, colors, accessibility.

- **SettingRow** (`ui/SettingRow/`)
  - Setting row layout with label, hint, and control slot.
  - Props: `label`, `hint?`, `children`, `noBorder?`.
  - Created `SettingRow.stories.tsx` with switch, input, badge children.
  - Created `SettingRow.test.tsx` covering label, hint, noBorder behavior.

- **DetailsList** (`ui/DetailsList/`)
  - Key-value pair list for displaying details (connection info, account data).
  - Props: `items` (label/value pairs), `variant?` (default/compact).
  - Created `DetailsList.stories.tsx` with icons, badges, compact variant.
  - Created `DetailsList.test.tsx` covering items, variant, ReactNode values.

- **Typography** (`ui/Typography/`)
  - Comprehensive typography system with semantic variants.
  - Base `Typography` component with variants: h1, h2, h3, h4, body, body-sm, caption, label.
  - Colors: primary, secondary, tertiary, success, danger, warning.
  - Convenience exports: `SectionTitle`, `PageTitle`, `Text`, `SmallText`, `Caption`.
  - Created `Typography.stories.tsx` with all variants, colors, and page examples.
  - Created `Typography.test.tsx` covering semantic HTML tags and styling.

### Page Deduplication

Replaced local styled-components with atomic UI components:

| Page | Components Replaced |
|------|---------------------|
| `dashboard/sync/page.tsx` | PageHeader, StatCard, PlatformIcon |
| `dashboard/settings/page.tsx` | PageHeader, SettingRow |
| `dashboard/page.tsx` | PageHeader, EmptyState |
| `dashboard/connectors/page.tsx` | PageHeader, PlatformIcon, DetailsList |
| `dashboard/webhooks/page.tsx` | PageHeader, StatCard |
| `dashboard/workspaces/page.tsx` | PageHeader, SectionTitle, SmallText |
| `dashboard/scheduler/page.tsx` | PageHeader, SectionTitle |

### Migration Status Update

**Completed (folder structure + story + test):**
- Button ✅
- Badge ✅
- Input ✅
- Card ✅
- Switch ✅
- Tabs ✅
- Alert ✅
- Modal ✅
- Toast ✅
- Progress ✅
- EmptyState ✅
- Spinner ✅
- PageHeader ✅ (new)
- StatCard ✅ (new)
- PlatformIcon ✅ (new)
- SettingRow ✅ (new)
- DetailsList ✅ (new)
- Typography ✅ (new)

- DataTable ✅
- DangerConfirm ✅
- ConnectionStatus ✅
- CollapsibleMenu ✅

**Pending migration (complex components):**
- CommandPalette
- ErrorResolution

### Non-UI Component Stories & Tests

Added stories and tests for components outside the `ui/` folder:

**Onboarding Components:**
- `OnboardingStep.stories.tsx` - Default, Current, Completed, Clickable, AllStates, AllIcons
- `OnboardingStep.test.tsx` - 12 tests covering rendering, status, icons, click handling
- `OnboardingChecklist.stories.tsx` - Default, PartialProgress, NearComplete, Completed
- `OnboardingChecklist.test.tsx` - 11 tests covering progress, navigation, skip, completion

**Scheduler Components:**
- `TimingHeatmap.stories.tsx` - Default, Loading, Empty, Compact, WithSelection, confidence levels
- `TimingHeatmap.test.tsx` - 18 tests covering grid, cells, tooltip, loading, empty states
- `TimingRecommendation.stories.tsx` - Default, HighScores, MixedScores, LowScores, Empty
- `TimingRecommendation.test.tsx` - 11 tests covering slots, sorting, click handling

**Feed-Lab Components:**
- `RecipeCard.stories.tsx` - Boost, Demote, Filter, Selected, NoPopularity, NoTags
- `RecipeCard.test.tsx` - 18 tests covering types, categories, conditions, interactions
- `RecipeGallery.stories.tsx` - Default, ListView, Empty, SingleRecipe, ManyRecipes
- `RecipeGallery.test.tsx` - 14 tests covering search, filter, sort, selection

### Next Actions
- Optional: run `npm run test-storybook` for interaction checks.
- Replace mock notifications with real API hook when backend endpoint available.
- Add backend endpoint for rule reordering (currently optimistic-only).

# ChirpSyncer Next.js Dashboard Specification

**Version**: 1.1
**Last Updated**: 2026-01-12
**Status**: Specification Complete - Ready for Sprint 1

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Routes & Pages](#3-routes--pages)
4. [Design System v1](#4-design-system-v1)
5. [API Contracts v1](#5-api-contracts-v1)
6. [Page Blueprints](#6-page-blueprints)
7. [Sprint Backlog](#7-sprint-backlog)
8. [Migration & Cutover](#8-migration--cutover)
9. [Quality Assurance](#9-quality-assurance)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 Objective

Replace Flask dashboard with Next.js 14+ App Router, maintaining full feature parity while enabling future enhancements (WebSocket, ML scheduling, multi-platform).

### 1.2 Product Scope

**Core (Sprint 1-6)**:
- Auth (login, logout, session)
- Credentials (CRUD, test)
- Sync Dashboard (status, history, trigger)
- Cleanup (rules, preview, step-up execute)
- Scheduler (queue, cancel)
- Analytics (overview, top tweets)

**Extra (Sprint 7-9)**:
- Search + Bookmarks
- Reports + Tasks
- Audit Log
- Admin (user management)

### 1.3 Guiding Principles

| Principle | Implementation |
|-----------|----------------|
| **Capabilities-First** | Never assume platform features; check `PlatformCapabilities` |
| **User-in-Control** | No automatic actions without explicit consent |
| **Step-Up Auth** | Dangerous actions require typed confirmation + reason + danger_token |
| **UI Honesty** | Show real state (including errors), no fake success |
| **Backend Enforcement** | All rules validated server-side, UI is hint only |
| **Observability** | Correlation IDs, audit logs, traceable actions |
| **No Surprises** | Feature gated in UI + enforced in backend |

### 1.4 Tech Stack

```
Frontend:
├── Next.js 14+ (App Router)
├── TypeScript (strict mode)
├── styled-components (SSR configured)
├── TanStack Query (data fetching)
├── Recharts (analytics charts)
└── Playwright (E2E testing)

Backend (unchanged):
├── Flask (API only, /api/v1/*)
├── SQLite + FTS5
├── APScheduler
└── JWT (shared auth)
```

### 1.5 Timeline

| Phase | Sprints | Duration | Key Milestone |
|-------|---------|----------|---------------|
| Foundation | 1-3 | 6 weeks | Auth + Core migrated |
| Features | 4-6 | 6 weeks | Cleanup + Scheduler + Analytics |
| Polish | 7-9 | 6 weeks | Search + Admin + Flask OFF |
| **Total** | **9** | **18 weeks** | **Complete migration** |

---

## 2. Architecture Overview

### 2.1 Project Structure

```
apps/web/
├── app/
│   ├── (auth)/                    # Auth route group (no layout)
│   │   ├── login/page.tsx
│   │   └── logout/route.ts
│   │
│   ├── (dashboard)/               # Dashboard route group (shared layout)
│   │   ├── layout.tsx             # AuthenticatedLayout with sidebar
│   │   ├── page.tsx               # /app → Dashboard home
│   │   ├── credentials/
│   │   │   ├── page.tsx           # List
│   │   │   ├── new/page.tsx       # Create
│   │   │   └── [id]/page.tsx      # Edit
│   │   ├── sync/page.tsx
│   │   ├── cleanup/
│   │   │   ├── page.tsx           # Rules list
│   │   │   ├── new/page.tsx       # Create rule
│   │   │   └── [id]/page.tsx      # Rule detail + preview
│   │   ├── scheduler/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── search/page.tsx
│   │   ├── bookmarks/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── audit/page.tsx
│   │   └── admin/
│   │       └── users/page.tsx
│   │
│   ├── layout.tsx                 # RootLayout with providers
│   ├── page.tsx                   # / → redirect to /login or /app
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                        # Design System v1
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Switch.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── DataTable.tsx
│   │   ├── Alert.tsx
│   │   ├── Toast.tsx
│   │   ├── Tag.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── Tooltip.tsx
│   │   ├── EmptyState.tsx
│   │   ├── DangerConfirm.tsx
│   │   └── index.ts               # Barrel export
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── UserMenu.tsx
│   │
│   └── features/                  # Feature-specific components
│       ├── credentials/
│       │   ├── CredentialCard.tsx
│       │   ├── CredentialForm.tsx
│       │   └── PlatformIcon.tsx
│       ├── cleanup/
│       │   ├── CleanupRuleCard.tsx
│       │   ├── RuleWizard.tsx
│       │   └── PreviewTable.tsx
│       ├── scheduler/
│       │   └── TweetComposer.tsx
│       └── analytics/
│           └── EngagementChart.tsx
│
├── lib/
│   ├── api.ts                     # API client wrapper
│   ├── auth.ts                    # Auth utilities
│   ├── theme/
│   │   ├── tokens.ts              # Design tokens
│   │   ├── GlobalStyles.ts
│   │   └── ThemeProvider.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useToast.ts
│   │   ├── useCredentials.ts      # TanStack Query hooks
│   │   ├── useSync.ts
│   │   ├── useCleanup.ts
│   │   └── useAnalytics.ts
│   └── utils/
│       ├── format.ts              # Date, number formatting
│       └── validation.ts
│
├── providers/
│   └── AppProviders.tsx           # Composed providers
│
├── middleware.ts                  # Auth middleware
│
├── styles/
│   └── globals.css
│
└── types/
    ├── api.ts                     # API response types
    ├── credentials.ts
    ├── cleanup.ts
    └── index.ts
```

### 2.2 Providers Setup

```typescript
// providers/AppProviders.tsx
// ORDER MATTERS - outer to inner
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>              {/* 1. Theme (styled-components) */}
      <QueryClientProvider>      {/* 2. TanStack Query */}
        <ToastProvider>          {/* 3. Toast notifications */}
          <AuthProvider>         {/* 4. Auth context */}
            <RealtimeProvider>   {/* 5. WebSocket (future) */}
              {children}
            </RealtimeProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

### 2.3 Server vs Client Components

| Type | Use For | Example |
|------|---------|---------|
| **Server** | Data fetching, metadata, static | `page.tsx`, `layout.tsx` |
| **Client** | Interactivity, hooks, state | Forms, modals, charts |

**Rules**:
```typescript
// ✅ Server Component (default) - page.tsx
export default async function CredentialsPage() {
  // Can await, access DB, no 'use client'
  return <CredentialsList />;
}

// ✅ Client Component - CredentialForm.tsx
'use client';
export function CredentialForm() {
  const [form, setForm] = useState({});
  // Hooks, event handlers
}

// ❌ DON'T mix - no useState in server components
// ❌ DON'T use server-only code in 'use client' files
```

### 2.4 Permissions Model (RBAC)

```typescript
// lib/permissions.ts
type Permission =
  | 'canViewDashboard'
  | 'canManageCredentials'
  | 'canTriggerSync'
  | 'canViewCleanup'
  | 'canExecuteCleanup'      // Requires step-up
  | 'canManageScheduler'
  | 'canViewAnalytics'
  | 'canExportData'
  | 'canViewAudit'
  | 'canManageUsers';        // Admin only

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user: [
    'canViewDashboard',
    'canManageCredentials',
    'canTriggerSync',
    'canViewCleanup',
    'canExecuteCleanup',
    'canManageScheduler',
    'canViewAnalytics',
  ],
  admin: [
    // All user permissions +
    'canExportData',
    'canViewAudit',
    'canManageUsers',
  ],
};

// Usage in components
function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return user?.roles.some(role =>
    ROLE_PERMISSIONS[role]?.includes(permission)
  ) ?? false;
}

// UI gating
{canManageUsers && <Link href="/app/admin/users">Users</Link>}

// Backend enforcement (Flask)
@require_permission('canManageUsers')
def admin_users():
    ...
```

### 2.5 Coexistence Strategy

```
                    ┌─────────────────────────────────────┐
                    │         Nginx Reverse Proxy          │
                    │         (port 80/443)                │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
              ┌─────▼─────┐               ┌───────▼───────┐
              │  Next.js  │               │    Flask      │
              │  :3000    │               │    :5000      │
              │           │               │               │
              │ /         │               │ /api/v1/*     │
              │ /login    │               │ /legacy/*     │
              │ /app/*    │               │               │
              └─────┬─────┘               └───────┬───────┘
                    │                             │
                    └─────────────┬───────────────┘
                                  │
                          ┌───────▼───────┐
                          │    SQLite     │
                          │  chirpsyncer  │
                          │     .db       │
                          └───────────────┘
```

### 2.2 Shared Authentication

```
┌──────────┐     POST /api/v1/auth/login      ┌──────────┐
│  Next.js │ ──────────────────────────────►  │  Flask   │
│  Client  │                                  │   API    │
│          │  ◄────────────────────────────── │          │
└──────────┘     Set-Cookie: chirp_token=JWT  └──────────┘
                 HttpOnly; Secure; SameSite=Lax
```

**JWT Payload**:
```json
{
  "user_id": 42,
  "roles": ["user", "admin"],
  "exp": 1736812800,
  "iat": 1736208000
}
```

---

## 3. Routes & Pages

### 3.1 Route Map

| Route | Page | Auth | Sprint | Flask Legacy |
|-------|------|------|--------|--------------|
| `/` | Landing/Redirect | No | 1 | `/` |
| `/login` | Login Page | No | 1 | `/login` |
| `/logout` | Logout Action | Yes | 1 | `/logout` |
| `/app` | Dashboard Home | Yes | 3 | `/dashboard` |
| `/app/credentials` | Credentials List | Yes | 2 | `/credentials` |
| `/app/credentials/new` | Add Credential | Yes | 2 | `/credentials/add` |
| `/app/credentials/[id]` | Edit Credential | Yes | 2 | `/credentials/:id` |
| `/app/sync` | Sync History | Yes | 3 | `/sync` |
| `/app/cleanup` | Cleanup Rules | Yes | 4 | `/cleanup` |
| `/app/cleanup/[id]` | Rule Detail | Yes | 4 | `/cleanup/:id` |
| `/app/scheduler` | Tweet Queue | Yes | 5 | `/scheduler` |
| `/app/analytics` | Analytics | Yes | 6 | `/analytics` |
| `/app/search` | Full-text Search | Yes | 7 | `/search` |
| `/app/bookmarks` | Saved Tweets | Yes | 7 | `/saved` |
| `/app/reports` | Report Generator | Yes | 8 | `/reports` |
| `/app/tasks` | Background Tasks | Yes | 8 | `/tasks` |
| `/app/audit` | Audit Log | Yes | 8 | `/audit` |
| `/app/admin/users` | User Management | Admin | 9 | `/admin/users` |

### 3.2 Navigation Structure

```
Sidebar:
├── 📊 Dashboard        /app
├── 🔐 Credentials      /app/credentials
├── 🔄 Sync History     /app/sync
├── 🧹 Cleanup          /app/cleanup
├── 📅 Scheduler        /app/scheduler
├── 📈 Analytics        /app/analytics
├── 🔍 Search           /app/search
├── 🔖 Bookmarks        /app/bookmarks
├── 📄 Reports          /app/reports
├── ⚙️ Tasks            /app/tasks
├── 📋 Audit Log        /app/audit
└── 👥 Admin (admin)    /app/admin/users
```

---

## 4. Design System v1

### 4.1 Design Tokens

```typescript
// lib/theme/tokens.ts
export const tokens = {
  colors: {
    // Brand
    primary: '#1DA1F2',      // Twitter blue
    primaryHover: '#1A91DA',
    secondary: '#0085FF',    // Bluesky blue
    secondaryHover: '#0077E6',

    // Semantic
    success: '#17BF63',
    warning: '#FFAD1F',
    danger: '#E0245E',
    info: '#1DA1F2',

    // Neutral
    background: '#FFFFFF',
    backgroundAlt: '#F7F9FA',
    surface: '#FFFFFF',
    surfaceHover: '#F7F9FA',
    border: '#E1E8ED',
    borderFocus: '#1DA1F2',

    // Text
    textPrimary: '#14171A',
    textSecondary: '#657786',
    textMuted: '#AAB8C2',
    textInverse: '#FFFFFF',

    // Dark mode variants
    dark: {
      background: '#15202B',
      backgroundAlt: '#192734',
      surface: '#1C2938',
      border: '#38444D',
      textPrimary: '#FFFFFF',
      textSecondary: '#8899A6',
    }
  },

  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '2rem',    // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
  },

  radii: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    full: '9999px',   // Pill
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },

  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    toast: 1500,
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },

  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
};
```

### 4.2 Component Library

#### Button

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

// Usage
<Button variant="primary" size="md" loading={isLoading}>
  Save Changes
</Button>

<Button variant="danger" size="sm" leftIcon={<TrashIcon />}>
  Delete
</Button>
```

#### IconButton

```typescript
// components/ui/IconButton.tsx
interface IconButtonProps {
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  label: string;  // Required for accessibility (aria-label)
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// Usage
<IconButton
  icon={<TrashIcon />}
  variant="danger"
  size="sm"
  label="Delete credential"
  onClick={handleDelete}
/>
```

#### Input

```typescript
// components/ui/Input.tsx
interface InputProps {
  type: 'text' | 'password' | 'email' | 'number' | 'search';
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}

// Usage
<Input
  type="password"
  label="Password"
  error={errors.password}
  required
  value={password}
  onChange={setPassword}
/>
```

#### Select

```typescript
// components/ui/Select.tsx
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

// Usage
<Select
  label="Platform"
  options={[
    { value: 'twitter', label: 'Twitter' },
    { value: 'bluesky', label: 'Bluesky' },
  ]}
  value={platform}
  onChange={setPlatform}
/>
```

#### Checkbox

```typescript
// components/ui/Checkbox.tsx
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  indeterminate?: boolean;  // For "select all" states
}

// Usage
<Checkbox
  checked={rememberMe}
  onChange={setRememberMe}
  label="Remember me"
  description="Stay logged in for 30 days"
/>
```

#### Switch

```typescript
// components/ui/Switch.tsx
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

// Usage
<Switch
  checked={ruleEnabled}
  onChange={setRuleEnabled}
  label="Enable rule"
  description="Run this cleanup rule automatically"
/>
```

#### Card

```typescript
// components/ui/Card.tsx
interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated';
  children: React.ReactNode;
}

// Usage
<Card
  title="Twitter Account"
  subtitle="@username"
  actions={<Button variant="ghost" size="sm">Edit</Button>}
>
  <CredentialDetails />
</Card>
```

#### Modal

```typescript
// components/ui/Modal.tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// Usage
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Add Credential"
  size="md"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>Save</Button>
    </>
  }
>
  <CredentialForm />
</Modal>
```

#### Drawer

```typescript
// components/ui/Drawer.tsx
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  position: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';  // 280px, 400px, 600px
  title?: string;
  children: React.ReactNode;
}

// Usage
<Drawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
  position="right"
  title="Filters"
>
  <FilterForm />
</Drawer>
```

#### Tag

```typescript
// components/ui/Tag.tsx
interface TagProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
}

// Usage
<Tag label="Twitter" variant="primary" icon={<TwitterIcon />} />
<Tag label="Bluesky" variant="default" removable onRemove={handleRemove} />
```

#### Tooltip

```typescript
// components/ui/Tooltip.tsx
interface TooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;  // ms before showing
  children: React.ReactNode;
}

// Usage
<Tooltip content="Last synced 2 hours ago" position="top">
  <StatusBadge status="active" />
</Tooltip>
```

#### DataTable

```typescript
// components/ui/DataTable.tsx
interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
}

// Usage
<DataTable
  columns={[
    { key: 'platform', header: 'Platform' },
    { key: 'username', header: 'Username' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', render: (row) => <RowActions row={row} /> },
  ]}
  data={credentials}
  pagination={{ page, pageSize: 10, total, onPageChange: setPage }}
  onRowClick={(row) => router.push(`/app/credentials/${row.id}`)}
/>
```

#### Alert / Toast

```typescript
// components/ui/Alert.tsx
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// components/ui/Toast.tsx
interface ToastProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number; // ms, 0 = persistent
}

// Usage via hook
const { toast } = useToast();
toast.success('Credential saved successfully');
toast.error('Failed to connect to API');
```

#### DangerConfirm (Step-Up Auth)

```typescript
// components/ui/DangerConfirm.tsx
interface DangerConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason: string; correlationId: string }) => void;
  title: string;
  description: string;
  confirmPhrase: string;  // User must type this exactly
  reasonRequired?: boolean;
  loading?: boolean;
}

// Usage
<DangerConfirm
  open={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleExecuteCleanup}
  title="Confirm Deletion"
  description="This will permanently delete 47 tweets. This action cannot be undone."
  confirmPhrase="DELETE 47 TWEETS"
  reasonRequired
  loading={isExecuting}
/>

// Visual structure:
// ┌─────────────────────────────────────────────┐
// │  ⚠️ Confirm Deletion                        │
// ├─────────────────────────────────────────────┤
// │                                             │
// │  This will permanently delete 47 tweets.    │
// │  This action cannot be undone.              │
// │                                             │
// │  Type "DELETE 47 TWEETS" to confirm:        │
// │  ┌─────────────────────────────────────┐   │
// │  │                                     │   │
// │  └─────────────────────────────────────┘   │
// │                                             │
// │  Reason for deletion (required):            │
// │  ┌─────────────────────────────────────┐   │
// │  │ Cleaning up old promotional tweets  │   │
// │  └─────────────────────────────────────┘   │
// │                                             │
// │  ┌─────────┐  ┌────────────────────────┐   │
// │  │ Cancel  │  │ Confirm Deletion [❌]  │   │
// │  └─────────┘  └────────────────────────┘   │
// │                                             │
// └─────────────────────────────────────────────┘
```

#### StatusBadge

```typescript
// components/ui/StatusBadge.tsx
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'pending' | 'testing';
  label?: string;
  size?: 'sm' | 'md';
}

// Color mapping
const statusColors = {
  active: 'success',
  inactive: 'muted',
  error: 'danger',
  pending: 'warning',
  testing: 'info',
};
```

#### Skeleton / Loading

```typescript
// components/ui/Skeleton.tsx
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

// components/ui/Spinner.tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'muted';
}

// Usage
<Skeleton variant="text" width="60%" />
<Skeleton variant="rectangular" height={200} />
<Spinner size="md" />
```

#### EmptyState

```typescript
// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Usage
<EmptyState
  icon={<InboxIcon />}
  title="No credentials yet"
  description="Add your first Twitter or Bluesky account to get started"
  action={{ label: 'Add Credential', onClick: () => router.push('/app/credentials/new') }}
/>
```

### 4.3 Component Summary

| Component | Sprint | Props | States |
|-----------|--------|-------|--------|
| Button | 1 | variant, size, loading, disabled, fullWidth, icons | default, hover, active, disabled, loading |
| IconButton | 1 | icon, variant, size, label | default, hover, active, disabled |
| Input | 1 | type, label, error, hint, icons | default, focus, error, disabled |
| Select | 1 | options, value, label, error | default, open, focus, disabled |
| Checkbox | 1 | checked, label, description, indeterminate | unchecked, checked, indeterminate |
| Switch | 1 | checked, label, description | off, on, disabled |
| Card | 1 | title, subtitle, actions, footer, padding, variant | default, hover (if clickable) |
| Modal | 1 | open, title, size, footer | open, closing |
| Drawer | 2 | open, position, size, title | open, closing |
| Alert | 1 | type, title, message, dismissible, action | visible, dismissed |
| Toast | 1 | type, message, duration | enter, visible, exit |
| Tag | 2 | label, variant, removable, icon | default, hover (if removable) |
| Tooltip | 2 | content, position, delay | hidden, visible |
| Skeleton | 1 | width, height, variant, animation | animating |
| Spinner | 1 | size, color | spinning |
| DataTable | 3 | columns, data, loading, pagination, selectable | loading, empty, populated |
| StatusBadge | 2 | status, label, size | N/A |
| EmptyState | 2 | icon, title, description, action | N/A |
| DangerConfirm | 4 | confirmPhrase, reasonRequired, loading | input, validating, confirmed |

---

## 5. API Contracts v1

### 5.1 Standard Response Format

```typescript
// Success response
interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    correlationId?: string;
  };
}

// Error response
interface ApiError {
  error: {
    code: string;          // e.g., "VALIDATION_ERROR", "NOT_FOUND"
    message: string;       // User-friendly message
    details?: Record<string, string>;  // Field-level errors
    correlationId: string; // For support/debugging
  };
}

// HTTP status mapping
// 200 - Success
// 201 - Created
// 400 - Validation error
// 401 - Unauthenticated
// 403 - Forbidden (insufficient permissions)
// 404 - Not found
// 409 - Conflict (e.g., duplicate)
// 422 - Unprocessable (business logic error)
// 429 - Rate limited
// 500 - Server error
```

### 5.2 Authentication Endpoints

#### POST /api/v1/auth/login

```typescript
// Request
interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;  // Extend token expiry to 30 days
}

// Response 200
interface LoginResponse {
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      roles: string[];
    };
    expiresAt: string;  // ISO datetime
  };
}
// Also sets: Set-Cookie: chirp_token=JWT; HttpOnly; Secure; SameSite=Lax

// Response 401
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "correlationId": "abc123"
  }
}
```

#### POST /api/v1/auth/logout

```typescript
// Request: No body (token from cookie)

// Response 200
{
  "data": { "success": true }
}
// Also clears cookie
```

#### GET /api/v1/auth/me

```typescript
// Request: Token from cookie

// Response 200
interface MeResponse {
  data: {
    id: number;
    username: string;
    email: string;
    roles: string[];
    createdAt: string;
    lastLoginAt: string;
  };
}
```

#### POST /api/v1/auth/token/refresh

```typescript
// Request: Token from cookie

// Response 200
interface RefreshResponse {
  data: {
    expiresAt: string;
  };
}
// Also sets new cookie
```

### 5.3 Credentials Endpoints

#### GET /api/v1/credentials

```typescript
// Response 200
interface CredentialsListResponse {
  data: Credential[];
  meta: {
    total: number;
  };
}

interface Credential {
  id: number;
  platform: 'twitter' | 'bluesky';
  credentialType: 'scraping' | 'api' | 'oauth';
  identifier: string;      // username or email (not password)
  displayName: string;
  status: 'active' | 'inactive' | 'error';
  statusMessage?: string;  // e.g., "Last tested: 2h ago"
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/v1/credentials

```typescript
// Request
interface CreateCredentialRequest {
  platform: 'twitter' | 'bluesky';
  credentialType: 'scraping' | 'api';
  identifier: string;
  secret: string;  // Password or API key (never returned)
  displayName?: string;
}

// Response 201
interface CreateCredentialResponse {
  data: Credential;
}

// Response 400 (validation)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid credential data",
    "details": {
      "identifier": "Username is required",
      "secret": "Password must be at least 8 characters"
    },
    "correlationId": "abc123"
  }
}
```

#### PUT /api/v1/credentials/:id

```typescript
// Request
interface UpdateCredentialRequest {
  identifier?: string;
  secret?: string;        // Only if changing password
  displayName?: string;
  status?: 'active' | 'inactive';
}

// Response 200
{
  "data": Credential
}
```

#### DELETE /api/v1/credentials/:id

```typescript
// Response 200
{
  "data": { "deleted": true }
}
```

#### POST /api/v1/credentials/:id/test

```typescript
// Response 200 (success)
interface TestCredentialResponse {
  data: {
    success: true;
    message: "Successfully authenticated as @username";
    testedAt: string;
  };
}

// Response 200 (failure - not 4xx because test completed)
{
  "data": {
    "success": false,
    "message": "Authentication failed: Invalid password",
    "testedAt": "2026-01-12T10:30:00Z"
  }
}
```

### 5.4 Platforms Endpoint

#### GET /api/v1/platforms

```typescript
// Response 200
interface PlatformsResponse {
  data: Platform[];
}

interface Platform {
  name: string;         // 'twitter', 'bluesky'
  displayName: string;  // 'Twitter', 'Bluesky'
  enabled: boolean;
  capabilities: PlatformCapabilities;
}

interface PlatformCapabilities {
  canPost: boolean;
  canReadTimeline: boolean;
  canDeleteOwnPosts: boolean;
  canEditPosts: boolean;
  supportsText: boolean;
  supportsImages: boolean;
  supportsVideos: boolean;
  supportsThreads: boolean;
  maxTextLength: number;
  maxImagesPerPost: number;
  authMethod: 'oauth2' | 'credentials' | 'api_key';
}
```

### 5.5 Sync Endpoints

#### GET /api/v1/sync/history

```typescript
// Query params
interface SyncHistoryParams {
  page?: number;      // default: 1
  pageSize?: number;  // default: 20, max: 100
  status?: 'success' | 'error' | 'partial';
}

// Response 200
interface SyncHistoryResponse {
  data: SyncRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface SyncRecord {
  id: number;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'success' | 'error' | 'partial';
  itemsSynced: number;
  itemsFailed: number;
  errorMessage?: string;
  correlationId: string;
}
```

#### GET /api/v1/sync/stats

```typescript
// Response 200
interface SyncStatsResponse {
  data: {
    today: { synced: number; failed: number };
    week: { synced: number; failed: number };
    total: { synced: number; failed: number };
    lastSync: {
      at: string;
      status: string;
      itemsSynced: number;
    };
    nextSync: {
      at: string;
      scheduledBy: 'automatic' | 'manual';
    };
  };
}
```

#### POST /api/v1/sync/trigger

```typescript
// Request
interface TriggerSyncRequest {
  credentialId?: number;  // Optional: sync specific credential only
}

// Response 202 (accepted, running async)
interface TriggerSyncResponse {
  data: {
    syncId: number;
    status: 'queued';
    correlationId: string;
  };
}
```

### 5.6 Cleanup Endpoints

#### GET /api/v1/cleanup/rules

```typescript
// Response 200
interface CleanupRulesResponse {
  data: CleanupRule[];
}

interface CleanupRule {
  id: number;
  name: string;
  description?: string;
  type: 'age' | 'engagement' | 'pattern';
  config: AgeConfig | EngagementConfig | PatternConfig;
  enabled: boolean;
  lastRunAt?: string;
  lastRunCount?: number;
  createdAt: string;
}

interface AgeConfig {
  olderThanDays: number;
  excludeWithMedia?: boolean;
  excludeWithLinks?: boolean;
}

interface EngagementConfig {
  maxLikes: number;
  maxRetweets: number;
  maxReplies: number;
  olderThanDays?: number;
}

interface PatternConfig {
  pattern: string;  // Regex
  matchType: 'contains' | 'startsWith' | 'endsWith' | 'regex';
}
```

#### GET /api/v1/cleanup/preview/:id

```typescript
// Response 200
interface CleanupPreviewResponse {
  data: {
    ruleId: number;
    ruleName: string;
    matchingTweets: PreviewTweet[];
    totalCount: number;
    previewLimit: number;  // e.g., showing 50 of 200
  };
}

interface PreviewTweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  hasMedia: boolean;
}
```

### 5.6.1 Step-Up Authentication Flow

For dangerous actions (cleanup execute, bulk delete), a two-step confirmation is required:

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP-UP AUTHENTICATION FLOW                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User clicks "Execute Cleanup"                                    │
│     ↓                                                               │
│  2. Frontend shows DangerConfirm modal                              │
│     - User types confirmation phrase                                │
│     - User enters reason                                            │
│     ↓                                                               │
│  3. POST /api/v1/danger/confirm                                     │
│     Request: { action, confirmPhrase, reason }                      │
│     Response: { danger_token, expiresIn: 300 }                      │
│     ↓                                                               │
│  4. POST /api/v1/cleanup/execute/:id                                │
│     Header: X-Danger-Token: {danger_token}                          │
│     Response: { executionId, status, correlationId }                │
│                                                                      │
│  Token expires after 5 minutes. Single use only.                    │
└─────────────────────────────────────────────────────────────────────┘
```

#### POST /api/v1/danger/confirm

```typescript
// Request
interface DangerConfirmRequest {
  action: 'cleanup.execute' | 'credential.delete' | 'bulk.delete';
  targetId?: string;         // Rule ID, credential ID, etc.
  confirmPhrase: string;     // Must match expected phrase
  reason: string;            // Why user is doing this (min 10 chars)
}

// Response 200
interface DangerConfirmResponse {
  data: {
    danger_token: string;    // Single-use token
    expiresIn: number;       // Seconds (300 = 5 min)
    action: string;
    correlationId: string;
  };
}

// Response 400 (validation failed)
{
  "error": {
    "code": "STEP_UP_FAILED",
    "message": "Confirmation phrase does not match",
    "details": {
      "expected": "DELETE 47 TWEETS",
      "received": "delete 47 tweets"
    },
    "correlationId": "abc123"
  }
}
```

#### POST /api/v1/cleanup/execute/:id

```typescript
// Headers
// X-Danger-Token: {danger_token from confirm endpoint}

// Request
interface ExecuteCleanupRequest {
  dryRun?: boolean;  // Default false
}

// Response 202 (accepted)
interface ExecuteCleanupResponse {
  data: {
    executionId: number;
    status: 'queued' | 'running';
    dryRun: boolean;
    estimatedCount: number;
    correlationId: string;  // For audit trail
  };
}

// Response 401 (missing or invalid token)
{
  "error": {
    "code": "DANGER_TOKEN_REQUIRED",
    "message": "This action requires step-up authentication",
    "correlationId": "abc123"
  }
}

// Response 403 (token expired or already used)
{
  "error": {
    "code": "DANGER_TOKEN_INVALID",
    "message": "Step-up token has expired or was already used",
    "correlationId": "abc123"
  }
}
```

#### GET /api/v1/cleanup/history

```typescript
// Response 200
interface CleanupHistoryResponse {
  data: CleanupExecution[];
  meta: { page: number; pageSize: number; total: number };
}

interface CleanupExecution {
  id: number;
  ruleId: number;
  ruleName: string;
  executedAt: string;
  executedBy: string;  // username
  dryRun: boolean;
  deletedCount: number;
  status: 'success' | 'partial' | 'error';
  reason: string;
  correlationId: string;
}
```

### 5.7 Scheduler Endpoints

#### GET /api/v1/scheduler/tweets

```typescript
// Query params
interface SchedulerParams {
  status?: 'pending' | 'published' | 'failed' | 'cancelled';
  page?: number;
  pageSize?: number;
}

// Response 200
interface ScheduledTweetsResponse {
  data: ScheduledTweet[];
  meta: { page: number; pageSize: number; total: number };
}

interface ScheduledTweet {
  id: number;
  content: string;
  scheduledFor: string;
  platform: 'twitter' | 'bluesky';
  credentialId: number;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  publishedAt?: string;
  publishedPostId?: string;
  errorMessage?: string;
  createdAt: string;
}
```

#### POST /api/v1/scheduler/tweets

```typescript
// Request
interface ScheduleTweetRequest {
  content: string;
  scheduledFor: string;  // ISO datetime, must be in future
  platform: 'twitter' | 'bluesky';
  credentialId: number;
}

// Response 201
{
  "data": ScheduledTweet
}
```

### 5.8 Analytics Endpoints

#### GET /api/v1/analytics/overview

```typescript
// Query params
interface AnalyticsParams {
  period: '24h' | '7d' | '30d' | '90d';
}

// Response 200
interface AnalyticsOverviewResponse {
  data: {
    period: string;
    tweets: {
      total: number;
      synced: number;
      deleted: number;
    };
    engagement: {
      likes: number;
      retweets: number;
      replies: number;
    };
    chart: {
      labels: string[];  // Dates
      datasets: {
        synced: number[];
        deleted: number[];
      };
    };
  };
}
```

#### GET /api/v1/analytics/top-tweets

```typescript
// Query params
interface TopTweetsParams {
  period: '24h' | '7d' | '30d';
  metric: 'likes' | 'retweets' | 'engagement';  // engagement = sum
  limit?: number;  // default: 10
}

// Response 200
interface TopTweetsResponse {
  data: TopTweet[];
}

interface TopTweet {
  id: string;
  text: string;
  platform: 'twitter' | 'bluesky';
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  engagementRate: number;
  url: string;
}
```

### 5.9 Search Endpoints

#### GET /api/v1/search

```typescript
// Query params
interface SearchParams {
  q: string;           // Full-text query
  platform?: string;
  dateFrom?: string;   // ISO date
  dateTo?: string;
  hasMedia?: boolean;
  minLikes?: number;
  page?: number;
  pageSize?: number;
}

// Response 200
interface SearchResponse {
  data: SearchResult[];
  meta: {
    query: string;
    total: number;
    page: number;
    pageSize: number;
    took: number;  // ms
  };
}

interface SearchResult {
  id: string;
  text: string;
  textHighlight: string;  // With <mark> tags
  platform: 'twitter' | 'bluesky';
  createdAt: string;
  likes: number;
  retweets: number;
  url: string;
}
```

### 5.10 Audit Endpoints

#### GET /api/v1/audit

```typescript
// Query params
interface AuditParams {
  action?: string;          // e.g., 'cleanup.execute', 'credential.delete'
  userId?: number;
  correlationId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// Response 200
interface AuditResponse {
  data: AuditEntry[];
  meta: { page: number; pageSize: number; total: number };
}

interface AuditEntry {
  id: number;
  action: string;
  userId: number;
  username: string;
  details: Record<string, any>;
  reason?: string;
  correlationId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}
```

---

## 6. Page Blueprints

### 6.1 Blueprint Format

Each page blueprint includes:
- **Route**: URL path
- **Sections**: UI regions
- **Queries**: TanStack Query hooks (data fetching)
- **Mutations**: Data modification operations
- **Permissions**: Required RBAC permissions
- **DS Components**: Design System components used

### 6.2 Login Page (`/login`)

| Aspect | Details |
|--------|---------|
| **Sections** | Logo, LoginForm, ErrorAlert |
| **Queries** | None (unauthenticated) |
| **Mutations** | `useLoginMutation` |
| **Permissions** | Public |
| **DS Components** | Card, Input, Button, Checkbox, Alert |

```typescript
// Mutations
const loginMutation = useMutation({
  mutationFn: (data: LoginRequest) => apiClient.post('/api/v1/auth/login', data),
  onSuccess: () => router.push('/app'),
  onError: (error) => setError(error.message),
});
```

**States**: Default → Submitting (spinner) → Success (redirect) | Error (alert)

### 6.3 Dashboard Home (`/app`)

| Aspect | Details |
|--------|---------|
| **Sections** | SyncStatusCards, RecentActivity, QuickActions |
| **Queries** | `useSyncStats`, `useSyncHistory(limit: 5)` |
| **Mutations** | `useTriggerSync` |
| **Permissions** | `canViewDashboard` |
| **DS Components** | Card, Button, StatusBadge, Skeleton, DataTable |

### 6.4 Credentials List (`/app/credentials`)

| Aspect | Details |
|--------|---------|
| **Sections** | Header+AddButton, CredentialTable, EmptyState |
| **Queries** | `useCredentials`, `usePlatforms` |
| **Mutations** | `useDeleteCredential`, `useTestCredential` |
| **Permissions** | `canManageCredentials` |
| **DS Components** | DataTable, Button, IconButton, StatusBadge, Tag, Modal, EmptyState, Skeleton, Tooltip |

```typescript
// Queries
const { data: credentials, isLoading } = useQuery({
  queryKey: ['credentials'],
  queryFn: () => apiClient.get('/api/v1/credentials'),
});

// Mutations
const testMutation = useMutation({
  mutationFn: (id: number) => apiClient.post(`/api/v1/credentials/${id}/test`),
  onSuccess: () => queryClient.invalidateQueries(['credentials']),
});
```

### 6.5 Credential Create (`/app/credentials/new`)

| Aspect | Details |
|--------|---------|
| **Sections** | Header, PlatformSelector, CredentialForm |
| **Queries** | `usePlatforms` |
| **Mutations** | `useCreateCredential` |
| **Permissions** | `canManageCredentials` |
| **DS Components** | Card, Select, Input, Button, Alert |

### 6.6 Credential Edit (`/app/credentials/[id]`)

| Aspect | Details |
|--------|---------|
| **Sections** | Header, CredentialForm, TestSection, DeleteSection |
| **Queries** | `useCredential(id)`, `usePlatforms` |
| **Mutations** | `useUpdateCredential`, `useDeleteCredential`, `useTestCredential` |
| **Permissions** | `canManageCredentials` |
| **DS Components** | Card, Input, Button, StatusBadge, DangerConfirm, Alert |

### 6.7 Sync Dashboard (`/app/sync`)

| Aspect | Details |
|--------|---------|
| **Sections** | StatsCards, SyncNowButton, HistoryTable |
| **Queries** | `useSyncStats`, `useSyncHistory(page, pageSize)` |
| **Mutations** | `useTriggerSync` |
| **Permissions** | `canTriggerSync` |
| **DS Components** | Card, Button, DataTable, StatusBadge, Modal, Spinner |

### 6.8 Cleanup Rules List (`/app/cleanup`)

| Aspect | Details |
|--------|---------|
| **Sections** | Header+CreateButton, RulesGrid, HistoryTable |
| **Queries** | `useCleanupRules`, `useCleanupHistory` |
| **Mutations** | `useToggleRule`, `useDeleteRule` |
| **Permissions** | `canViewCleanup` |
| **DS Components** | Card, Button, Switch, StatusBadge, DataTable, EmptyState |

### 6.9 Cleanup Rule Detail (`/app/cleanup/[id]`)

| Aspect | Details |
|--------|---------|
| **Sections** | RuleConfig, PreviewSection, ExecuteSection, HistorySection |
| **Queries** | `useCleanupRule(id)`, `useCleanupPreview(id)` |
| **Mutations** | `useExecuteCleanup` (requires step-up) |
| **Permissions** | `canViewCleanup`, `canExecuteCleanup` (for execute) |
| **DS Components** | Card, Button, DataTable, DangerConfirm, Alert, Tag, Spinner |

**Execute Flow (Step-Up Auth)**:
```typescript
// Step 1: Get danger token
const confirmMutation = useMutation({
  mutationFn: (data: DangerConfirmRequest) =>
    apiClient.post('/api/v1/danger/confirm', data),
});

// Step 2: Execute with token
const executeMutation = useMutation({
  mutationFn: ({ id, token }: { id: number; token: string }) =>
    apiClient.post(`/api/v1/cleanup/execute/${id}`, {}, {
      headers: { 'X-Danger-Token': token }
    }),
});

// Combined flow
async function handleExecute(reason: string) {
  const { data } = await confirmMutation.mutateAsync({
    action: 'cleanup.execute',
    targetId: ruleId,
    confirmPhrase: `DELETE ${previewCount} TWEETS`,
    reason,
  });
  await executeMutation.mutateAsync({ id: ruleId, token: data.danger_token });
}
```

### 6.10 Scheduler (`/app/scheduler`)

| Aspect | Details |
|--------|---------|
| **Sections** | Composer, QueueTable, FilterTabs (pending/published/failed) |
| **Queries** | `useScheduledTweets(status)`, `useCredentials` |
| **Mutations** | `useScheduleTweet`, `useCancelTweet` |
| **Permissions** | `canManageScheduler` |
| **DS Components** | Card, Button, Input (textarea), Select, DataTable, Tag, Modal |

### 6.11 Analytics (`/app/analytics`)

| Aspect | Details |
|--------|---------|
| **Sections** | PeriodSelector, StatsCards, ActivityChart, TopTweetsTable |
| **Queries** | `useAnalyticsOverview(period)`, `useTopTweets(period)` |
| **Mutations** | None |
| **Permissions** | `canViewAnalytics` |
| **DS Components** | Card, Button (toggle group), DataTable, Skeleton |

**Chart**: Recharts LineChart for synced/deleted over time

### 6.12 Search (`/app/search`)

| Aspect | Details |
|--------|---------|
| **Sections** | SearchBar, FilterDrawer, ResultsList |
| **Queries** | `useSearch(query, filters)` |
| **Mutations** | `useBookmarkTweet` |
| **Permissions** | `canViewDashboard` |
| **DS Components** | Input, Button, Drawer, DataTable, Tag, Checkbox, EmptyState |

### 6.13 Bookmarks (`/app/bookmarks`)

| Aspect | Details |
|--------|---------|
| **Sections** | Header, BookmarksList, CollectionSidebar |
| **Queries** | `useBookmarks`, `useCollections` |
| **Mutations** | `useRemoveBookmark`, `useCreateCollection` |
| **Permissions** | `canViewDashboard` |
| **DS Components** | Card, DataTable, Button, Modal, EmptyState |

### 6.14 Reports (`/app/reports`)

| Aspect | Details |
|--------|---------|
| **Sections** | ReportBuilder, GeneratedReports |
| **Queries** | `useReports` |
| **Mutations** | `useGenerateReport`, `useExportReport` |
| **Permissions** | `canExportData` |
| **DS Components** | Card, Select, Button, DataTable, Spinner |

### 6.15 Tasks (`/app/tasks`)

| Aspect | Details |
|--------|---------|
| **Sections** | RunningTasks, TaskHistory |
| **Queries** | `useTasks(status)` |
| **Mutations** | `useCancelTask` |
| **Permissions** | `canViewDashboard` |
| **DS Components** | Card, DataTable, StatusBadge, Button, Spinner |

### 6.16 Audit Log (`/app/audit`)

| Aspect | Details |
|--------|---------|
| **Sections** | FilterBar, AuditTable |
| **Queries** | `useAuditLog(filters)` |
| **Mutations** | None |
| **Permissions** | `canViewAudit` |
| **DS Components** | DataTable, Input, Select, Tag, Drawer |

### 6.17 Admin Users (`/app/admin/users`)

| Aspect | Details |
|--------|---------|
| **Sections** | Header+InviteButton, UsersTable |
| **Queries** | `useUsers` |
| **Mutations** | `useInviteUser`, `useUpdateUserRole`, `useDeactivateUser` |
| **Permissions** | `canManageUsers` |
| **DS Components** | DataTable, Button, Modal, Select, StatusBadge, DangerConfirm |

---

## 7. Sprint Backlog

### 7.1 Sprint Overview

| Sprint | Weeks | Focus | Deliverables | Tests |
|--------|-------|-------|--------------|-------|
| 1 | 1-2 | Foundation + Auth | Next.js scaffold, DS v1, Login | 4 E2E |
| 2 | 3-4 | Credentials | CRUD credentials, test credential | 6 E2E |
| 3 | 5-6 | Sync Dashboard | Dashboard home, sync history, trigger | 3 E2E |
| 4 | 7-8 | Cleanup | Rules CRUD, preview, execute + step-up | 7 E2E |
| 5 | 9-10 | Scheduler | Schedule tweets, queue, cancel | 4 E2E |
| 6 | 11-12 | Analytics | Overview, charts, top tweets | 2 E2E |
| 7 | 13-14 | Search & Bookmarks | FTS search, collections | 2 E2E |
| 8 | 15-16 | Reports & Maintenance | Reports, tasks, audit | 3 E2E |
| 9 | 17-18 | Admin & Shutdown | User management, Flask cleanup | 2 E2E |

### 7.2 Sprint 1: Foundation + Auth

**Objective**: Next.js functional with login and Design System base.

| ID | Ticket | Owner | Est |
|----|--------|-------|-----|
| S1-01 | Create Next.js 14 project with App Router | FE | 2h |
| S1-02 | Configure TypeScript strict mode | FE | 1h |
| S1-03 | Setup styled-components with SSR | FE | 2h |
| S1-04 | Configure ESLint + Prettier | FE | 1h |
| S1-05 | Setup environment variables | FE | 1h |
| S1-06 | Create docker-compose.dev.yml | DevOps | 2h |
| S1-07 | Theme provider + design tokens | FE | 3h |
| S1-08 | Button component | FE | 2h |
| S1-09 | Input component | FE | 2h |
| S1-10 | Card component | FE | 1h |
| S1-11 | Modal component | FE | 2h |
| S1-12 | Alert/Toast component | FE | 2h |
| S1-13 | Loading spinner + skeleton | FE | 1h |
| S1-14 | App layout with sidebar | FE | 3h |
| S1-15 | Header with user menu | FE | 2h |
| S1-16 | Sidebar navigation | FE | 2h |
| S1-17 | Mobile responsive sidebar | FE | 2h |
| S1-18 | Login page UI | FE | 3h |
| S1-19 | API client (lib/api.ts) | FE | 2h |
| S1-20 | Login form submission | FE | 2h |
| S1-21 | Next.js middleware for auth | FE | 3h |
| S1-22 | Logout route | FE | 1h |
| S1-23 | useAuth hook | FE | 2h |
| S1-24 | BE: JWT token endpoint | BE | 3h |
| S1-25 | BE: /api/v1/auth/me endpoint | BE | 2h |
| S1-26 | Setup Playwright | QA | 2h |
| S1-27 | Test: login success | QA | 1h |
| S1-28 | Test: login invalid credentials | QA | 1h |
| S1-29 | Test: protected route redirect | QA | 1h |
| S1-30 | Test: logout | QA | 1h |
| S1-31 | Add Playwright to CI | DevOps | 2h |

**Sprint 1 DoD**:
- [ ] Next.js running on :3000
- [ ] 6+ DS components complete
- [ ] Login/Logout functional
- [ ] JWT auth with Flask
- [ ] 4/4 E2E tests passing

### 7.3 Sprint 2: Credentials

**Objective**: Complete credential management migrated.

| ID | Ticket | Owner | Est |
|----|--------|-------|-----|
| S2-01 | /app/credentials page | FE | 2h |
| S2-02 | CredentialCard component | FE | 2h |
| S2-03 | Fetch credentials from API | FE | 2h |
| S2-04 | Platform icons | FE | 1h |
| S2-05 | Credential status badges | FE | 2h |
| S2-06 | Empty state | FE | 1h |
| S2-07 | Loading skeleton | FE | 1h |
| S2-08 | Add Credential modal | FE | 2h |
| S2-09 | Platform selector | FE | 2h |
| S2-10 | Twitter credential form | FE | 3h |
| S2-11 | Bluesky credential form | FE | 2h |
| S2-12 | Form validation | FE | 2h |
| S2-13 | Submit credential | FE | 2h |
| S2-14 | Edit credential modal | FE | 3h |
| S2-15 | Delete confirmation modal | FE | 2h |
| S2-16 | Test credential button | FE | 1h |
| S2-17 | Test credential API call | FE | 2h |
| S2-18 | Test result display | FE | 2h |
| S2-19 | BE: GET /api/v1/platforms | BE | 3h |
| S2-20 | Test: view credentials list | QA | 1h |
| S2-21 | Test: add Twitter credential | QA | 2h |
| S2-22 | Test: add Bluesky credential | QA | 1h |
| S2-23 | Test: edit credential | QA | 1h |
| S2-24 | Test: delete credential | QA | 1h |
| S2-25 | Test: test credential | QA | 2h |

**Sprint 2 DoD**:
- [ ] /app/credentials complete
- [ ] Add/Edit/Delete flows
- [ ] Test credential functionality
- [ ] 6/6 E2E tests passing

### 7.4 Sprint 3: Sync Dashboard

| ID | Ticket | Owner | Est |
|----|--------|-------|-----|
| S3-01 | /app page (dashboard home) | FE | 2h |
| S3-02 | Sync status cards | FE | 3h |
| S3-03 | DataTable component | FE | 4h |
| S3-04 | Sync history table | FE | 3h |
| S3-05 | Sync statistics | FE | 2h |
| S3-06 | Fetch sync data | FE | 2h |
| S3-07 | Auto-refresh (30s) | FE | 2h |
| S3-08 | "Sync Now" button | FE | 1h |
| S3-09 | Sync confirmation modal | FE | 1h |
| S3-10 | Trigger sync API call | FE | 2h |
| S3-11 | Sync progress indicator | FE | 2h |
| S3-12 | Sync detail modal | FE | 2h |
| S3-13 | Test: view sync dashboard | QA | 1h |
| S3-14 | Test: view sync history | QA | 1h |
| S3-15 | Test: trigger manual sync | QA | 2h |

### 7.5 Sprint 4: Cleanup (Step-Up Auth)

| ID | Ticket | Owner | Est |
|----|--------|-------|-----|
| S4-01 | /app/cleanup page | FE | 2h |
| S4-02 | CleanupRuleCard component | FE | 3h |
| S4-03 | Fetch rules | FE | 2h |
| S4-04 | Rule enable/disable toggle | FE | 2h |
| S4-05 | Create rule wizard | FE | 4h |
| S4-06 | Rule type selector | FE | 2h |
| S4-07 | Age rule config | FE | 2h |
| S4-08 | Engagement rule config | FE | 2h |
| S4-09 | Pattern rule config | FE | 3h |
| S4-10 | Preview before save | FE | 2h |
| S4-11 | Submit rule | FE | 2h |
| S4-12 | Preview button | FE | 1h |
| S4-13 | Fetch preview | FE | 2h |
| S4-14 | Preview results display | FE | 3h |
| S4-15 | DangerConfirm component | FE | 4h |
| S4-16 | Typed confirmation input | FE | 2h |
| S4-17 | Reason field | FE | 1h |
| S4-18 | Execute cleanup API | FE | 2h |
| S4-19 | Show correlation ID | FE | 1h |
| S4-20 | BE: Validate step-up | BE | 3h |
| S4-21 | BE: Log to audit | BE | 2h |
| S4-22 | Cleanup history tab | FE | 2h |
| S4-23 | Test: view cleanup rules | QA | 1h |
| S4-24 | Test: create rule | QA | 2h |
| S4-25 | Test: preview cleanup | QA | 2h |
| S4-26 | Test: execute requires step-up | QA | 2h |
| S4-27 | Test: execute cancelled | QA | 1h |
| S4-28 | Test: execute success | QA | 2h |
| S4-29 | Test: view history | QA | 1h |

### 7.6 Sprints 5-9 (Summary)

**Sprint 5 - Scheduler**: 11 tickets, 4 E2E tests
**Sprint 6 - Analytics**: 8 tickets, 2 E2E tests
**Sprint 7 - Search & Bookmarks**: 10 tickets, 2 E2E tests
**Sprint 8 - Reports & Maintenance**: 10 tickets, 3 E2E tests
**Sprint 9 - Admin & Shutdown**: 8 tickets, 2 E2E tests, Flask cleanup

---

## 8. Migration & Cutover

### 8.1 Coexistence Routing

During migration, Nginx routes requests to Next.js or Flask:

```nginx
upstream nextjs { server 127.0.0.1:3000; }
upstream flask  { server 127.0.0.1:5000; }

server {
    listen 80;

    # Next.js (new dashboard)
    location / {
        proxy_pass http://nextjs;
    }

    # Flask API
    location /api/v1/ {
        proxy_pass http://flask;
    }

    # Flask legacy pages (during migration)
    location /legacy/ {
        proxy_pass http://flask;
    }
}
```

### 8.2 Migration Phases

| Phase | Next.js | Flask | Duration |
|-------|---------|-------|----------|
| **Phase 1** | `/login`, `/app` shell | All features at `/legacy/*` | Sprint 1 |
| **Phase 2** | Core features | Remaining at `/legacy/*` | Sprint 2-4 |
| **Phase 3** | All features | API only | Sprint 5-8 |
| **Phase 4** | Complete | API only, no templates | Sprint 9+ |

### 8.3 Feature Flag Strategy

```typescript
// lib/features.ts
export const FEATURES = {
  NEW_CREDENTIALS: true,     // Sprint 2
  NEW_SYNC: true,            // Sprint 3
  NEW_CLEANUP: true,         // Sprint 4
  NEW_SCHEDULER: true,       // Sprint 5
  NEW_ANALYTICS: true,       // Sprint 6
  NEW_SEARCH: false,         // Sprint 7 (pending)
  NEW_ADMIN: false,          // Sprint 9 (pending)
};

// Usage
{FEATURES.NEW_SEARCH ? <NewSearch /> : <LegacyLink href="/legacy/search" />}
```

### 8.4 Cutover Checklist

```markdown
## Pre-Cutover (Sprint 9)
- [ ] All 16 pages migrated
- [ ] 33+ E2E tests passing
- [ ] Performance: p95 < 200ms
- [ ] 7 days with 0 critical errors
- [ ] User acceptance testing complete

## Cutover Day
- [ ] Enable maintenance mode
- [ ] Update Nginx to remove /legacy/*
- [ ] Deploy final Next.js build
- [ ] Smoke test all critical paths
- [ ] Disable maintenance mode
- [ ] Monitor error rates for 2 hours

## Post-Cutover
- [ ] Remove Flask templates from repo
- [ ] Update documentation
- [ ] Archive legacy Flask dashboard code
- [ ] Celebrate! 🎉
```

---

## 9. Quality Assurance

### 9.1 "No Surprises" Principle

Every feature must follow:
1. **UI Gating**: Button/link disabled if user lacks permission
2. **Backend Enforcement**: API returns 403 if permission check fails
3. **Never Trust UI**: Backend validates all inputs regardless of UI state

```typescript
// ❌ WRONG: Trust UI state
<Button onClick={handleDelete}>Delete</Button>  // No permission check!

// ✅ CORRECT: Gate in UI + enforce in backend
{canExecuteCleanup && (
  <Button onClick={handleDelete}>Delete</Button>
)}

// Backend
@require_permission('canExecuteCleanup')  # Always validate!
def delete_cleanup_rule():
    ...
```

### 9.2 Anti-Hallucination Checklist

Before implementing any feature, verify:

| Check | Question | Source |
|-------|----------|--------|
| API Contract | Does the endpoint exist? | Section 5 |
| Permissions | What permission is required? | Section 2.4 |
| DS Components | Which components are specified? | Section 4.2 |
| Page Blueprint | What sections/queries/mutations? | Section 6 |
| Sprint | Is this feature in scope for current sprint? | Section 7 |

### 9.3 Testing Requirements

| Type | Requirement | Tool |
|------|-------------|------|
| Unit | All lib/ functions | Jest |
| Component | All DS components | React Testing Library |
| Integration | All API hooks | MSW + RTL |
| E2E | All critical paths | Playwright |

**E2E Coverage by Feature**:
| Feature | Min Tests | Critical Paths |
|---------|-----------|----------------|
| Auth | 4 | login, logout, protected redirect, remember me |
| Credentials | 6 | list, add, edit, delete, test, empty state |
| Sync | 3 | stats, history, trigger |
| Cleanup | 7 | list, create, preview, step-up required, execute, cancel, history |
| Scheduler | 4 | list, create, cancel, filter |
| Analytics | 2 | overview, top tweets |
| Search | 2 | search, filter |
| Admin | 3 | list, invite, deactivate |

### 9.4 Accessibility Requirements

- All interactive elements keyboard accessible
- ARIA labels on icon buttons
- Color contrast meets WCAG AA
- Focus management in modals
- Screen reader announcements for toasts

---

## 10. Appendices

### 10.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| JWT sync issues | Medium | High | Fallback to Flask sessions |
| Playwright flaky tests | High | Medium | Retry config, deterministic tests |
| Step-up UX confusion | Medium | High | User testing before deploy |
| Chart library issues | Low | Medium | Fallback to simple tables |
| Admin RBAC bugs | Low | Critical | Extra security review |
| Danger token race condition | Low | High | Token invalidation on use |

### 10.2 Glossary

| Term | Definition |
|------|------------|
| **Step-Up Auth** | Secondary confirmation for dangerous actions (typed phrase + reason + danger_token) |
| **Danger Token** | Single-use JWT issued after step-up confirmation, valid for 5 minutes |
| **Correlation ID** | UUID linking related actions across audit log entries |
| **Capabilities** | Platform-specific feature flags (what each platform can/cannot do) |
| **DS** | Design System |
| **E2E** | End-to-End (Playwright tests) |
| **FTS** | Full-Text Search (SQLite FTS5) |
| **RBAC** | Role-Based Access Control |

### 10.3 External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.x | Framework |
| typescript | 5.x | Type safety |
| styled-components | 6.x | Styling |
| @tanstack/react-query | 5.x | Data fetching |
| recharts | 2.x | Charts |
| @playwright/test | 1.x | E2E testing |
| jose | 5.x | JWT handling |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | Claude (Architect) | Initial consolidated specification |
| 1.1 | 2026-01-12 | Claude (Architect) | Added: folder structure, providers, RBAC, step-up flow with danger_token, detailed page blueprints, migration cutover, QA checklist |

---

*This specification is the single source of truth for the ChirpSyncer Next.js dashboard migration. All implementation must adhere to the patterns and contracts defined here.*

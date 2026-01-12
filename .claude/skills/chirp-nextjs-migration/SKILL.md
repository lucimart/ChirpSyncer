---
name: ChirpSyncer Next.js Migration
description: Flask to Next.js dashboard migration guide and patterns
category: migration
triggers:
  - Next.js development
  - dashboard migration
  - frontend architecture
  - React components
  - styled-components
  - App Router
  - server components
  - TanStack Query
  - provider
auto_trigger: false
dependencies:
  - docs/migration/CHIRP_NEXT_DASHBOARD_SPEC.md
  - docs/migration/STATUS.md
  - dashboard/
  - chirp-design-system.md
  - chirp-api-contracts.md
version: "1.2"
sprint_relevant: 10-13
---

# Skill: ChirpSyncer Next.js Dashboard Migration v1.1

Use this skill when planning or implementing the migration from Flask dashboard to Next.js.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Target | Next.js 14+ (App Router) |
| Styling | styled-components (SSR) |
| Data Fetching | TanStack Query v5 |
| Auth | JWT in HttpOnly cookie |
| Step-Up | danger_token for destructive ops |
| Testing | Playwright E2E |
| Duration | 9 sprints (18 weeks) |

## Migration Target

Replace Flask dashboard with:
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- styled-components
- Reusable Design System v1

## Current Flask → Target Next.js

```
Flask (Legacy)                    Next.js (Target)
─────────────────────────────────────────────────────
app/web/dashboard.py          →   dashboard/app/
templates/dashboard.html      →   app/page.tsx
templates/login.html          →   app/login/page.tsx
templates/credentials.html    →   app/credentials/page.tsx
templates/cleanup.html        →   app/cleanup/page.tsx
```

## Target Structure

```
apps/web/
├── app/
│   ├── layout.tsx                    # Root layout + providers
│   ├── page.tsx                      # Redirect to /dashboard
│   ├── (auth)/                       # Auth route group (no layout)
│   │   ├── login/page.tsx
│   │   └── logout/page.tsx
│   └── (dashboard)/                  # Protected route group
│       ├── layout.tsx                # Shell + sidebar + header
│       ├── page.tsx                  # Dashboard home
│       ├── credentials/
│       │   ├── page.tsx              # List
│       │   ├── new/page.tsx          # Create
│       │   └── [id]/page.tsx         # Edit
│       ├── sync/page.tsx             # Sync dashboard
│       ├── cleanup/
│       │   ├── page.tsx              # Rules list
│       │   ├── new/page.tsx          # Create rule
│       │   └── [id]/
│       │       ├── page.tsx          # Rule detail + preview
│       │       └── execute/page.tsx  # Execution confirm
│       ├── scheduler/page.tsx
│       ├── analytics/page.tsx
│       ├── search/page.tsx
│       ├── bookmarks/page.tsx
│       ├── reports/page.tsx
│       ├── tasks/page.tsx
│       ├── audit/page.tsx
│       └── admin/
│           ├── users/page.tsx
│           └── settings/page.tsx
├── components/
│   ├── ui/                           # Design System v1
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── DangerConfirm.tsx         # Step-up auth modal
│   │   ├── DataTable.tsx
│   │   └── index.ts                  # Barrel export
│   ├── layout/
│   │   ├── Shell.tsx                 # Main app shell
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── NavLink.tsx
│   └── features/                     # Feature-specific components
│       ├── credentials/
│       ├── cleanup/
│       ├── sync/
│       └── analytics/
├── lib/
│   ├── api.ts                        # API client with error handling
│   ├── auth.ts                       # Auth context + hooks
│   ├── permissions.ts                # RBAC utilities
│   └── hooks/
│       ├── useCredentials.ts         # TanStack Query hooks
│       ├── useCleanup.ts
│       ├── useSync.ts
│       └── useDangerConfirm.ts       # Step-up flow hook
├── providers/
│   ├── AppProviders.tsx              # Provider composition
│   ├── ThemeProvider.tsx
│   ├── QueryProvider.tsx             # TanStack Query
│   ├── AuthProvider.tsx
│   ├── ToastProvider.tsx
│   └── RealtimeProvider.tsx          # WebSocket (optional)
└── styles/
    └── globals.css
```

## Providers Setup

Provider order matters for context dependencies:

```typescript
// providers/AppProviders.tsx
'use client';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>              {/* 1. Theme (no deps) */}
      <QueryClientProvider>      {/* 2. TanStack Query */}
        <ToastProvider>          {/* 3. Toast */}
          <AuthProvider>         {/* 4. Auth (uses Query) */}
            <RealtimeProvider>   {/* 5. WebSocket (uses Auth) */}
              {children}
            </RealtimeProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// app/layout.tsx
import { AppProviders } from '@/providers/AppProviders';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

## Server vs Client Components

```typescript
// SERVER Components (default) - No 'use client'
// ✅ Use for: Data fetching, SEO, static content
// ❌ Cannot: useState, useEffect, event handlers, browser APIs

// CLIENT Components - Add 'use client'
// ✅ Use for: Interactivity, forms, state, effects
// ❌ Cannot: Direct DB access, server-only code

// Pattern: Server wrapper → Client island
// app/(dashboard)/credentials/page.tsx (Server)
export default async function CredentialsPage() {
  // Can prefetch data here if needed
  return <CredentialsList />;  // Client component
}

// components/features/credentials/CredentialsList.tsx (Client)
'use client';
export function CredentialsList() {
  const { data } = useCredentials();  // TanStack Query
  return <DataTable data={data} />;
}
```

## API Integration

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.error.code, error.error.message);
  }

  return response.json();
}
```

## Auth Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('chirp_token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token!, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/app/:path*']
};
```

## Step-Up Auth Pattern (Danger Token)

Destructive operations require a two-phase confirmation:

1. User types exact confirmation phrase + provides reason
2. Backend issues single-use `danger_token` (5 min expiry)
3. Token sent in `X-Danger-Token` header for actual operation

```typescript
// lib/hooks/useDangerConfirm.ts
export function useDangerConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DangerConfig | null>(null);

  const confirm = useCallback(async (cfg: DangerConfig) => {
    setConfig(cfg);
    setIsOpen(true);
    // Returns promise that resolves with danger_token or rejects
    return new Promise((resolve, reject) => {
      // ... modal handles resolution
    });
  }, []);

  return { isOpen, config, confirm, Modal: DangerConfirmModal };
}

// Usage in cleanup execution
const { confirm, Modal } = useDangerConfirm();

async function handleExecute() {
  try {
    const { danger_token } = await confirm({
      action: 'cleanup.execute',
      targetId: ruleId,
      confirmPhrase: `DELETE ${previewCount} TWEETS`,
      title: 'Confirm Cleanup Execution',
      description: `This will permanently delete ${previewCount} tweets.`
    });

    await executeCleanup(ruleId, { danger_token });
    toast.success('Cleanup started');
  } catch {
    // User cancelled or phrase mismatch
  }
}
```

```typescript
// components/ui/DangerConfirm.tsx
interface DangerConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { danger_token: string }) => void;
  action: string;
  targetId?: string;
  title: string;
  description: string;
  confirmPhrase: string;
  loading?: boolean;
}
```

## Migration Phases

### Phase 1: Foundation (Sprint 1)
- [ ] Next.js scaffold with TypeScript
- [ ] styled-components SSR
- [ ] Design System v1 primitives
- [ ] Auth flow (login/logout)
- [ ] Protected routes

### Phase 2: Core (Sprints 2-4)
- [ ] Credentials management
- [ ] Sync dashboard
- [ ] Cleanup with step-up auth

### Phase 3: Features (Sprints 5-7)
- [ ] Scheduler
- [ ] Analytics
- [ ] Search & Bookmarks

### Phase 4: Complete (Sprints 8-9)
- [ ] Reports & Tasks
- [ ] Admin
- [ ] Flask shutdown

## Coexistence & Cutover

### Nginx Config (Coexistence Phase)

```nginx
upstream nextjs { server 127.0.0.1:3000; }
upstream flask { server 127.0.0.1:5000; }

server {
    listen 80;

    # Next.js dashboard (new)
    location / {
        proxy_pass http://nextjs;
    }

    # API stays on Flask
    location /api/v1/ {
        proxy_pass http://flask;
    }

    # Legacy Flask dashboard (during migration)
    location /legacy/ {
        proxy_pass http://flask;
    }
}
```

### Feature Flags

```typescript
// lib/featureFlags.ts
export const features = {
  nextDashboard: env.NEXT_DASHBOARD_ENABLED === 'true',
  nextCredentials: env.NEXT_CREDENTIALS_ENABLED === 'true',
  nextCleanup: env.NEXT_CLEANUP_ENABLED === 'true',
  // ... per-screen flags
};

// Redirect to legacy if feature not ready
if (!features.nextCleanup) {
  redirect('/legacy/cleanup');
}
```

### Cutover Checklist

Before disabling Flask dashboard for each screen:

- [ ] All Flask functionality replicated in Next.js
- [ ] E2E tests passing (Playwright)
- [ ] Loading, error, empty states implemented
- [ ] Mobile responsive
- [ ] RBAC permissions enforced (UI + backend)
- [ ] Step-up auth working for destructive ops
- [ ] Audit logging verified
- [ ] Performance acceptable (< 3s initial load)
- [ ] Stakeholder sign-off

## Definition of Done per Screen

Each migrated screen must have:
- [ ] All Flask functionality replicated
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Mobile responsive
- [ ] Playwright E2E tests passing
- [ ] docs/migration/STATUS.md updated

## Key Documents

| Document | Purpose |
|----------|---------|
| `CHIRP_NEXT_DASHBOARD_SPEC.md` | Full specification |
| `STATUS.md` | Progress tracking |
| `P0_FLASK_TO_NEXT_MIGRATION.md` | Migration plan |
| `SPRINT_MIGRATION_BACKLOG.md` | Sprint tickets |

## Related Skills

- `chirp-design-system.md` - DS v1 components
- `chirp-api-contracts.md` - API specifications
- `chirp-testing.md` - E2E testing

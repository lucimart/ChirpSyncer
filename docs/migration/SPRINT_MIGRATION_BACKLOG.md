# Sprint Migration Backlog: Flask → Next.js

**Metodología**: Sprints de 2 semanas
**Objetivo**: Next.js como dashboard principal
**Criterio de éxito**: Flask solo sirve API al final

---

## Sprint 1: Foundation + Auth (Semanas 1-2)

### Epic: MIGR-001 - Next.js Foundation & Authentication

**Objetivo**: Next.js funcional con login, shell de navegación, y Design System base.

#### User Stories

##### US-001: Scaffold Next.js Project
**Como** desarrollador
**Quiero** un proyecto Next.js configurado correctamente
**Para** empezar la migración sobre una base sólida

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-001-01 | Create Next.js 14 project with App Router | FE | 2h | - |
| MIGR-001-02 | Configure TypeScript strict mode | FE | 1h | 01 |
| MIGR-001-03 | Setup styled-components with SSR | FE | 2h | 01 |
| MIGR-001-04 | Configure ESLint + Prettier | FE | 1h | 01 |
| MIGR-001-05 | Setup environment variables (.env.local) | FE | 1h | 01 |
| MIGR-001-06 | Create docker-compose.dev.yml | DevOps | 2h | 01 |

**Acceptance Criteria**:
- [ ] `npm run dev` starts Next.js on :3000
- [ ] TypeScript compiles without errors
- [ ] styled-components SSR works (no hydration mismatch)
- [ ] Can read FLASK_API_URL from env

---

##### US-002: Design System v1 (Minimal)
**Como** desarrollador
**Quiero** componentes UI base reutilizables
**Para** mantener consistencia visual y velocidad de desarrollo

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-001-07 | Create theme provider + tokens (colors, spacing, fonts) | FE | 3h | 03 |
| MIGR-001-08 | Button component (variants: primary, secondary, danger, ghost) | FE | 2h | 07 |
| MIGR-001-09 | Input component (text, password, with validation) | FE | 2h | 07 |
| MIGR-001-10 | Card component | FE | 1h | 07 |
| MIGR-001-11 | Modal component | FE | 2h | 07 |
| MIGR-001-12 | Alert/Toast component | FE | 2h | 07 |
| MIGR-001-13 | Loading spinner + skeleton | FE | 1h | 07 |
| MIGR-001-14 | Storybook setup (optional pero recomendado) | FE | 3h | 07-13 |

**Acceptance Criteria**:
- [ ] All components have TypeScript types
- [ ] Components are accessible (keyboard nav, aria)
- [ ] Dark mode ready (theme tokens)
- [ ] Storybook running with all components (if implemented)

---

##### US-003: Layout Shell
**Como** usuario
**Quiero** ver una estructura de navegación consistente
**Para** orientarme en la aplicación

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-001-15 | Create app layout with sidebar | FE | 3h | 07-13 |
| MIGR-001-16 | Header with user menu (placeholder) | FE | 2h | 15 |
| MIGR-001-17 | Sidebar navigation items (icons + labels) | FE | 2h | 15 |
| MIGR-001-18 | Mobile responsive sidebar (hamburger) | FE | 2h | 15-17 |
| MIGR-001-19 | Breadcrumb component | FE | 1h | 07 |

**Acceptance Criteria**:
- [ ] Layout renders on all /app/* routes
- [ ] Sidebar collapses on mobile
- [ ] Navigation items link to placeholder pages
- [ ] User menu shows "Login" if not authenticated

---

##### US-004: Authentication Flow
**Como** usuario
**Quiero** poder hacer login/logout
**Para** acceder a mis datos de forma segura

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-001-20 | Create /login page UI | FE | 3h | 08-09 |
| MIGR-001-21 | Create API client (lib/api.ts) | FE | 2h | 05 |
| MIGR-001-22 | Implement login form submission | FE | 2h | 20-21 |
| MIGR-001-23 | Create Next.js middleware for auth | FE | 3h | 22 |
| MIGR-001-24 | Create /logout route (clear cookie) | FE | 1h | 23 |
| MIGR-001-25 | Create useAuth hook | FE | 2h | 23 |
| MIGR-001-26 | BE: Add JWT token endpoint (if not exists) | BE | 3h | - |
| MIGR-001-27 | BE: Add /api/v1/auth/me endpoint | BE | 2h | 26 |
| MIGR-001-28 | Update Header to show user info | FE | 1h | 25 |

**Acceptance Criteria**:
- [ ] User can login with username/password
- [ ] Invalid credentials show error message
- [ ] After login, redirect to /app
- [ ] Protected routes redirect to /login if not authenticated
- [ ] Logout clears session and redirects to /login
- [ ] JWT stored in HttpOnly cookie

---

##### US-005: Playwright E2E Setup
**Como** QA
**Quiero** tests E2E automatizados
**Para** prevenir regresiones durante la migración

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-001-29 | Setup Playwright in dashboard/ | QA | 2h | 01 |
| MIGR-001-30 | Create auth fixtures (login helper) | QA | 2h | 29, 22 |
| MIGR-001-31 | Test: login success | QA | 1h | 30 |
| MIGR-001-32 | Test: login invalid credentials | QA | 1h | 30 |
| MIGR-001-33 | Test: protected route redirect | QA | 1h | 30 |
| MIGR-001-34 | Test: logout | QA | 1h | 30 |
| MIGR-001-35 | Add Playwright to CI | DevOps | 2h | 29-34 |

**Acceptance Criteria**:
- [ ] 4 auth tests passing
- [ ] Tests run in CI on every PR
- [ ] Test report uploaded on failure

---

### Sprint 1 DoD

```markdown
## Sprint 1 Definition of Done

### Deliverables
- [ ] Next.js project running on :3000
- [ ] Design System v1 with 6+ components
- [ ] Layout shell with sidebar + header
- [ ] Login/Logout functional
- [ ] JWT auth with Flask API
- [ ] 4 Playwright tests passing
- [ ] CI pipeline running E2E tests

### Metrics
- [ ] Next.js builds without errors
- [ ] 0 TypeScript errors
- [ ] 4/4 E2E tests passing
- [ ] Login latency < 500ms

### Documentation
- [ ] README updated with Next.js setup
- [ ] docs/migration/STATUS.md created
```

---

## Sprint 2: Credentials Management (Semanas 3-4)

### Epic: MIGR-002 - Credentials & Accounts

**Objetivo**: Gestión completa de credenciales en Next.js (seguridad primero).

#### User Stories

##### US-006: Credentials List Page
**Como** usuario
**Quiero** ver todas mis credenciales configuradas
**Para** saber qué cuentas tengo conectadas

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-002-01 | Create /app/credentials page | FE | 2h | Sprint 1 |
| MIGR-002-02 | Create CredentialCard component | FE | 2h | 01 |
| MIGR-002-03 | Fetch credentials from API | FE | 2h | 01 |
| MIGR-002-04 | Show platform icons (Twitter, Bluesky) | FE | 1h | 02 |
| MIGR-002-05 | Show credential status (active/error/testing) | FE | 2h | 02 |
| MIGR-002-06 | Empty state when no credentials | FE | 1h | 01 |
| MIGR-002-07 | Loading skeleton while fetching | FE | 1h | 01 |

**Acceptance Criteria**:
- [ ] Page shows all user credentials
- [ ] Each credential shows platform, type, status
- [ ] Passwords are NEVER shown (only *****)
- [ ] Empty state guides user to add credential

---

##### US-007: Add Credential Flow
**Como** usuario
**Quiero** añadir nuevas credenciales
**Para** conectar mis cuentas de Twitter/Bluesky

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-002-08 | Create Add Credential modal/page | FE | 2h | 06 |
| MIGR-002-09 | Platform selector (Twitter, Bluesky) | FE | 2h | 08 |
| MIGR-002-10 | Twitter credential form (scraping) | FE | 3h | 09 |
| MIGR-002-11 | Bluesky credential form | FE | 2h | 09 |
| MIGR-002-12 | Form validation (required fields, format) | FE | 2h | 10-11 |
| MIGR-002-13 | Submit credential to API | FE | 2h | 12 |
| MIGR-002-14 | Success/error feedback | FE | 1h | 13 |
| MIGR-002-15 | BE: GET /api/v1/platforms (capabilities) | BE | 3h | - |

**Acceptance Criteria**:
- [ ] User can add Twitter scraping credential
- [ ] User can add Bluesky credential
- [ ] Validation prevents invalid submissions
- [ ] Success redirects to credentials list
- [ ] Error shows clear message

---

##### US-008: Edit/Delete Credential
**Como** usuario
**Quiero** editar o eliminar mis credenciales
**Para** actualizar datos o remover cuentas

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-002-16 | Edit credential modal | FE | 3h | 10-11 |
| MIGR-002-17 | Pre-fill form with existing data (except passwords) | FE | 2h | 16 |
| MIGR-002-18 | Update credential via API | FE | 2h | 17 |
| MIGR-002-19 | Delete credential confirmation modal | FE | 2h | DS Modal |
| MIGR-002-20 | Delete credential via API | FE | 1h | 19 |
| MIGR-002-21 | Refresh list after edit/delete | FE | 1h | 18, 20 |

**Acceptance Criteria**:
- [ ] User can edit credential (except platform)
- [ ] Password fields show "unchanged" option
- [ ] Delete requires confirmation modal
- [ ] List updates after successful operation

---

##### US-009: Test Credential
**Como** usuario
**Quiero** probar si mis credenciales funcionan
**Para** verificar la conexión antes de usarlas

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-002-22 | Add "Test" button to CredentialCard | FE | 1h | 02 |
| MIGR-002-23 | Loading state during test | FE | 1h | 22 |
| MIGR-002-24 | Call /api/v1/credentials/:id/test | FE | 2h | 22 |
| MIGR-002-25 | Show test result (success/failure + details) | FE | 2h | 24 |
| MIGR-002-26 | Update credential status after test | FE | 1h | 25 |

**Acceptance Criteria**:
- [ ] Test button triggers API call
- [ ] Loading spinner during test
- [ ] Success shows green checkmark
- [ ] Failure shows error message
- [ ] Status badge updates

---

##### US-010: Credentials Playwright Tests
**Como** QA
**Quiero** tests E2E para credentials
**Para** asegurar que la migración no rompe nada

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-002-27 | Test: view credentials list | QA | 1h | 06 |
| MIGR-002-28 | Test: add Twitter credential | QA | 2h | 13 |
| MIGR-002-29 | Test: add Bluesky credential | QA | 1h | 13 |
| MIGR-002-30 | Test: edit credential | QA | 1h | 18 |
| MIGR-002-31 | Test: delete credential confirmation | QA | 1h | 20 |
| MIGR-002-32 | Test: test credential (mocked) | QA | 2h | 25 |

**Acceptance Criteria**:
- [ ] 6 credential tests passing
- [ ] Tests use API mocks for external calls

---

### Sprint 2 DoD

```markdown
## Sprint 2 Definition of Done

### Deliverables
- [ ] /app/credentials page complete
- [ ] Add/Edit/Delete credential flows
- [ ] Test credential functionality
- [ ] Platform capabilities endpoint
- [ ] 6 Playwright tests passing

### Metrics
- [ ] Credentials CRUD works end-to-end
- [ ] Passwords never exposed in UI
- [ ] 6/6 E2E tests passing

### Migration
- [ ] Flask /credentials → redirect /app/credentials
- [ ] docs/migration/STATUS.md updated
```

---

## Sprint 3: Sync Dashboard (Semanas 5-6)

### Epic: MIGR-003 - Sync Dashboard

**Objetivo**: Dashboard principal de sincronización migrado.

#### User Stories

##### US-011: Sync Overview Page
**Como** usuario
**Quiero** ver el estado de mis sincronizaciones
**Para** saber si todo está funcionando

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-003-01 | Create /app page (dashboard home) | FE | 2h | Sprint 2 |
| MIGR-003-02 | Sync status cards (last sync, next sync) | FE | 3h | 01 |
| MIGR-003-03 | Recent sync history table | FE | 3h | 01 |
| MIGR-003-04 | Sync statistics summary | FE | 2h | 01 |
| MIGR-003-05 | Create DataTable component | FE | 4h | DS |
| MIGR-003-06 | Fetch sync data from API | FE | 2h | 01 |
| MIGR-003-07 | Auto-refresh every 30s | FE | 2h | 06 |

**Acceptance Criteria**:
- [ ] Dashboard shows sync status
- [ ] History table with pagination
- [ ] Stats show tweets synced today/week/total
- [ ] Auto-refresh updates data

---

##### US-012: Manual Sync Trigger
**Como** usuario
**Quiero** forzar una sincronización manualmente
**Para** no esperar al siguiente ciclo automático

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-003-08 | Add "Sync Now" button | FE | 1h | 01 |
| MIGR-003-09 | Confirmation before sync | FE | 1h | 08 |
| MIGR-003-10 | Call /api/v1/sync/trigger | FE | 2h | 09 |
| MIGR-003-11 | Show sync progress (if available) | FE | 2h | 10 |
| MIGR-003-12 | Disable button during sync | FE | 1h | 10 |

**Acceptance Criteria**:
- [ ] User can trigger manual sync
- [ ] Button disabled during execution
- [ ] Feedback shows when complete

---

##### US-013: Sync History Detail
**Como** usuario
**Quiero** ver detalles de una sincronización específica
**Para** entender qué se sincronizó y si hubo errores

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-003-13 | Click on history row opens detail | FE | 2h | 03 |
| MIGR-003-14 | Show synced posts list | FE | 2h | 13 |
| MIGR-003-15 | Show errors if any | FE | 2h | 13 |
| MIGR-003-16 | Link to original tweet/post | FE | 1h | 14 |

**Acceptance Criteria**:
- [ ] Can view sync detail modal/page
- [ ] Shows list of synced items
- [ ] Errors displayed clearly

---

##### US-014: Sync Playwright Tests

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-003-17 | Test: view sync dashboard | QA | 1h | 06 |
| MIGR-003-18 | Test: view sync history | QA | 1h | 03 |
| MIGR-003-19 | Test: trigger manual sync | QA | 2h | 12 |

---

### Sprint 3 DoD

```markdown
## Sprint 3 Definition of Done

### Deliverables
- [ ] /app (dashboard home) complete
- [ ] Sync history with detail view
- [ ] Manual sync trigger
- [ ] 3 Playwright tests passing

### Migration
- [ ] Flask / → redirect /app
- [ ] Flask /sync → redirect /app
```

---

## Sprint 4: Cleanup Engine (Semanas 7-8)

### Epic: MIGR-004 - Cleanup (Dangerous Actions)

**Objetivo**: Migrar cleanup con step-up authentication correctamente implementado.

#### User Stories

##### US-015: Cleanup Rules List
**Como** usuario
**Quiero** ver mis reglas de limpieza
**Para** gestionar qué tweets se eliminan automáticamente

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-004-01 | Create /app/cleanup page | FE | 2h | Sprint 3 |
| MIGR-004-02 | CleanupRuleCard component | FE | 3h | 01 |
| MIGR-004-03 | Fetch rules from API | FE | 2h | 01 |
| MIGR-004-04 | Rule status toggle (enable/disable) | FE | 2h | 02 |
| MIGR-004-05 | Empty state | FE | 1h | 01 |

---

##### US-016: Create/Edit Cleanup Rule
**Como** usuario
**Quiero** crear y editar reglas de limpieza
**Para** personalizar qué tweets borrar

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-004-06 | Create rule wizard/form | FE | 4h | 01 |
| MIGR-004-07 | Rule type selector (age, engagement, pattern) | FE | 2h | 06 |
| MIGR-004-08 | Age rule configuration | FE | 2h | 07 |
| MIGR-004-09 | Engagement rule configuration | FE | 2h | 07 |
| MIGR-004-10 | Pattern rule configuration (regex) | FE | 3h | 07 |
| MIGR-004-11 | Preview before save | FE | 2h | 08-10 |
| MIGR-004-12 | Submit rule to API | FE | 2h | 11 |

---

##### US-017: Preview Cleanup (Critical)
**Como** usuario
**Quiero** ver qué tweets serían eliminados antes de ejecutar
**Para** evitar borrar algo importante por error

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-004-13 | Add "Preview" button to rule card | FE | 1h | 02 |
| MIGR-004-14 | Fetch preview from /api/v1/cleanup/preview/:id | FE | 2h | 13 |
| MIGR-004-15 | Display preview results (tweets to delete) | FE | 3h | 14 |
| MIGR-004-16 | Show tweet content, date, engagement | FE | 2h | 15 |
| MIGR-004-17 | "This will delete X tweets" warning | FE | 1h | 15 |

---

##### US-018: Execute Cleanup (STEP-UP AUTH)
**Como** usuario
**Quiero** ejecutar la limpieza con confirmación extra
**Para** evitar acciones destructivas accidentales

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-004-18 | Create StepUpAuthModal component | FE | 4h | DS Modal |
| MIGR-004-19 | Typed confirmation phrase input | FE | 2h | 18 |
| MIGR-004-20 | Reason text field (required) | FE | 1h | 18 |
| MIGR-004-21 | Disable confirm until phrase matches | FE | 1h | 19 |
| MIGR-004-22 | Call /api/v1/cleanup/execute with step-up payload | FE | 2h | 21 |
| MIGR-004-23 | Show correlation_id in success message | FE | 1h | 22 |
| MIGR-004-24 | BE: Validate step-up in execute endpoint | BE | 3h | - |
| MIGR-004-25 | BE: Log step-up action to audit | BE | 2h | 24 |

**Step-Up Modal UX**:
```
┌─────────────────────────────────────────────┐
│  ⚠️ Confirm Deletion                        │
├─────────────────────────────────────────────┤
│                                             │
│  This will permanently delete 47 tweets.    │
│  This action cannot be undone.              │
│                                             │
│  Type "DELETE 47 TWEETS" to confirm:        │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Reason for deletion (required):            │
│  ┌─────────────────────────────────────┐   │
│  │ Cleaning up old promotional tweets  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────┐  ┌────────────────────────┐   │
│  │ Cancel  │  │ Confirm Deletion [❌]  │   │
│  └─────────┘  └────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

##### US-019: Cleanup History
**Como** usuario
**Quiero** ver el historial de limpiezas ejecutadas
**Para** auditar qué se ha borrado

**Tickets**:

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-004-26 | Cleanup history tab/section | FE | 2h | 01 |
| MIGR-004-27 | Fetch history from API | FE | 2h | 26 |
| MIGR-004-28 | Show execution details (date, count, dry_run) | FE | 2h | 27 |
| MIGR-004-29 | Show correlation_id for audit | FE | 1h | 28 |

---

##### US-020: Cleanup Playwright Tests (Critical)

| ID | Ticket | Owner | Estimate | Dependencias |
|----|--------|-------|----------|--------------|
| MIGR-004-30 | Test: view cleanup rules | QA | 1h | 05 |
| MIGR-004-31 | Test: create cleanup rule | QA | 2h | 12 |
| MIGR-004-32 | Test: preview cleanup | QA | 2h | 17 |
| MIGR-004-33 | Test: execute requires step-up confirmation | QA | 2h | 23 |
| MIGR-004-34 | Test: execute cancelled | QA | 1h | 23 |
| MIGR-004-35 | Test: execute success | QA | 2h | 23 |
| MIGR-004-36 | Test: view cleanup history | QA | 1h | 29 |

---

### Sprint 4 DoD

```markdown
## Sprint 4 Definition of Done

### Deliverables
- [ ] /app/cleanup page complete
- [ ] CRUD cleanup rules
- [ ] Preview functionality
- [ ] Step-up auth for execute
- [ ] History view
- [ ] 7 Playwright tests passing

### Security
- [ ] Step-up auth validated in backend
- [ ] Correlation ID in audit log
- [ ] Reason logged for all executions

### Migration
- [ ] Flask /cleanup → redirect /app/cleanup
```

---

## Sprint 5: Scheduler (Semanas 9-10)

### Epic: MIGR-005 - Tweet Scheduler

**Objetivo**: Programación de tweets migrada.

#### Tickets Summary

| ID | Ticket | Owner | Estimate |
|----|--------|-------|----------|
| MIGR-005-01 | /app/scheduler page | FE | 2h |
| MIGR-005-02 | Scheduled tweets queue view | FE | 3h |
| MIGR-005-03 | Schedule new tweet form | FE | 4h |
| MIGR-005-04 | DateTime picker component | FE | 3h |
| MIGR-005-05 | Edit scheduled tweet | FE | 2h |
| MIGR-005-06 | Cancel scheduled tweet | FE | 2h |
| MIGR-005-07 | Post history (published) | FE | 2h |
| MIGR-005-08 | Test: schedule tweet | QA | 2h |
| MIGR-005-09 | Test: edit scheduled | QA | 1h |
| MIGR-005-10 | Test: cancel scheduled | QA | 1h |
| MIGR-005-11 | Test: view queue | QA | 1h |

### Sprint 5 DoD
- [ ] Scheduler fully migrated
- [ ] 4 Playwright tests passing

---

## Sprint 6: Analytics (Semanas 11-12)

### Epic: MIGR-006 - Analytics Dashboard

#### Tickets Summary

| ID | Ticket | Owner | Estimate |
|----|--------|-------|----------|
| MIGR-006-01 | /app/analytics page | FE | 2h |
| MIGR-006-02 | Overview stats cards | FE | 3h |
| MIGR-006-03 | Engagement chart (Chart.js/Recharts) | FE | 4h |
| MIGR-006-04 | Top tweets section | FE | 3h |
| MIGR-006-05 | Period selector (24h, 7d, 30d) | FE | 2h |
| MIGR-006-06 | Export data button | FE | 2h |
| MIGR-006-07 | Test: view analytics | QA | 1h |
| MIGR-006-08 | Test: change period | QA | 1h |

### Sprint 6 DoD
- [ ] Analytics fully migrated
- [ ] 2 Playwright tests passing

---

## Sprint 7: Search & Bookmarks (Semanas 13-14)

### Epic: MIGR-007 - Search & Saved Content

#### Tickets Summary

| ID | Ticket | Owner | Estimate |
|----|--------|-------|----------|
| MIGR-007-01 | /app/search page | FE | 2h |
| MIGR-007-02 | Search input with filters | FE | 3h |
| MIGR-007-03 | Search results display | FE | 3h |
| MIGR-007-04 | Filter panel (date, hashtag, engagement) | FE | 4h |
| MIGR-007-05 | /app/bookmarks page | FE | 2h |
| MIGR-007-06 | Saved tweets list | FE | 2h |
| MIGR-007-07 | Collections management | FE | 3h |
| MIGR-007-08 | Save tweet to collection | FE | 2h |
| MIGR-007-09 | Test: search basic | QA | 1h |
| MIGR-007-10 | Test: save bookmark | QA | 1h |

### Sprint 7 DoD
- [ ] Search & Bookmarks migrated
- [ ] 2 Playwright tests passing

---

## Sprint 8: Reports & Maintenance (Semanas 15-16)

### Epic: MIGR-008 - Reports, Tasks, Audit

#### Tickets Summary

| ID | Ticket | Owner | Estimate |
|----|--------|-------|----------|
| MIGR-008-01 | /app/reports page | FE | 2h |
| MIGR-008-02 | Report type selector | FE | 2h |
| MIGR-008-03 | Generate report flow | FE | 3h |
| MIGR-008-04 | Download report (PDF/CSV/JSON) | FE | 2h |
| MIGR-008-05 | /app/tasks page | FE | 2h |
| MIGR-008-06 | Task list with status | FE | 2h |
| MIGR-008-07 | Trigger task manually | FE | 2h |
| MIGR-008-08 | /app/audit page | FE | 2h |
| MIGR-008-09 | Audit log table with filters | FE | 3h |
| MIGR-008-10 | Correlation ID search | FE | 2h |

### Sprint 8 DoD
- [ ] Reports, Tasks, Audit migrated
- [ ] All admin-lite features complete

---

## Sprint 9: Admin & Flask Deprecation (Semanas 17-18)

### Epic: MIGR-009 - Admin & Flask Shutdown

#### Tickets Summary

| ID | Ticket | Owner | Estimate |
|----|--------|-------|----------|
| MIGR-009-01 | /app/admin/users page | FE | 3h |
| MIGR-009-02 | User management CRUD | FE | 4h |
| MIGR-009-03 | Role assignment UI | FE | 2h |
| MIGR-009-04 | Remove Flask templates | BE | 2h |
| MIGR-009-05 | Flask only serves /api/v1/* | BE | 3h |
| MIGR-009-06 | Update deployment docs | DevOps | 2h |
| MIGR-009-07 | Final E2E regression suite | QA | 4h |
| MIGR-009-08 | Performance benchmark | QA | 2h |

### Sprint 9 DoD (MIGRATION COMPLETE)

```markdown
## Migration Complete Checklist

### Pages Migrated (All)
- [x] Login/Auth
- [x] Credentials
- [x] Sync Dashboard
- [x] Cleanup
- [x] Scheduler
- [x] Analytics
- [x] Search
- [x] Bookmarks
- [x] Reports
- [x] Tasks/Maintenance
- [x] Audit
- [x] Admin/Users

### Tests Passing
- [x] 30+ Playwright E2E tests
- [x] All critical flows covered

### Flask Status
- [x] Only serves /api/v1/*
- [x] Templates removed
- [x] No /legacy routes remaining

### Documentation
- [x] Migration complete announcement
- [x] Updated README
- [x] Deprecated Flask UI docs removed
```

---

## Timeline Summary

| Sprint | Semanas | Focus | Key Deliverable |
|--------|---------|-------|-----------------|
| 1 | 1-2 | Foundation + Auth | Next.js funcional con login |
| 2 | 3-4 | Credentials | Seguridad migrada |
| 3 | 5-6 | Sync | Core del producto migrado |
| 4 | 7-8 | Cleanup | Step-up auth implementado |
| 5 | 9-10 | Scheduler | Features populares |
| 6 | 11-12 | Analytics | Dashboards migrados |
| 7 | 13-14 | Search/Bookmarks | Features secundarias |
| 8 | 15-16 | Reports/Tasks | Admin features |
| 9 | 17-18 | Admin + Shutdown | 🎉 **FLASK OFF** |

**Total: 18 semanas (~4.5 meses)**

---

## Risk Register

| Risk | Sprint | Mitigation |
|------|--------|------------|
| JWT sync issues | 1 | Fallback to Flask sessions |
| Playwright flaky | 1+ | Retry config, deterministic tests |
| Step-up UX confusa | 4 | User testing antes de deploy |
| Chart library issues | 6 | Fallback to simple tables |
| Admin RBAC bugs | 9 | Extra security review |

---

## Next Steps

1. **Crear repositorio** `dashboard/` en el proyecto
2. **Sprint 1 kickoff** - Setup Next.js
3. **Weekly sync** - Review progreso de migración

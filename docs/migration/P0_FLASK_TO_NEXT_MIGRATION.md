# P0: Flask → Next.js Migration Plan

**Objetivo**: Next.js como dashboard principal lo antes posible, minimizando regresiones.

**Principio rector**: Migrar por valor + riesgo, no por complejidad técnica.

---

## 1. Estrategia de Coexistencia

### 1.1 Arquitectura Durante Migración

```
                    ┌─────────────────────────────────────┐
                    │         Nginx Reverse Proxy          │
                    │         (puerto 80/443)              │
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

### 1.2 Routing Strategy

| Path Pattern | Destino | Fase |
|--------------|---------|------|
| `/` | Next.js | Sprint 1 |
| `/login`, `/logout`, `/register` | Next.js | Sprint 1 |
| `/app/*` | Next.js (todas las páginas migradas) | Sprint 1+ |
| `/api/v1/*` | Flask (API REST) | Permanente hasta FastAPI |
| `/legacy/*` | Flask (páginas no migradas) | Temporal |
| `/ws/*` | Next.js/Flask (WebSocket) | P1 |

### 1.3 Configuración Nginx

```nginx
# /etc/nginx/sites-available/chirpsyncer
upstream nextjs {
    server 127.0.0.1:3000;
}

upstream flask {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name chirpsyncer.local;

    # Next.js - Primary (migrated pages)
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Flask API - Always proxied
    location /api/v1/ {
        proxy_pass http://flask;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Legacy Flask pages (shrinks over time)
    location /legacy/ {
        proxy_pass http://flask;
        proxy_set_header Host $host;
    }
}
```

### 1.4 Auth Strategy (Shared Sessions)

**Problema**: Next.js y Flask necesitan compartir sesión durante coexistencia.

**Solución**: JWT tokens en cookie HttpOnly

```
┌──────────┐     POST /api/v1/auth/login      ┌──────────┐
│  Next.js │ ──────────────────────────────►  │  Flask   │
│  Client  │                                  │   API    │
│          │  ◄────────────────────────────── │          │
└──────────┘     Set-Cookie: token=JWT        └──────────┘
                 HttpOnly; Secure; SameSite
```

**Implementación**:

1. Flask genera JWT con claims: `{user_id, roles, exp}`
2. Cookie compartida entre dominios (SameSite=Lax)
3. Next.js middleware valida JWT en cada request
4. Flask API valida mismo JWT

```python
# Flask: app/auth/jwt_handler.py (NUEVO)
import jwt
from datetime import datetime, timedelta

def create_token(user_id: int, roles: list) -> str:
    payload = {
        "user_id": user_id,
        "roles": roles,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def validate_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
```

```typescript
// Next.js: middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('chirp_token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    // Add user info to headers for pages
    const response = NextResponse.next();
    response.headers.set('x-user-id', String(payload.user_id));
    response.headers.set('x-user-roles', JSON.stringify(payload.roles));
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/app/:path*']
};
```

### 1.5 Deployment Strategy

**Fase 1: Development**
```yaml
# docker-compose.dev.yml
services:
  nextjs:
    build: ./dashboard
    ports:
      - "3000:3000"
    environment:
      - FLASK_API_URL=http://flask:5000
    volumes:
      - ./dashboard:/app

  flask:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./app:/app/app
      - ./chirpsyncer.db:/app/chirpsyncer.db
```

**Fase 2: Production**
```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - nextjs
      - flask

  nextjs:
    build:
      context: ./dashboard
      dockerfile: Dockerfile.prod
    expose:
      - "3000"

  flask:
    build: .
    expose:
      - "5000"
```

---

## 2. Orden de Migración de Pantallas

### 2.1 Matriz Valor × Riesgo

| Pantalla | Valor | Riesgo | Prioridad | Sprint |
|----------|-------|--------|-----------|--------|
| Login/Auth | 🔴 Crítico | 🟢 Bajo | P0 | 1 |
| Credentials | 🔴 Crítico | 🟡 Medio | P0 | 2 |
| Sync Dashboard | 🔴 Crítico | 🟢 Bajo | P0 | 3 |
| Cleanup | 🟡 Alto | 🔴 Alto | P0 | 4 |
| Scheduler | 🟡 Alto | 🟡 Medio | P0 | 5 |
| Analytics | 🟡 Alto | 🟢 Bajo | P0 | 6 |
| Search | 🟢 Medio | 🟢 Bajo | P0 | 7 |
| Bookmarks | 🟢 Medio | 🟢 Bajo | P0 | 7 |
| Reports | 🟢 Medio | 🟡 Medio | P0 | 8 |
| Maintenance | 🟢 Bajo | 🟢 Bajo | P0 | 8 |
| Audit Log | 🟢 Bajo | 🟢 Bajo | P0 | 8 |
| Admin/Users | 🟡 Alto | 🟡 Medio | P0 | 9 |

### 2.2 Justificación del Orden

1. **Login/Auth (Sprint 1)**: Gate de entrada. Sin esto no hay migración.
2. **Credentials (Sprint 2)**: Seguridad primero. Es lo que usuarios configuran día 1.
3. **Sync Dashboard (Sprint 3)**: Core del producto. Lo que usuarios ven diariamente.
4. **Cleanup (Sprint 4)**: Acciones peligrosas = step-up auth. Alto riesgo pero alto valor.
5. **Scheduler (Sprint 5)**: Feature popular, moderado riesgo.
6. **Analytics (Sprint 6)**: Read-only, bajo riesgo, buen valor.
7. **Search/Bookmarks (Sprint 7)**: Features complementarias.
8. **Reports/Maintenance/Audit (Sprint 8)**: Lower priority features.
9. **Admin/Users (Sprint 9)**: Admin-only, puede quedarse en Flask más tiempo.

---

## 3. Definition of Done por Pantalla

### 3.1 Template DoD

Cada pantalla migrada debe cumplir:

```markdown
## DoD: [Nombre Pantalla]

### Funcionalidad
- [ ] Todas las acciones del usuario funcionan igual que en Flask
- [ ] Mensajes de error claros y en español
- [ ] Estados de carga (loading states) implementados
- [ ] Estados vacíos (empty states) implementados

### UI/UX
- [ ] Responsive (mobile + desktop)
- [ ] Usa componentes del Design System
- [ ] Accesibilidad básica (keyboard nav, aria-labels)
- [ ] Dark mode ready (opcional en P0)

### Integración
- [ ] Llama a Flask API correctamente
- [ ] Maneja errores de API (4xx, 5xx, timeout)
- [ ] Auth/RBAC funciona correctamente
- [ ] Audit log registra acciones (si aplica)

### Testing
- [ ] Test E2E Playwright para happy path
- [ ] Test E2E para error cases críticos
- [ ] Tests pasan en CI

### Documentación
- [ ] Ruta Flask legacy redirige a Next.js
- [ ] Actualizado docs/migration/STATUS.md
```

### 3.2 DoD Específicos

#### Login/Auth
```markdown
## DoD: Login/Auth

### Funcionalidad
- [ ] Login con username/email + password
- [ ] Logout limpia sesión y cookie
- [ ] Registro de nuevo usuario (si habilitado)
- [ ] Redirect a /app después de login
- [ ] Redirect a /login si no autenticado
- [ ] "Recordar sesión" funciona (7 días)

### Específico
- [ ] Rate limiting visual (X intentos restantes)
- [ ] Validación de password en frontend
- [ ] CSRF token en forms

### Tests Playwright
- [ ] test_login_success
- [ ] test_login_invalid_credentials
- [ ] test_logout
- [ ] test_protected_route_redirect
```

#### Credentials
```markdown
## DoD: Credentials

### Funcionalidad
- [ ] Listar credenciales del usuario
- [ ] Añadir credencial Twitter (scraping)
- [ ] Añadir credencial Bluesky
- [ ] Editar credencial existente
- [ ] Eliminar credencial (con confirmación)
- [ ] Test de credencial (verificar login)
- [ ] Indicador visual de estado (activa/inactiva/error)

### Específico
- [ ] Passwords nunca visibles en UI (solo *****)
- [ ] Form validation antes de submit
- [ ] Feedback visual durante test de credencial

### Tests Playwright
- [ ] test_add_twitter_credential
- [ ] test_add_bluesky_credential
- [ ] test_edit_credential
- [ ] test_delete_credential_confirmation
- [ ] test_test_credential_success
- [ ] test_test_credential_failure
```

#### Cleanup
```markdown
## DoD: Cleanup

### Funcionalidad
- [ ] Listar reglas de cleanup
- [ ] Crear regla (age, engagement, pattern)
- [ ] Editar regla
- [ ] Eliminar regla
- [ ] Preview cleanup (ver qué se borraría)
- [ ] Ejecutar cleanup (dry-run disponible)
- [ ] Ver historial de ejecuciones

### Específico (STEP-UP AUTH)
- [ ] Ejecutar cleanup requiere typed confirmation
- [ ] Modal con: "Type DELETE X TWEETS to confirm"
- [ ] Campo "Reason" obligatorio
- [ ] Correlation ID visible para audit
- [ ] Confirmación visual después de ejecución

### Tests Playwright
- [ ] test_create_cleanup_rule
- [ ] test_preview_cleanup
- [ ] test_execute_cleanup_requires_confirmation
- [ ] test_execute_cleanup_cancelled
- [ ] test_execute_cleanup_success
- [ ] test_cleanup_history
```

---

## 4. Plan de Testing

### 4.1 Estrategia E2E

```
tests/
└── e2e/
    └── playwright/
        ├── fixtures/
        │   ├── auth.ts           # Login helpers
        │   ├── test-data.ts      # Seed data
        │   └── api-mocks.ts      # API mocking
        ├── pages/
        │   ├── login.spec.ts
        │   ├── credentials.spec.ts
        │   ├── sync.spec.ts
        │   ├── cleanup.spec.ts
        │   ├── scheduler.spec.ts
        │   ├── analytics.spec.ts
        │   └── ...
        └── playwright.config.ts
```

### 4.2 Test Mínimo por Pantalla

| Pantalla | Tests Mínimos | Críticos |
|----------|---------------|----------|
| Login | 4 | login_success, protected_redirect |
| Credentials | 6 | add_credential, delete_confirmation |
| Sync | 3 | view_history, trigger_sync |
| Cleanup | 6 | preview, execute_confirmation |
| Scheduler | 4 | schedule_tweet, cancel_scheduled |
| Analytics | 2 | view_overview, view_top_tweets |
| Search | 2 | search_basic, search_filters |
| Bookmarks | 3 | save_tweet, create_collection |

### 4.3 CI Pipeline

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
    paths:
      - 'dashboard/**'
  pull_request:
    paths:
      - 'dashboard/**'

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: dashboard
        run: npm ci

      - name: Install Playwright
        working-directory: dashboard
        run: npx playwright install --with-deps

      - name: Start Flask API
        run: |
          pip install -r requirements.txt
          python -m app.web.dashboard &
          sleep 5

      - name: Start Next.js
        working-directory: dashboard
        run: |
          npm run build
          npm start &
          sleep 5

      - name: Run Playwright tests
        working-directory: dashboard
        run: npx playwright test

      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: dashboard/playwright-report/
```

### 4.4 Playwright Config

```typescript
// dashboard/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

## 5. Plan de Roll-out

### 5.1 Feature Flags (Opcional pero Recomendado)

```typescript
// lib/feature-flags.ts
export const FLAGS = {
  // Pantallas migradas
  USE_NEXT_LOGIN: true,        // Sprint 1
  USE_NEXT_CREDENTIALS: false, // Sprint 2
  USE_NEXT_SYNC: false,        // Sprint 3
  USE_NEXT_CLEANUP: false,     // Sprint 4
  // ...

  // Features nuevas (P1/P2)
  ENABLE_WEBSOCKET: false,
  ENABLE_ML_SCHEDULING: false,
};

// Uso en componentes
const SyncPage = () => {
  if (!FLAGS.USE_NEXT_SYNC) {
    redirect('/legacy/sync');
  }
  return <SyncDashboard />;
};
```

### 5.2 Estrategia de Roll-out

```
Sprint 1 Complete:
├── FLAGS.USE_NEXT_LOGIN = true
├── Flask /login → redirect /login (Next)
└── Users can login via Next.js

Sprint 2 Complete:
├── FLAGS.USE_NEXT_CREDENTIALS = true
├── Flask /credentials → redirect /app/credentials (Next)
└── 10% users get Next.js credentials (canary)
    └── Monitor errors, feedback
└── 100% users after 48h sin issues

Sprint N Complete:
├── All flags = true
├── Flask legacy routes return 301 → Next
└── Flask dashboard templates removed
└── Flask solo sirve API
```

### 5.3 Rollback Plan

```bash
# Si algo falla después de habilitar una pantalla:

# 1. Revertir flag
FLAGS.USE_NEXT_[SCREEN] = false

# 2. Nginx redirige a Flask
location /app/[screen] {
    return 302 /legacy/[screen];
}

# 3. Investigar y fix en Next.js

# 4. Re-deploy con flag = true
```

---

## 6. Lista de Endpoints API

### 6.1 Endpoints Existentes (Flask)

| Endpoint | Método | Usado por | Prioridad |
|----------|--------|-----------|-----------|
| `/api/v1/auth/login` | POST | Login | P0-Sprint1 |
| `/api/v1/auth/logout` | POST | Logout | P0-Sprint1 |
| `/api/v1/auth/register` | POST | Register | P0-Sprint1 |
| `/api/v1/auth/me` | GET | Session check | P0-Sprint1 |
| `/api/v1/credentials` | GET | List credentials | P0-Sprint2 |
| `/api/v1/credentials` | POST | Add credential | P0-Sprint2 |
| `/api/v1/credentials/:id` | PUT | Edit credential | P0-Sprint2 |
| `/api/v1/credentials/:id` | DELETE | Delete credential | P0-Sprint2 |
| `/api/v1/credentials/:id/test` | POST | Test credential | P0-Sprint2 |
| `/api/v1/sync/history` | GET | Sync history | P0-Sprint3 |
| `/api/v1/sync/trigger` | POST | Manual sync | P0-Sprint3 |
| `/api/v1/sync/stats` | GET | Sync statistics | P0-Sprint3 |
| `/api/v1/cleanup/rules` | GET/POST | Cleanup rules | P0-Sprint4 |
| `/api/v1/cleanup/rules/:id` | PUT/DELETE | Edit/delete rule | P0-Sprint4 |
| `/api/v1/cleanup/preview/:id` | GET | Preview cleanup | P0-Sprint4 |
| `/api/v1/cleanup/execute/:id` | POST | Execute cleanup | P0-Sprint4 |
| `/api/v1/cleanup/history` | GET | Cleanup history | P0-Sprint4 |
| `/api/v1/scheduler/tweets` | GET/POST | Scheduled tweets | P0-Sprint5 |
| `/api/v1/scheduler/tweets/:id` | PUT/DELETE | Edit/cancel | P0-Sprint5 |
| `/api/v1/analytics/overview` | GET | Analytics | P0-Sprint6 |
| `/api/v1/analytics/top-tweets` | GET | Top tweets | P0-Sprint6 |
| `/api/v1/search` | GET | Search tweets | P0-Sprint7 |
| `/api/v1/saved/tweets` | GET/POST | Bookmarks | P0-Sprint7 |
| `/api/v1/saved/collections` | GET/POST | Collections | P0-Sprint7 |
| `/api/v1/reports/generate` | POST | Generate report | P0-Sprint8 |
| `/api/v1/tasks` | GET | List tasks | P0-Sprint8 |
| `/api/v1/tasks/:name/trigger` | POST | Trigger task | P0-Sprint8 |
| `/api/v1/audit` | GET | Audit log | P0-Sprint8 |
| `/api/v1/admin/users` | GET/POST | User management | P0-Sprint9 |

### 6.2 Endpoints Nuevos Necesarios

| Endpoint | Método | Propósito | Sprint |
|----------|--------|-----------|--------|
| `/api/v1/auth/token/refresh` | POST | Refresh JWT | Sprint 1 |
| `/api/v1/auth/token/validate` | GET | Validate JWT | Sprint 1 |
| `/api/v1/platforms` | GET | List platforms + capabilities | Sprint 2 |
| `/api/v1/cleanup/execute/:id` | POST | **Con step-up auth** | Sprint 4 |

### 6.3 Prioridad de Implementación

```
Sprint 1 (Auth):
├── POST /api/v1/auth/login         ✅ Existe
├── POST /api/v1/auth/logout        ✅ Existe
├── POST /api/v1/auth/register      ✅ Existe
├── GET  /api/v1/auth/me            ⚠️  Verificar formato
├── POST /api/v1/auth/token/refresh 🆕 Nuevo
└── GET  /api/v1/auth/token/validate 🆕 Nuevo

Sprint 2 (Credentials):
├── GET    /api/v1/credentials      ✅ Existe
├── POST   /api/v1/credentials      ✅ Existe
├── PUT    /api/v1/credentials/:id  ⚠️  Verificar
├── DELETE /api/v1/credentials/:id  ✅ Existe
├── POST   /api/v1/credentials/:id/test ✅ Existe
└── GET    /api/v1/platforms        🆕 Nuevo (capabilities)

...continúa por sprint...
```

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Auth sync issues (JWT) | Media | Alto | Testing exhaustivo, fallback a Flask |
| Performance degradación | Baja | Medio | Benchmark antes/después, SSR donde necesario |
| Breaking changes en API | Media | Alto | Versionar API (/v1/), no modificar durante migración |
| Playwright tests flaky | Alta | Medio | Retry en CI, tests determinísticos |
| Usuarios confundidos (2 UIs) | Media | Bajo | Banner "New UI", redirect automático |
| Cleanup step-up mal implementado | Baja | Crítico | Review de seguridad, tests específicos |
| Deployment complexity | Media | Medio | Docker compose bien testeado, runbook |

---

## 8. Criterios para Apagar Flask Dashboard

### 8.1 Checklist de Apagado

```markdown
## Flask Dashboard Deprecation Checklist

### Pantallas Migradas (100%)
- [ ] Login/Logout/Register
- [ ] Credentials management
- [ ] Sync dashboard
- [ ] Cleanup (preview + execute + history)
- [ ] Scheduler
- [ ] Analytics
- [ ] Search
- [ ] Bookmarks/Collections
- [ ] Reports
- [ ] Maintenance/Tasks
- [ ] Audit log
- [ ] Admin/Users (si aplica)

### Tests E2E Playwright
- [ ] Auth flows (4+ tests passing)
- [ ] Credential flows (6+ tests passing)
- [ ] Cleanup flows (6+ tests passing)
- [ ] Sync flows (3+ tests passing)
- [ ] All critical paths covered

### Métricas
- [ ] 0 errores críticos en Next.js (7 días)
- [ ] Latencia comparable a Flask (<200ms p95)
- [ ] No user complaints (o resueltos)

### Technical
- [ ] Todas las rutas Flask legacy devuelven 301
- [ ] Flask solo sirve /api/v1/*
- [ ] Templates Flask eliminados del repo
- [ ] Documentación actualizada
```

### 8.2 Timeline Estimado

```
Semana 1-2:   Sprint 1 (Auth)           → Next usable con login
Semana 3-4:   Sprint 2 (Credentials)    → Seguridad migrada
Semana 5-6:   Sprint 3 (Sync)           → Core migrado
Semana 7-8:   Sprint 4 (Cleanup)        → Acciones peligrosas migradas
Semana 9-10:  Sprint 5 (Scheduler)      → Feature popular migrada
Semana 11-12: Sprint 6 (Analytics)      → Dashboards migrados
Semana 13-14: Sprint 7 (Search/Bookmarks) → Features secundarias
Semana 15-16: Sprint 8 (Reports/Maintenance) → Admin features
Semana 17-18: Sprint 9 (Admin) + Cleanup Flask → 🎉 FLASK OFF

Total: ~4-5 meses para migración completa
```

---

## 9. Siguiente Paso

Ver: `SPRINT_MIGRATION_BACKLOG.md` para tickets detallados por sprint.

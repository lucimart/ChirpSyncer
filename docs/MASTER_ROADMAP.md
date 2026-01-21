# ChirpSyncer → Open Social Hub: Master Roadmap (Consolidated, Code-Verified)
> Source of truth for status + backlog. Built from actual code in `app/`, `frontend/`, `tests/`.
> This replaces fragmented docs and prevents orphan features.

## 1) Estado actual (según código)
### Hecho
- **Cleanup Engine**: `app/features/cleanup_engine.py` (fetch + delete + rate limit).
- **Search Engine avanzado**: `app/features/search_engine.py` (FTS5 + filtros de engagement).
- **API v1 JSON**: `app/web/api/v1/*` con errores normalizados y `X-Correlation-Id`.
- **Dashboard Next.js**: `frontend/src/app/dashboard/*` con vistas principales.
- **Auth + Credentials + Sync + Cleanup + Analytics + Feed + Workspaces + Export**: endpoints existentes.
- **E2E/API tests**: `tests/e2e/` y `tests/e2e/playwright/`.

### Parcial / Pendiente
- **Sync real-time jobs**: `/sync/start` es in-memory; no motor real.
- **Protocolos descentralizados**: ActivityPub/Mastodon, DSNP, SSB, Matrix.

### Completado recientemente
- **Search API filtros**: ✅ Sprint D - Integrado `search_with_filters` con filtros de fecha, engagement, media y plataforma.
- **Webhooks**: ✅ Sprint C - Webhooks de salida con firma HMAC-SHA256 y reintentos exponenciales.
- **Feed Lab real**: ✅ Sprint E - Reemplazado datos mock con posts reales de `synced_posts`.
- **ML Scheduling**: ✅ Sprint F - Predicción de engagement y tiempos óptimos basados en datos históricos.
- **Multi-Platform Framework**: ✅ Sprint G - PlatformConnector interface, CanonicalPost, ConnectorRegistry, ConflictResolver con 5 estrategias.

---

## 2) Principios de integración (anti-orphan)
Todo sprint debe:
1) Tener UI visible (dashboard) **y** endpoint real (API v1).
2) Emitir eventos para observabilidad (logs + correlation_id).
3) Conectar con features existentes (cleanup, sync, analytics, feed lab, export).
4) Tener tests (unit + integration + E2E) antes de cerrar.

---

## 3) Infra & Architecture Improvements (Scalability)

### Sprint Infra — Core Infrastructure (Redis + Celery)
**Motivo**: Necesario para background jobs fiables (vs threads) y websockets.

#### User Stories
- **US-I1**: Sistema robusto de colas para jobs largos (Sync/Cleanup).
- **US-I2**: Caching distribuido para endpoints de alto tráfico.

#### Requisitos funcionales
- Redis container en docker-compose.
- Celery worker para reemplazar `APScheduler` (gradual).

#### Backend
- `app/core/redis_client.py`: Singleton connection pool.
- `app/core/celery_app.py`: Configuración de worker.
- Migrar `sync_user_posts` y `cleanup_engine` a tareas Celery.

#### API
- Health check para Redis: `GET /api/v1/health/redis`.

#### TDD
- Integration: conectar y set/get en Redis.
- E2E: job encolado en Celery se ejecuta exitosamente.

---

### Sprint J — Performance & Archival
**Motivo**: Manejo de gran volumen de datos (>1M tweets) y latencia API.

#### User Stories
- **US-J1**: Archivar posts antiguos (>1 año) a "cold storage" (S3/File).
- **US-J2**: API p95 < 200ms para listas y stats.

#### Requisitos funcionales
- Job nocturno de archivo (`ArchivalManager`).
- Caching layer (`@cached`) para endpoints de lectura.

#### Backend
- `app/features/archival/`: Mover filas de SQLite a JSON/Parquet comprimido.
- `app/core/cache.py`: Decorador usando Redis.

#### Frontend
- UI: Mostrar indicador "Archived" en búsquedas históricas.

#### TDD
- Unit: ArchivalManager mueve data y marca `archived=True`.
- Integration: Cache hit/miss metrics.

---

## 4) Sprints Funcionales Pendientes (Detallados)

### Sprint A — Sync Engine real (jobs, colas y progreso)
**Motivo**: `/sync/start` hoy no ejecuta nada real y no persiste jobs.
**Estado**: ✅ Implementado (persistencia + ejecución Celery)

#### User Stories
- **US-A1**: Como usuario quiero iniciar un sync y ver progreso real.
- **US-A2**: Como usuario quiero historial confiable (status, errores, duración).
- **US-A3**: Como admin quiero limitar frecuencia y detectar fallos.

#### Requisitos funcionales
- Persistir jobs de sync (DB) y actualizar estado.
- Integración con `sync_stats` existente.
- Exponer status por job_id real.

#### Requisitos no funcionales
- Idempotencia (no duplicar posts).
- Retry con backoff.
- Latencia en progreso < 1s (si hay realtime).

#### Backend (tareas)
- Tabla `sync_jobs` + `sync_job_events`.
- Servicio `SyncService` (orquestación real).
- Hook con `analytics_tracker` para métricas.

#### Frontend
- Estado de sync con polling o websocket.
- Historial de jobs con status y error.

#### API (propuesto)
```
POST /api/v1/sync/start
→ { job_id, status: "queued" }

GET /api/v1/sync/{job_id}/status
→ { status, progress, errors[] }
```

#### TDD
- Unit: SyncService queue + idempotencia.
- Integration: job start + status.
- E2E: user start sync → ver progreso.

#### Casos de uso
- Migrar posts entre plataformas.
- Resync tras fallo de credenciales.

---

### Sprint B — WebSockets / SSE (Real-time UX)
**Motivo**: Progreso, notificaciones y jobs sin polling.

#### User Stories
- **US-B1**: Ver progreso de sync en vivo.
- **US-B2**: Ver progreso de cleanup en vivo.
- **US-B3**: Recibir notificaciones de jobs completados.

#### Requisitos funcionales
- Canal por usuario autenticado (Room-based).
- Eventos: `sync.progress`, `cleanup.progress`, `job.completed`.

#### Requisitos no funcionales
- Reconexión automática.
- Rate limit por canal.
- SSE fallback si WS falla.

#### Backend
- **Flask-SocketIO** con Redis message queue.
- `app/web/websocket.py`: Handlers de conexión.
- Emisión de eventos desde Celery tasks.

#### Frontend
- Provider `RealtimeProvider` + hooks (`useSocket`).
- Toasts + banners de estado.

#### API / Events
```
event: sync.progress
{ job_id, status, items_synced, correlation_id }
```

#### TDD
- Unit: emitter mock.
- Integration: websocket connect + send event.
- E2E: UI actualiza sin refresh.

---

### Sprint C — Webhooks (in/out + integrados al producto)
**Estado**: ✅ Implementado (HMAC signing + retry + UI)
**Motivo**: Automatización real, integración con terceros.

#### User Stories
- **US-C1**: Crear webhooks de salida (notificar eventos).
- **US-C2**: Ver historial de deliveries y reintentos.
- **US-C3**: Webhooks de entrada para disparar acciones.

#### Requisitos funcionales
- CRUD de webhooks con firma HMAC.
- Logs de delivery por evento.
- Retries con backoff.

#### Requisitos no funcionales
- No exponer secrets.
- Idempotencia en deliveries.
- Rate limit por endpoint.

#### Backend
- Nuevas tablas: `webhooks`, `webhook_deliveries`.
- Dispatcher con reintentos.

#### Frontend
- `/dashboard/webhooks` con tabla y logs.

#### API (propuesto)
```
POST /api/v1/webhooks
GET /api/v1/webhooks
GET /api/v1/webhooks/:id/deliveries
```

#### TDD
- Unit: firma HMAC + retry.
- Integration: delivery ok/fail.
- E2E: crear webhook → ver delivery.

---

### Sprint D — Search filtros reales + enriquecimiento
**Estado**: ✅ Implementado (date range, engagement, media, platform filters)
**Motivo**: API search hoy no aplica filtros a DB.

#### User Stories
- **US-D1**: Filtrar por likes/retweets/has_media.
- **US-D2**: Filtrar por fechas reales.

#### Requisitos funcionales
- Usar `search_with_filters` en API.
- Retornar métricas y hashtags.

#### Backend
- Ajustar `/api/v1/search` para usar filtros.
- Si falta data en `synced_posts`, añadir columnas.

#### Frontend
- Search UI con filtros activos.

#### TDD
- Unit: filtros combinados.
- Integration: query con filtros.
- E2E: filtro cambia resultados.

---

### Sprint E — Feed Lab real (no mock)
**Estado**: ✅ Implementado (real posts + condition evaluation + scoring)
**Motivo**: `explainer.py` usa sample posts.

#### User Stories
- **US-E1**: Explicar scoring con posts reales.
- **US-E2**: Ver reglas aplicadas a cada post.

#### Requisitos funcionales
- Lectura real de posts en DB.
- Reglas aplicadas con métricas reales.

#### Backend
- Reemplazar sample data con `synced_posts`.
- Endpoint `/feed/explain` real.

#### Frontend
- Feed Lab consume data real.

#### TDD
- Unit: reglas + scoring.
- Integration: explain endpoint.
- E2E: feed lab muestra resultados.

---

### Sprint F — ML Scheduling real
**Estado**: ✅ Implementado (historical analysis + engagement prediction + confidence levels)
**Motivo**: `/optimal-times` y `/predict` son placeholders.

#### User Stories
- **US-F1**: Sugerir horarios basados en métricas reales.
- **US-F2**: Predecir engagement de un draft.

#### Requisitos funcionales
- Usar `analytics_tracker`.
- Predicción basada en histórico.

#### Backend
- Modelo simple (heurístico) inicial.
- Persistir resultados.

#### Frontend
- UI de scheduler actualiza con modelo real.

#### TDD
- Unit: scoring.
- Integration: endpoints.
- E2E: scheduler muestra recomendaciones.

---

### Sprint G — Framework Multi-Plataforma + Conflict Resolution
**Estado**: ✅ Implementado (PlatformConnector + CanonicalPost + Registry + ConflictResolver)
**Motivo**: Integraciones dispersas y manejo de conflictos en sync.

#### User Stories
- **US-G1**: Unificar conectores con capabilities.
- **US-G2**: Conectar nuevas plataformas sin duplicar lógica.
- **US-G3**: Resolver conflictos de edición (Last Write Wins / Manual).

#### Requisitos funcionales
- Interface `PlatformConnector`.
- Mapping a `CanonicalPost`.
- Detección de conflictos en SyncService.

#### Backend
- Crear `app/protocols/*`.
- Registrar conectores en registry.
- `ConflictResolver` service.

#### Frontend
- UI de connectors con capacidades y estado.
- UI de resolución de conflictos manuales.

#### TDD
- Unit: mapping + conflict detection strategies.
- Integration: registro + sync + conflict handling.

---

### Sprint H — Protocolos descentralizados
**Motivo**: ActivityPub/DSNP/SSB/Matrix faltan.

#### User Stories
- **US-H1**: Conectar cuentas federadas.
- **US-H2**: Sincronizar posts federados.

#### Requisitos funcionales
- Almacenamiento de identidades y llaves.
- Integración con `sync` y `feed`.

#### Backend
- Implementar protocolos en `app/protocols`.

#### Frontend
- UI de cuentas federadas.

#### TDD
- Unit: parsing de eventos.
- Integration: sync federado.

---

## 5) Deprecated Documentation
> These files are outdated and superseded by this Master Roadmap. Do not use for planning.

- `docs/PROTOCOL_ROADMAP.md`
- `docs/SESSION_WORKFLOW.md`
- `docs/SPRINT_TICKETS.md`
- `docs/USER_STORIES.md`
- `docs/migration/*` (all files)
- `docs/sprints/*` (all files)

---

## 6) Orden recomendado
1. **Sprint Infra**: Redis + Celery (Base sólida).
2. **Sprint A**: Sync Engine real (Celery-based).
3. **Sprint B**: WebSockets (Real-time).
4. **Sprint C**: Webhooks (Integración).
5. **Sprint D**: Search real.
6. **Sprint E**: Feed Lab real.
7. **Sprint F**: ML Scheduling.
8. **Sprint G**: Multi-Platform + Conflicts.

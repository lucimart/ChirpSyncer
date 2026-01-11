# Sprint 4 Plan: Sincronización Bidireccional (Twitter ↔ Bluesky)

## Objetivos
Implementar sincronización bidireccional entre Twitter y Bluesky con protección contra loops infinitos.

## Estado Actual
- ✅ Sprint 3: Sincronización unidireccional (Twitter → Bluesky)
- ❌ No hay sincronización Bluesky → Twitter
- ❌ Sin protección contra loops infinitos
- ❌ DB no trackea origen de posts

## Problema a Resolver

### Sincronización Actual (Unidireccional)
```
Twitter ---> ChirpSyncer ---> Bluesky
         ✅
```

### Sincronización Deseada (Bidireccional)
```
Twitter <---> ChirpSyncer <---> Bluesky
         ✅                ✅
```

### ⚠️ Riesgo de Loop Infinito
```
1. Post original en Twitter: "Hello World"
2. ChirpSyncer copia a Bluesky: "Hello World"
3. ChirpSyncer detecta post nuevo en Bluesky: "Hello World"
4. ChirpSyncer copia a Twitter: "Hello World" [DUPLICADO]
5. ChirpSyncer detecta post nuevo en Twitter: "Hello World" [DUPLICADO]
6. Loop infinito... ❌
```

## Solución: Sistema de Metadata y Deduplicación

### 1. Nuevo Schema de Base de Datos

Actualizar `data.db` para trackear origen y destino:

```sql
-- Tabla actual (Sprint 3)
CREATE TABLE seen_tweets (
    tweet_id TEXT PRIMARY KEY,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nueva tabla (Sprint 4) - Reemplaza seen_tweets
CREATE TABLE synced_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identificadores
    twitter_id TEXT,        -- ID del tweet (si aplica)
    bluesky_uri TEXT,       -- URI del post en Bluesky (si aplica)

    -- Metadata de origen
    source TEXT NOT NULL,   -- 'twitter' o 'bluesky'
    content_hash TEXT NOT NULL UNIQUE,  -- Hash del contenido para dedup

    -- Metadata de sincronización
    synced_to TEXT,         -- 'bluesky', 'twitter', o 'both'
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contenido original
    original_text TEXT NOT NULL,

    -- Constraints
    CONSTRAINT valid_source CHECK (source IN ('twitter', 'bluesky')),
    CONSTRAINT valid_synced_to CHECK (synced_to IN ('bluesky', 'twitter', 'both'))
);

-- Índices para queries rápidas
CREATE INDEX idx_twitter_id ON synced_posts(twitter_id);
CREATE INDEX idx_bluesky_uri ON synced_posts(bluesky_uri);
CREATE INDEX idx_content_hash ON synced_posts(content_hash);
CREATE INDEX idx_source ON synced_posts(source);
```

### 2. Algoritmo de Deduplicación

```python
def should_sync_post(post_content: str, source: str, post_id: str) -> bool:
    """
    Determina si un post debe ser sincronizado.

    Args:
        post_content: Texto del post
        source: 'twitter' o 'bluesky'
        post_id: ID del post en la plataforma de origen

    Returns:
        True si debe sincronizarse, False si es duplicado o ya fue sincronizado
    """
    content_hash = hashlib.sha256(post_content.encode()).hexdigest()

    # Caso 1: Post con mismo hash ya existe (contenido duplicado)
    existing = db.query("SELECT * FROM synced_posts WHERE content_hash = ?", content_hash)
    if existing:
        # Ya fue sincronizado
        return False

    # Caso 2: Post con mismo ID ya existe
    if source == 'twitter':
        existing = db.query("SELECT * FROM synced_posts WHERE twitter_id = ?", post_id)
    else:
        existing = db.query("SELECT * FROM synced_posts WHERE bluesky_uri = ?", post_id)

    if existing:
        return False

    # Caso 3: Post nuevo, debe sincronizarse
    return True
```

### 3. Flujo de Sincronización Bidireccional

```python
def sync_twitter_to_bluesky():
    """Twitter → Bluesky (ya implementado en Sprint 3)"""
    tweets = fetch_tweets_from_twitter()

    for tweet in tweets:
        if should_sync_post(tweet.text, 'twitter', tweet.id):
            # Sincronizar a Bluesky
            bluesky_uri = post_to_bluesky(tweet.text)

            # Registrar en DB
            save_synced_post(
                twitter_id=tweet.id,
                bluesky_uri=bluesky_uri,
                source='twitter',
                synced_to='bluesky',
                content=tweet.text
            )

def sync_bluesky_to_twitter():
    """Bluesky → Twitter (NUEVO en Sprint 4)"""
    posts = fetch_posts_from_bluesky()

    for post in posts:
        if should_sync_post(post.text, 'bluesky', post.uri):
            # Sincronizar a Twitter
            tweet_id = post_to_twitter(post.text)

            # Registrar en DB
            save_synced_post(
                twitter_id=tweet_id,
                bluesky_uri=post.uri,
                source='bluesky',
                synced_to='twitter',
                content=post.text
            )

def main():
    """Orquestador principal con sincronización bidireccional"""
    while True:
        # Sincronización en ambas direcciones
        sync_twitter_to_bluesky()
        sync_bluesky_to_twitter()

        time.sleep(POLL_INTERVAL)
```

---

## Tareas del Sprint 4

### 1. BIDIR-001: Implementar Bluesky Reader
**Prioridad**: Alta (3 horas)
**Descripción**: Leer posts de Bluesky para detectar nuevos posts a sincronizar.

**Criterios de Aceptación**:
- Función `fetch_posts_from_bluesky(username, count=10)` que retorna posts recientes
- Usa atproto client para leer feed del usuario
- Filtra solo posts del usuario (no reposts/likes)
- Retorna posts en orden cronológico (más recientes primero)
- Maneja errores de red con retry

**Archivos a crear/modificar**:
- `app/bluesky_handler.py`: Agregar `fetch_posts_from_bluesky()`
- `tests/test_bluesky_handler.py`: +5 tests

**Tests**:
1. `test_fetch_posts_from_bluesky_success` - Fetch exitoso
2. `test_fetch_posts_from_bluesky_empty` - Usuario sin posts
3. `test_fetch_posts_from_bluesky_filters_reposts` - Filtra reposts
4. `test_fetch_posts_from_bluesky_network_error` - Retry en errores
5. `test_fetch_posts_from_bluesky_pagination` - Limita a count posts

---

### 2. BIDIR-002: Implementar Twitter Writer
**Prioridad**: Alta (2 horas)
**Descripción**: Escribir posts en Twitter usando tweepy API.

**⚠️ IMPORTANTE**: Twitter API Free Tier permite 1,500 writes/mes.

**Criterios de Aceptación**:
- Función `post_to_twitter(content: str) -> str` que retorna tweet_id
- Usa tweepy con credenciales deprecated (TWITTER_API_KEY, etc.)
- Retry logic con exponential backoff (3 intentos)
- Maneja rate limiting de Twitter (1,500 tweets/mes)
- Logging estructurado
- Validación de 280 caracteres (truncar si es necesario)

**Archivos a crear/modificar**:
- `app/twitter_handler.py`: Agregar `post_to_twitter()`
- `app/config.py`: Descomentar TWITTER_API_KEY (se necesitan para writes)
- `app/validation.py`: Validar API credentials para writes
- `.env.example`: Documentar que API credentials son opcionales (solo para sync Bluesky→Twitter)
- `tests/test_twitter_handler.py`: +6 tests

**Tests**:
1. `test_post_to_twitter_success` - Post exitoso
2. `test_post_to_twitter_truncates_long_text` - Trunca >280 chars
3. `test_post_to_twitter_retry_on_error` - Retry logic
4. `test_post_to_twitter_rate_limit` - Manejo de rate limit
5. `test_post_to_twitter_auth_error` - Error de autenticación
6. `test_post_to_twitter_returns_id` - Retorna tweet_id válido

---

### 3. BIDIR-003: Database Schema Migration
**Prioridad**: Alta (1 hora)
**Descripción**: Migrar de `seen_tweets` a `synced_posts` con metadata completa.

**Criterios de Aceptación**:
- Nueva tabla `synced_posts` con schema completo
- Migración automática de datos existentes (si existen)
- Funciones helper: `should_sync_post()`, `save_synced_post()`, `get_post_by_hash()`
- Índices para queries rápidas
- Backward compatibility (no romper funcionalidad existente)

**Archivos a crear/modificar**:
- `app/db_handler.py`: Nueva tabla + migration + helper functions
- `app/utils.py`: NUEVO - `compute_content_hash(text: str)`
- `tests/test_db_handler.py`: +8 tests

**Tests**:
1. `test_migration_from_seen_tweets` - Migración exitosa
2. `test_should_sync_post_new_post` - Post nuevo debe sincronizarse
3. `test_should_sync_post_duplicate_hash` - Hash duplicado no se sincroniza
4. `test_should_sync_post_duplicate_id` - ID duplicado no se sincroniza
5. `test_save_synced_post_twitter_source` - Guardar post de Twitter
6. `test_save_synced_post_bluesky_source` - Guardar post de Bluesky
7. `test_get_post_by_hash` - Buscar por hash
8. `test_database_indexes_created` - Índices creados correctamente

---

### 4. BIDIR-004: Bidirectional Sync Orchestration
**Prioridad**: Alta (2 horas)
**Descripción**: Orquestador principal que sincroniza en ambas direcciones.

**Criterios de Aceptación**:
- Función `sync_twitter_to_bluesky()` actualizada con nueva DB
- Función `sync_bluesky_to_twitter()` nueva
- Main loop ejecuta ambas sincronizaciones
- Logging detallado de cada operación
- Manejo de errores independiente por dirección
- Estadísticas de sincronización (posts sincronizados, skipped, errores)

**Archivos a modificar**:
- `app/main.py`: Actualizar main() con sync bidireccional
- `tests/test_main.py`: +6 tests

**Tests**:
1. `test_sync_twitter_to_bluesky_with_new_db` - Sync con nueva DB
2. `test_sync_bluesky_to_twitter_success` - Sync Bluesky→Twitter
3. `test_bidirectional_sync_no_loop` - Sin loop infinito
4. `test_sync_same_content_different_platforms` - Contenido igual no duplica
5. `test_main_loop_runs_both_syncs` - Loop ejecuta ambas direcciones
6. `test_sync_continues_on_partial_failure` - Continúa si una dirección falla

---

### 5. BIDIR-005: Loop Prevention Verification
**Prioridad**: Alta (1 hora)
**Descripción**: Tests de integración para verificar que NO hay loops infinitos.

**Criterios de Aceptación**:
- Test end-to-end: Twitter → Bluesky → Twitter (detecta loop)
- Test end-to-end: Bluesky → Twitter → Bluesky (detecta loop)
- Test de stress: 100 posts bidireccionales sin duplicados
- Verificación de content_hash funciona correctamente
- Documentación de casos edge

**Archivos a crear**:
- `tests/test_loop_prevention.py`: NUEVO - 5 tests de integración

**Tests**:
1. `test_no_loop_twitter_to_bluesky_to_twitter` - Detecta y previene loop
2. `test_no_loop_bluesky_to_twitter_to_bluesky` - Detecta y previene loop
3. `test_stress_100_bidirectional_posts` - Stress test
4. `test_content_hash_collision_handling` - Manejo de colisiones SHA256
5. `test_edge_case_same_text_different_time` - Mismo texto en diferentes momentos

---

## Consideraciones Importantes

### Twitter API Credentials

Para sincronización bidireccional se necesitan **2 sets de credenciales**:

1. **Para leer Twitter** (ya implementado en Sprint 2):
   - TWITTER_USERNAME
   - TWITTER_PASSWORD
   - TWITTER_EMAIL
   - TWITTER_EMAIL_PASSWORD
   - Usa: twscrape (gratis, ilimitado)

2. **Para escribir en Twitter** (NUEVO en Sprint 4):
   - TWITTER_API_KEY
   - TWITTER_API_SECRET
   - TWITTER_ACCESS_TOKEN
   - TWITTER_ACCESS_SECRET
   - Usa: tweepy API (Free tier: 1,500 writes/mes)

**Modo de operación**:
- **Unidireccional** (Twitter→Bluesky): Solo necesita credenciales de scraping
- **Bidireccional** (Twitter↔Bluesky): Necesita ambos sets

### Rate Limits

| Operación | Límite | Estrategia |
|-----------|--------|------------|
| Leer Twitter | Ilimitado (twscrape) | Sin restricción |
| Escribir Twitter | 1,500/mes (Free) | Poll cada 7.2h = ~100 posts/mes |
| Leer Bluesky | ~500/día estimado | Poll cada 7.2h = safe |
| Escribir Bluesky | ~300/día estimado | Poll cada 7.2h = safe |

**Polling interval**: Mantener 7.2 horas para estar safe en ambas direcciones.

### Content Hash Strategy

Usar SHA256 del contenido normalizado:

```python
import hashlib

def compute_content_hash(text: str) -> str:
    # Normalizar: lowercase, strip whitespace, remove URLs
    normalized = text.lower().strip()
    normalized = re.sub(r'https?://\S+', '', normalized)  # Remove URLs
    normalized = re.sub(r'\s+', ' ', normalized)  # Normalize whitespace

    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
```

**Por qué normalizar**:
- URLs pueden ser diferentes (t.co vs original)
- Whitespace puede variar
- Case no importa para detección de duplicados

---

## Estrategia de Implementación

### Fase 1: Database Migration (1 agente)
- **Agent 1**: BIDIR-003 (DB schema + migration)
- **Tiempo**: 1 hora
- **Bloqueante**: Sí (otros agentes dependen de nueva DB)

### Fase 2: Readers/Writers (2 agentes en paralelo)
- **Agent 2**: BIDIR-001 (Bluesky reader)
- **Agent 3**: BIDIR-002 (Twitter writer)
- **Tiempo**: 3 horas (paralelo)
- **Dependencia**: Agent 1 completo

### Fase 3: Orchestration + Loop Prevention (2 agentes en paralelo)
- **Agent 4**: BIDIR-004 (Orchestration)
- **Agent 5**: BIDIR-005 (Loop prevention tests)
- **Tiempo**: 2 horas (paralelo)
- **Dependencia**: Agents 2 y 3 completos

**Tiempo total estimado**: 6 horas (con agentes paralelos)

---

## Métricas de Éxito

### Before Sprint 4:
- Sync: Unidireccional (Twitter → Bluesky)
- DB: `seen_tweets` simple
- Loop prevention: N/A
- Tests: 69 tests
- Twitter write: No soportado

### After Sprint 4:
- Sync: **Bidireccional** (Twitter ↔ Bluesky) ✅
- DB: `synced_posts` con metadata completa ✅
- Loop prevention: SHA256 hash + metadata tracking ✅
- Tests: 99+ tests (+30 nuevos) ✅
- Twitter write: Soportado con API credentials ✅

---

## Riesgos y Mitigaciones

### Riesgo 1: Twitter API credentials no disponibles
**Mitigación**:
- Modo de operación flexible: si no hay API credentials, mantener unidireccional
- Validación opcional: advertir pero no fallar
- Documentación clara sobre cuándo se necesitan

### Riesgo 2: Content hash colisiones (SHA256)
**Mitigación**:
- Probabilidad de colisión es astronómicamente baja (2^256)
- Backup check: también verificar IDs de plataforma
- Tests específicos para este edge case

### Riesgo 3: Rate limits excedidos
**Mitigación**:
- Mantener polling interval de 7.2h
- Monitorear límites con logging
- Implementar backoff si se detecta rate limit

### Riesgo 4: Migration de DB rompe funcionalidad existente
**Mitigación**:
- Migration automática con fallback
- Tests de backward compatibility
- Backup de DB antes de migration

---

## Actualización de Documentación

Al completar Sprint 4:
1. Actualizar `ARCHITECTURE.md` con sección "Sincronización Bidireccional"
2. Actualizar `.env.example` con ambos sets de credenciales
3. Actualizar README.md con guía de setup bidireccional
4. Crear `MIGRATION_GUIDE_v1.1_to_v1.2.md` para usuarios existentes

---

## Casos de Uso

### Caso 1: Usuario solo con credenciales de scraping
```
Resultado: Sync unidireccional (Twitter → Bluesky)
Logs: "Twitter API credentials not found. Running in read-only mode."
```

### Caso 2: Usuario con credenciales completas
```
Resultado: Sync bidireccional (Twitter ↔ Bluesky)
Logs: "Bidirectional sync enabled."
```

### Caso 3: Post publicado manualmente en Twitter
```
1. Usuario publica "Hello" en Twitter
2. ChirpSyncer detecta nuevo tweet
3. Computa hash: sha256("hello") = "abc123..."
4. Verifica DB: hash no existe
5. Sincroniza a Bluesky
6. Guarda en DB: source=twitter, synced_to=bluesky, hash=abc123
7. Próximo ciclo: detecta mismo tweet, hash existe, SKIP ✅
```

### Caso 4: Post publicado manualmente en Bluesky
```
1. Usuario publica "World" en Bluesky
2. ChirpSyncer detecta nuevo post
3. Computa hash: sha256("world") = "def456..."
4. Verifica DB: hash no existe
5. Sincroniza a Twitter
6. Guarda en DB: source=bluesky, synced_to=twitter, hash=def456
7. Próximo ciclo: detecta mismo tweet en Twitter, hash existe, SKIP ✅
```

### Caso 5: Mismo contenido posteado en ambas plataformas manualmente
```
1. Usuario publica "Test" en Twitter manualmente
2. Usuario publica "Test" en Bluesky manualmente (mismo contenido)
3. ChirpSyncer detecta "Test" en Twitter
4. Computa hash: sha256("test") = "xyz789..."
5. Sincroniza a Bluesky → FALLA (post ya existe)
6. ChirpSyncer detecta "Test" en Bluesky
7. Hash xyz789 ya existe en DB → SKIP ✅
```

---

## Comandos Útiles

```bash
# Migrar base de datos (si ya tienes data.db vieja)
python -c "from app.db_handler import migrate_database; migrate_database()"

# Verificar schema de DB
sqlite3 data.db ".schema synced_posts"

# Ver posts sincronizados
sqlite3 data.db "SELECT source, synced_to, COUNT(*) FROM synced_posts GROUP BY source, synced_to"

# Verificar que no hay duplicados por hash
sqlite3 data.db "SELECT content_hash, COUNT(*) as cnt FROM synced_posts GROUP BY content_hash HAVING cnt > 1"

# Correr solo tests de loop prevention
pytest tests/test_loop_prevention.py -v

# Correr todos los tests nuevos de Sprint 4
pytest tests/test_bluesky_handler.py tests/test_twitter_handler.py tests/test_db_handler.py tests/test_main.py tests/test_loop_prevention.py -v

# Correr todos los tests (debe mostrar 99+)
pytest -v
```

---

## Next Sprints (Futuro)

**Sprint 5** (Opcional):
- MEDIA-001: Soporte para imágenes/videos bidireccional
- THREAD-001: Threads bidireccionales
- MONITORING-001: Dashboard web
- STATS-001: Estadísticas de sincronización

---

**Fecha**: 2026-01-09
**Sprint**: 4
**Status**: 🎯 READY TO START
**Complejidad**: Alta (bidireccional + loop prevention)
**Estimated Time**: 6 horas con 5 agentes

# Sprint 5 Plan: Bidirectional Thread Support

## Objetivos
Extender el soporte de threads (implementado en Sprint 3) para sincronización bidireccional Twitter ↔ Bluesky.

## Estado Actual
- ✅ Sprint 1: Bugs críticos resueltos (14 tests)
- ✅ Sprint 2: Migración a twscrape + logging + retry logic (59 tests)
- ✅ Sprint 3: Thread support unidireccional + Docker HEALTHCHECK (69 tests)
- ✅ Sprint 4: Sincronización bidireccional con prevención de loops (86 tests)
- 🎯 Sprint 5: Thread support bidireccional

## Contexto del Problema

### Sprint 3 vs Sprint 5
**Sprint 3** implementó:
- Detección de threads en Twitter
- Sincronización de threads Twitter → Bluesky
- Thread completo publicado como cadena de replies en Bluesky
- Tests: 10 tests en test_thread_support.py

**Sprint 5** necesita:
- Detección de threads en Bluesky
- Sincronización de threads Bluesky → Twitter
- Thread completo publicado como cadena de replies en Twitter
- Prevención de loops en threads (triple-layer como Sprint 4)
- Tests: ~15 nuevos tests

### Desafío: Loop Prevention en Threads

**Problema**: Si un thread de 5 tweets se sincroniza Twitter → Bluesky, y luego se detecta como thread en Bluesky, podría crear loop infinito.

**Solución**: Extender el sistema de content_hash para cada tweet del thread:
- Cada tweet del thread tiene su propio hash
- La base de datos guarda el hash de cada tweet individual
- Un thread ya sincronizado no se vuelve a sincronizar

## Tareas del Sprint 5

### 1. THREAD-BIDIR-001: Bluesky Thread Detection
**Prioridad**: Alta (Foundation - 1 hora)
**Descripción**: Detectar cuando un post de Bluesky es parte de un thread (cadena de replies).

**Criterios de Aceptación**:
- Detectar si un post es respuesta (tiene `reply` field)
- Detectar si un post es parte de un thread del mismo autor
- Recuperar el thread completo en orden cronológico
- Manejar threads con posts eliminados

**Cambios**:

**`app/bluesky_handler.py`**:
```python
def is_bluesky_thread(post) -> bool:
    """
    Detecta si un post de Bluesky es parte de un thread.

    Un post es parte de thread si:
    - Tiene campo 'reply'
    - El post padre (parent) es del mismo autor

    Returns:
        bool: True si es parte de un thread
    """
    pass

async def fetch_bluesky_thread(post_uri: str, username: str) -> list:
    """
    Recupera todos los posts de un thread de Bluesky.

    Args:
        post_uri: URI del post inicial
        username: Handle del usuario (@handle.bsky.social)

    Returns:
        list: Posts del thread en orden cronológico

    Algoritmo:
    1. Obtener post actual
    2. Buscar post raíz (root) del thread
    3. Recuperar todos los replies del mismo autor
    4. Ordenar cronológicamente
    """
    pass
```

**Tests** (`tests/test_bluesky_thread.py` - NEW):
1. `test_detect_single_post_not_thread()`: Post simple no es thread
2. `test_detect_reply_to_self_is_thread()`: Reply a sí mismo es thread
3. `test_detect_reply_to_other_not_thread()`: Reply a otro usuario no es thread
4. `test_fetch_bluesky_thread_returns_ordered()`: Thread recuperado en orden
5. `test_fetch_thread_handles_deleted_posts()`: Manejo de posts eliminados en medio del thread

**Tiempo estimado**: 1 hora

---

### 2. THREAD-BIDIR-002: Twitter Thread Writer
**Prioridad**: Alta (Foundation - 1.5 horas)
**Descripción**: Publicar threads completos en Twitter manteniendo la cadena de replies.

**Criterios de Aceptación**:
- Publicar primer tweet del thread
- Publicar tweets subsecuentes como replies al tweet anterior
- Manejar rate limiting entre tweets (sleep)
- Retornar lista de tweet_ids publicados
- Manejo de errores parciales (publicar lo que se pueda)

**Cambios**:

**`app/twitter_handler.py`**:
```python
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def post_thread_to_twitter(posts: list) -> list:
    """
    Publica un thread completo en Twitter.

    Args:
        posts: Lista de textos a publicar en orden

    Returns:
        list: Lista de tweet_ids publicados

    Algoritmo:
    1. Publicar primer post (sin reply)
    2. Para cada post subsecuente:
        - Publicar como reply al anterior
        - Sleep 2 segundos (rate limiting)
        - Guardar tweet_id
    3. Retornar lista de tweet_ids

    Error handling:
    - Si falla un tweet intermedio, seguir con los siguientes
    - Retornar lista de IDs exitosos
    """
    pass
```

**Tests** (`tests/test_twitter_thread.py` - NEW):
1. `test_post_single_tweet_thread()`: Thread de 1 tweet
2. `test_post_multi_tweet_thread()`: Thread de 3 tweets
3. `test_thread_maintains_reply_chain()`: Verificar reply_to_tweet_id correcto
4. `test_thread_rate_limiting()`: Verificar sleep entre tweets
5. `test_thread_partial_failure()`: Manejo de fallo en tweet intermedio
6. `test_thread_truncation()`: Tweets > 280 chars truncados

**Tiempo estimado**: 1.5 horas

---

### 3. THREAD-BIDIR-003: Database Schema for Threads
**Prioridad**: Alta (Foundation - 1 hora)
**Descripción**: Extender el schema de `synced_posts` para trackear threads completos.

**Problema Actual**:
```sql
CREATE TABLE synced_posts (
    twitter_id TEXT,
    bluesky_uri TEXT,
    content_hash TEXT UNIQUE  -- ❌ Solo 1 hash por post
)
```

**Problema**: Un thread de 5 tweets tiene 5 hashes diferentes. La tabla actual solo guarda 1 hash.

**Solución**: Agregar campo `thread_id` para agrupar posts del mismo thread.

**Cambios**:

**`app/db_handler.py`**:
```python
def migrate_database_v2(db_path="data.db"):
    """
    Migración v2: Agregar soporte para threads.

    Cambios:
    - Agregar columna thread_id (nullable)
    - Agregar columna thread_position (nullable, 0-indexed)
    - Crear índice en thread_id

    thread_id format: "{platform}_{original_post_id}"
    Ejemplo: "twitter_12345" para thread iniciado en Twitter

    thread_position:
    - 0: Primer post del thread
    - 1: Segundo post
    - N: N-ésimo post
    """
    pass

def save_synced_thread(posts: list, source: str, synced_to: str,
                       thread_id: str, db_path="data.db"):
    """
    Guarda un thread completo con metadatos.

    Args:
        posts: Lista de dicts con {twitter_id, bluesky_uri, content}
        source: 'twitter' o 'bluesky'
        synced_to: 'twitter' o 'bluesky'
        thread_id: ID único del thread

    Ejemplo:
        posts = [
            {'twitter_id': 'tw1', 'bluesky_uri': 'bs1', 'content': 'First'},
            {'twitter_id': 'tw2', 'bluesky_uri': 'bs2', 'content': 'Second'}
        ]
        save_synced_thread(posts, 'twitter', 'bluesky', 'twitter_tw1')
    """
    pass

def is_thread_synced(thread_id: str, db_path="data.db") -> bool:
    """
    Verifica si un thread ya fue sincronizado.

    Returns:
        bool: True si el thread_id existe en la base de datos
    """
    pass
```

**Tests** (`tests/test_db_thread.py` - NEW):
1. `test_migration_v2_adds_thread_columns()`: Verificar columnas nuevas
2. `test_save_synced_thread_single_post()`: Thread de 1 post
3. `test_save_synced_thread_multiple_posts()`: Thread de 3 posts
4. `test_thread_position_ordering()`: Verificar thread_position correcto
5. `test_is_thread_synced_returns_true()`: Thread existente detectado
6. `test_is_thread_synced_returns_false()`: Thread nuevo no detectado

**Tiempo estimado**: 1 hora

---

### 4. THREAD-BIDIR-004: Orchestration Layer
**Prioridad**: Alta (Integration - 1.5 horas)
**Descripción**: Integrar todas las piezas en `main.py` para sincronización bidireccional de threads.

**Criterios de Aceptación**:
- Detectar threads en ambas direcciones
- Sincronizar threads completos Twitter → Bluesky
- Sincronizar threads completos Bluesky → Twitter
- Prevención de loops usando thread_id
- Logging detallado de cada thread sincronizado

**Cambios**:

**`app/main.py`**:
```python
def sync_twitter_to_bluesky():
    """
    Actualizado para manejar threads bidireccionales.
    """
    tweets = fetch_tweets()

    for tweet in tweets:
        # Detectar si es thread
        if is_thread(tweet):
            thread_tweets = fetch_thread(tweet.id, TWITTER_USERNAME)
            thread_id = f"twitter_{tweet.id}"

            # Verificar si ya sincronizado
            if is_thread_synced(thread_id):
                logger.info(f"Thread {thread_id} already synced, skipping")
                continue

            # Sincronizar thread completo
            logger.info(f"Syncing thread {thread_id} ({len(thread_tweets)} tweets)")
            bluesky_uris = post_thread_to_bluesky(thread_tweets)

            # Guardar en DB
            posts = [
                {
                    'twitter_id': t.id,
                    'bluesky_uri': uri,
                    'content': t.text
                }
                for t, uri in zip(thread_tweets, bluesky_uris)
            ]
            save_synced_thread(posts, 'twitter', 'bluesky', thread_id)
        else:
            # Tweet simple (código existente)
            if should_sync_post(tweet.text, 'twitter', tweet.id):
                uri = post_to_bluesky(tweet.text)
                save_synced_post(...)

def sync_bluesky_to_twitter():
    """
    Actualizado para manejar threads.
    """
    posts = fetch_posts_from_bluesky(BSKY_USERNAME)

    for post in posts:
        # Detectar si es thread
        if is_bluesky_thread(post):
            thread_posts = fetch_bluesky_thread(post.uri, BSKY_USERNAME)
            thread_id = f"bluesky_{post.uri}"

            # Verificar si ya sincronizado
            if is_thread_synced(thread_id):
                logger.info(f"Thread {thread_id} already synced, skipping")
                continue

            # Sincronizar thread completo
            logger.info(f"Syncing thread {thread_id} ({len(thread_posts)} posts)")
            tweet_ids = post_thread_to_twitter([p.text for p in thread_posts])

            # Guardar en DB
            posts_data = [
                {
                    'twitter_id': tid,
                    'bluesky_uri': p.uri,
                    'content': p.text
                }
                for p, tid in zip(thread_posts, tweet_ids)
            ]
            save_synced_thread(posts_data, 'bluesky', 'twitter', thread_id)
        else:
            # Post simple (código existente)
            if should_sync_post(post.text, 'bluesky', post.uri):
                tweet_id = post_to_twitter(post.text)
                save_synced_post(...)
```

**Tests** (`tests/test_thread_orchestration.py` - NEW):
1. `test_sync_twitter_thread_to_bluesky()`: Thread Twitter → Bluesky
2. `test_sync_bluesky_thread_to_twitter()`: Thread Bluesky → Twitter
3. `test_thread_deduplication_twitter_source()`: No duplicar threads de Twitter
4. `test_thread_deduplication_bluesky_source()`: No duplicar threads de Bluesky
5. `test_mixed_threads_and_singles()`: Mix de threads y posts simples

**Tiempo estimado**: 1.5 horas

---

### 5. THREAD-BIDIR-005: End-to-End Loop Prevention Verification
**Prioridad**: Crítica (Verification - 1 hora)
**Descripción**: Probar matemáticamente que los threads no crean loops infinitos.

**Criterios de Aceptación**:
- Thread Twitter → Bluesky no se vuelve a sincronizar Bluesky → Twitter
- Thread Bluesky → Twitter no se vuelve a sincronizar Twitter → Bluesky
- Stress test: 50 threads bidireccionales sin loops
- Verificar que thread_id previene duplicación

**Tests** (`tests/test_thread_loop_prevention.py` - NEW):
1. `test_no_loop_twitter_thread_to_bluesky_to_twitter()`: Thread Twitter → Bluesky no regresa
2. `test_no_loop_bluesky_thread_to_twitter_to_bluesky()`: Thread Bluesky → Twitter no regresa
3. `test_stress_50_bidirectional_threads()`: 50 threads sin loops
4. `test_thread_id_prevents_duplication()`: thread_id único previene duplicados
5. `test_mixed_threads_and_singles_no_loops()`: Mix sin loops

**Tiempo estimado**: 1 hora

---

## Estrategia de Implementación

### Fase Única: Parallel Agent Deployment

Deploy 5 agentes en paralelo (similar a Sprint 4):

- **Agent 1**: THREAD-BIDIR-001 (Bluesky Thread Detection)
- **Agent 2**: THREAD-BIDIR-002 (Twitter Thread Writer)
- **Agent 3**: THREAD-BIDIR-003 (Database Schema)
- **Agent 4**: THREAD-BIDIR-004 (Orchestration)
- **Agent 5**: THREAD-BIDIR-005 (Loop Prevention Tests)

**Tiempo total estimado**: 6 horas (en paralelo: ~2 horas wall-clock)

### Testing Strategy
- TDD: Escribir tests primero para cada tarea
- Cobertura mínima: 80% para código nuevo
- End-to-end tests para loop prevention (crítico)
- Integration tests con mocks

---

## Métricas de Éxito

### Before Sprint 5:
- Tests: 86 tests
- Thread support: Unidireccional (Twitter → Bluesky only)
- Bidirectional sync: Posts simples only
- Thread loop prevention: No implementado

### After Sprint 5:
- Tests: 112+ tests (86 + 26 nuevos)
- Thread support: Bidireccional ✅
- Bidirectional sync: Posts simples + Threads ✅
- Thread loop prevention: Implementado y probado ✅

**Breakdown de tests**:
- test_bluesky_thread.py: 5 tests
- test_twitter_thread.py: 6 tests
- test_db_thread.py: 6 tests
- test_thread_orchestration.py: 5 tests
- test_thread_loop_prevention.py: 5 tests
- **Total nuevo**: 27 tests

---

## Riesgos y Mitigaciones

### Riesgo 1: Twitter API rate limits en threads largos
**Impacto**: Alto
**Probabilidad**: Media

**Mitigación**:
- Implementar sleep de 2 segundos entre tweets
- Limitar threads a 10 posts máximo
- Usar retry logic existente con exponential backoff
- Logging detallado de rate limit hits

### Riesgo 2: Bluesky no retorna threads completos
**Impacto**: Alto
**Probabilidad**: Baja

**Mitigación**:
- Investigar API de Bluesky para thread fetching
- Implementar manejo de posts eliminados/faltantes
- Fallback: Sincronizar posts individuales si thread fetch falla

### Riesgo 3: Database migration rompe datos existentes
**Impacto**: Alto
**Probabilidad**: Baja

**Mitigación**:
- Hacer migration compatible con datos existentes (ALTER TABLE)
- No modificar columnas existentes, solo agregar nuevas
- thread_id y thread_position son nullable
- Posts simples funcionan sin thread_id (NULL)

### Riesgo 4: Loop prevention falla en edge cases
**Impacto**: Crítico
**Probabilidad**: Baja

**Mitigación**:
- Tests exhaustivos end-to-end
- Stress test con 50 threads
- Verificación matemática de thread_id unicidad
- Monitoring en producción

---

## Arquitectura: Loop Prevention en Threads

### Sistema de 4 Capas

**Capa 1: thread_id único**
```
Format: {platform}_{original_post_id}
Ejemplo: "twitter_12345" o "bluesky_at://user/post/abc"

Regla: Un thread_id solo se sincroniza UNA vez
```

**Capa 2: content_hash individual**
```
Cada post del thread tiene su propio hash
Si un post ya existe (mismo hash), no se re-sincroniza
```

**Capa 3: Platform IDs**
```
twitter_id y bluesky_uri únicos por post
Detecta duplicados a nivel de post individual
```

**Capa 4: Database UNIQUE constraint**
```
content_hash tiene UNIQUE constraint
Imposible insertar duplicados a nivel de SQLite
```

### Ejemplo de Prevención:

**Escenario**: Thread de 3 tweets en Twitter
```
Tweet 1: "First tweet" (id: tw1)
Tweet 2: "Second tweet" (id: tw2)
Tweet 3: "Third tweet" (id: tw3)
```

**Paso 1: Sync Twitter → Bluesky**
```sql
INSERT INTO synced_posts
  (thread_id, thread_position, twitter_id, bluesky_uri, content_hash, source)
VALUES
  ('twitter_tw1', 0, 'tw1', 'bs1', 'hash1', 'twitter'),
  ('twitter_tw1', 1, 'tw2', 'bs2', 'hash2', 'twitter'),
  ('twitter_tw1', 2, 'tw3', 'bs3', 'hash3', 'twitter');
```

**Paso 2: Detectar thread en Bluesky**
```python
is_bluesky_thread(bs1)  # True
thread_id = "bluesky_bs1"
is_thread_synced("bluesky_bs1")  # False (nuevo ID)
```

**Paso 3: Intentar sync Bluesky → Twitter**
```python
# Cada post del thread se chequea:
should_sync_post("First tweet", "bluesky", "bs1")
  → compute_hash("First tweet") = "hash1"
  → SELECT * FROM synced_posts WHERE content_hash = "hash1"
  → FOUND! (ya existe)
  → return False ✅ BLOQUEADO
```

**Resultado**: Loop prevenido por Capa 2 (content_hash)

---

## Actualización de Documentación

Al completar Sprint 5:
1. Actualizar `ARCHITECTURE.md` sección "Sprint 5 - COMPLETADO"
2. Documentar arquitectura de loop prevention en threads
3. Agregar ejemplos de threads bidireccionales
4. Actualizar tabla de evolución (v1.3.0)
5. Mencionar Sprint 6 potencial

---

## Comandos Útiles

```bash
# Correr tests de threads
pytest tests/test_bluesky_thread.py -v
pytest tests/test_twitter_thread.py -v
pytest tests/test_db_thread.py -v
pytest tests/test_thread_orchestration.py -v
pytest tests/test_thread_loop_prevention.py -v

# Correr todos los tests nuevos
pytest tests/test_*thread*.py -v

# Correr todos los tests del proyecto
pytest -v

# Verificar migración de base de datos
sqlite3 data.db "PRAGMA table_info(synced_posts);"

# Ver threads sincronizados
sqlite3 data.db "SELECT thread_id, COUNT(*) FROM synced_posts WHERE thread_id IS NOT NULL GROUP BY thread_id;"

# Ver posiciones de un thread específico
sqlite3 data.db "SELECT thread_position, twitter_id, bluesky_uri FROM synced_posts WHERE thread_id = 'twitter_12345' ORDER BY thread_position;"
```

---

## Next Sprint (Sprint 6)

**Opciones**:
1. **MEDIA-001**: Soporte para imágenes/videos bidireccional
2. **MONITORING-001**: Dashboard web con Flask
3. **CI/CD-001**: GitHub Actions para tests automáticos
4. **QUOTE-001**: Quote tweets support
5. **PERF-001**: Optimización de DB con índices compuestos

**Estimación Sprint 6**: 1 semana

---

## Resumen Ejecutivo

**Sprint 5** completa la visión de sincronización bidireccional completa:

| Feature | Sprint 3 | Sprint 4 | Sprint 5 |
|---------|----------|----------|----------|
| Posts simples T→B | ✅ | ✅ | ✅ |
| Posts simples B→T | ❌ | ✅ | ✅ |
| Threads T→B | ✅ | ✅ | ✅ |
| Threads B→T | ❌ | ❌ | ✅ |
| Loop prevention | ❌ | ✅ (posts) | ✅ (posts + threads) |

**Deliverables**:
- 27 tests nuevos (100% cobertura features)
- 4 capas de loop prevention en threads
- Database schema v2 con thread tracking
- Sincronización bidireccional completa de threads
- Documentación exhaustiva en ARCHITECTURE.md

**ROI**:
- Costo: $0/mes (sigue usando twscrape + free APIs)
- Tiempo desarrollo: ~6 horas (2 horas wall-clock con parallel agents)
- Value: Feature completa de threads bidireccionales sin loops

---

**Fecha**: 2026-01-09
**Sprint**: 5
**Status**: 🎯 READY TO START
**Complejidad**: Media-Alta
**Riesgo**: Bajo (arquitectura probada en Sprint 3 y 4)

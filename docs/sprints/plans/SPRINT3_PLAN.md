# Sprint 3 Plan: Production Readiness & Thread Support

## Objetivos
Mejorar la robustez en producción y agregar soporte para threads de Twitter.

## Estado Actual
- ✅ Sprint 1: Bugs críticos resueltos (14 tests)
- ✅ Sprint 2: Migración a twscrape + logging + retry logic (59 tests)
- 🎯 Sprint 3: Producción-ready + sincronización de threads

## Tareas del Sprint 3

### 1. DOCKER-001: HEALTHCHECK para Dockerfile
**Prioridad**: Alta (Quick Win - 30 min)
**Descripción**: Agregar HEALTHCHECK al Dockerfile para verificar que el contenedor está funcionando correctamente.

**Criterios de Aceptación**:
- HEALTHCHECK verifica conectividad a base de datos
- Verifica que el proceso principal está corriendo
- Intervalo de 1 hora entre checks
- Timeout de 10 segundos
- 3 reintentos antes de marcar como unhealthy

**Cambios**:
- `Dockerfile`: Agregar instrucción HEALTHCHECK

**Tests**:
- Build exitoso del Dockerfile
- Verificación manual con `docker inspect`

---

### 2. DEPS-001: Pinear todas las versiones de dependencias
**Prioridad**: Alta (Quick Win - 30 min)
**Descripción**: Asegurar reproducibilidad pinneando todas las versiones de dependencias.

**Estado Actual**:
```
tweepy            # ❌ sin versión
atproto           # ❌ sin versión
tenacity==8.2.3   # ✅ pinneado
twscrape==0.12.0  # ✅ pinneado
```

**Criterios de Aceptación**:
- Todas las dependencias en requirements.txt tienen versión exacta
- Todas las dependencias de desarrollo en requirements-dev.txt tienen versión exacta
- Tests siguen pasando con versiones pinneadas

**Cambios**:
- `requirements.txt`: Pinnear tweepy y atproto
- `requirements-dev.txt`: Pinnear pytest, pytest-mock, black, flake8, pre-commit

**Tests**:
- `pip install -r requirements.txt` exitoso
- Todos los tests existentes (59) siguen pasando

---

### 3. FEATURE-002: Sincronización de threads de Twitter
**Prioridad**: Media (Effort: Medium - 2-3 horas)
**Descripción**: Detectar cuando un tweet es parte de un thread y sincronizar el thread completo a Bluesky.

**Contexto**:
Twitter permite threads (hilos) de múltiples tweets conectados. Bluesky también soporta threads mediante el campo `reply` en el post.

**Criterios de Aceptación**:
1. Detectar cuando un tweet es parte de un thread
2. Recuperar todos los tweets del thread en orden
3. Publicar el thread en Bluesky manteniendo el orden
4. Manejar rate limits y errores
5. Tests de integración con mocks

**Cambios Necesarios**:

#### 3.1 `app/twitter_scraper.py`:
```python
async def is_thread(tweet) -> bool:
    """Detecta si un tweet es parte de un thread"""
    # Un tweet es parte de thread si:
    # - Es respuesta a sí mismo (self-reply)
    # - O tiene inReplyToTweetId del mismo usuario
    pass

async def fetch_thread(tweet_id: str, username: str) -> list:
    """Recupera todos los tweets de un thread"""
    # 1. Obtener tweet original
    # 2. Seguir la cadena de replies del mismo autor
    # 3. Retornar lista ordenada cronológicamente
    pass
```

#### 3.2 `app/bluesky_handler.py`:
```python
def post_thread_to_bluesky(tweets: list) -> list:
    """Publica un thread completo en Bluesky"""
    # 1. Validar cada tweet del thread
    # 2. Publicar primer tweet
    # 3. Publicar respuestas enlazadas (reply chain)
    # 4. Retornar lista de URIs publicados
    pass
```

#### 3.3 `app/main.py`:
```python
def sync_tweets():
    """Actualizado para manejar threads"""
    tweets = fetch_tweets()

    for tweet in tweets:
        if is_thread(tweet):
            thread = fetch_thread(tweet.id, username)
            post_thread_to_bluesky(thread)
        else:
            post_to_bluesky(tweet.text)
```

**Tests** (`tests/test_thread_support.py`):
1. `test_detect_single_tweet_not_thread()`: Tweet simple no es thread
2. `test_detect_self_reply_is_thread()`: Self-reply detectado como thread
3. `test_fetch_thread_returns_ordered_tweets()`: Thread recuperado en orden
4. `test_fetch_thread_handles_missing_tweets()`: Manejo de tweets eliminados
5. `test_post_thread_to_bluesky()`: Thread publicado correctamente
6. `test_post_thread_maintains_order()`: Orden mantenido
7. `test_post_thread_handles_partial_failure()`: Manejo de fallos parciales
8. `test_thread_deduplication()`: No duplicar threads ya sincronizados
9. `test_thread_with_media()`: Threads con multimedia (futuro)
10. `test_long_thread_rate_limiting()`: Rate limiting en threads largos

---

## Estrategia de Implementación

### Fase 1: Quick Wins (Paralelo)
Deploy 2 agentes en paralelo:
- **Agent 1**: DOCKER-001 (HEALTHCHECK)
- **Agent 2**: DEPS-001 (Pin versions)

**Tiempo estimado**: 30-45 minutos

### Fase 2: Feature Development (TDD)
Deploy 1 agente:
- **Agent 3**: FEATURE-002 (Thread support)

**Tiempo estimado**: 2-3 horas

### Testing Strategy
- TDD: Escribir tests primero
- Cobertura mínima: 80% para nuevo código
- Integration tests con mocks
- Manual testing con Docker build

---

## Métricas de Éxito

### Before Sprint 3:
- Tests: 59 tests
- Docker: Sin HEALTHCHECK
- Dependencies: 2/4 pinneadas (50%)
- Features: Tweet simple sync only

### After Sprint 3:
- Tests: 69+ tests (59 + 10 nuevos)
- Docker: HEALTHCHECK configurado ✅
- Dependencies: 100% pinneadas ✅
- Features: Tweet simple + Thread sync ✅

---

## Riesgos y Mitigaciones

### Riesgo 1: twscrape no soporta thread detection
**Mitigación**:
- Investigar API de twscrape primero
- Fallback: Usar heurísticas basadas en timestamps y IDs

### Riesgo 2: Bluesky rate limits en threads largos
**Mitigación**:
- Implementar rate limiting con sleep entre posts
- Usar retry logic existente
- Limitar threads a 10 tweets máximo inicialmente

### Riesgo 3: Versiones pinneadas rompen compatibilidad
**Mitigación**:
- Correr todos los tests después de pinnear
- Usar versiones actuales en requirements.txt

---

## Actualización de Documentación

Al completar Sprint 3:
1. Actualizar `ARCHITECTURE.md` sección "Sprint 3 - COMPLETADO"
2. Actualizar `.env.example` si hay nuevas variables
3. Actualizar README.md con features de threads
4. Agregar comentarios en código nuevo

---

## Comandos Útiles

```bash
# Build Docker con healthcheck
docker build -t chirpsyncer:sprint3 .
docker inspect --format='{{.State.Health.Status}}' chirpsyncer

# Verificar versiones pinneadas
pip list | grep -E "(tweepy|atproto|tenacity|twscrape)"

# Correr tests nuevos
pytest tests/test_thread_support.py -v

# Correr todos los tests
pytest -v
```

---

## Next Sprints (Futuro)

**Sprint 4** (Opcional):
- FEATURE-001: Soporte para imágenes/multimedia
- MONITORING-001: Dashboard web de monitoreo
- CI/CD: GitHub Actions para tests automáticos

---

**Fecha**: 2026-01-09
**Sprint**: 3
**Status**: 🎯 READY TO START

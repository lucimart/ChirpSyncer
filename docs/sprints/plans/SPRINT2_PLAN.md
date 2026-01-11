# Sprint 2: Migración a twscrape + Mejoras de Robustez

**Fecha de inicio:** 2026-01-08
**Estimación:** 2 semanas
**Estado:** PLANEADO

---

## 🎯 Objetivo Principal

Migrar de Twitter API (pago) a **twscrape** (gratuito) y mejorar la robustez del sistema con logging estructurado, retry logic, y validaciones adicionales.

---

## 📋 Contexto de la Decisión

### Problema Actual

**Twitter API Free Tier NO permite leer tweets** (solo escribir 1,500/mes):
- El código actual usa `tweepy` con API v1.1
- Endpoint: `/statuses/user_timeline` requiere tier Basic ($100/mes)
- Las 100 lecturas/mes mencionadas en código **ya no existen** en 2026
- La app actualmente **NO FUNCIONA** con tier gratuito

### Investigación de Alternativas

Se evaluaron 7 opciones:

| Opción | Costo | Confiabilidad | Legalidad | Mantenimiento |
|--------|-------|---------------|-----------|---------------|
| **twscrape** ⭐ | $0 | Alta | ⚠️ Gray | Bajo |
| TweeterPy | $0 | Media | ⚠️ Gray | Medio |
| Playwright/Selenium | $0 | Media | ⚠️ Gray | Alto (10-15h/mes) |
| Twitter API Basic | $100/mes | Máxima | ✅ Legal | Ninguno |
| snscrape | - | ❌ Roto | - | - |
| Nitter | - | ❌ Muerto | - | - |
| Twitter Free API | $0 | ❌ Sin lectura | ✅ Legal | - |

### Decisión: twscrape

**Razones:**
1. ✅ **Gratuito** - Sin costos mensuales
2. ✅ **Confiable** - Activamente mantenido para 2025/2026
3. ✅ **Usa credenciales existentes** - Puede usar los tokens del usuario
4. ✅ **Async Python** - Moderno y eficiente
5. ✅ **Sin rate limits** - Scraping ilimitado
6. ⚠️ **Legalidad** - Gray area pero defensible legalmente (hiQ vs LinkedIn)

**Trade-off aceptable:** Viola ToS de Twitter pero es legal para datos públicos propios.

---

## 📊 Tareas del Sprint 2

### 🔴 CRÍTICAS (Bloquean funcionalidad)

#### MIGRATE-001: Migrar de tweepy a twscrape
**Prioridad:** P0 (CRÍTICA)
**Estimación:** 4 horas
**Descripción:** Reemplazar la integración de Twitter API por twscrape

**Subtareas:**
1. Instalar `twscrape` en requirements.txt
2. Crear nuevo módulo `app/twitter_scraper.py` con API de twscrape
3. Implementar patrón Adapter para mantener interfaz compatible
4. Actualizar `config.py` para nuevas credenciales (username, password, email)
5. Migrar funciones:
   - `fetch_tweets()` → scraping con twscrape
   - `get_rate_limit_status()` → eliminar (ya no aplica)
6. Tests: Mock de twscrape con async support
7. Documentación: Actualizar README con nuevas credenciales

**Criterios de aceptación:**
- ✅ App puede fetchear tweets sin Twitter API
- ✅ Mantiene compatibilidad con DB existente
- ✅ Tests pasan con mocks de async functions
- ✅ README actualizado con setup de twscrape

---

### 🟡 IMPORTANTES (Mejoran robustez)

#### LOGGING-001: Implementar logging estructurado
**Prioridad:** P1
**Estimación:** 2 horas
**Descripción:** Reemplazar todos los `print()` por `logging.Logger`

**Subtareas:**
1. Crear módulo `app/logger.py` con configuración centralizada
2. Configurar formato: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
3. Niveles: DEBUG, INFO, WARNING, ERROR
4. Reemplazar en todos los módulos:
   - `app/main.py` (3 prints)
   - `app/twitter_scraper.py` (nuevo)
   - `app/bluesky_handler.py` (2 prints)
5. Rotación de logs: max 10MB, 5 backups
6. Tests: Captura de logs en tests

**Criterios de aceptación:**
- ✅ Zero `print()` statements en producción
- ✅ Logs con timestamps y niveles
- ✅ Rotación automática configurada
- ✅ Tests verifican logging correcto

---

#### ERROR-001: Retry logic con exponential backoff
**Prioridad:** P1
**Estimación:** 2 horas
**Descripción:** Añadir reintentos automáticos en fallos de API

**Subtareas:**
1. Instalar `tenacity` en requirements.txt
2. Decorador `@retry` en:
   - `fetch_tweets()` - 3 intentos, backoff 2^x
   - `post_to_bluesky()` - 3 intentos, backoff 2^x
   - `login_to_bluesky()` - 2 intentos, backoff 2^x
3. Configurar excepciones a reintentar:
   - Network errors (ConnectionError, Timeout)
   - HTTP 5xx (server errors)
   - NO reintentar: 4xx (client errors)
4. Logging de reintentos
5. Tests: Mock de fallos transitorios

**Criterios de aceptación:**
- ✅ Reintentos automáticos en fallos de red
- ✅ Backoff exponencial implementado
- ✅ Logs muestran intentos
- ✅ Tests verifican retry logic

---

#### ERROR-002: Validación de longitud de texto Bluesky
**Prioridad:** P1
**Estimación:** 1 hora
**Descripción:** Validar que tweets no excedan 300 chars de Bluesky

**Subtareas:**
1. Función `validate_post_length()` en `bluesky_handler.py`
2. Truncar texto si > 300 chars con "..." al final
3. Logging de warning cuando se trunca
4. Test: posts largos se truncan correctamente
5. Test: posts < 300 chars no se modifican

**Criterios de aceptación:**
- ✅ Posts > 300 chars se truncan a 297 + "..."
- ✅ Warning en logs cuando se trunca
- ✅ Tests verifican truncamiento
- ✅ No errores al postear

---

### 🟢 DESEABLES (Mejoran calidad)

#### DEPS-001: Pinear versiones en requirements.txt
**Prioridad:** P2
**Estimación:** 30 min
**Descripción:** Especificar versiones exactas de dependencias

**Subtareas:**
1. Listar versiones actuales instaladas
2. Actualizar requirements.txt con versiones pinneadas
3. Actualizar requirements-dev.txt con versiones
4. Documentar en ARCHITECTURE.md

**Nuevo requirements.txt:**
```
twscrape==0.12.0
atproto==0.0.50
tenacity==8.2.3
```

**Criterios de aceptación:**
- ✅ Todas las deps con versión exacta
- ✅ CI pasa con versiones pinneadas
- ✅ Documentado en ARCHITECTURE.md

---

#### DOCKER-001: Agregar HEALTHCHECK a Dockerfile
**Prioridad:** P2
**Estimación:** 30 min
**Descripción:** Añadir healthcheck para monitoreo de Docker

**Subtareas:**
1. Crear endpoint `/health` o script de verificación
2. Agregar `HEALTHCHECK` a Dockerfile
3. Verificar que BD es accesible
4. Test manual con `docker inspect`

**Dockerfile addition:**
```dockerfile
HEALTHCHECK --interval=1h --timeout=10s --start-period=5s \
  CMD python -c "import sqlite3; conn = sqlite3.connect('data.db'); conn.close()" || exit 1
```

**Criterios de aceptación:**
- ✅ Healthcheck ejecuta cada hora
- ✅ Verifica conectividad a BD
- ✅ Docker muestra estado healthy
- ✅ Documentado en README

---

#### CONFIG-003: Migrar .env a nuevas credenciales
**Prioridad:** P2
**Estimación:** 30 min
**Descripción:** Actualizar variables de entorno para twscrape

**Cambios en config.py:**
```python
# Before (Twitter API)
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# After (twscrape)
TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")
TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
TWITTER_EMAIL_PASSWORD = os.getenv("TWITTER_EMAIL_PASSWORD")
```

**Subtareas:**
1. Actualizar `config.py`
2. Actualizar `.env.example`
3. Actualizar validación en `validation.py`
4. Actualizar tests
5. Documentar migración en README

**Criterios de aceptación:**
- ✅ Nuevas variables en config.py
- ✅ .env.example actualizado
- ✅ Validación funciona
- ✅ Backward compatibility opcional (migración gradual)

---

## 🏗️ Arquitectura Post-Sprint 2

### Estructura de Módulos

```
app/
├── __init__.py
├── main.py                    # Orquestador (sin cambios)
├── config.py                  # Nuevas vars: TWITTER_USERNAME, etc.
├── logger.py                  # NUEVO: Configuración de logging
├── validation.py              # Actualizado: validar nuevas vars
├── db_handler.py              # Sin cambios
├── twitter_scraper.py         # NUEVO: Integración twscrape (reemplaza twitter_handler.py)
└── bluesky_handler.py         # Actualizado: logging + retry + validación
```

### Flujo Actualizado

```
main.py:
  └─> validate_credentials()         # Valida nuevas credenciales
  └─> initialize_db()
  └─> login_to_bluesky()            # Con retry logic
  └─> while True:
        ├─> fetch_tweets()            # Ahora usa twscrape (async wrapper)
        │   └─> logger.info()         # Logging estructurado
        │   └─> @retry decorator      # Retry automático
        │   └─> twscrape async calls
        │
        ├─> for tweet in tweets:
        │     └─> validate_length()   # Validación 300 chars
        │     └─> post_to_bluesky()   # Con retry logic
        │           └─> logger.info() # Logging estructurado
        │
        └─> time.sleep(POLL_INTERVAL)
```

---

## 📦 Nuevas Dependencias

```txt
# requirements.txt (actualizado)
twscrape==0.12.0        # Scraping de Twitter
atproto==0.0.50         # Bluesky client
tenacity==8.2.3         # Retry logic
```

```txt
# requirements-dev.txt (actualizado)
pytest==8.0.0
pytest-mock==3.12.0
pytest-asyncio==0.23.0  # NUEVO: Para tests async
black==24.1.0
flake8==7.0.0
pre-commit==3.6.0
```

---

## 🧪 Estrategia de Testing

### Tests Nuevos a Crear

1. **tests/test_twitter_scraper.py** (nuevo)
   - test_fetch_tweets_with_twscrape
   - test_fetch_tweets_handles_async
   - test_scraper_initialization
   - test_account_pool_setup
   - Mock: twscrape.API y gather

2. **tests/test_logger.py** (nuevo)
   - test_logger_configuration
   - test_log_rotation
   - test_log_levels

3. **tests/test_retry_logic.py** (nuevo)
   - test_retry_on_network_error
   - test_no_retry_on_4xx
   - test_exponential_backoff
   - test_max_attempts_reached

4. **tests/test_bluesky_handler.py** (actualizado)
   - test_validate_post_length_truncates
   - test_validate_post_length_keeps_short
   - test_retry_on_bluesky_failure

### Coverage Goal: 98%

---

## 🚀 Plan de Deployment

### Fase 1: Setup Local (Día 1)
1. Instalar twscrape: `pip install twscrape`
2. Setup account pool:
   ```bash
   python -m twscrape add_accounts accounts.txt
   python -m twscrape login_accounts
   ```
3. Test manual de fetch

### Fase 2: Desarrollo con TDD (Días 2-7)
- Agentes paralelos implementando cada tarea
- Tests primero, luego implementación
- Commits incrementales

### Fase 3: Integración (Día 8-9)
- Merge de branches de agentes
- Tests de integración completos
- Actualización de documentación

### Fase 4: Deployment (Día 10)
- Build de Docker con nuevas deps
- Migración de credenciales en .env
- Deploy a producción
- Monitoreo de logs

---

## 📊 Métricas de Éxito

| Métrica | Antes Sprint 2 | Después Sprint 2 | Objetivo |
|---------|----------------|------------------|----------|
| **Costo mensual** | N/A (app rota) | $0 | $0 ✅ |
| **Tests** | 14 | ~25 | +11 tests |
| **Coverage** | 95% | 98% | +3% |
| **LOC producción** | 235 | ~350 | +115 LOC |
| **Reintentos** | 0 | Automáticos | ✅ |
| **Logging** | print() | logger | ✅ |
| **Dependencias pinneadas** | No | Sí | ✅ |

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: twscrape deja de funcionar
**Probabilidad:** Baja (activamente mantenido)
**Impacto:** Alto (app deja de funcionar)
**Mitigación:**
- Implementar patrón Adapter para fácil swap
- Tener TweeterPy como backup
- Monitorear GitHub de twscrape

### Riesgo 2: Twitter bloquea cuenta
**Probabilidad:** Media
**Impacto:** Medio (requiere nueva cuenta)
**Mitigación:**
- Usar account rotation de twscrape
- Tener 2-3 cuentas en pool
- Respetar rate limits naturales

### Riesgo 3: Cambio en estructura de async
**Probabilidad:** Baja
**Impacto:** Medio (refactoring necesario)
**Mitigación:**
- Usar sync wrappers en main.py
- Tests robustos de async

---

## 📝 Checklist de Implementación

### Pre-Sprint
- [x] Investigación de alternativas completada
- [ ] Crear branch: `sprint-2/migrate-to-twscrape`
- [ ] Actualizar ARCHITECTURE.md con este plan

### Durante Sprint
- [ ] MIGRATE-001: Migrar a twscrape
- [ ] LOGGING-001: Logging estructurado
- [ ] ERROR-001: Retry logic
- [ ] ERROR-002: Validación longitud
- [ ] DEPS-001: Pinear versiones
- [ ] DOCKER-001: Healthcheck
- [ ] CONFIG-003: Nuevas credenciales

### Post-Sprint
- [ ] Todos los tests pasan (≥25 tests)
- [ ] Coverage ≥98%
- [ ] Documentación actualizada
- [ ] README con instrucciones de migración
- [ ] Docker build exitoso
- [ ] Deploy a producción

---

## 🎯 Entregables Finales

1. **Código funcional** con twscrape integrado
2. **25+ tests** con 98% coverage
3. **ARCHITECTURE.md** actualizado con Sprint 2
4. **README.md** con nuevas instrucciones de setup
5. **MIGRATION_GUIDE.md** para usuarios existentes
6. **Docker image** funcional con healthcheck

---

**Plan creado por:** Sistema de agentes paralelos
**Metodología:** TDD + Patrón Adapter + Async/Await
**Fecha:** 2026-01-08

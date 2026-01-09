# Sprint 7 Plan: Twitter Analytics & Advanced Features

## Objetivo Principal

Transformar ChirpSyncer en una **herramienta completa de gestión de Twitter** con analytics avanzados, programación de tweets, limpieza automática, búsqueda avanzada y gestión de contenido guardado.

---

## Estado Actual

- ✅ Sprint 1-5: Sync bidireccional con medios, threads, stats y dashboard
- ✅ Sprint 6: Multi-user support con credenciales encriptadas
- 🎯 Sprint 7: Analytics y features avanzados de gestión

---

## Visión del Sprint 7

Convertir ChirpSyncer de una herramienta de sync a un **Social Media Management Tool** completo con:
- 📊 Analytics detallados de engagement
- ⏰ Programación de tweets (cola de publicación)
- 🗑️ Limpieza automática de tweets antiguos
- 🔍 Búsqueda avanzada multi-criterio
- 📑 Sistema de guardado de contenido (bookmarks personales)
- 📈 Reportes y exportación de datos

---

## Tareas del Sprint 7

### 1. ANALYTICS-001: Twitter Analytics Comprehensivos (Alta Prioridad)

**Descripción**: Sistema completo de análisis de engagement, métricas y tendencias de tweets.

#### 1.1 Base de Datos de Métricas

**Archivo**: `app/analytics_tracker.py` (NUEVO)

**Tabla `tweet_metrics`:**
```sql
CREATE TABLE IF NOT EXISTS tweet_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tweet_id TEXT NOT NULL,
    platform TEXT NOT NULL,        -- 'twitter' or 'bluesky'

    -- Métricas de engagement
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    quotes_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0,
    impressions_count INTEGER DEFAULT 0,

    -- Métricas calculadas
    engagement_rate REAL DEFAULT 0.0,  -- (likes+rts+replies)/impressions * 100
    engagement_score INTEGER DEFAULT 0, -- Puntuación ponderada

    -- Metadata
    fetched_at INTEGER NOT NULL,
    tweet_created_at INTEGER NOT NULL,
    tweet_text TEXT,
    has_media INTEGER DEFAULT 0,
    media_type TEXT,               -- 'image', 'video', 'gif'
    is_thread INTEGER DEFAULT 0,
    is_reply INTEGER DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, tweet_id, fetched_at)
);

CREATE INDEX idx_metrics_user ON tweet_metrics(user_id);
CREATE INDEX idx_metrics_tweet ON tweet_metrics(tweet_id);
CREATE INDEX idx_metrics_created ON tweet_metrics(tweet_created_at);
CREATE INDEX idx_metrics_engagement ON tweet_metrics(engagement_rate DESC);
```

**Tabla `analytics_snapshots`:**
```sql
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    snapshot_date INTEGER NOT NULL,  -- Unix timestamp (día)

    -- Agregados del día
    total_tweets INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_retweets INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    avg_engagement_rate REAL DEFAULT 0.0,

    -- Followers (si disponible)
    followers_count INTEGER,
    followers_gained INTEGER DEFAULT 0,
    followers_lost INTEGER DEFAULT 0,

    -- Top performing
    best_tweet_id TEXT,
    best_tweet_engagement REAL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user ON analytics_snapshots(user_id);
CREATE INDEX idx_snapshots_date ON analytics_snapshots(snapshot_date);
```

#### 1.2 Funciones de Analytics

```python
class AnalyticsTracker:
    def fetch_tweet_metrics(user_id: int, tweet_id: str) -> dict:
        """Obtener métricas actuales de un tweet"""

    def update_all_metrics(user_id: int, since_days: int = 7) -> int:
        """Actualizar métricas de todos los tweets recientes"""

    def calculate_engagement_rate(metrics: dict) -> float:
        """Calcular tasa de engagement"""

    def calculate_engagement_score(metrics: dict) -> int:
        """Calcular puntuación de engagement (0-100)"""

    def get_top_tweets(user_id: int, period: str = '30d',
                       metric: str = 'engagement_rate',
                       limit: int = 10) -> List[dict]:
        """Obtener top tweets por métrica"""

    def get_metrics_timeline(user_id: int, period: str = '30d') -> List[dict]:
        """Timeline de métricas agregadas"""

    def get_engagement_by_time(user_id: int, period: str = '30d') -> dict:
        """Engagement por hora del día / día de la semana"""

    def get_content_performance(user_id: int, period: str = '30d') -> dict:
        """Performance por tipo de contenido (texto, imagen, video, thread)"""

    def create_daily_snapshot(user_id: int, date: int) -> bool:
        """Crear snapshot diario de analytics"""

    def export_analytics(user_id: int, format: str = 'csv') -> str:
        """Exportar analytics a CSV/JSON"""
```

#### 1.3 Dashboard de Analytics

**Archivo**: `app/templates/analytics.html` (NUEVO)

**Secciones del Dashboard:**

1. **Overview (Resumen)**
   - Cards con métricas principales (últimos 30 días):
     - Total tweets
     - Total engagement (likes + RTs + replies)
     - Promedio engagement rate
     - Mejor tweet del período
   - Gráfico de línea: Engagement timeline
   - Gráfico de barras: Tweets por día

2. **Top Content**
   - Tabla de top 10 tweets por:
     - Engagement rate
     - Total likes
     - Total retweets
     - Replies
   - Filtros: Período (7d, 30d, 90d, año, todo)

3. **Content Analysis**
   - Gráfico de pastel: Distribución por tipo
     - Texto solo
     - Con imagen
     - Con video
     - Threads
   - Performance por tipo (engagement rate promedio)
   - Hashtags más efectivos (engagement)
   - Palabras clave más usadas

4. **Timing Analysis**
   - Heatmap: Mejor hora para publicar (día/hora)
   - Gráfico: Engagement por día de la semana
   - Recomendación: "Tus mejores horas son X, Y, Z"

5. **Growth Tracking** (si disponible)
   - Gráfico de followers over time
   - Followers gained/lost por día
   - Proyección de crecimiento

6. **Export**
   - Botones para exportar datos:
     - CSV completo
     - JSON para análisis externo
     - PDF report

**Rutas Flask:**
```python
@app.route('/analytics')
@require_auth
def analytics_dashboard():
    """Dashboard principal de analytics"""

@app.route('/api/analytics/overview')
@require_auth
def analytics_overview():
    """API: Datos de overview"""

@app.route('/api/analytics/top-tweets')
@require_auth
def analytics_top_tweets():
    """API: Top tweets"""

@app.route('/api/analytics/timeline')
@require_auth
def analytics_timeline():
    """API: Timeline de métricas"""

@app.route('/api/analytics/content-analysis')
@require_auth
def analytics_content_analysis():
    """API: Análisis de contenido"""

@app.route('/api/analytics/timing')
@require_auth
def analytics_timing():
    """API: Análisis de timing"""

@app.route('/api/analytics/export')
@require_auth
def analytics_export():
    """API: Exportar analytics"""
```

**Tests**: `tests/test_analytics.py` (15 tests)

---

### 2. SCHEDULE-001: Programación de Tweets (Alta Prioridad)

**Descripción**: Sistema de cola para programar tweets para publicación futura.

#### 2.1 Base de Datos de Tweets Programados

**Tabla `scheduled_tweets`:**
```sql
CREATE TABLE IF NOT EXISTS scheduled_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,         -- 'twitter', 'bluesky', 'both'

    -- Contenido
    content TEXT NOT NULL,
    media_urls TEXT,               -- JSON array de URLs
    media_alt_texts TEXT,          -- JSON array de alt texts
    is_thread INTEGER DEFAULT 0,
    thread_tweets TEXT,            -- JSON array si es thread

    -- Scheduling
    scheduled_for INTEGER NOT NULL, -- Unix timestamp
    timezone TEXT DEFAULT 'UTC',
    status TEXT DEFAULT 'pending',  -- 'pending', 'posted', 'failed', 'cancelled'

    -- Resultados
    posted_at INTEGER,
    twitter_tweet_id TEXT,
    bluesky_post_uri TEXT,
    error_message TEXT,

    -- Metadata
    created_at INTEGER NOT NULL,
    created_by_user_id INTEGER NOT NULL,
    updated_at INTEGER,

    -- Opciones avanzadas
    retry_on_fail INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_scheduled_user ON scheduled_tweets(user_id);
CREATE INDEX idx_scheduled_status ON scheduled_tweets(status);
CREATE INDEX idx_scheduled_for ON scheduled_tweets(scheduled_for);
```

**Tabla `posting_queue`:**
```sql
CREATE TABLE IF NOT EXISTS posting_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduled_tweet_id INTEGER NOT NULL,
    queued_at INTEGER NOT NULL,
    processing_started_at INTEGER,
    processing_completed_at INTEGER,
    status TEXT DEFAULT 'queued',  -- 'queued', 'processing', 'completed', 'failed'
    worker_id TEXT,

    FOREIGN KEY (scheduled_tweet_id) REFERENCES scheduled_tweets(id) ON DELETE CASCADE
);

CREATE INDEX idx_queue_status ON posting_queue(status);
CREATE INDEX idx_queue_scheduled ON posting_queue(scheduled_tweet_id);
```

#### 2.2 Scheduler Service

**Archivo**: `app/scheduler.py` (NUEVO)

```python
class TweetScheduler:
    def schedule_tweet(user_id: int, platform: str,
                      content: str, scheduled_for: int,
                      media_urls: List[str] = None,
                      is_thread: bool = False,
                      thread_tweets: List[str] = None) -> int:
        """Programar un nuevo tweet"""

    def cancel_scheduled_tweet(scheduled_tweet_id: int, user_id: int) -> bool:
        """Cancelar tweet programado"""

    def update_scheduled_tweet(scheduled_tweet_id: int, user_id: int,
                              **kwargs) -> bool:
        """Actualizar tweet programado"""

    def get_scheduled_tweets(user_id: int,
                            status: str = None,
                            limit: int = 100) -> List[dict]:
        """Obtener tweets programados del usuario"""

    def get_queue_status() -> dict:
        """Estado actual de la cola de publicación"""

    def process_queue():
        """Procesar cola de tweets programados (ejecutar en background)"""

    def post_scheduled_tweet(scheduled_tweet_id: int) -> bool:
        """Publicar un tweet programado"""

    def cleanup_old_scheduled(days: int = 30) -> int:
        """Limpiar tweets programados antiguos (posted/failed)"""
```

**Background Worker**: `app/scheduler_worker.py` (NUEVO)

```python
import threading
import time

class SchedulerWorker:
    """Background worker que procesa la cola cada minuto"""

    def __init__(self):
        self.running = False
        self.thread = None

    def start(self):
        """Iniciar worker en background thread"""
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        """Detener worker"""
        self.running = False
        if self.thread:
            self.thread.join()

    def _run(self):
        """Loop principal del worker"""
        scheduler = TweetScheduler()
        while self.running:
            try:
                scheduler.process_queue()
            except Exception as e:
                logger.error(f"Error in scheduler worker: {e}")

            # Esperar 1 minuto
            time.sleep(60)
```

#### 2.3 UI de Programación

**Template**: `app/templates/schedule_tweets.html` (NUEVO)

**Secciones:**

1. **Nuevo Tweet Programado**
   - Form para crear tweet:
     - Textarea para contenido (contador de caracteres)
     - Selector de plataforma (Twitter, Bluesky, Ambas)
     - Date/time picker para scheduling
     - Selector de timezone
     - Upload de medios (opcional)
     - Checkbox: "Es un thread" → mostrar campos adicionales
     - Botón: "Programar" / "Guardar como borrador"

2. **Cola de Publicación**
   - Tabla con tweets programados:
     - Columnas: Contenido (preview), Plataforma, Fecha programada, Estado
     - Acciones: Ver, Editar, Eliminar, Publicar ahora
     - Filtros: Estado (pending, posted, failed), Plataforma, Fecha
     - Búsqueda por contenido

3. **Calendario**
   - Vista de calendario con tweets programados
   - Drag & drop para reprogramar
   - Colores por plataforma

4. **Estadísticas de Cola**
   - Tweets programados (pending)
   - Tweets publicados hoy
   - Tweets fallidos
   - Próximo tweet en: X minutos

**Rutas Flask:**
```python
@app.route('/schedule')
@require_auth
def schedule_list():
    """Lista de tweets programados"""

@app.route('/schedule/new', methods=['GET', 'POST'])
@require_auth
def schedule_new():
    """Crear nuevo tweet programado"""

@app.route('/schedule/<int:id>', methods=['GET'])
@require_auth
def schedule_detail(id):
    """Ver detalle de tweet programado"""

@app.route('/schedule/<int:id>/edit', methods=['GET', 'POST'])
@require_auth
def schedule_edit(id):
    """Editar tweet programado"""

@app.route('/schedule/<int:id>/cancel', methods=['POST'])
@require_auth
def schedule_cancel(id):
    """Cancelar tweet programado"""

@app.route('/schedule/<int:id>/post-now', methods=['POST'])
@require_auth
def schedule_post_now(id):
    """Publicar tweet programado inmediatamente"""

@app.route('/api/schedule/queue-status')
@require_auth
def schedule_queue_status():
    """Estado de la cola"""

@app.route('/api/schedule/calendar')
@require_auth
def schedule_calendar():
    """Datos para vista de calendario"""
```

**Tests**: `tests/test_scheduler.py` (18 tests)

---

### 3. CLEANUP-001: Limpieza Automática de Tweets (Media Prioridad)

**Descripción**: Sistema para eliminar tweets antiguos automáticamente según criterios configurables.

#### 3.1 Base de Datos de Reglas

**Tabla `cleanup_rules`:**
```sql
CREATE TABLE IF NOT EXISTS cleanup_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,

    -- Criterios de selección
    older_than_days INTEGER,          -- Días desde publicación
    max_tweets_to_keep INTEGER,       -- Mantener solo N tweets más recientes
    min_likes INTEGER,                -- Solo eliminar si likes < N
    min_retweets INTEGER,             -- Solo eliminar si RTs < N
    exclude_replies INTEGER DEFAULT 0, -- Excluir replies
    exclude_threads INTEGER DEFAULT 0, -- Excluir threads
    exclude_with_media INTEGER DEFAULT 0, -- Excluir tweets con medios

    -- Ejecución
    run_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    last_run_at INTEGER,
    next_run_at INTEGER,

    -- Seguridad
    require_confirmation INTEGER DEFAULT 1,
    dry_run INTEGER DEFAULT 1,         -- Si es 1, solo simula

    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Tabla `cleanup_log`:**
```sql
CREATE TABLE IF NOT EXISTS cleanup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rule_id INTEGER,
    executed_at INTEGER NOT NULL,

    -- Resultados
    tweets_scanned INTEGER DEFAULT 0,
    tweets_deleted INTEGER DEFAULT 0,
    tweets_failed INTEGER DEFAULT 0,
    duration_seconds INTEGER,

    -- Detalles
    is_dry_run INTEGER DEFAULT 0,
    deleted_tweet_ids TEXT,           -- JSON array
    errors TEXT,                      -- JSON array de errores

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES cleanup_rules(id) ON DELETE SET NULL
);
```

#### 3.2 Cleanup Manager

**Archivo**: `app/cleanup_manager.py` (NUEVO)

```python
class CleanupManager:
    def create_rule(user_id: int, name: str, criteria: dict) -> int:
        """Crear nueva regla de limpieza"""

    def update_rule(rule_id: int, user_id: int, **kwargs) -> bool:
        """Actualizar regla"""

    def delete_rule(rule_id: int, user_id: int) -> bool:
        """Eliminar regla"""

    def get_rules(user_id: int) -> List[dict]:
        """Obtener reglas del usuario"""

    def execute_rule(rule_id: int, dry_run: bool = True) -> dict:
        """Ejecutar regla de limpieza"""

    def find_tweets_to_delete(user_id: int, criteria: dict) -> List[str]:
        """Encontrar tweets que cumplen criterios"""

    def delete_tweets(user_id: int, tweet_ids: List[str]) -> dict:
        """Eliminar tweets (ejecuta en Twitter)"""

    def schedule_rule_execution(rule_id: int, next_run: int) -> bool:
        """Programar próxima ejecución"""

    def get_cleanup_history(user_id: int, limit: int = 50) -> List[dict]:
        """Historial de limpiezas"""

    def estimate_cleanup(user_id: int, criteria: dict) -> dict:
        """Estimar cuántos tweets se eliminarían"""
```

#### 3.3 UI de Limpieza

**Template**: `app/templates/cleanup_rules.html` (NUEVO)

**Secciones:**

1. **Crear Regla de Limpieza**
   - Form wizard paso a paso:
     - **Paso 1: Nombre y descripción**
     - **Paso 2: Criterios de antigüedad**
       - Eliminar tweets más antiguos que: [X días]
       - O mantener solo los últimos: [N tweets]
     - **Paso 3: Filtros de engagement**
       - Solo eliminar si likes < [N]
       - Solo eliminar si retweets < [N]
     - **Paso 4: Exclusiones**
       - Checkboxes: Excluir replies, threads, tweets con medios
     - **Paso 5: Programación**
       - Frecuencia: Diaria, Semanal, Mensual
       - Hora de ejecución
     - **Paso 6: Confirmación**
       - Preview de tweets que se eliminarían (primeros 10)
       - Total estimado
       - Checkbox: "Confirmo que quiero eliminar"

2. **Lista de Reglas**
   - Tabla con reglas activas:
     - Nombre, Criterios (resumen), Última ejecución, Próxima ejecución
     - Toggle: Activar/Desactivar
     - Acciones: Editar, Ejecutar ahora, Ver historial, Eliminar

3. **Historial de Limpieza**
   - Tabla con ejecuciones pasadas:
     - Fecha, Regla, Tweets escaneados, Eliminados, Duración
     - Link para ver detalles (IDs eliminados)

4. **Simulación (Dry Run)**
   - Ejecutar regla en modo simulación
   - Mostrar lista de tweets que se eliminarían
   - Preview de cada tweet
   - Botón: "Confirmar eliminación" para ejecutar real

**Rutas Flask:**
```python
@app.route('/cleanup')
@require_auth
def cleanup_rules_list():
    """Lista de reglas de limpieza"""

@app.route('/cleanup/new', methods=['GET', 'POST'])
@require_auth
def cleanup_rule_new():
    """Crear nueva regla"""

@app.route('/cleanup/<int:id>/edit', methods=['GET', 'POST'])
@require_auth
def cleanup_rule_edit(id):
    """Editar regla"""

@app.route('/cleanup/<int:id>/delete', methods=['POST'])
@require_auth
def cleanup_rule_delete(id):
    """Eliminar regla"""

@app.route('/cleanup/<int:id>/execute', methods=['POST'])
@require_auth
def cleanup_rule_execute(id):
    """Ejecutar regla (dry-run o real)"""

@app.route('/cleanup/<int:id>/toggle', methods=['POST'])
@require_auth
def cleanup_rule_toggle(id):
    """Activar/desactivar regla"""

@app.route('/cleanup/history')
@require_auth
def cleanup_history():
    """Historial de limpiezas"""

@app.route('/api/cleanup/estimate', methods=['POST'])
@require_auth
def cleanup_estimate():
    """Estimar cuántos tweets se eliminarían"""
```

**Tests**: `tests/test_cleanup.py` (12 tests)

---

### 4. SEARCH-001: Búsqueda Avanzada (Media Prioridad)

**Descripción**: Motor de búsqueda avanzada para encontrar tweets propios con múltiples criterios.

#### 4.1 Índices de Búsqueda

**Tabla `tweet_search_index`:**
```sql
CREATE TABLE IF NOT EXISTS tweet_search_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tweet_id TEXT NOT NULL,
    platform TEXT NOT NULL,

    -- Contenido indexado
    content_text TEXT NOT NULL,
    content_normalized TEXT NOT NULL, -- Lowercase, sin acentos
    hashtags TEXT,                    -- JSON array
    mentions TEXT,                    -- JSON array
    urls TEXT,                        -- JSON array

    -- Metadata
    posted_at INTEGER NOT NULL,
    has_media INTEGER DEFAULT 0,
    media_type TEXT,
    is_thread INTEGER DEFAULT 0,
    is_reply INTEGER DEFAULT 0,
    reply_to_username TEXT,

    -- Engagement
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,

    -- Full-text search
    content_fts TEXT,                 -- Para SQLite FTS5

    indexed_at INTEGER NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, tweet_id, platform)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_search_user ON tweet_search_index(user_id);
CREATE INDEX idx_search_posted ON tweet_search_index(posted_at DESC);
CREATE INDEX idx_search_hashtags ON tweet_search_index(hashtags);
CREATE INDEX idx_search_normalized ON tweet_search_index(content_normalized);

-- Full-text search index (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS tweet_search_fts USING fts5(
    content_text,
    content=tweet_search_index,
    content_rowid=id
);
```

#### 4.2 Search Engine

**Archivo**: `app/search_engine.py` (NUEVO)

```python
class TweetSearchEngine:
    def index_tweet(user_id: int, tweet_id: str, platform: str,
                   content: str, metadata: dict) -> bool:
        """Indexar un tweet para búsqueda"""

    def search(user_id: int, query: str, filters: dict = None,
              sort_by: str = 'relevance', limit: int = 50) -> List[dict]:
        """
        Búsqueda avanzada de tweets.

        query: Texto a buscar (soporta operadores)
        filters: {
            'platform': 'twitter' | 'bluesky' | None,
            'date_from': timestamp,
            'date_to': timestamp,
            'hashtags': ['tag1', 'tag2'],
            'mentions': ['user1', 'user2'],
            'has_media': True | False,
            'media_type': 'image' | 'video',
            'is_thread': True | False,
            'is_reply': True | False,
            'min_likes': int,
            'min_retweets': int,
        }
        sort_by: 'relevance' | 'date' | 'likes' | 'retweets'
        """

    def search_with_operators(user_id: int, query: str) -> List[dict]:
        """
        Búsqueda con operadores:
        - "exact phrase" (comillas para frase exacta)
        - word1 AND word2 (ambas palabras)
        - word1 OR word2 (cualquiera)
        - -excluded (palabra excluida)
        - #hashtag (buscar hashtag)
        - @mention (buscar mention)
        - has:media (con medios)
        - has:video (con video)
        - has:image (con imagen)
        - min_likes:100 (mínimo likes)
        """

    def search_hashtag(user_id: int, hashtag: str) -> List[dict]:
        """Buscar por hashtag específico"""

    def search_mention(user_id: int, username: str) -> List[dict]:
        """Buscar menciones a usuario"""

    def get_popular_hashtags(user_id: int, limit: int = 20) -> List[tuple]:
        """Hashtags más usados por el usuario"""

    def get_frequent_mentions(user_id: int, limit: int = 20) -> List[tuple]:
        """Usuarios más mencionados"""

    def rebuild_index(user_id: int) -> int:
        """Reconstruir índice completo de búsqueda"""
```

#### 4.3 UI de Búsqueda

**Template**: `app/templates/search.html` (NUEVO)

**Secciones:**

1. **Barra de Búsqueda Avanzada**
   - Input principal con autocomplete
   - Botón "Filtros avanzados" → mostrar panel
   - Sugerencias de búsqueda mientras escribe

2. **Panel de Filtros** (colapsable)
   - Rango de fechas (date picker)
   - Plataforma (Twitter, Bluesky, Ambas)
   - Con medios: Cualquiera, Solo imágenes, Solo videos
   - Tipo: Cualquiera, Solo threads, Solo replies
   - Engagement mínimo (sliders):
     - Likes: 0 - 1000+
     - Retweets: 0 - 500+
   - Hashtags específicos (input con tags)
   - Menciones específicas (input con tags)

3. **Resultados de Búsqueda**
   - Cards de tweets:
     - Preview del contenido
     - Fecha, plataforma, engagement
     - Hashtags resaltados
     - Menciones resaltadas
     - Query terms resaltados
   - Paginación (50 resultados por página)
   - Ordenar por: Relevancia, Fecha, Likes, Retweets

4. **Estadísticas de Búsqueda**
   - Total resultados encontrados
   - Rango de fechas de resultados
   - Engagement promedio de resultados
   - Hashtags más comunes en resultados

5. **Acciones en Resultados**
   - Selección múltiple de tweets
   - Acciones batch:
     - Guardar seleccionados
     - Eliminar seleccionados
     - Exportar a CSV

6. **Búsquedas Guardadas**
   - Guardar criterios de búsqueda frecuentes
   - Lista de búsquedas guardadas
   - Quick access

**Ejemplos de búsqueda:**
```
python programming          → Búsqueda simple
"machine learning"          → Frase exacta
python AND data            → Ambas palabras
python OR ruby             → Cualquiera
python -tutorial           → Python pero no tutorial
#python                    → Hashtag python
@username                  → Menciones a username
has:media min_likes:100    → Con medios y mínimo 100 likes
```

**Rutas Flask:**
```python
@app.route('/search')
@require_auth
def search_page():
    """Página de búsqueda"""

@app.route('/api/search', methods=['GET', 'POST'])
@require_auth
def api_search():
    """API de búsqueda"""

@app.route('/api/search/suggestions')
@require_auth
def search_suggestions():
    """Sugerencias de búsqueda (autocomplete)"""

@app.route('/api/search/saved', methods=['GET', 'POST'])
@require_auth
def saved_searches():
    """Búsquedas guardadas"""

@app.route('/api/search/hashtags')
@require_auth
def popular_hashtags():
    """Hashtags populares del usuario"""

@app.route('/api/search/rebuild-index', methods=['POST'])
@require_auth
def rebuild_search_index():
    """Reconstruir índice de búsqueda"""
```

**Tests**: `tests/test_search.py` (15 tests)

---

### 5. SAVED-001: Sistema de Contenido Guardado (Baja Prioridad)

**Descripción**: Bookmarks personales para guardar tweets propios y ajenos, con organización por colecciones.

#### 5.1 Base de Datos de Guardados

**Tabla `saved_tweets`:**
```sql
CREATE TABLE IF NOT EXISTS saved_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tweet_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    tweet_author_username TEXT,
    tweet_author_name TEXT,

    -- Contenido guardado
    content_text TEXT,
    content_html TEXT,
    media_urls TEXT,              -- JSON array
    has_media INTEGER DEFAULT 0,

    -- Metadata
    tweet_created_at INTEGER,
    saved_at INTEGER NOT NULL,

    -- Organización
    collection_id INTEGER,
    tags TEXT,                    -- JSON array
    notes TEXT,                   -- Notas personales
    is_favorite INTEGER DEFAULT 0,

    -- Engagement al momento de guardar
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES saved_collections(id) ON DELETE SET NULL,
    UNIQUE(user_id, tweet_id, platform)
);
```

**Tabla `saved_collections`:**
```sql
CREATE TABLE IF NOT EXISTS saved_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,                    -- Emoji o icon class
    color TEXT,                   -- Color hex
    is_public INTEGER DEFAULT 0,  -- Para compartir colecciones
    created_at INTEGER NOT NULL,
    updated_at INTEGER,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 5.2 Saved Content Manager

**Archivo**: `app/saved_manager.py` (NUEVO)

```python
class SavedContentManager:
    def save_tweet(user_id: int, tweet_id: str, platform: str,
                  collection_id: int = None, tags: List[str] = None,
                  notes: str = None) -> int:
        """Guardar un tweet"""

    def unsave_tweet(user_id: int, saved_id: int) -> bool:
        """Eliminar guardado"""

    def update_saved(saved_id: int, user_id: int, **kwargs) -> bool:
        """Actualizar tweet guardado (colección, tags, notas)"""

    def get_saved_tweets(user_id: int, collection_id: int = None,
                        tags: List[str] = None, limit: int = 50) -> List[dict]:
        """Obtener tweets guardados"""

    def search_saved(user_id: int, query: str) -> List[dict]:
        """Buscar en guardados"""

    def create_collection(user_id: int, name: str,
                         description: str = None, **kwargs) -> int:
        """Crear colección"""

    def update_collection(collection_id: int, user_id: int, **kwargs) -> bool:
        """Actualizar colección"""

    def delete_collection(collection_id: int, user_id: int) -> bool:
        """Eliminar colección"""

    def get_collections(user_id: int) -> List[dict]:
        """Obtener colecciones del usuario"""

    def move_to_collection(saved_id: int, user_id: int, collection_id: int) -> bool:
        """Mover tweet guardado a otra colección"""

    def get_popular_tags(user_id: int, limit: int = 20) -> List[tuple]:
        """Tags más usados"""

    def export_collection(collection_id: int, user_id: int, format: str = 'json') -> str:
        """Exportar colección"""
```

#### 5.3 UI de Guardados

**Template**: `app/templates/saved.html` (NUEVO)

**Layout:**

1. **Sidebar de Colecciones**
   - Lista de colecciones del usuario
   - Contador de tweets por colección
   - "Todas" (sin colección)
   - "Favoritos" (marcados como favoritos)
   - Botón: "Nueva colección"

2. **Grid de Tweets Guardados**
   - Cards con preview:
     - Contenido (truncado)
     - Autor
     - Fecha guardada
     - Tags
     - Estrella si es favorito
   - Filtros:
     - Por colección (sidebar)
     - Por tags (tags populares arriba)
     - Búsqueda en contenido y notas
   - Ordenar por: Fecha guardado, Fecha tweet, Engagement

3. **Modal de Detalles**
   - Al hacer click en card:
     - Contenido completo
     - Medios (si tiene)
     - Notas personales (editable)
     - Tags (editable)
     - Mover a colección (dropdown)
     - Link al tweet original
     - Botón: Eliminar guardado

4. **Gestión de Colecciones**
   - Modal para crear/editar colección:
     - Nombre
     - Descripción
     - Icono (selector de emojis)
     - Color (color picker)
   - Acciones: Editar, Eliminar, Exportar

**Rutas Flask:**
```python
@app.route('/saved')
@require_auth
def saved_list():
    """Lista de tweets guardados"""

@app.route('/saved/add', methods=['POST'])
@require_auth
def saved_add():
    """Guardar un tweet"""

@app.route('/saved/<int:id>', methods=['GET'])
@require_auth
def saved_detail(id):
    """Detalle de tweet guardado"""

@app.route('/saved/<int:id>/update', methods=['POST'])
@require_auth
def saved_update(id):
    """Actualizar tweet guardado"""

@app.route('/saved/<int:id>/delete', methods=['POST'])
@require_auth
def saved_delete(id):
    """Eliminar guardado"""

@app.route('/collections', methods=['GET', 'POST'])
@require_auth
def collections():
    """Gestionar colecciones"""

@app.route('/collections/<int:id>', methods=['GET'])
@require_auth
def collection_detail(id):
    """Ver colección"""

@app.route('/collections/<int:id>/edit', methods=['POST'])
@require_auth
def collection_edit(id):
    """Editar colección"""

@app.route('/collections/<int:id>/export')
@require_auth
def collection_export(id):
    """Exportar colección"""
```

**Tests**: `tests/test_saved.py` (12 tests)

---

### 6. REPORTS-001: Reportes y Exportación (Baja Prioridad)

**Descripción**: Generación de reportes personalizados y exportación de datos.

#### 6.1 Report Generator

**Archivo**: `app/report_generator.py` (NUEVO)

```python
class ReportGenerator:
    def generate_engagement_report(user_id: int, period: str) -> dict:
        """Reporte de engagement con gráficos"""

    def generate_growth_report(user_id: int, period: str) -> dict:
        """Reporte de crecimiento de followers"""

    def generate_content_report(user_id: int, period: str) -> dict:
        """Reporte de análisis de contenido"""

    def generate_pdf_report(user_id: int, report_data: dict) -> bytes:
        """Generar PDF de reporte"""

    def export_tweets_csv(user_id: int, filters: dict = None) -> str:
        """Exportar tweets a CSV"""

    def export_analytics_excel(user_id: int, period: str) -> bytes:
        """Exportar analytics a Excel"""

    def schedule_weekly_report(user_id: int, email: str) -> bool:
        """Programar reporte semanal por email"""
```

---

## Dependencias Nuevas

```txt
# requirements.txt (añadir)
pandas==2.1.4              # Análisis de datos
reportlab==4.0.7           # Generación de PDFs
openpyxl==3.1.2            # Excel export
celery==5.3.4              # Task queue para scheduler
redis==5.0.1               # Backend para Celery
APScheduler==3.10.4        # Alternative scheduler
```

---

## Métricas de Éxito Sprint 7

- **Tests**: Mínimo 82 tests, >90% pass rate
- **Cobertura**: >85% en código nuevo
- **Performance**:
  - Búsqueda: <500ms para 10k tweets
  - Analytics dashboard: <2s carga
  - Scheduler: Precisión de ±1 minuto
- **UX**:
  - Búsqueda con resultados instantáneos (<1s)
  - Scheduler visual e intuitivo
  - Analytics con visualizaciones claras

---

## Estimación

- **Sprint 7 completo**: 4-5 semanas
- **Prioridad Alta**: 3 semanas (Analytics, Scheduler, Cleanup)
- **Prioridad Media/Baja**: 2 semanas (Search, Saved, Reports)

---

## Próximos Sprints Post-7

- **Sprint 8**: Notificaciones y Webhooks
- **Sprint 9**: API REST pública con documentación
- **Sprint 10**: Mobile app (React Native)
- **Sprint 11**: AI-powered features (content suggestions, sentiment analysis)

---

**Fecha**: 2026-01-09
**Status**: Planning phase
**Dependency**: Sprint 6 debe completarse primero

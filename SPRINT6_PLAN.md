# Sprint 6 Plan: Multi-User Support & Credential Management

## Objetivo Principal

Transformar ChirpSyncer de una aplicación single-user a una plataforma **multi-tenant** que permita a múltiples usuarios gestionar sus propias cuentas de Twitter y Bluesky de forma segura, con credenciales encriptadas y gestión mediante dashboard web.

---

## Estado Actual

- ✅ Sprint 1-5: Aplicación funcional single-user con dashboard
- ✅ Credenciales en archivo `.env` (single user)
- ✅ Dashboard web básico de monitoreo
- 🎯 Sprint 6: Multi-user con gestión de credenciales segura

---

## Visión del Sprint 6

### Transformación Arquitectónica

**Antes (Single-User):**
```
.env file → app/config.py → Sync único usuario
```

**Después (Multi-User):**
```
Dashboard Web UI → User Management → Encrypted DB → Sync por usuario
                                      ↓
                              users.db (encrypted)
                              └─ users table
                              └─ credentials table
                              └─ user_settings table
```

---

## Tareas del Sprint 6

### 1. USER-001: Sistema de Usuarios y Autenticación (Alta Prioridad)

**Descripción**: Implementar sistema completo de usuarios con registro, login, sesiones y autenticación.

#### 1.1 Base de Datos de Usuarios

**Archivo**: `app/user_manager.py` (NUEVO)

**Tabla `users`:**
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,      -- bcrypt hash
    created_at INTEGER NOT NULL,
    last_login INTEGER,
    is_active INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    settings_json TEXT                -- JSON con configuraciones del usuario
);
```

**Tabla `user_sessions`:**
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Funciones requeridas:**
```python
class UserManager:
    def create_user(username: str, email: str, password: str) -> int
    def authenticate_user(username: str, password: str) -> Optional[User]
    def get_user_by_id(user_id: int) -> Optional[User]
    def get_user_by_username(username: str) -> Optional[User]
    def update_user(user_id: int, **kwargs) -> bool
    def delete_user(user_id: int) -> bool
    def create_session(user_id: int, ip_address: str, user_agent: str) -> str
    def validate_session(session_token: str) -> Optional[User]
    def delete_session(session_token: str) -> bool
    def list_users(admin_only: bool = False) -> List[User]
```

**Seguridad:**
- Contraseñas hasheadas con **bcrypt** (cost factor: 12)
- Sessions con tokens aleatorios (32 bytes)
- Expiración de sesiones (default: 7 días)
- Rate limiting en login (máx 5 intentos en 15 min)

**Tests**: `tests/test_user_manager.py` (mínimo 15 tests)

---

### 2. CRED-001: Gestión de Credenciales Encriptadas (Alta Prioridad)

**Descripción**: Almacenar credenciales de Twitter y Bluesky de forma segura con encriptación AES-256.

#### 2.1 Base de Datos de Credenciales

**Archivo**: `app/credential_manager.py` (NUEVO)

**Tabla `user_credentials`:**
```sql
CREATE TABLE IF NOT EXISTS user_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,           -- 'twitter' or 'bluesky'
    credential_type TEXT NOT NULL,    -- 'scraping' or 'api'

    -- Credenciales encriptadas (AES-256-GCM)
    encrypted_data BLOB NOT NULL,     -- JSON encriptado con todas las credenciales
    encryption_iv BLOB NOT NULL,      -- Initialization Vector (12 bytes)
    encryption_tag BLOB NOT NULL,     -- Authentication tag (16 bytes)

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_used INTEGER,
    is_active INTEGER DEFAULT 1,

    -- Para compartir API keys
    is_shared INTEGER DEFAULT 0,      -- Si estas credenciales son compartidas
    owner_user_id INTEGER,            -- Usuario dueño (si is_shared=1)

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, platform, credential_type)
);
```

**Estructura de `encrypted_data` (JSON):**

Para Twitter (scraping):
```json
{
    "username": "twitter_user",
    "password": "twitter_pass",
    "email": "email@example.com",
    "email_password": "email_pass"
}
```

Para Twitter (API):
```json
{
    "api_key": "...",
    "api_secret": "...",
    "access_token": "...",
    "access_secret": "..."
}
```

Para Bluesky:
```json
{
    "username": "user.bsky.social",
    "password": "app_password"
}
```

**Funciones requeridas:**
```python
class CredentialManager:
    def __init__(self, master_key: bytes):
        """Master key derivado de SECRET_KEY en .env"""

    def save_credentials(user_id: int, platform: str,
                        credential_type: str, data: dict) -> bool

    def get_credentials(user_id: int, platform: str,
                       credential_type: str) -> Optional[dict]

    def update_credentials(user_id: int, platform: str,
                          credential_type: str, data: dict) -> bool

    def delete_credentials(user_id: int, platform: str,
                          credential_type: str) -> bool

    def list_user_credentials(user_id: int) -> List[dict]

    def share_credentials(owner_id: int, platform: str,
                         credential_type: str,
                         shared_with_user_ids: List[int]) -> bool

    def get_shared_credentials(user_id: int) -> List[dict]
```

**Encriptación:**
- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 con salt único por instalación
- **Master Key**: Almacenada en `.env` como `SECRET_KEY`
- **IV**: Único para cada credencial (12 bytes random)
- **Authentication**: GCM tag verifica integridad

**Ejemplo de uso:**
```python
# Encriptar credenciales
cred_manager = CredentialManager(master_key)
cred_manager.save_credentials(
    user_id=1,
    platform='twitter',
    credential_type='scraping',
    data={
        'username': 'mytwitter',
        'password': 'mypass',
        'email': 'me@email.com',
        'email_password': 'emailpass'
    }
)

# Recuperar credenciales (desencriptadas)
twitter_creds = cred_manager.get_credentials(1, 'twitter', 'scraping')
# {'username': 'mytwitter', 'password': 'mypass', ...}
```

**Tests**: `tests/test_credential_manager.py` (mínimo 12 tests)

---

### 3. DASH-002: Dashboard de Gestión de Usuarios (Alta Prioridad)

**Descripción**: Extender el dashboard web existente para incluir gestión de usuarios y credenciales.

#### 3.1 Nuevas Rutas Flask

**Archivo**: `app/dashboard.py` (MODIFICAR)

**Rutas de Autenticación:**
```python
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Página de login"""

@app.route('/logout', methods=['POST'])
def logout():
    """Cerrar sesión"""

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registro de nuevo usuario (solo si está habilitado)"""

@app.route('/api/auth/check')
def check_auth():
    """Verificar si usuario está autenticado"""
```

**Rutas de Gestión de Usuarios:**
```python
@app.route('/users')
@require_admin
def users_list():
    """Lista de usuarios (solo admin)"""

@app.route('/users/<int:user_id>')
@require_auth
def user_detail(user_id):
    """Detalle de usuario (propio o admin)"""

@app.route('/users/<int:user_id>/edit', methods=['POST'])
@require_auth
def user_edit(user_id):
    """Editar usuario"""

@app.route('/users/<int:user_id>/delete', methods=['POST'])
@require_admin
def user_delete(user_id):
    """Eliminar usuario (solo admin)"""
```

**Rutas de Credenciales:**
```python
@app.route('/credentials')
@require_auth
def credentials_list():
    """Lista de credenciales del usuario"""

@app.route('/credentials/add', methods=['GET', 'POST'])
@require_auth
def credentials_add():
    """Añadir nuevas credenciales"""

@app.route('/credentials/<int:cred_id>/edit', methods=['GET', 'POST'])
@require_auth
def credentials_edit(cred_id):
    """Editar credenciales existentes"""

@app.route('/credentials/<int:cred_id>/delete', methods=['POST'])
@require_auth
def credentials_delete(cred_id):
    """Eliminar credenciales"""

@app.route('/credentials/<int:cred_id>/test', methods=['POST'])
@require_auth
def credentials_test(cred_id):
    """Probar credenciales (verificar login)"""

@app.route('/credentials/share', methods=['POST'])
@require_auth
def credentials_share():
    """Compartir credenciales con otros usuarios"""
```

#### 3.2 Templates HTML

**Nuevos archivos en `app/templates/`:**

1. **`login.html`** - Página de login
   - Form con username/email y password
   - Link a registro (si habilitado)
   - "Recordar sesión" checkbox

2. **`register.html`** - Página de registro
   - Form con username, email, password, confirm password
   - Validación en frontend
   - Captcha opcional

3. **`users_list.html`** - Lista de usuarios (admin)
   - Tabla con todos los usuarios
   - Acciones: Editar, Eliminar, Ver estadísticas
   - Búsqueda y filtros

4. **`user_detail.html`** - Detalle de usuario
   - Información del usuario
   - Credenciales asociadas
   - Estadísticas de sync
   - Opciones de configuración

5. **`credentials_manage.html`** - Gestión de credenciales
   - Lista de credenciales del usuario
   - Añadir: Twitter (scraping/API), Bluesky
   - Editar/Eliminar
   - Estado de credenciales (activas/inactivas)
   - Test de credenciales (verificar login)

6. **`credentials_form.html`** - Form para añadir/editar credenciales
   - Formularios dinámicos según plataforma y tipo
   - Campos con placeholder y ayuda
   - Opción de marcar como compartidas

**Mejoras en `dashboard.html` existente:**
- Añadir menú de navegación con: Dashboard, Credenciales, Usuarios (admin), Logout
- Mostrar usuario actual en header
- Filtrar estadísticas por usuario

#### 3.3 Decoradores de Autenticación

**Archivo**: `app/auth_decorators.py` (NUEVO)

```python
from functools import wraps
from flask import session, redirect, url_for, abort

def require_auth(f):
    """Requiere que el usuario esté autenticado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    """Requiere que el usuario sea administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))

        user = UserManager().get_user_by_id(session['user_id'])
        if not user or not user.is_admin:
            abort(403)  # Forbidden

        return f(*args, **kwargs)
    return decorated_function

def require_self_or_admin(f):
    """Requiere que sea el propio usuario o admin"""
    @wraps(f)
    def decorated_function(user_id, *args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))

        current_user = UserManager().get_user_by_id(session['user_id'])
        if not current_user:
            return redirect(url_for('login'))

        if current_user.id != user_id and not current_user.is_admin:
            abort(403)

        return f(user_id, *args, **kwargs)
    return decorated_function
```

**Tests**: `tests/test_auth_decorators.py` (8 tests)

---

### 4. SYNC-002: Sync Multi-Usuario (Alta Prioridad)

**Descripción**: Adaptar el sistema de sincronización para manejar múltiples usuarios simultáneamente.

#### 4.1 Modificaciones en `app/main.py`

**Cambios requeridos:**

```python
# ANTES (single-user)
def main():
    validate_credentials()  # De .env
    migrate_database()
    add_stats_tables()
    login_to_bluesky()

    while True:
        sync_twitter_to_bluesky()
        sync_bluesky_to_twitter()
        time.sleep(POLL_INTERVAL)

# DESPUÉS (multi-user)
def main():
    # Inicializar sistema
    init_user_system()
    migrate_database()
    add_stats_tables()
    add_user_tables()

    # Crear primer usuario admin si no existe
    ensure_admin_user()

    # Iniciar sync multi-usuario
    while True:
        sync_all_users()
        time.sleep(POLL_INTERVAL)

def sync_all_users():
    """Sincronizar todos los usuarios activos"""
    user_manager = UserManager()
    cred_manager = CredentialManager(get_master_key())

    active_users = user_manager.list_users(active_only=True)

    for user in active_users:
        try:
            # Obtener credenciales del usuario
            twitter_creds = cred_manager.get_credentials(
                user.id, 'twitter', 'scraping'
            )
            bluesky_creds = cred_manager.get_credentials(
                user.id, 'bluesky', 'api'
            )

            if not twitter_creds or not bluesky_creds:
                logger.warning(f"User {user.username} missing credentials, skipping")
                continue

            # Sync para este usuario
            logger.info(f"Syncing user: {user.username}")
            sync_user_twitter_to_bluesky(user, twitter_creds, bluesky_creds)

            # Si tiene credenciales de Twitter API, sync bidireccional
            twitter_api_creds = cred_manager.get_credentials(
                user.id, 'twitter', 'api'
            )
            if twitter_api_creds:
                sync_user_bluesky_to_twitter(user, twitter_api_creds, bluesky_creds)

        except Exception as e:
            logger.error(f"Error syncing user {user.username}: {e}")
            # Continuar con siguiente usuario
            stats_tracker.record_error(
                source='multi-user-sync',
                target=f'user_{user.id}',
                error_type=type(e).__name__,
                error_message=str(e)
            )
```

**Nuevas funciones:**
```python
def sync_user_twitter_to_bluesky(user: User,
                                  twitter_creds: dict,
                                  bluesky_creds: dict):
    """Sync Twitter → Bluesky para un usuario específico"""
    # Similar a sync_twitter_to_bluesky() pero con credenciales del usuario
    # y guardando en tablas con user_id

def sync_user_bluesky_to_twitter(user: User,
                                  twitter_api_creds: dict,
                                  bluesky_creds: dict):
    """Sync Bluesky → Twitter para un usuario específico"""
```

#### 4.2 Modificaciones en Base de Datos

**Actualizar tablas existentes para incluir `user_id`:**

```sql
-- Añadir user_id a synced_posts
ALTER TABLE synced_posts ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX idx_synced_posts_user ON synced_posts(user_id);

-- Añadir user_id a sync_stats
ALTER TABLE sync_stats ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX idx_sync_stats_user ON sync_stats(user_id);

-- Añadir user_id a media_synced
ALTER TABLE media_synced ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX idx_media_synced_user ON media_synced(user_id);
```

**Función de migración:**
```python
def migrate_to_multi_user():
    """
    Migrar base de datos single-user a multi-user.

    1. Crear usuario admin automático con credenciales de .env
    2. Asignar todos los posts/stats existentes al admin
    3. Actualizar schema con user_id
    """
```

**Tests**: `tests/test_multi_user_sync.py` (10 tests)

---

### 5. CONFIG-003: Configuración Multi-Tenant (Media Prioridad)

**Descripción**: Sistema de configuración flexible por usuario.

#### 5.1 Tabla de Configuración

```sql
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,  -- JSON
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, setting_key)
);
```

**Configuraciones por usuario:**
- `sync_interval`: Intervalo de sync personalizado (segundos)
- `twitter_to_bluesky_enabled`: Activar/desactivar dirección
- `bluesky_to_twitter_enabled`: Activar/desactivar dirección
- `sync_threads`: Sincronizar threads
- `sync_media`: Sincronizar medios
- `max_tweets_per_sync`: Límite de tweets por ciclo
- `notification_email`: Email para notificaciones
- `timezone`: Zona horaria del usuario

**Clase:**
```python
class UserSettings:
    def get(user_id: int, key: str, default=None) -> Any
    def set(user_id: int, key: str, value: Any) -> bool
    def get_all(user_id: int) -> dict
    def update_bulk(user_id: int, settings: dict) -> bool
```

---

### 6. SECURITY-001: Seguridad y Validación (Alta Prioridad)

#### 6.1 Medidas de Seguridad

**Passwords:**
- Mínimo 8 caracteres
- Requiere: mayúscula, minúscula, número, símbolo especial
- Bcrypt con cost factor 12
- No permitir contraseñas comunes (lista de 10k passwords)

**Sessions:**
- Tokens CSRF en todos los forms
- HTTPOnly y Secure cookies
- Expiración configurable (default: 7 días)
- Invalidación en logout
- Limitar sesiones concurrentes (máx 5 por usuario)

**Rate Limiting:**
- Login: 5 intentos / 15 minutos
- Registro: 3 registros / hora por IP
- API calls: 100 requests / minuto por usuario

**Auditoría:**
- Tabla `audit_log`:
```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,      -- 'login', 'logout', 'create_cred', etc.
    resource_type TEXT,        -- 'user', 'credential', etc.
    resource_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER,           -- 1 o 0
    details TEXT,              -- JSON con detalles adicionales
    created_at INTEGER NOT NULL
);
```

**Funciones:**
```python
def log_audit(user_id: int, action: str, success: bool, **kwargs)
def get_audit_log(user_id: int, limit: int = 100) -> List[dict]
def check_rate_limit(user_id: int, action: str) -> bool
```

**Tests**: `tests/test_security.py` (12 tests)

---

## Base de Datos: Schema Completo Multi-User

```sql
-- USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login INTEGER,
    is_active INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    settings_json TEXT
);

-- SESIONES
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CREDENCIALES ENCRIPTADAS
CREATE TABLE IF NOT EXISTS user_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    encrypted_data BLOB NOT NULL,
    encryption_iv BLOB NOT NULL,
    encryption_tag BLOB NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_used INTEGER,
    is_active INTEGER DEFAULT 1,
    is_shared INTEGER DEFAULT 0,
    owner_user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, platform, credential_type)
);

-- CONFIGURACIÓN POR USUARIO
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, setting_key)
);

-- AUDITORÍA
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER,
    details TEXT,
    created_at INTEGER NOT NULL
);

-- ÍNDICES
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_credentials_user ON user_credentials(user_id);
CREATE INDEX idx_settings_user ON user_settings(user_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

---

## Dependencias Nuevas

```txt
# requirements.txt (añadir)
bcrypt==4.1.2              # Password hashing
cryptography==41.0.7       # AES encryption
Flask-Session==0.5.0       # Server-side sessions
Flask-Limiter==3.5.0       # Rate limiting
Flask-WTF==1.2.1           # Forms con CSRF
email-validator==2.1.0     # Validación de emails
```

---

## Flujo de Usuario: Primer Uso

### Setup Inicial (Administrador)

1. **Iniciar aplicación por primera vez:**
   ```bash
   python -m app.dashboard
   ```

2. **Crear usuario admin automático:**
   - Si no existe ningún usuario, crear admin con credenciales de `.env`
   - Username: `admin`
   - Password: Generar aleatoria y mostrar en logs
   - O usar `ADMIN_PASSWORD` de `.env` si está configurada

3. **Login como admin:**
   - Ir a `http://localhost:5000/login`
   - Ingresar credenciales de admin
   - Redirigir a dashboard

4. **Configurar credenciales:**
   - Ir a "Credenciales" → "Añadir Nueva"
   - Añadir Twitter (scraping)
   - Añadir Bluesky
   - Opcional: Añadir Twitter API para sync bidireccional

5. **Verificar sync:**
   - El sync automático comenzará para el usuario admin
   - Ver actividad en dashboard

### Añadir Más Usuarios (Admin)

1. **Ir a sección "Usuarios"**
2. **Crear nuevo usuario:**
   - Ingresar username, email, password
   - Marcar si es admin
3. **El nuevo usuario recibe email con instrucciones** (opcional)
4. **Nuevo usuario hace login y configura sus credenciales**

---

## Migración desde Single-User

**Script de migración**: `scripts/migrate_to_multi_user.py`

```python
def migrate():
    """
    Migración automática de single-user a multi-user.

    Pasos:
    1. Crear usuario admin con credenciales de .env
    2. Guardar credenciales de .env en user_credentials (encriptadas)
    3. Asignar todos los synced_posts existentes al admin (user_id=1)
    4. Asignar todas las stats existentes al admin
    5. Actualizar schema con nuevas tablas
    6. Crear índices
    """
    # 1. Crear admin
    admin_id = create_admin_from_env()

    # 2. Migrar credenciales
    migrate_credentials_from_env(admin_id)

    # 3. Actualizar posts existentes
    update_existing_posts(admin_id)

    # 4. Actualizar stats existentes
    update_existing_stats(admin_id)

    # 5. Verificar integridad
    verify_migration()

    print("✅ Migración completada. Usuario admin creado con ID:", admin_id)
```

**Ejecutar migración:**
```bash
python scripts/migrate_to_multi_user.py
```

---

## Testing Strategy

### Tests Requeridos (Mínimo 70 tests)

1. **test_user_manager.py** (15 tests)
   - Crear usuario
   - Autenticar
   - Sesiones
   - Permisos
   - Rate limiting

2. **test_credential_manager.py** (12 tests)
   - Encriptación/desencriptación
   - CRUD credenciales
   - Compartir credenciales
   - Validación

3. **test_auth_decorators.py** (8 tests)
   - @require_auth
   - @require_admin
   - @require_self_or_admin

4. **test_dashboard_multi_user.py** (15 tests)
   - Rutas de autenticación
   - Rutas de usuarios
   - Rutas de credenciales
   - Permisos

5. **test_multi_user_sync.py** (10 tests)
   - Sync múltiples usuarios
   - Aislamiento de datos
   - Manejo de errores

6. **test_security.py** (12 tests)
   - Validación de passwords
   - Rate limiting
   - Audit log
   - Encriptación

---

## Métricas de Éxito

- **Tests**: Mínimo 70 tests, 90% pass rate
- **Cobertura**: >85% en código nuevo
- **Seguridad**: 0 vulnerabilidades críticas (según bandit/safety)
- **Performance**: Sync de 10 usuarios en <30 segundos
- **UX**: Registro y configuración en <5 minutos

---

## Rollback Plan

Si algo falla:
1. Mantener compatibilidad con modo single-user usando `.env`
2. Feature flag: `MULTI_USER_ENABLED=false` en `.env`
3. Script de rollback: `scripts/rollback_multi_user.py`

---

## Próximos Pasos Post-Sprint 6

- Sprint 7: Twitter Analytics & Advanced Features
- Sprint 8: Notificaciones y Webhooks
- Sprint 9: API REST pública
- Sprint 10: Mobile App

---

**Estimación Sprint 6:** 3-4 semanas
**Prioridad:** Alta (transforma ChirpSyncer en producto multi-tenant)
**Complejidad:** Alta (seguridad, encriptación, multi-tenancy)

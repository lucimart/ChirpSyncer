---
name: Security Assessment
description: Code security review, vulnerability detection, and secure coding practices
---

# Skill: Security Assessment

Proactive security review for all code changes.

## Quick Reference

| Category | Check | Severity |
|----------|-------|----------|
| Injection | SQL, Command, LDAP | Critical |
| XSS | Reflected, Stored, DOM | High |
| Auth | Broken auth, session | Critical |
| Crypto | Weak algorithms, key mgmt | High |
| Secrets | Hardcoded, leaked | Critical |

## OWASP Top 10 Checklist

### 1. Injection Prevention (A03:2021)

**SQL - Always use parameterized queries:**
```python
# SAFE - Parameterized query
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

**Commands - Use subprocess with list args:**
```python
# SAFE - List arguments, no shell
subprocess.run(["ls", "-la", directory], check=True)
```

### 2. Broken Authentication (A07:2021)

Checklist:
- Passwords hashed with bcrypt (cost >= 12)
- Session tokens are random (secrets.token_urlsafe)
- Sessions expire (24h default, configurable)
- Rate limiting on login attempts
- Account lockout after failures
- Secure password reset flow

### 3. Sensitive Data Exposure (A02:2021)

Encryption requirements:
- AES-256-GCM for data at rest
- TLS 1.3 for data in transit
- No sensitive data in logs
- No sensitive data in URLs
- Proper key management

### 4. XSS Prevention (A03:2021)

- Use template escaping (Jinja2 auto-escapes)
- React auto-escapes by default
- Never insert raw HTML from user input
- Sanitize with DOMPurify if HTML needed

### 5. CSRF Protection (A01:2021)

```python
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)
# All forms must include CSRF token
```

### 6. Security Misconfiguration (A05:2021)

Production checklist:
- DEBUG = False
- Secret key from environment
- HTTPS only (HSTS enabled)
- Secure cookie flags
- Error pages don't leak info

## Code Review Checklist

### Input Validation

```python
def create_user(username: str, email: str):
    if len(username) > 50:
        raise ValueError("Username too long")

    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Invalid username format")

    if not validate_email(email):
        raise ValueError("Invalid email")
```

### Authentication

```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt(rounds=12)
    ).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

### Session Management

```python
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=86400
)
```

### API Security

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=get_remote_address)

@app.route('/api/v1/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    pass

@app.route('/api/v1/user/<int:user_id>')
@require_auth
def get_user(user_id):
    if current_user.id != user_id and not current_user.is_admin:
        abort(403)
    return get_user_data(user_id)
```

## Credential Management

### Never Commit
- .env files
- Private keys (*.pem, *.key)
- credentials.json
- secrets/ directory

### Environment Variables

```python
import os

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set")
```

### Encrypted Storage

```python
from app.auth.credential_manager import CredentialManager

cred_mgr = CredentialManager(db_path, encryption_key)
cred_mgr.store_credentials(
    user_id=1,
    platform='twitter',
    credentials={'api_key': key}  # AES-256-GCM encrypted
)
```

## Vulnerability Patterns to Block

- String concatenation in SQL queries
- Shell commands with user input
- Dynamic code execution with user input
- Path traversal (use os.path.basename)
- Unvalidated redirects

### Safe Path Handling

```python
import os
safe_filename = os.path.basename(filename)
file_path = os.path.join("/uploads", safe_filename)
if not file_path.startswith("/uploads"):
    raise ValueError("Invalid path")
```

## Security Headers

```python
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    return response
```

## Audit Logging

Events to log:
- login_success, login_failure
- password_change
- permission_change
- data_export, data_delete
- admin_action

```python
def audit_log(event_type: str, user_id: int, details: dict):
    logger.info(f"AUDIT: {event_type}", extra={
        'user_id': user_id,
        'event_type': event_type,
        'details': details,
        'timestamp': datetime.utcnow().isoformat()
    })
```

## Auto-Trigger Actions

### before_pr_create
1. Scan for hardcoded secrets
2. Check for injection vulnerabilities
3. Verify auth decorators
4. Check CSRF on state-changing endpoints

### after_auth_change
1. Verify password hashing
2. Check session configuration
3. Review token generation
4. Verify rate limiting

### after_api_change
1. Check input validation
2. Verify authorization checks
3. Review error handling
4. Check rate limiting

## Related Skills

- `chirp-api-design.md` - API security patterns
- `github-operations.md` - Secret scanning
- `chirp-testing.md` - Security tests

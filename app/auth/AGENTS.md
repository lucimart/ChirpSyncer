# APP AUTH

## OVERVIEW
Session-based web auth and JWT-based API auth.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| User lifecycle | app/auth/user_manager.py | SQLite users + sessions
| JWT tokens | app/auth/jwt_handler.py | HS256 tokens
| API auth | app/auth/api_auth.py | require_auth decorator
| Web auth | app/auth/auth_decorators.py | session-based decorators
| Credential encryption | app/auth/credential_manager.py | AES-256-GCM

## CONVENTIONS
- API auth accepts Bearer token or auth_token cookie.
- Use log_audit for auth events.

## ANTI-PATTERNS
- Do not store raw credentials outside credential_manager.

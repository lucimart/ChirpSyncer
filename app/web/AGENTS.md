# APP WEB

## OVERVIEW
Flask dashboard + API v1 endpoints with shared response helpers.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Dashboard routes | app/web/dashboard.py | Flask app factory
| API v1 | app/web/api/v1/ | Blueprints by domain
| Responses | app/web/api/v1/responses.py | api_response/api_error
| Templates | app/web/templates/ | Jinja templates
| Websocket | app/web/websocket.py | Progress events

## CONVENTIONS
- API endpoints are registered in app/web/api/v1/__init__.py.
- Authenticated routes use require_auth decorators.

## ANTI-PATTERNS
- Avoid embedding business logic in templates.

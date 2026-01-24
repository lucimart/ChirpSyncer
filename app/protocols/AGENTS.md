# APP PROTOCOLS

## OVERVIEW
Protocol-driven connectors using CanonicalPost and a registry.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Connector interface | app/protocols/base.py | PlatformConnector, CanonicalPost
| Registry | app/protocols/registry.py | Connector discovery
| Conflict resolution | app/protocols/conflict.py | Merge strategies
| Platform connectors | app/protocols/connectors/ | Twitter/Bluesky/Mastodon

## CONVENTIONS
- Platform-specific logic stays inside connectors.
- Convert platform data to CanonicalPost ASAP.

## ANTI-PATTERNS
- Do not call external platform libraries outside connectors.

# APP INTEGRATIONS

## OVERVIEW
Low-level platform adapters (twscrape/atproto) used by services and protocols.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Twitter scrape | app/integrations/twitter_scraper.py | Read-only scraping
| Bluesky API | app/integrations/bluesky_handler.py | AT Protocol access
| Mastodon | app/integrations/mastodon_handler.py | API access

## CONVENTIONS
- Keep these modules thin adapters over external APIs.
- Return raw platform payloads; transform in protocols/services.

## ANTI-PATTERNS
- Avoid business rules here; keep it in services/features.

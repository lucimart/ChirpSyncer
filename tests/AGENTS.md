# TESTS

## OVERVIEW
Pytest-based backend tests plus Playwright E2E.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Unit tests | tests/unit/ | Pure logic tests
| Integration | tests/integration/ | DB-backed tests
| E2E | tests/e2e/playwright/ | Playwright POM
| Fixtures | tests/conftest.py | Global mocks

## CONVENTIONS
- Integration tests create temp SQLite DB per test.
- E2E uses Page Object Model in tests/e2e/playwright/pages/.

## ANTI-PATTERNS
- Do not call live external APIs in tests; use mocks/fixtures.

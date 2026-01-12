---
name: ChirpSyncer Testing
description: TDD workflow, test optimization, coverage targets, and CI acceleration
category: testing
triggers:
  - writing tests
  - test coverage
  - test strategy
  - pytest
  - playwright
  - mocking
  - fixture
  - conftest
  - E2E test
  - unit test
  - integration test
  - TDD
  - test driven
  - slow tests
  - CI optimization
auto_trigger: before_feature_start,after_feature_complete,after_ci_failure
dependencies:
  - tests/
  - pytest.ini
  - playwright.config.ts
  - .github/workflows/ci.yml
  - chirp-architecture.md
version: "2.0"
sprint_relevant: all
---

# Skill: ChirpSyncer Testing Strategy

TDD-first approach with optimized test execution.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Framework | pytest + Playwright |
| Current Tests | 1437+ passing |
| Coverage Target | Core >90%, Features >85% |
| TDD Cycle | Red -> Green -> Refactor |

## TDD Workflow

### Before Writing Code (before_feature_start)

```
1. Write failing test first
2. Run test - confirm RED
3. Write minimal code to pass
4. Run test - confirm GREEN
5. Refactor if needed
6. Repeat
```

### Test Types by Purpose

| Type | Purpose | Speed | When |
|------|---------|-------|------|
| Unit | Single function/class | Fast (<1s) | Every change |
| Integration | Component interaction | Medium (1-10s) | Feature complete |
| E2E | Full user flow | Slow (10-60s) | Before PR |

## Test Structure

```
tests/
├── unit/                    # Fast, isolated tests
├── integration/             # Real DB, mocked APIs
├── e2e/                     # Full browser tests
└── conftest.py              # Shared fixtures
```

## Optimized Test Commands

### Development (Fast Feedback)

```bash
# Only unit tests (fastest)
pytest tests/unit/ -v -x --tb=short

# Specific file
pytest tests/unit/test_cleanup_engine.py -v

# Only tests matching pattern
pytest -k "cleanup" -v

# Stop on first failure
pytest -x

# Last failed only
pytest --lf

# Failed first, then rest
pytest --ff
```

### Pre-Commit (Balanced)

```bash
# Unit + fast integration
pytest tests/unit/ tests/integration/ -v --tb=short -m "not slow"

# With coverage (specific module)
pytest --cov=app/features/cleanup_engine --cov-report=term-missing tests/
```

### CI/Full Suite

```bash
# Parallel execution (faster)
pytest tests/ -n auto --dist loadfile

# With coverage report
pytest --cov=app --cov-report=xml --cov-report=html tests/

# Skip slow tests in PR checks
pytest tests/ -m "not slow" -n auto
```

## Writing Useful Tests

### Unit Tests - Test Behavior, Not Implementation

```python
# BAD - Tests implementation detail
def test_uses_bcrypt():
    assert 'bcrypt' in str(hash_password.__code__.co_consts)

# GOOD - Tests behavior
def test_password_hash_is_verifiable():
    password = "SecurePass123!"
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrong", hashed)
```

### Test Edge Cases That Matter

```python
class TestCleanupEngine:
    def test_empty_tweets_returns_empty(self, engine):
        """Edge: No tweets to process."""
        result = engine.evaluate_rule(rule, tweets=[])
        assert result == []

    def test_rule_with_invalid_regex_handled(self, engine):
        """Edge: Malformed regex doesn't crash."""
        rule = create_rule(rule_type='pattern', config={'regex': '['})
        result = engine.evaluate_rule(rule, tweets)
        assert result == []  # Graceful handling

    def test_rate_limit_waits_correctly(self, engine):
        """Edge: Rate limiter enforces delays."""
        # Fill up the rate limit
        for _ in range(50):
            engine._delete_limiter.record_request()

        wait_time = engine._delete_limiter.wait_time()
        assert wait_time > 0
```

### Integration Tests - Test Real Flows

```python
class TestCleanupIntegration:
    def test_full_cleanup_flow(self, test_db, test_user):
        """Integration: Create rule -> Preview -> Execute."""
        engine = CleanupEngine(db_path=test_db)

        # Create rule
        rule_id = engine.create_rule(
            user_id=test_user['id'],
            name='Test rule',
            rule_type='age',
            config={'max_age_days': 30}
        )

        # Mock tweets
        with patch.object(engine, '_fetch_user_tweets') as mock_fetch:
            mock_fetch.return_value = [
                {'id': '1', 'created_at': int(time.time()) - 40*86400, 'likes': 5}
            ]

            # Preview
            preview = engine.preview_cleanup(test_user['id'], rule_id)
            assert preview['count'] == 1

            # Execute dry run
            result = engine.execute_cleanup(test_user['id'], rule_id, dry_run=True)
            assert result['would_delete'] == 1
```

## Fixtures for Reuse

```python
# tests/conftest.py
import pytest
from app.core.db_handler import init_db

@pytest.fixture
def test_db(tmp_path):
    """Clean test database."""
    db_path = tmp_path / "test.db"
    init_db(str(db_path))
    yield str(db_path)

@pytest.fixture
def test_user(test_db):
    """Test user with credentials."""
    from app.auth.user_manager import UserManager
    mgr = UserManager(db_path=test_db)
    user_id = mgr.create_user("testuser", "test@test.com", "Pass123!")
    return {"id": user_id, "username": "testuser"}

@pytest.fixture
def cleanup_engine(test_db):
    """CleanupEngine with test DB."""
    from app.features.cleanup_engine import CleanupEngine
    engine = CleanupEngine(db_path=test_db)
    engine.init_db()
    return engine

@pytest.fixture
def mock_twitter_api():
    """Mock Twitter API responses."""
    with patch("app.integrations.twitter_scraper.twscrape.API") as mock:
        yield mock
```

## Mocking Patterns

### External APIs

```python
@pytest.fixture
def mock_twscrape():
    with patch("app.features.cleanup_engine.twscrape") as mock:
        mock.API.return_value.user_tweets = AsyncMock(return_value=[
            Mock(id=1, rawContent="Test", date=datetime.now(), likeCount=10)
        ])
        yield mock
```

### Time-Dependent Tests

```python
from freezegun import freeze_time

@freeze_time("2026-01-01")
def test_age_rule_evaluation():
    # All time.time() calls return fixed timestamp
    pass
```

## Test Markers

```python
# pytest.ini
[pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: integration tests
    e2e: end-to-end tests
    security: security-related tests

# Usage
@pytest.mark.slow
def test_full_sync_takes_time():
    pass

@pytest.mark.integration
def test_database_migration():
    pass
```

## Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| app/core/ | >90% | Check |
| app/features/ | >85% | Check |
| app/integrations/ | >80% | Check |
| app/web/ | >75% | Check |
| app/auth/ | >90% | Check |

### Coverage Commands

```bash
# Generate HTML report
pytest --cov=app --cov-report=html tests/
open htmlcov/index.html

# Check minimum coverage
pytest --cov=app --cov-fail-under=80 tests/

# Coverage for specific module
pytest --cov=app/features/cleanup_engine tests/test_cleanup_engine.py
```

## CI Optimization

### GitHub Actions Config

```yaml
# .github/workflows/ci.yml
jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: pytest tests/unit/ -n auto --tb=short

  test-integration:
    runs-on: ubuntu-latest
    needs: test-unit  # Only run if unit tests pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: pytest tests/integration/ -n auto --tb=short
```

### Speed Improvements

1. **Parallel execution**: `-n auto`
2. **Cache pip**: `cache: 'pip'` in actions
3. **Skip slow in PR**: `-m "not slow"`
4. **Fail fast**: `-x` flag
5. **Load distribution**: `--dist loadfile`

## Checklist

### Before Feature (TDD)
- [ ] Write test for expected behavior
- [ ] Confirm test fails (RED)
- [ ] Implement minimal code
- [ ] Confirm test passes (GREEN)
- [ ] Refactor if needed

### After Feature
- [ ] Unit tests for all public methods
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Integration test for full flow
- [ ] Coverage meets target

### Before PR
- [ ] All tests pass locally
- [ ] No skipped tests without reason
- [ ] Coverage report reviewed
- [ ] E2E for critical paths

## Related Skills

- `chirp-architecture.md` - System design
- `security.md` - Security tests
- `github-operations.md` - CI/CD

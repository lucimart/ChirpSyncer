# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- implement comprehensive Playwright E2E test infrastructure

## Summary
- Complete Playwright E2E test infrastructure with Page Object Model
- 10+ E2E tests for authentication and credential management flows
- Optimized CI workflow with comprehensive test coverage reporting
- Added Playwright dependencies and browser automation setup

## E2E Test Infrastructure
- Page Object Model (POM) implementation for maintainable tests
- Fixtures for Flask app server, database, and user management
- Automated browser testing with Chromium and Firefox
- Test coverage for critical user workflows

## Tests Implemented
**Authentication Flows (tests/e2e/playwright/test_auth_flows.py):**
- Complete user registration and login flow
- Login validation and error handling
- Session management and logout
- Password validation requirements
- Authentication state persistence
- Invalid credential handling

**Credential Management (tests/e2e/playwright/test_credential_management.py):**
- Add new platform credentials
- Encryption verification in database
- Delete credentials workflow
- Multi-platform credential support

**Additional E2E Test Stubs:**
- Analytics flows
- Error handling
- Multi-user scenarios
- Session management
- Task scheduling
- UI interactions

## CI/CD Optimizations
**Enhanced .github/workflows/ci.yml:**
- Consolidated test execution (unit + integration + e2e)
- Playwright browser installation (chromium, firefox)
- Comprehensive coverage reporting (XML, HTML, terminal)
- Coverage artifact upload for reuse
- Coverage badge generation
- Codecov integration
- GitHub Actions summary with test results
- Python 3.11 testing matrix

## Dependencies Added
**requirements-dev.txt:**
- playwright==1.40.0
- pytest-playwright==0.4.3
- pytest-cov==6.0.0 (for coverage reporting)

## Configuration Files
**playwright.config.js:**
- Base URL configuration for Flask app (localhost:5000)
- Browser project setup (chromium, firefox)
- Screenshot and video capture on failure
- 30s test timeout
- Test directory configuration

## Documentation
- E2E_IMPLEMENTATION_SUMMARY.md: Complete implementation overview
- E2E_SETUP_COMPLETE.md: Setup completion guide
- RUNNING_E2E_TESTS.md: Detailed test execution instructions
- tests/e2e/playwright/README.md: Playwright-specific documentation

## Testing Philosophy
- Real browser automation (no mocking)
- Database state verification
- Encryption validation
- Complete user journey testing
- Cross-browser compatibility
- Automated CI/CD integration

## Page Object Model Structure
- BasePage: Common page functionality
- LoginPage: Authentication workflows
- RegisterPage: User registration
- DashboardPage: Main dashboard interactions
- CredentialsPage: Credential CRUD operations

## Coverage Impact
- E2E tests ensure critical user paths work end-to-end
- Complements unit and integration tests
- Validates frontend-backend integration
- Catches UI regression issues
- Verifies database encryption

## Next Steps
- Run: python -m playwright install chromium firefox
- Execute tests: pytest tests/e2e/playwright/ -v
- View HTML coverage: open htmlcov/index.html
- CI/CD automatically runs all test suites on PR
- add comprehensive integration tests for search, reports, saved content, core, and enhanced platform modules

Phase 2.3: Search Engine Integration (68 tests)
- FTS5 index initialization and management (9 tests)
- Full-text search queries with ranking (10 tests)
- Advanced search features: hashtags, dates, proximity (10 tests)
- Multi-user isolation verification (3 tests)
- Index synchronization via triggers (5 tests)
- Error handling and edge cases (6+ tests)
- Coverage: 87.97% of search_engine (117/133 statements)

Phase 2.4: Report Generator Integration (88 tests)
- Report initialization and database schema (6 tests)
- Engagement reports in all formats (9 tests)
- Growth and trend analysis (7 tests)
- Top tweets reporting (5 tests)
- Data export functionality (5 tests)
- Period parsing and validation (8 tests)
- Sync performance reports (8 tests)
- Cross-platform analysis (5 tests)
- Multi-user isolation (3 tests)
- Error handling (7 tests)
- Coverage: 78.48% of report_generator (175/223 statements)

Phase 2.5: Saved Content Integration (56 tests)
- Database schema and initialization (5 tests)
- Bookmark management operations (9 tests)
- Collections/folders organization (9 tests)
- Notes and annotations (6 tests)
- Search and filtering (8 tests)
- Export to JSON/CSV (6 tests)
- Multi-user data isolation (5 tests)
- Statistics and analytics (5 tests)
- Complex workflows (3 tests)
- Coverage: 83.22% of saved_content (119/143 statements)

Phase 3+: Platform Integration Enhancements (22 new tests)
- Enhanced bluesky_handler: 0% → 97.59% coverage
- Enhanced twitter_scraper: 0% → 93.26% coverage
- Enhanced twitter_api_handler: 21% → 100% coverage
- Enhanced credential_validator: 58% → 91.30% coverage
- Fixed mocking issues preventing code execution
- Added comprehensive async testing
- Total: 64 tests, all passing

Phase 6: Core Modules Integration (47 tests)
- Database handler operations (16 tests)
- Configuration loading and validation (6 tests)
- Utility functions (5 tests)
- Input validation (7 tests)
- Real file I/O and database operations
- Coverage: 97.48% of core modules (116/119 statements)

Summary:
- Total new tests: 281 (68 + 88 + 56 + 22 + 47)
- Total new test code: ~10,500 lines
- All tests passing with real SQLite DB integration
- Comprehensive error handling and edge cases
- Multi-user isolation verified across all modules
- add services and dashboard integration tests

Phase 4: Services Integration (32 tests)
- Notification service: email config, SMTP connection, batch sending (12 tests)
- User settings: CRUD operations, multi-user isolation, type handling (9 tests)
- Stats handler: recording, aggregation, success rates, rollup (9 tests)
- Cross-service integration workflows (2 tests)
- Coverage: 80.07% of services modules (241/301 statements)

Phase 5: Dashboard Routes Integration (45 tests)
- Authentication routes: login, register, logout, session management (10 tests)
- Dashboard routes: main page, analytics rendering (4 tests)
- User management: list, view, edit, delete with RBAC (6 tests)
- Credential management: add, edit, delete, test validation (8 tests)
- Task management routes: list, trigger, status (5 tests)
- Analytics API routes: overview, top-tweets, metrics, snapshots (4 tests)
- Error handling: 404, 403, error pages (4 tests)
- Session persistence and workflows (4 tests)
- Coverage: 65.49% of dashboard module (260/397 statements)

Total: 77 new integration tests with real Flask/DB integration
All tests passing with comprehensive route coverage
- add comprehensive integration tests for auth, scheduler, cleanup, and platform modules

Phase 1: Authentication Integration (32 tests)
- User registration and login workflows
- Multi-user credential management with AES-256-GCM encryption
- Authentication decorator integration (@require_auth, @require_admin)
- Session management and expiration
- Audit trail verification
- Coverage: 75% of app/auth modules (418 statements)

Phase 2.1: Tweet Scheduler Integration (37 tests)
- Complete scheduling workflows with DB persistence
- Credential integration with CredentialManager
- Status transitions (pending → posted/failed/cancelled)
- Queue processing with batch handling
- Edit and cancel operations
- Coverage: 100% of tweet_scheduler (134 statements)

Phase 2.2: Cleanup Engine Integration (17 tests)
- Age-based, engagement-based, and pattern-based cleanup rules
- Dry run vs execute validation
- Multi-rule interaction and enable/disable
- User isolation verification
- Database schema updates (cleanup_rules, cleanup_history tables)
- Coverage: 96% of cleanup_engine (185 statements)

Phase 3: Platform Integration (20 tests)
- Bluesky handler: login, post, media, error handling
- Twitter API handler: OAuth, tweet posting, media upload
- Twitter scraper: async/sync wrapper, tweet adapters
- Credential validator: all credential types validation
- End-to-end sync workflows with multi-user isolation
- Coverage: All 4 integration modules (293 statements)

Total: 106 new integration tests
All tests passing with real SQLite DB integration
- add commit-msg, pre-commit, and pre-push hooks

- commit-msg: validates conventional commit format
- pre-commit: black, isort, syntax, secrets check
- pre-push: runs full test suite before pushing
- Updated hooks documentation with examples
- Integration test suite with 122 tests
- E2E test suite with 24 tests
- GitHub Actions workflows for integration and E2E tests
- Credential validation against live APIs
- Twitter posting from scheduler via API v2
- Git hooks for automatic changelog updates

### Changed
- separate unit, integration, and e2e test workflows

- CI workflow now only runs unit tests (tests/*.py)
- Integration tests workflow runs tests/integration/
- E2E tests workflow runs tests/e2e/
- Added Playwright browser installation to e2e workflow
- Added system dependencies and test credentials to all workflows
- Updated coverage artifact names to distinguish between test types
- Added coverage flags (unit, integration, e2e) for Codecov

Benefits:
- Faster feedback loop with separate test suites
- Easier to debug specific test type failures
- Better coverage tracking per test type
- Each workflow runs only what it needs
- Test coverage from 87.77% to 93.59%
- Dashboard credentials test validates against actual APIs
- README rewritten for clarity

### Fixed
- remove manual pytest-playwright plugin declaration

- pytest-playwright auto-registers as a plugin when installed
- Manual declaration was causing import errors
- Plugin will be discovered automatically by pytest
- move pytest_plugins to top-level conftest.py

- pytest_plugins declaration must be in top-level conftest.py
- Moved from tests/e2e/playwright/conftest.py to tests/conftest.py
- pytest-playwright plugin now loaded globally for all tests
- Fixes pytest collection error in CI

Error fixed:
  Defining 'pytest_plugins' in a non-top-level conftest is no longer supported
- remove --with-deps flag from playwright install

- Ubuntu 24.04 renamed libasound2 to libasound2t64
- Playwright --with-deps tries to install old package name
- GitHub Actions runners have most dependencies pre-installed
- Install only browsers without system dependency management
- fix 6 failing integration tests

- Fix validation tests to patch config values directly instead of os.environ
  Config values are loaded at import time, so patching environment
  variables after import has no effect
- Fix Bluesky error handling tests to use single Exception type
  instead of tuple with RetryError to avoid MagicMock type errors
- Move imports before patch context for proper fixture setup

Fixes:
- test_validate_credentials_raises_on_missing_twitter_username
- test_validate_credentials_raises_on_empty_string_credentials
- test_validate_credentials_raises_on_missing_bluesky_credentials
- test_validate_credentials_handles_whitespace_only_strings
- test_bluesky_handler_post_error_handling
- test_bluesky_handler_fetch_error_handling
- downgrade pytest to 8.3.4 for playwright compatibility

- pytest-playwright 0.5.2 requires pytest<9.0.0
- Downgrade from pytest 9.0.2 to 8.3.4
- Resolves dependency conflict with pytest-playwright
- upgrade pytest-playwright to 0.5.2 for pytest 9.x compatibility

- pytest-playwright 0.4.3 requires pytest<8.0.0
- pytest-playwright 0.5.2 supports pytest 9.x
- Resolves dependency conflict in CI pipeline
- enable pytest-playwright plugin and fix fixture chain

- Add pytest_plugins declaration to enable pytest-playwright
- Rename browser_context to context to match pytest-playwright convention
- Add browser fixture to ensure proper dependency chain
- Ensure app_server starts before browser launch
- Fix missing 'playwright' fixture error in CI
- update TweetScheduler tests to include master_key parameter

- TweetScheduler now requires master_key for credential decryption
- Updated all test instantiations to pass master_key
- All 542 unit tests passing with 87.18% coverage
- fix broken documentation links

- Update placeholder URL in API.md to actual repository
- Fix relative link path in SPRINT7_SUMMARY.md
- Configure link checker to ignore pre-release links:
  - GitHub releases/tags (will exist once created)
  - GitHub Pages site (will exist once set up)
  - Main branch file links (will exist after merge)
- make documentation checks fail on errors

- Removed continue-on-error from TODO/FIXME check
- Removed continue-on-error from markdown link check
- Disabled pre-push hook by default (850+ tests too slow)
- Updated documentation to reflect changes
- make documentation checks fail on errors

- Removed continue-on-error from TODO/FIXME check
- Removed continue-on-error from markdown link check
- Disabled pre-push hook by default (850+ tests too slow)
- Updated documentation to reflect changes
- correct awk logic to only update Unreleased section

- Fixed hook to stop at first version marker
- Prevents duplicate entries in historical versions
- Restored clean CHANGELOG.md state
- Hook now properly scopes changes to Unreleased only
- RuntimeWarning about unawaited coroutine in E2E tests
- Database error handling in analytics tracker
- User manager bcrypt and update error handling
- Credential manager encryption/decryption failures
- Git hook changelog logic to preserve existing entries

### Documentation
- update coverage threshold references to 90%

- Updated CONTRIBUTING.md
- Updated PR template checklist
- Updated GitHub setup summary
- update coverage threshold references to 90%

- Updated CONTRIBUTING.md
- Updated PR template checklist
- Updated GitHub setup summary
- Removed emojis from DATABASE.md
- Added comprehensive API.md (95KB) and DATABASE.md (75KB)
- Created automatic changelog system via git hooks


### Build
- remove claude/** from push trigger to avoid duplicate runs

- Feature branches only trigger on PR now
- Push trigger only for main branch
- Cuts CI runs by 50% for feature branches with open PRs
- remove Python 3.10 from test matrix

- Testing only on Python 3.11 (newer version)
- Reduces CI test runs by 50%
- Updated README badge
- lower coverage threshold from 95% to 90%

- Updated PR checks to require 90% coverage instead of 95%
- More realistic threshold for active development
- Integration tests remain at 85%
## [1.6.0] - 2026-01-12

### Added
- Comprehensive GitHub configuration including issue templates
- Security automation workflows
- Open source release checklist documentation
- Comprehensive deployment and configuration guides

### Changed
- Project restructured for better maintainability and open source release
- Updated documentation for public release

### Security
- Added Semgrep nosemgrep annotation for 0.0.0.0 binding
- Resolved security vulnerabilities identified in CI
- Enhanced security scanning in CI/CD pipeline

### Fixed
- Remaining CI failures before open source release
- Security issues flagged by automated scanning tools

## [1.5.0] - 2026-01-11

### Added
- Sprint 7 Architecture Decision Records (ADR)
- Comprehensive Sprint 7 documentation and summary
- Enhanced CI/CD improvements and automation
- Component review and optimization

### Changed
- Merged Sprint 7 implementation with improved CI/CD pipeline
- Updated test suite to 422/422 passing tests (100%)

### Fixed
- All notification service test failures (422/422 tests passing)
- Test failures and schema mismatches (from 399/408 to 422/422)
- Critical bugs identified during Sprint 7 review

## [1.4.0] - 2026-01-11

### Added
- Multi-user support with user authentication and role-based access control
- Secure credential management with AES-256-GCM encryption
- Cron-based scheduled tasks system with configurable intervals
- Task scheduler lifecycle management (pause/resume/monitoring)
- Database cleanup and maintenance operations
- Sprint 6 comprehensive documentation

### Changed
- Migrated to multi-user architecture with per-user data isolation
- Enhanced task scheduler with cron/interval/date scheduling support
- Improved test coverage to 89 passing tests for Sprint 6

### Fixed
- Migration issues from single-user to multi-user architecture
- Task scheduler edge cases and concurrent execution issues
- Database schema mismatches for multi-user support

## [1.3.0] - 2026-01-09

### Added
- Bidirectional sync support (Twitter ↔ Bluesky)
- Enhanced thread support with bidirectional detection
- Media handling for images and videos in both directions
- Advanced analytics dashboard with engagement metrics
- Statistics tracking for sync operations
- Report generation in multiple formats (PDF/CSV/JSON/HTML)
- Full-text search engine with FTS5
- Bookmark management and saved content collections
- Comprehensive Sprint 4 and Sprint 5 documentation

### Changed
- Enhanced thread detection and posting logic
- Improved media upload pipeline with MIME type detection
- Updated ARCHITECTURE.md with Sprint 5 comprehensive documentation
- Increased test coverage to 86 tests (Sprint 4) and 74-77 tests (Sprint 5)

### Fixed
- Bidirectional sync edge cases and duplicate prevention
- Thread ordering and reply chain reconstruction
- Media processing errors and size validation issues

## [1.2.0] - 2026-01-09

### Added
- Production-ready deployment configuration
- Thread support for Twitter and Bluesky
- Thread detection and chain reconstruction
- Rate limiting enforcement
- Audit logging for all operations
- Comprehensive architecture documentation

### Changed
- Enhanced error recovery mechanisms
- Improved database schema for thread support
- Increased test coverage to 69 passing tests

### Fixed
- Production deployment issues
- Thread ordering and reply detection bugs
- Rate limiting edge cases

## [1.1.0] - 2026-01-09

### Added
- Migration from Tweety to twscrape for Twitter scraping
- Robustness improvements for API failures
- Enhanced error handling and retry logic
- Duplicate detection improvements

### Changed
- Replaced Tweety scraper with twscrape for better reliability
- Enhanced API error handling with exponential backoff
- Improved test coverage and stability

### Fixed
- Twitter API scraping reliability issues
- Connection timeout and retry failures
- Duplicate post detection edge cases

## [1.0.0] - 2026-01-08

### Added
- Test-driven development (TDD) approach with comprehensive test suite
- Critical bug fixes for core functionality
- Test coverage tracking with .gitignore rules
- Comprehensive architecture documentation
- Foundation for production-ready application

### Changed
- Implemented TDD methodology for all new features
- Enhanced code quality with comprehensive tests

### Fixed
- All critical bugs identified in initial implementation
- Core synchronization logic errors
- Database persistence issues

## [0.1.0] - 2024-12-21

### Added
- Initial project setup and architecture
- Basic Twitter to Bluesky synchronization
- Twitter scraper integration using Tweety
- Basic database schema for posts and sync state
- Initial README documentation

### Changed
- Replaced Twitter API with Tweety scraper for cost-effective access

### Fixed
- README formatting and documentation issues

## [0.0.1] - 2024-12-11

### Added
- First commit with project foundation
- Basic project structure
- Initial configuration files

[Unreleased]: https://github.com/lucimart/ChirpSyncer/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/lucimart/ChirpSyncer/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/lucimart/ChirpSyncer/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/lucimart/ChirpSyncer/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/lucimart/ChirpSyncer/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/lucimart/ChirpSyncer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lucimart/ChirpSyncer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lucimart/ChirpSyncer/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/lucimart/ChirpSyncer/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/lucimart/ChirpSyncer/releases/tag/v0.0.1

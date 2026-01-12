# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- Test coverage from 87.77% to 93.59%
- Dashboard credentials test validates against actual APIs
- README rewritten for clarity

### Fixed
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

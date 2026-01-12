# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive integration test suite with 122 tests covering end-to-end component interactions
- E2E test suites with 24 tests for complete user workflows
- GitHub Actions workflows for integration and E2E tests with separate coverage tracking
- Dynamic status badges to README (CI, coverage, issues, stars)

### Changed
- Improved test coverage from 87.77% to 93.59% (+5.86 points)
- Rewritten README for clarity and professionalism with reduced verbosity
- Enhanced error handling tests across multiple modules

### Fixed
- RuntimeWarning about unawaited coroutine in E2E tests
- Database error handling in analytics tracker
- Bcrypt and update error handling in user manager
- Encryption/decryption failure handling in credential manager

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

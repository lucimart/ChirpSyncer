# Git Hooks

Project automation hooks for ChirpSyncer.

## Setup

```bash
git config core.hooksPath .githooks
```

## Active Hooks

### commit-msg
Validates commit message format (conventional commits).

**Required format:** `type(scope): description`

**Valid types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation
- `style` - Code formatting
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance
- `perf` - Performance
- `ci` - CI/CD
- `build` - Build system
- `revert` - Revert commits

**Examples:**
```bash
feat(auth): add OAuth2 support
fix(sync): handle rate limit errors
docs: update API documentation
```

### pre-commit
Code quality checks before commit.

**Checks:**
- Black formatting
- isort import ordering
- Python syntax
- Potential secrets scan

**Skip:** `git commit --no-verify`

### pre-push
Disabled by default (tests run in CI).

**Why disabled:** Running 850+ tests before every push is excessive. CI handles full test suite.

**Enable:** Uncomment code in `.githooks/pre-push` if needed

### post-commit
Automatically updates `CHANGELOG.md` in Unreleased section.

**Maps types to categories:**
- `feat` → Added
- `fix` → Fixed
- `docs` → Documentation
- `refactor/perf` → Changed
- `test` → Testing
- `ci/build` → Build

**Skips:** `chore` commits and changelog-related commits

## Hook Configuration

### Disable specific hooks
Comment out checks in hook files.

### Adjust strictness
Edit validation patterns and thresholds in hook scripts.

### Enable optional checks
Uncomment sections in hooks:
- `pre-commit`: Unit tests
- `pre-push`: Coverage threshold

## Troubleshooting

**Hook not running:**
```bash
git config core.hooksPath .githooks
chmod +x .githooks/*
```

**Tests too slow:**
```bash
# Skip pre-push for this push only
git push --no-verify
```

**Format failures:**
```bash
# Auto-fix formatting
black app/ tests/
isort app/ tests/
git add -u
git commit
```

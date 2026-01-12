# Git Hooks

Custom git hooks for ChirpSyncer project automation.

## Setup

```bash
git config core.hooksPath .githooks
```

## Hooks

### post-commit

Automatically updates `CHANGELOG.md` based on conventional commit messages.

**Supported commit types:**
- `feat`: New features (Added)
- `fix`: Bug fixes (Fixed)
- `docs`: Documentation changes
- `refactor`: Code refactoring (Changed)
- `perf`: Performance improvements (Changed)
- `test`: Test additions/changes
- `ci`: CI/CD changes
- `build`: Build system changes

**Format:** `type(scope): description`

**Examples:**
```
feat(auth): add OAuth2 support
fix(sync): handle rate limit errors
docs(api): update authentication examples
```

The hook parses the commit message and adds an entry to the Unreleased section of CHANGELOG.md under the appropriate category.

### prepare-commit-msg

Currently a placeholder for future commit message validation.

## Manual Changelog Updates

For multi-line commit messages or complex changes, manually edit CHANGELOG.md following the Keep a Changelog format.

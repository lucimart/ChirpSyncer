---
name: GitHub Operations
description: PR management, repo hygiene, CI/CD, and repository health
---

# Skill: GitHub Operations

Comprehensive GitHub management: PRs, CI/CD, repo hygiene, and automation.

## Quick Reference

| Operation | Tool | Auto-Trigger |
|-----------|------|--------------|
| Create PR | mcp__github__create_pull_request | after_feature_complete |
| Check CI | mcp__github__get_pull_request_status | after_pr_create |
| Fix CI | Trigger chirp-testing skill | after_ci_failure |
| Merge | mcp__github__merge_pull_request | after_approval |

## PR Workflow

### Creating PRs

```python
# 1. Check branch status
git status
git log main..HEAD --oneline

# 2. Create PR with proper format
mcp__github__create_pull_request(
    owner="user",
    repo="ChirpSyncer",
    title="feat: Implement cleanup engine real API",
    head="feature-branch",
    base="main",
    body="""## Summary
- Implemented _fetch_user_tweets with twscrape
- Implemented _delete_tweet with Twitter API v2
- Added rate limiting (50 delete/15min)
- Added exponential backoff retry

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual test with dry_run=True

## Related
- Closes #123
"""
)
```

### PR Title Format

```
<type>: <short description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- refactor: Code change without feature/fix
- test: Adding tests
- chore: Maintenance tasks
```

### PR Body Template

```markdown
## Summary
<1-3 bullet points of changes>

## Test Plan
- [ ] Specific test steps

## Related
- Closes #<issue>
- Related to #<issue>
```

## CI/CD Management

### Check Pipeline Status

```python
mcp__github__get_pull_request_status(
    owner="user",
    repo="ChirpSyncer",
    pull_number=123
)
```

### On CI Failure

1. Get failure details
2. Identify failing job
3. Trigger appropriate fix skill:
   - Test failure -> chirp-testing skill
   - Lint failure -> Fix code style
   - Type error -> Fix types
   - Security scan -> security skill

### GitHub Actions Structure

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v --tb=short

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ruff
      - run: ruff check .
```

## Repository Hygiene

### Root Folder Organization

```
ChirpSyncer/
├── app/              # Source code
├── tests/            # Test files
├── docs/             # Documentation
├── .github/          # GitHub config
│   ├── workflows/    # CI/CD
│   └── CODEOWNERS    # Review assignments
├── .claude/          # Claude skills
├── README.md         # Project overview (concise)
├── CLAUDE.md         # Claude instructions
├── requirements.txt  # Dependencies
├── pytest.ini        # Test config
└── .gitignore        # Ignore patterns
```

### README Standards

- Short and professional
- No emojis
- Dynamic badges (CI status, coverage)
- Quick start (3-5 steps max)
- Link to docs/ for details
- No stale information

```markdown
# ChirpSyncer

Cross-platform social media sync between Twitter and Bluesky.

![CI](https://github.com/user/ChirpSyncer/workflows/CI/badge.svg)
![Coverage](https://codecov.io/gh/user/ChirpSyncer/branch/main/graph/badge.svg)

## Quick Start

1. Clone: `git clone ...`
2. Install: `pip install -r requirements.txt`
3. Configure: `cp .env.example .env`
4. Run: `python -m app.main`

## Documentation

See [docs/](docs/) for full documentation.

## License

MIT
```

### .gitignore Maintenance

Always include:
```gitignore
# Python
__pycache__/
*.py[cod]
.pytest_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/

# Environment
.env
.env.local
*.local

# IDE
.idea/
.vscode/
*.swp

# Credentials (NEVER commit)
*.pem
*.key
credentials.json
secrets/

# OS
.DS_Store
Thumbs.db

# Project specific
chirpsyncer.db
*.log
```

### Credential Leak Prevention

Before every commit:
1. Check for .env files
2. Check for hardcoded tokens/keys
3. Verify .gitignore covers secrets
4. Use git-secrets or similar tool

```bash
# Install git-secrets
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'sk-[a-zA-Z0-9]{32}'  # API keys
git secrets --add 'ghp_[a-zA-Z0-9]{36}' # GitHub tokens
```

## Automation

### Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/sh
# Run tests
pytest tests/unit/ -q
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi

# Check for secrets
git secrets --scan
if [ $? -ne 0 ]; then
    echo "Potential secrets detected. Commit aborted."
    exit 1
fi
```

### Branch Protection

Recommended settings:
- Require PR reviews (1+)
- Require status checks (CI)
- Require up-to-date branches
- No force push to main

## Checklist

### Before PR
- [ ] Branch up to date with main
- [ ] Tests pass locally
- [ ] No credential leaks
- [ ] Commit messages follow format
- [ ] README updated if needed

### PR Review
- [ ] Title follows format
- [ ] Description complete
- [ ] Tests added for changes
- [ ] No TODO comments left
- [ ] Documentation updated

### After Merge
- [ ] Delete feature branch
- [ ] Update related issues
- [ ] Verify deployment (if applicable)

## MCP Tools Reference

| Operation | Tool |
|-----------|------|
| List PRs | mcp__github__list_pull_requests |
| Get PR | mcp__github__get_pull_request |
| Create PR | mcp__github__create_pull_request |
| PR Files | mcp__github__get_pull_request_files |
| PR Status | mcp__github__get_pull_request_status |
| PR Review | mcp__github__create_pull_request_review |
| Merge PR | mcp__github__merge_pull_request |
| Create Issue | mcp__github__create_issue |
| Update Issue | mcp__github__update_issue |
| Search Code | mcp__github__search_code |
| Get File | mcp__github__get_file_contents |
| Push Files | mcp__github__push_files |
| Create Branch | mcp__github__create_branch |

## Related Skills

- `chirp-testing.md` - Fix test failures
- `security.md` - Fix security issues
- `documentation-brain.md` - Update docs

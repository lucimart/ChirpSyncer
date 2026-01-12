# Contributing to ChirpSyncer

Thank you for your interest in contributing to ChirpSyncer! This document provides guidelines and instructions for contributing.

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Making Changes](#making-changes)
5. [Testing](#testing)
6. [Submitting Changes](#submitting-changes)
7. [Code Review Process](#code-review-process)
8. [Style Guidelines](#style-guidelines)
9. [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Experience level
- Gender identity and expression
- Sexual orientation
- Disability
- Personal appearance
- Body size
- Race or ethnicity
- Age
- Religion
- Nationality

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment, trolling, or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Report violations to: conduct@chirpsyncer.com (coming soon) or via GitHub Issues.

---

## Getting Started

### Ways to Contribute

There are many ways to contribute to ChirpSyncer:

1. **Report Bugs** 🐛
   - Use the bug report template
   - Provide detailed reproduction steps
   - Include environment information

2. **Suggest Features** ✨
   - Use the feature request template
   - Describe the problem it solves
   - Provide use cases

3. **Improve Documentation** 📚
   - Fix typos or clarify existing docs
   - Add examples
   - Translate documentation

4. **Write Code** 💻
   - Fix bugs
   - Implement new features
   - Improve performance
   - Refactor code

5. **Review Pull Requests** 👀
   - Test changes
   - Provide constructive feedback
   - Suggest improvements

6. **Help Others** 💬
   - Answer questions in Discussions
   - Help troubleshoot issues
   - Share your ChirpSyncer setup

### First Time Contributors

Looking for a good first issue? Check issues labeled:
- `good first issue`
- `beginner-friendly`
- `documentation`
- `help wanted`

---

## Development Setup

### Prerequisites

- Python 3.10 or 3.11
- Git
- SQLite 3
- Virtual environment tool (venv, virtualenv, or conda)

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ChirpSyncer.git
cd ChirpSyncer

# Add upstream remote
git remote add upstream https://github.com/lucimart/ChirpSyncer.git
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

### 3. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest pytest-cov black isort flake8 pylint mypy bandit safety
```

### 4. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your test credentials
nano .env
```

### 5. Initialize Database

```bash
python3 -c "from app.core.db_handler import init_db; init_db()"
```

### 6. Verify Setup

```bash
# Run tests
pytest tests/ -v

# All 422 tests should pass
```

---

## Making Changes

### 1. Create a Branch

Always create a new branch for your changes:

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes:
git checkout -b bugfix/issue-number-description
```

**Branch naming conventions:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `ci/` - CI/CD changes

### 2. Make Your Changes

Follow these guidelines:
- ✅ Keep changes focused (one feature/fix per PR)
- ✅ Write clear, descriptive commit messages
- ✅ Add tests for new functionality
- ✅ Update documentation as needed
- ✅ Follow the style guide

### 3. Write Tests

**All code changes require tests.**

```bash
# Run tests
pytest tests/ -v

# Run with coverage
pytest --cov=app --cov-report=term --cov-report=html tests/

# Check coverage threshold (must be ≥90%)
open htmlcov/index.html
```

**Test guidelines:**
- Write tests before code (TDD approach)
- Test both success and failure cases
- Test edge cases
- Use descriptive test names
- Mock external dependencies

Example test:
```python
def test_user_creation_success(db_path):
    """Test successful user creation"""
    um = UserManager(db_path)
    user_id = um.create_user("testuser", "test@example.com", "password123", "user")

    assert user_id > 0
    user = um.get_user(user_id)
    assert user['username'] == "testuser"
    assert user['email'] == "test@example.com"
```

---

## Testing

### Running Tests

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_user_manager.py

# Run specific test
pytest tests/test_user_manager.py::test_user_creation_success

# Run with verbose output
pytest tests/ -v

# Run with coverage
pytest --cov=app tests/

# Run only failed tests
pytest --lf
```

### Test Structure

```
tests/
├── conftest.py              # Shared fixtures
├── test_module_name.py      # Tests for app/module_name.py
└── ...
```

### Writing Good Tests

```python
import pytest
from app.module import function

@pytest.fixture
def setup_data():
    """Fixture for test data"""
    return {"key": "value"}

def test_function_success(setup_data):
    """Test function with valid input"""
    result = function(setup_data)
    assert result == expected_value

def test_function_failure():
    """Test function with invalid input"""
    with pytest.raises(ValueError):
        function(invalid_input)
```

---

## Submitting Changes

### 1. Commit Your Changes

Follow **Conventional Commits** format:

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve database connection issue"
git commit -m "docs: update installation guide"
git commit -m "test: add tests for search engine"
git commit -m "refactor: reorganize app structure"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build process or dependencies
- `ci`: CI/CD changes
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

1. Go to https://github.com/lucimart/ChirpSyncer
2. Click "Pull requests" → "New pull request"
3. Click "compare across forks"
4. Select your fork and branch
5. Fill out the PR template completely
6. Submit the pull request

### 4. PR Requirements

Before submitting, ensure:
- [ ] All tests pass (422/422)
- [ ] Coverage remains ≥90%
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] PR description is complete
- [ ] No merge conflicts

---

## Code Review Process

### What to Expect

1. **Automated Checks** (5-10 minutes)
   - CI tests (Python 3.10, 3.11)
   - Linting (flake8, black, isort)
   - Security scans (CodeQL, Bandit, Safety)
   - Coverage check (≥90%)

2. **Code Review** (1-3 days)
   - A maintainer will review your code
   - May request changes or ask questions
   - Be responsive to feedback

3. **Approval & Merge** (1-2 days after approval)
   - Once approved, maintainer merges
   - Your changes go into the next release

### Responding to Feedback

- Be patient and respectful
- Ask for clarification if needed
- Make requested changes promptly
- Push updates to the same branch
- Re-request review after updates

### If Your PR Is Not Merged

Reasons a PR might not be merged:
- Doesn't align with project goals
- Introduces breaking changes
- Insufficient test coverage
- Code quality issues
- Duplicate functionality

Don't take it personally! Discuss with maintainers to understand why.

---

## Style Guidelines

### Python Code Style

We follow **PEP 8** with some modifications:

```python
# Use Black formatter (line length: 120)
black app/ tests/ --line-length 120

# Sort imports with isort
isort app/ tests/

# Check with flake8
flake8 app/ tests/ --max-line-length=120 --extend-ignore=E203,W503
```

### Code Conventions

**Naming:**
```python
# Classes: PascalCase
class UserManager:
    pass

# Functions/variables: snake_case
def get_user_by_id(user_id):
    pass

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3

# Private: _prefix
def _internal_function():
    pass
```

**Docstrings:**
```python
def function_name(param1: str, param2: int) -> bool:
    """
    Brief description of what function does.

    Longer description if needed. Explain behavior, edge cases, etc.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value

    Raises:
        ValueError: When param1 is empty
        TypeError: When param2 is not an integer

    Example:
        >>> function_name("test", 42)
        True
    """
    pass
```

**Type Hints:**
```python
from typing import Optional, List, Dict

def get_users(limit: int = 10) -> List[Dict[str, any]]:
    """Get list of users."""
    pass

def find_user(user_id: int) -> Optional[Dict[str, any]]:
    """Find user by ID, return None if not found."""
    pass
```

### Import Organization

```python
# Standard library imports
import os
import sys
from datetime import datetime

# Third-party imports
import flask
from sqlalchemy import create_engine

# Local imports
from app.core.config import DB_PATH
from app.auth.user_manager import UserManager
```

### Comments

```python
# Good: Explain WHY, not WHAT
# Calculate engagement rate to compare posts across different audiences
engagement_rate = (likes + retweets) / impressions * 100

# Bad: Obvious comment
# Add 1 to counter
counter += 1
```

---

## Documentation

### When to Update Docs

Update documentation when you:
- Add a new feature
- Change existing behavior
- Fix a bug that was incorrectly documented
- Add new API endpoints
- Change configuration options

### Documentation Locations

- **README.md** - Project overview, installation, quick start
- **docs/** - Detailed guides (deployment, configuration, etc.)
- **Docstrings** - Inline code documentation
- **CHANGELOG.md** - Version history (maintainers update)

### Documentation Style

- Use clear, concise language
- Include code examples
- Use proper markdown formatting
- Test all code examples
- Add screenshots for UI changes

---

## Community

### Getting Help

- **Discussions**: https://github.com/lucimart/ChirpSyncer/discussions
- **Issues**: https://github.com/lucimart/ChirpSyncer/issues
- **Email**: support@chirpsyncer.com (coming soon)

### Staying Updated

- Watch the repository for notifications
- Star the repository to show support
- Follow project updates in Discussions

### Recognition

Contributors are recognized in:
- GitHub Contributors page
- Release notes (for significant contributions)
- CONTRIBUTORS.md (coming soon)

---

## License

By contributing to ChirpSyncer, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

Don't hesitate to ask! We're here to help:
- Open a Discussion for questions
- Comment on issues for clarification
- Reach out to maintainers

**Thank you for contributing to ChirpSyncer!** 🎉

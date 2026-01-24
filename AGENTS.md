# ChirpSyncer Agent Guide

**Generated:** 2026-01-22
**Context:** Bidirectional Twitter <-> Bluesky sync platform with analytics and scheduling.
**Tech Stack:** Python 3.11 (Flask), Next.js 14 (App Router), SQLite, Redis, Celery.

---

## 1. Environment & Commands

### Backend (Python)
- **Start API:** `make api` (Runs Flask on :5000)
- **Start Worker:** `make worker` (Runs Celery)
- **Lint/Format:** `make lint` (Runs black + flake8)
- **Dependencies:** `pip install -r requirements.txt`

### Frontend (Next.js)
- **Start Dev:** `make frontend` (Runs Next.js on :3000)
- **Lint:** `npm run lint`
- **Dependencies:** `cd frontend && npm install`

### Testing
- **Run All Tests:** `make test-all` (with coverage)
- **Run Unit Tests:** `make test`
- **Run Single File:** `pytest tests/unit/test_filename.py`
- **Run Single Case:** `pytest -k "test_function_name"`
- **E2E Tests:** Located in `tests/e2e/playwright/`

### Docker (Preferred for Full Stack)
- **Start All:** `make dev`
- **Stop All:** `make stop`
- **Logs:** `make logs`

---

## 2. Python Code Style (Backend)

**Standards:** PEP 8, Black, Isort, Flake8.

### Imports
- **Absolute Imports Only:** Use `from app.core.config import settings`, NOT `from ..config import settings`.
- **Grouping:** 
  1. Standard Library (`import os`)
  2. Third Party (`import flask`)
  3. Local (`from app.services import ...`)

### Type Hinting
- **Strictness:** Mandatory for all new service/protocol code.
- **Tools:** Checked via `mypy`.
- **Pattern:**
  ```python
  from typing import Optional, List, Dict
  
  def process_posts(posts: List[Dict[str, Any]]) -> Optional[int]:
      ...
  ```

### Naming Conventions
- **Classes:** `PascalCase` (e.g., `TwitterConnector`)
- **Functions/Vars:** `snake_case` (e.g., `sync_user_timeline`)
- **Constants:** `UPPER_CASE` (e.g., `MAX_RETRIES = 3`)
- **Private Members:** `_single_underscore` (e.g., `_sanitize_token`)

### Error Handling
- **Logic:** Define custom exceptions in the module (e.g., `TwitterAuthError`).
- **API:** Catch errors at the view layer and return standard responses using `app.web.api.v1.responses.api_error`.
- **Logging:** Use `app.core.logger`. NEVER use `print()`.

### Testing Pattern
- **Fixtures:** Use `conftest.py` fixtures for DB and API mocks.
- **Mocking:** Use `unittest.mock.MagicMock` for external APIs (Twitter/Bluesky).
- **Structure:** `tests/unit` (logic), `tests/integration` (db + service).

---

## 3. TypeScript/Next.js Code Style (Frontend)

**Standards:** React 18, Next.js 14 App Router, Styled-Components.

### Component Structure
- **Type:** Functional Components only.
- **Props:** Use `interface ComponentProps` (exported if reusable).
- **Styling:** Use `styled-components`.
- **Example:**
  ```tsx
  import styled from 'styled-components';
  
  interface ButtonProps {
    variant: 'primary' | 'secondary';
    onClick: () => void;
  }
  
  export const Button = ({ variant, onClick }: ButtonProps) => { ... }
  ```

### State Management
- **Global Auth:** `zustand` store in `src/lib/auth.ts`.
- **Server Data:** `react-query` (v5) for all API data.
- **Local:** `useState` for UI state (modals, inputs).

### API Integration
- **No Direct Fetch:** NEVER use `fetch()` in components.
- **Client:** Use `ApiClient` from `src/lib/api.ts`.
- **Hooks:** Create custom hooks in `src/hooks/` (e.g., `useSyncStatus`).

### Naming Conventions
- **Components:** `PascalCase` (e.g., `SyncDashboard.tsx`)
- **Hooks:** `camelCase` with prefix (e.g., `useRealtimeUpdates`)
- **Files:** Match export name. `index.ts` only for barrel exports.

---

## 4. Architecture & Anti-Patterns

### Key Directories
- `app/protocols/`: Connector logic for social platforms.
- `app/services/`: Core business logic (Sync, Analytics).
- `app/web/api/`: Flask Blueprint definitions.
- `frontend/src/app/`: Next.js App Router pages.

### Do Not
- **Do not** edit `frontend/.next` or `__pycache__`.
- **Do not** commit `.env` files.
- **Do not** put business logic in Flask routes (delegate to `services/`).
- **Do not** mix styled-components with Tailwind (this project uses styled-components).
- **Do not** use `any` in TypeScript unless absolutely necessary.

### Database
- **Engine:** SQLite (`chirpsyncer.db` in root).
- **ORM:** SQLAlchemy (via `app.core.db`).
- **Migrations:** Managed via `alembic` (if present) or `scripts/init_db.py`.

---

## 5. Agent Workflow Rules

1. **Check Requirements:** Read `pyproject.toml` or `package.json` before adding libs.
2. **Verify Changes:**
   - Python: Run `pytest tests/unit/test_modified_file.py`
   - Frontend: Run `npm run lint`
3. **Safety:** 
   - Never output raw secrets in logs.
   - Mock external API calls in tests.
4. **Docs:** Update docstrings if changing function signatures.

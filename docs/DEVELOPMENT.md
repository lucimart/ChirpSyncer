# Development Guide

Quick reference for running ChirpSyncer locally.

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start everything (Redis + API + Worker + Frontend)
make dev

# View logs
make logs

# Stop
make stop
```

**URLs:**
- Frontend: http://localhost:3000
- API: http://localhost:5000

### Option 2: Local Development (Hybrid)

Start Redis in Docker, run app locally for faster iteration:

```bash
# Terminal 1: Start Redis
make redis

# Terminal 2: Start API
make api

# Terminal 3: Start Frontend
make frontend

# Terminal 4 (optional): Start Celery worker
make worker
```

## First Time Setup

```bash
# Install dependencies
make setup

# Create sample data
make seed
```

## Test Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | AdminPass123! | Admin |
| testuser | TestPass123! | User |
| alice | AlicePass123! | User |
| bob | BobPass123! | User |

## Common Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start full dev environment (Docker) |
| `make stop` | Stop all services |
| `make logs` | View container logs |
| `make test` | Run unit tests |
| `make lint` | Run linters |
| `make seed` | Create sample data |
| `make db-reset` | Reset database |

## npm Scripts (Alternative)

If you prefer npm:

```bash
# Start dev environment
npm run start:dev

# Stop
npm run stop:dev

# Just Redis
npm run redis

# Just frontend
npm run frontend

# Run tests
npm test

# Seed data
npm run seed
```

## Project Structure

```
ChirpSyncer/
├── app/                    # Python backend
│   ├── web/               # Flask routes & dashboard
│   ├── core/              # Celery, cache, config
│   ├── features/          # Business logic
│   ├── services/          # Service layer
│   └── models/            # Database models
├── frontend/              # Next.js dashboard
│   ├── src/app/          # App router pages
│   └── src/lib/          # API client, hooks
├── tests/                 # Test suites
├── scripts/               # Dev & deployment scripts
└── docs/                  # Documentation
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required for sync features
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
BSKY_USERNAME=username.bsky.social
BSKY_PASSWORD=app_password

# App config
SECRET_KEY=change-this-in-production
ADMIN_PASSWORD=AdminPass123!
```

## Troubleshooting

### Port already in use

```bash
# Check what's using port 5000
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# Kill the process or change port in .env
```

### Docker issues

```bash
# Clean up everything
make docker-clean

# Rebuild from scratch
make rebuild
```

### Database issues

```bash
# Reset and reseed
make db-reset
make seed
```

## Running Tests

```bash
# Unit tests only
make test

# All tests with coverage
make test-all

# Specific test file
pytest tests/unit/test_sync_engine.py -v
```

## Manual E2E Testing

See [MANUAL_E2E_TESTING.md](./MANUAL_E2E_TESTING.md) for the full checklist.

Quick start:
1. `make dev` - Start services
2. `make seed` - Create test data
3. Open http://localhost:3000
4. Login with `admin` / `AdminPass123!`

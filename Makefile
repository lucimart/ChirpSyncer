# ChirpSyncer Makefile
# Simple commands for development and deployment

.PHONY: help dev start stop logs test lint setup seed clean \
        docker-rebuild-frontend docker-rebuild-api restart-frontend restart-api restart-worker \
        frontend-clear-cache frontend-reset-cache dev-rebuild docker-clean storybook

# Default target
help:
	@echo ""
	@echo "ChirpSyncer - Development Commands"
	@echo "==================================="
	@echo ""
	@echo "Quick Start (Docker - Recommended):"
	@echo "  make dev           Start full dev environment (Redis + API + Worker + Frontend)"
	@echo "  make stop          Stop all containers"
	@echo "  make logs          View all logs (follow mode)"
	@echo "  make logs-api      View API logs only"
	@echo "  make logs-frontend View frontend logs only"
	@echo ""
	@echo "Quick Start (Local - No Docker for app):"
	@echo "  make redis         Start Redis only (Docker)"
	@echo "  make api           Start Flask API (local Python)"
	@echo "  make frontend      Start Next.js frontend (local Node)"
	@echo "  make worker        Start Celery worker (local Python)"
	@echo ""
	@echo "Setup:"
	@echo "  make setup         Install all dependencies (Python + Node)"
	@echo "  make seed          Create sample data for testing"
	@echo ""
	@echo "Testing:"
	@echo "  make test          Run unit tests"
	@echo "  make test-all      Run all tests with coverage"
	@echo "  make lint          Run linters"
	@echo "  make storybook     Start Storybook on :6006"
	@echo ""
	@echo "Hot Reload:"
	@echo "  Frontend (Next.js):  Automatic - changes reflect instantly"
	@echo "  Backend (Flask):     Automatic - API restarts on .py changes"
	@echo "  Worker (Celery):     Manual - use 'make restart-worker'"
	@echo ""
	@echo "Restart Services (without rebuild):"
	@echo "  make restart-api       Restart API container"
	@echo "  make restart-frontend  Restart frontend container"
	@echo "  make restart-worker    Restart Celery worker"
	@echo ""
	@echo "Rebuild (when deps change):"
	@echo "  make dev-rebuild       Rebuild all (no cache)"
	@echo "  make docker-rebuild-api      Rebuild API only"
	@echo "  make docker-rebuild-frontend Rebuild frontend only"
	@echo ""

# =============================================================================
# DEVELOPMENT (Docker - Full Stack)
# =============================================================================

dev:
	@echo "Starting development environment..."
	@mkdir -p data logs
	docker compose -f docker-compose.dev.yml up -d --build
	@echo ""
	@echo "Services starting (may take a moment on first run):"
	@echo "  Frontend: http://localhost:3000"
	@echo "  API:      http://localhost:5000"
	@echo "  Redis:    localhost:6379"
	@echo ""
	@echo "Hot Reload enabled:"
	@echo "  - Frontend: Automatic (Next.js Fast Refresh)"
	@echo "  - Backend:  Automatic (Flask debug reloader)"
	@echo ""
	@echo "Run 'make logs' to view output"
	@echo "Run 'make stop' to stop all services"

stop:
	docker compose -f docker-compose.dev.yml down 2>/dev/null || true
	docker compose down 2>/dev/null || true

logs:
	docker compose -f docker-compose.dev.yml logs -f 2>/dev/null || docker compose logs -f

logs-api:
	docker compose -f docker-compose.dev.yml logs -f api

logs-frontend:
	docker compose -f docker-compose.dev.yml logs -f frontend

logs-worker:
	docker compose -f docker-compose.dev.yml logs -f worker

# =============================================================================
# DEVELOPMENT (Local - Hybrid)
# =============================================================================

redis:
	@docker run -d --name chirp-redis -p 6379:6379 redis:7-alpine 2>/dev/null || docker start chirp-redis
	@echo "Redis running on localhost:6379"

redis-stop:
	@docker stop chirp-redis 2>/dev/null || true

api:
	@echo "Starting Flask API on http://localhost:5000..."
	FLASK_DEBUG=true PYTHONPATH=. python -m app.web.dashboard

worker:
	@echo "Starting Celery worker..."
	PYTHONPATH=. celery -A app.core.celery_app.celery_app worker --loglevel=info

frontend:
	@echo "Starting Next.js on http://localhost:3000..."
	cd frontend && npm run dev

# =============================================================================
# PRODUCTION
# =============================================================================

start:
	docker compose up -d
	@echo "Production services started"

rebuild:
	docker compose up --build -d

# =============================================================================
# SETUP
# =============================================================================

setup: setup-python setup-frontend setup-env
	@echo ""
	@echo "Setup complete! Run 'make dev' to start."

setup-python:
	@echo "Installing Python dependencies..."
	pip install -r requirements.txt

setup-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

setup-env:
	@if [ ! -f .env ]; then \
		echo "Creating .env from template..."; \
		cp .env.example .env; \
		echo "Please edit .env with your credentials"; \
	fi

seed:
	@echo "Creating sample data..."
	@mkdir -p data
	DATABASE_PATH=data/chirpsyncer.db python scripts/seed_data.py

seed-clean:
	@echo "Resetting database and creating fresh data..."
	@mkdir -p data
	DATABASE_PATH=data/chirpsyncer.db python scripts/seed_data.py --clean

# Seed data inside Docker container
seed-docker:
	docker compose -f docker-compose.dev.yml exec api python scripts/seed_data.py

# =============================================================================
# TESTING
# =============================================================================

test:
	pytest tests/unit -v

test-all:
	pytest tests/ -v --cov=app --cov-report=html
	@echo "Coverage report: htmlcov/index.html"

lint:
	black app tests
	flake8 app tests

lint-check:
	black --check app tests
	flake8 app tests

# =============================================================================
# UTILITIES
# =============================================================================

clean:
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov .coverage 2>/dev/null || true

db-reset:
	@echo "Resetting database..."
	rm -f chirpsyncer.db data.db
	@echo "Database reset. Run 'make seed' to create fresh data."

# =============================================================================
# DOCKER UTILITIES
# =============================================================================

docker-clean:
	docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
	docker compose down -v --remove-orphans 2>/dev/null || true
	docker system prune -f

docker-shell-api:
	docker exec -it chirp-api-dev /bin/sh

docker-shell-frontend:
	docker exec -it chirp-frontend-dev /bin/sh

# Rebuild specific service without cache
docker-rebuild-frontend:
	docker compose -f docker-compose.dev.yml build --no-cache frontend
	docker compose -f docker-compose.dev.yml up -d frontend
	@echo "Frontend rebuilt and restarted"

docker-rebuild-api:
	docker compose -f docker-compose.dev.yml build --no-cache api
	docker compose -f docker-compose.dev.yml up -d api
	@echo "API rebuilt and restarted"

# Restart services (no rebuild)
restart-frontend:
	docker compose -f docker-compose.dev.yml restart frontend

restart-api:
	docker compose -f docker-compose.dev.yml restart api

restart-worker:
	docker compose -f docker-compose.dev.yml restart worker
	@echo "Worker restarted"

# Storybook
storybook:
	docker compose -f docker-compose.dev.yml --profile storybook up -d storybook
	@echo "Storybook starting on http://localhost:6006"

# Clear Next.js cache inside container and restart
frontend-clear-cache:
	docker compose -f docker-compose.dev.yml exec frontend rm -rf .next 2>/dev/null || true
	docker compose -f docker-compose.dev.yml restart frontend
	@echo "Frontend cache cleared and restarted"

# Full cache clear (removes Docker volume - use when cache issues persist)
frontend-reset-cache:
	docker compose -f docker-compose.dev.yml stop frontend
	docker volume rm chirpsyncer_frontend_next 2>/dev/null || true
	docker compose -f docker-compose.dev.yml up -d frontend
	@echo "Frontend cache volume removed and service restarted"

# Full dev rebuild (all services, no cache)
dev-rebuild:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.dev.yml build --no-cache
	docker compose -f docker-compose.dev.yml up -d
	@echo "All services rebuilt and started"

#!/bin/bash
# ChirpSyncer Development Environment Startup Script (Linux/macOS)
# Usage: ./scripts/dev-start.sh [--no-frontend] [--no-redis] [--seed]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
NO_FRONTEND=false
NO_REDIS=false
SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-frontend)
            NO_FRONTEND=true
            shift
            ;;
        --no-redis)
            NO_REDIS=true
            shift
            ;;
        --seed)
            SEED=true
            shift
            ;;
        --help|-h)
            echo "ChirpSyncer Development Environment"
            echo ""
            echo "Usage: ./scripts/dev-start.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-frontend    Skip starting the Next.js frontend"
            echo "  --no-redis       Skip starting Redis (use if Redis is already running)"
            echo "  --seed           Run seed data script after startup"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Components started:"
            echo "  1. Redis (Docker container)"
            echo "  2. Flask Backend (port 5000)"
            echo "  3. Celery Worker"
            echo "  4. Next.js Frontend (port 3000)"
            echo ""
            echo "Requirements:"
            echo "  - Python 3.10+"
            echo "  - Node.js 18+"
            echo "  - Docker (for Redis)"
            echo "  - .env file configured"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}  ChirpSyncer Development Environment  ${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        warn ".env file not found. Copying from .env.example..."
        cp .env.example .env
        warn "Please edit .env with your credentials before running again."
        exit 1
    else
        error ".env file not found and no .env.example available."
        exit 1
    fi
fi

# Load .env file
set -a
source .env
set +a

# Set development defaults
export FLASK_DEBUG=true
export FLASK_ENV=development
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export PYTHONPATH="$PROJECT_ROOT"

# Check Python
info "Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    error "Python not found. Please install Python 3.10+"
    exit 1
fi
PYTHON_VERSION=$($PYTHON_CMD --version)
success "Found $PYTHON_VERSION"

# Check Node.js (if frontend needed)
if [ "$NO_FRONTEND" = false ]; then
    info "Checking Node.js..."
    if ! command -v node &> /dev/null; then
        error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    success "Found Node.js $NODE_VERSION"
fi

# Check Docker (if Redis needed)
if [ "$NO_REDIS" = false ]; then
    info "Checking Docker..."
    if ! command -v docker &> /dev/null; then
        warn "Docker not found. Redis will not be started."
        warn "Make sure Redis is running on $REDIS_HOST:$REDIS_PORT"
        NO_REDIS=true
    else
        success "Found Docker"
    fi
fi

# Create logs directory
mkdir -p logs

# Start Redis
if [ "$NO_REDIS" = false ]; then
    info "Starting Redis..."
    
    # Check if Redis container already exists
    if docker ps -a --filter "name=chirp-redis-dev" --format "{{.Names}}" | grep -q "chirp-redis-dev"; then
        # Container exists, check if running
        if docker ps --filter "name=chirp-redis-dev" --format "{{.Names}}" | grep -q "chirp-redis-dev"; then
            success "Redis already running"
        else
            docker start chirp-redis-dev > /dev/null
            success "Redis started (existing container)"
        fi
    else
        # Create new container
        docker run -d --name chirp-redis-dev -p 6379:6379 redis:7-alpine > /dev/null
        success "Redis started (new container)"
    fi
    
    # Wait for Redis to be ready
    sleep 2
fi

# Create and activate virtual environment if needed
if [ ! -d "venv" ]; then
    info "Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
fi

info "Activating virtual environment..."
source venv/bin/activate

info "Installing Python dependencies..."
pip install -r requirements.txt -q

# Install frontend dependencies if needed
if [ "$NO_FRONTEND" = false ]; then
    if [ ! -d "frontend/node_modules" ]; then
        info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
fi

# Run seed data if requested
if [ "$SEED" = true ]; then
    info "Running seed data script..."
    $PYTHON_CMD scripts/seed_data.py
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Starting Services...                 ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    warn "Stopping services..."
    
    # Kill background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    success "Services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Flask backend in background
info "Starting Flask backend on http://localhost:5000..."
$PYTHON_CMD -m app.web.dashboard > logs/flask.log 2>&1 &
FLASK_PID=$!

# Start Celery worker in background
info "Starting Celery worker..."
celery -A app.core.celery_app.celery_app worker --loglevel=info > logs/celery.log 2>&1 &
CELERY_PID=$!

# Start frontend in background (if not disabled)
if [ "$NO_FRONTEND" = false ]; then
    info "Starting Next.js frontend on http://localhost:3000..."
    cd frontend
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
fi

# Wait for services to start
sleep 5

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Development Environment Ready!       ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Services running:${NC}"
echo "  - Flask API:    http://localhost:5000"
echo "  - Redis:        localhost:6379"
if [ "$NO_FRONTEND" = false ]; then
    echo "  - Frontend:     http://localhost:3000"
fi
echo ""
echo -e "${CYAN}Default credentials:${NC}"
echo "  Username: admin"
echo "  Password: (check ADMIN_PASSWORD in .env)"
echo ""
echo -e "${CYAN}Logs:${NC}"
echo "  Flask:    tail -f logs/flask.log"
echo "  Celery:   tail -f logs/celery.log"
if [ "$NO_FRONTEND" = false ]; then
    echo "  Frontend: tail -f logs/frontend.log"
fi
echo ""
echo -e "${YELLOW}To stop all services: Press Ctrl+C${NC}"
echo ""

# Stream Flask logs
tail -f logs/flask.log

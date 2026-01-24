# ChirpSyncer Development Environment Startup Script (Windows PowerShell)
# Usage: .\scripts\dev-start.ps1 [--no-frontend] [--no-redis] [--seed]

param(
    [switch]$NoFrontend,
    [switch]$NoRedis,
    [switch]$Seed,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

if ($Help) {
    Write-Host @"
ChirpSyncer Development Environment

Usage: .\scripts\dev-start.ps1 [options]

Options:
  --NoFrontend    Skip starting the Next.js frontend
  --NoRedis       Skip starting Redis (use if Redis is already running)
  --Seed          Run seed data script after startup
  --Help          Show this help message

Components started:
  1. Redis (Docker container)
  2. Flask Backend (port 5000)
  3. Celery Worker
  4. Next.js Frontend (port 3000)

Requirements:
  - Python 3.10+
  - Node.js 18+
  - Docker (for Redis)
  - .env file configured

"@
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  ChirpSyncer Development Environment  " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Check for .env file
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Warn ".env file not found. Copying from .env.example..."
        Copy-Item ".env.example" ".env"
        Write-Warn "Please edit .env with your credentials before running again."
        exit 1
    } else {
        Write-Err ".env file not found and no .env.example available."
        exit 1
    }
}

# Load .env file
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Set development defaults
$env:FLASK_DEBUG = "true"
$env:FLASK_ENV = "development"
$env:REDIS_HOST = if ($env:REDIS_HOST) { $env:REDIS_HOST } else { "localhost" }
$env:REDIS_PORT = if ($env:REDIS_PORT) { $env:REDIS_PORT } else { "6379" }

# Check Python
Write-Info "Checking Python..."
$pythonCmd = if (Get-Command "py" -ErrorAction SilentlyContinue) { "py" } 
             elseif (Get-Command "python" -ErrorAction SilentlyContinue) { "python" }
             else { $null }

if (-not $pythonCmd) {
    Write-Err "Python not found. Please install Python 3.10+"
    exit 1
}
$pythonVersion = & $pythonCmd --version
Write-Success "Found $pythonVersion"

# Check Node.js (if frontend needed)
if (-not $NoFrontend) {
    Write-Info "Checking Node.js..."
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Err "Node.js not found. Please install Node.js 18+"
        exit 1
    }
    $nodeVersion = node --version
    Write-Success "Found Node.js $nodeVersion"
}

# Check Docker (if Redis needed)
if (-not $NoRedis) {
    Write-Info "Checking Docker..."
    if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
        Write-Warn "Docker not found. Redis will not be started."
        Write-Warn "Make sure Redis is running on $env:REDIS_HOST`:$env:REDIS_PORT"
        $NoRedis = $true
    } else {
        Write-Success "Found Docker"
    }
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Start Redis
if (-not $NoRedis) {
    Write-Info "Starting Redis..."
    
    # Check if Redis container already exists
    $existingContainer = docker ps -a --filter "name=chirp-redis-dev" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq "chirp-redis-dev") {
        # Container exists, check if running
        $runningContainer = docker ps --filter "name=chirp-redis-dev" --format "{{.Names}}" 2>$null
        if ($runningContainer -eq "chirp-redis-dev") {
            Write-Success "Redis already running"
        } else {
            docker start chirp-redis-dev | Out-Null
            Write-Success "Redis started (existing container)"
        }
    } else {
        # Create new container
        docker run -d --name chirp-redis-dev -p 6379:6379 redis:7-alpine | Out-Null
        Write-Success "Redis started (new container)"
    }
    
    # Wait for Redis to be ready
    Start-Sleep -Seconds 2
}

# Install Python dependencies if needed
if (-not (Test-Path "venv")) {
    Write-Info "Creating Python virtual environment..."
    & $pythonCmd -m venv venv
}

Write-Info "Activating virtual environment..."
. .\venv\Scripts\Activate.ps1

Write-Info "Installing Python dependencies..."
pip install -r requirements.txt -q

# Install frontend dependencies if needed
if (-not $NoFrontend) {
    if (-not (Test-Path "frontend\node_modules")) {
        Write-Info "Installing frontend dependencies..."
        Push-Location frontend
        npm install
        Pop-Location
    }
}

# Run seed data if requested
if ($Seed) {
    Write-Info "Running seed data script..."
    & $pythonCmd scripts/seed_data.py
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Starting Services...                 " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start Flask backend in background
Write-Info "Starting Flask backend on http://localhost:5000..."
$flaskJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    . .\venv\Scripts\Activate.ps1
    $env:FLASK_DEBUG = "true"
    $env:PYTHONPATH = "."
    python -m app.web.dashboard
} -Name "flask-backend"

# Start Celery worker in background
Write-Info "Starting Celery worker..."
$celeryJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    . .\venv\Scripts\Activate.ps1
    $env:PYTHONPATH = "."
    celery -A app.core.celery_app.celery_app worker --loglevel=info
} -Name "celery-worker"

# Start frontend in background (if not disabled)
if (-not $NoFrontend) {
    Write-Info "Starting Next.js frontend on http://localhost:3000..."
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location "$using:PWD\frontend"
        npm run dev
    } -Name "nextjs-frontend"
}

# Wait for services to start
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Development Environment Ready!       " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  - Flask API:    http://localhost:5000" -ForegroundColor White
Write-Host "  - Redis:        localhost:6379" -ForegroundColor White
if (-not $NoFrontend) {
    Write-Host "  - Frontend:     http://localhost:3000" -ForegroundColor White
}
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Cyan
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: (check ADMIN_PASSWORD in .env)" -ForegroundColor White
Write-Host ""
Write-Host "Logs:" -ForegroundColor Cyan
Write-Host "  Flask:   Receive-Job -Name flask-backend" -ForegroundColor White
Write-Host "  Celery:  Receive-Job -Name celery-worker" -ForegroundColor White
if (-not $NoFrontend) {
    Write-Host "  Frontend: Receive-Job -Name nextjs-frontend" -ForegroundColor White
}
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White
Write-Host "  docker stop chirp-redis-dev" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop watching logs..." -ForegroundColor Yellow
Write-Host ""

# Stream logs from Flask backend
try {
    while ($true) {
        Receive-Job -Name flask-backend -ErrorAction SilentlyContinue
        Receive-Job -Name celery-worker -ErrorAction SilentlyContinue
        if (-not $NoFrontend) {
            Receive-Job -Name nextjs-frontend -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Warn "Stopping services..."
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Success "Services stopped."
}

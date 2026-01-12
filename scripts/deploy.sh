#!/bin/bash
# ChirpSyncer Home Server Deployment Script
#
# Usage: ./scripts/deploy.sh [version]
# Example: ./scripts/deploy.sh v1.0.0

set -e  # Exit on error

DEPLOY_DIR="/opt/chirpsyncer"
BACKUP_DIR="/opt/chirpsyncer/backups"
VERSION="${1:-latest}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==================================="
echo "ChirpSyncer Deployment Script"
echo "Version: $VERSION"
echo "Timestamp: $TIMESTAMP"
echo "==================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running with appropriate permissions
if [ "$EUID" -ne 0 ] && [ ! -w "$DEPLOY_DIR" ]; then
    print_error "Please run with sudo or as user with write access to $DEPLOY_DIR"
    exit 1
fi

# Step 1: Create backup of current deployment
print_warning "Step 1: Creating backup..."
mkdir -p "$BACKUP_DIR"

if [ -d "$DEPLOY_DIR/app" ]; then
    tar -czf "$BACKUP_DIR/chirpsyncer_backup_$TIMESTAMP.tar.gz" \
        -C "$DEPLOY_DIR" \
        --exclude='*.db' \
        --exclude='venv' \
        --exclude='__pycache__' \
        --exclude='.git' \
        . 2>/dev/null || true
    print_success "Backup created: chirpsyncer_backup_$TIMESTAMP.tar.gz"
else
    print_warning "No existing deployment found - skipping backup"
fi

# Step 2: Stop running services
print_warning "Step 2: Stopping services..."
if command -v systemctl &> /dev/null; then
    sudo systemctl stop chirpsyncer || print_warning "Service not running"
elif [ -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    cd "$DEPLOY_DIR" && docker-compose down || print_warning "Docker containers not running"
fi
print_success "Services stopped"

# Step 3: Pull/extract new code
print_warning "Step 3: Deploying new version..."
cd "$DEPLOY_DIR"

if [ -f "chirpsyncer-${VERSION}.tar.gz" ]; then
    # Extract from deployment package
    tar -xzf "chirpsyncer-${VERSION}.tar.gz"
    print_success "Extracted version $VERSION"
elif [ -d ".git" ]; then
    # Pull from git
    git fetch origin
    git checkout "$VERSION" || git checkout main
    git pull
    print_success "Pulled from git: $VERSION"
else
    print_error "No deployment package or git repository found"
    exit 1
fi

# Step 4: Install dependencies
print_warning "Step 4: Installing dependencies..."
if [ -f "requirements.txt" ]; then
    if [ -d "venv" ]; then
        source venv/bin/activate
    else
        python3 -m venv venv
        source venv/bin/activate
    fi
    pip install --upgrade pip
    pip install -r requirements.txt
    print_success "Dependencies installed"
fi

# Step 5: Run database migrations
print_warning "Step 5: Running database migrations..."
if [ -f "scripts/migrate_db.py" ]; then
    python scripts/migrate_db.py
    print_success "Database migrated"
else
    print_warning "No migration script found - skipping"
fi

# Step 6: Check configuration
print_warning "Step 6: Checking configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_warning "No .env file found. Copying from .env.example"
        print_warning "⚠️  IMPORTANT: Edit .env with your credentials before starting!"
        cp .env.example .env
    else
        print_error "No .env file and no .env.example found!"
        print_error "Please create .env with required credentials"
        exit 1
    fi
else
    print_success "Configuration file exists"
fi

# Step 7: Set permissions
print_warning "Step 7: Setting permissions..."
chown -R $(whoami):$(whoami) "$DEPLOY_DIR" 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
print_success "Permissions set"

# Step 8: Start services
print_warning "Step 8: Starting services..."
if command -v systemctl &> /dev/null && [ -f "/etc/systemd/system/chirpsyncer.service" ]; then
    sudo systemctl daemon-reload
    sudo systemctl start chirpsyncer
    sudo systemctl enable chirpsyncer
    print_success "Systemd service started and enabled"
elif [ -f "docker-compose.yml" ]; then
    docker-compose up -d
    print_success "Docker containers started"
else
    print_warning "No systemd service or docker-compose.yml found"
    print_warning "Start manually with: python app/main.py"
fi

# Step 9: Health check
print_warning "Step 9: Running health check..."
sleep 5

if curl -f http://localhost:5000/health 2>/dev/null; then
    print_success "Health check passed! ✓"
elif curl -f http://localhost:5000/ 2>/dev/null; then
    print_success "Dashboard accessible! ✓"
else
    print_warning "Could not connect to dashboard (may take a moment to start)"
fi

# Step 10: Cleanup old backups (keep last 10)
print_warning "Step 10: Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t chirpsyncer_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
print_success "Old backups cleaned up"

# Final summary
echo ""
echo "==================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "==================================="
echo "Version: $VERSION"
echo "Deployed to: $DEPLOY_DIR"
echo "Backup location: $BACKUP_DIR/chirpsyncer_backup_$TIMESTAMP.tar.gz"
echo ""
echo "Next steps:"
echo "  1. Check logs: journalctl -u chirpsyncer -f"
echo "  2. Access dashboard: http://localhost:5000"
echo "  3. Monitor status: systemctl status chirpsyncer"
echo ""
print_warning "Don't forget to update your .env file if needed!"

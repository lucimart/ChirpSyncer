#!/bin/bash
# ChirpSyncer NAS Deployment Script
# Automates deployment to NAS on local network

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

echo "======================================"
echo "  ChirpSyncer NAS Deployment Script"
echo "======================================"
echo ""

# Configuration
NAS_HOST="${NAS_HOST:-}"
NAS_USER="${NAS_USER:-admin}"
NAS_PORT="${NAS_PORT:-22}"
INSTALL_DIR="${INSTALL_DIR:-/opt/chirpsyncer}"
USE_RSYNC="${USE_RSYNC:-true}"

# Interactive configuration if not set
if [ -z "$NAS_HOST" ]; then
    echo "NAS Configuration"
    echo "=================="
    read -p "NAS IP address or hostname: " NAS_HOST
    read -p "NAS username (default: admin): " input_user
    NAS_USER="${input_user:-admin}"
    read -p "SSH port (default: 22): " input_port
    NAS_PORT="${input_port:-22}"
    read -p "Installation directory (default: /opt/chirpsyncer): " input_dir
    INSTALL_DIR="${input_dir:-/opt/chirpsyncer}"
    echo ""
fi

# Validate configuration
if [ -z "$NAS_HOST" ]; then
    print_error "NAS_HOST is required"
    exit 1
fi

print_info "Deployment Configuration:"
echo "  NAS Host: $NAS_HOST"
echo "  SSH User: $NAS_USER"
echo "  SSH Port: $NAS_PORT"
echo "  Install Directory: $INSTALL_DIR"
echo ""

# Test SSH connection
print_info "Testing SSH connection..."
if ssh -p "$NAS_PORT" -o ConnectTimeout=5 -o BatchMode=yes "$NAS_USER@$NAS_HOST" "echo 'SSH OK'" &>/dev/null; then
    print_success "SSH connection successful"
else
    print_warning "SSH connection failed - trying with password..."
    if ! ssh -p "$NAS_PORT" -o ConnectTimeout=5 "$NAS_USER@$NAS_HOST" "echo 'SSH OK'" &>/dev/null; then
        print_error "Cannot connect to NAS. Please check:"
        echo "  1. NAS IP/hostname is correct"
        echo "  2. SSH is enabled on NAS"
        echo "  3. Username and port are correct"
        echo "  4. Firewall allows SSH connections"
        exit 1
    fi
fi

# Confirm deployment
echo ""
read -p "Ready to deploy. Continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi
echo ""

# Step 1: Transfer files
print_info "Step 1: Transferring files to NAS..."

if [ "$USE_RSYNC" = "true" ] && command -v rsync &> /dev/null; then
    print_info "Using rsync for file transfer..."
    rsync -avz --progress \
        -e "ssh -p $NAS_PORT" \
        --exclude '.git' \
        --exclude 'venv' \
        --exclude '*.db' \
        --exclude '*.db-shm' \
        --exclude '*.db-wal' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.pytest_cache' \
        --exclude 'logs/' \
        ./ "${NAS_USER}@${NAS_HOST}:${INSTALL_DIR}/"
else
    print_warning "rsync not available, using scp (slower)..."
    # Create tar, transfer, extract
    tar czf /tmp/chirpsyncer-deploy.tar.gz \
        --exclude='.git' \
        --exclude='venv' \
        --exclude='*.db' \
        --exclude='__pycache__' \
        --exclude='.pytest_cache' \
        --exclude='logs' \
        .

    scp -P "$NAS_PORT" /tmp/chirpsyncer-deploy.tar.gz "${NAS_USER}@${NAS_HOST}:/tmp/"

    ssh -p "$NAS_PORT" "${NAS_USER}@${NAS_HOST}" << EOF
        sudo mkdir -p $INSTALL_DIR
        sudo tar xzf /tmp/chirpsyncer-deploy.tar.gz -C $INSTALL_DIR
        rm /tmp/chirpsyncer-deploy.tar.gz
EOF

    rm /tmp/chirpsyncer-deploy.tar.gz
fi

print_success "Files transferred"

# Step 2: Run installation
print_info "Step 2: Running installation script on NAS..."

ssh -p "$NAS_PORT" "${NAS_USER}@${NAS_HOST}" << 'EOF'
    cd /opt/chirpsyncer
    if [ -f scripts/install.sh ]; then
        echo "Running installer..."
        sudo scripts/install.sh
    else
        echo "Warning: install.sh not found, manual setup required"
        exit 1
    fi
EOF

if [ $? -eq 0 ]; then
    print_success "Installation complete"
else
    print_error "Installation failed"
    exit 1
fi

# Step 3: Configuration reminder
echo ""
print_warning "⚠️  IMPORTANT: Next Steps"
echo ""
echo "1. Configure environment variables:"
echo "   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST"
echo "   sudo nano $INSTALL_DIR/.env"
echo ""
echo "2. Required configuration:"
echo "   - Twitter credentials (TWITTER_USERNAME, TWITTER_PASSWORD, etc.)"
echo "   - Bluesky credentials (BSKY_USERNAME, BSKY_PASSWORD)"
echo "   - Secret key: python3 -c \"import secrets; print(secrets.token_urlsafe(32))\""
echo "   - Admin password (ADMIN_PASSWORD)"
echo ""
echo "3. Optional: Configure SMTP for email notifications"
echo "   See: docs/SMTP_SETUP_GUIDE.md"
echo ""
echo "4. Start the service:"
echo "   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST"
echo "   sudo systemctl start chirpsyncer"
echo "   sudo systemctl status chirpsyncer"
echo ""
echo "5. Access dashboard:"
echo "   http://$NAS_HOST:5000"
echo ""
print_success "Deployment successful!"
echo ""

# Offer to SSH to NAS
read -p "Open SSH session to NAS now? (y/N): " ssh_now
if [[ "$ssh_now" =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Connecting to NAS..."
    ssh -p "$NAS_PORT" "${NAS_USER}@${NAS_HOST}"
fi

#!/bin/bash
# ChirpSyncer Home Server Installation Script
#
# This script sets up ChirpSyncer on a fresh home server
#
# Usage: sudo ./scripts/install.sh

set -e

INSTALL_DIR="/opt/chirpsyncer"
SERVICE_USER="chirpsyncer"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

echo "==================================="
echo "ChirpSyncer Installation"
echo "==================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Install system dependencies
print_warning "Step 1: Installing system dependencies..."
if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y python3 python3-pip python3-venv sqlite3 git curl
elif command -v yum &> /dev/null; then
    yum install -y python3 python3-pip sqlite git curl
else
    print_error "Unsupported package manager. Please install manually: python3, pip, sqlite3, git, curl"
    exit 1
fi
print_success "System dependencies installed"

# Step 2: Create service user
print_warning "Step 2: Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --user-group --create-home --shell /bin/bash "$SERVICE_USER"
    print_success "Created user: $SERVICE_USER"
else
    print_warning "User $SERVICE_USER already exists"
fi

# Step 3: Create installation directory
print_warning "Step 3: Creating installation directory..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/backups"
mkdir -p "$INSTALL_DIR/logs"
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
print_success "Directories created: $INSTALL_DIR"

# Step 4: Copy application files
print_warning "Step 4: Copying application files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
print_success "Application files copied"

# Step 5: Set up Python virtual environment
print_warning "Step 5: Setting up Python environment..."
cd "$INSTALL_DIR"
sudo -u "$SERVICE_USER" python3 -m venv venv
sudo -u "$SERVICE_USER" venv/bin/pip install --upgrade pip
sudo -u "$SERVICE_USER" venv/bin/pip install -r requirements.txt
print_success "Python environment ready"

# Step 6: Create .env from template
print_warning "Step 6: Creating configuration file..."
if [ ! -f "$INSTALL_DIR/.env" ] && [ -f "$INSTALL_DIR/.env.example" ]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.env"
    chmod 600 "$INSTALL_DIR/.env"
    print_warning "Created .env from template"
    print_warning "⚠️  IMPORTANT: Edit $INSTALL_DIR/.env with your credentials!"
else
    print_warning ".env file already exists or no template found"
fi

# Step 7: Initialize database
print_warning "Step 7: Initializing database..."
cd "$INSTALL_DIR"
sudo -u "$SERVICE_USER" venv/bin/python -c "from app.db_handler import initialize_db, migrate_database; initialize_db(); migrate_database()"
print_success "Database initialized"

# Step 8: Install systemd service
print_warning "Step 8: Installing systemd service..."
if [ -f "$INSTALL_DIR/scripts/chirpsyncer.service" ]; then
    cp "$INSTALL_DIR/scripts/chirpsyncer.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable chirpsyncer
    print_success "Systemd service installed and enabled"
else
    print_warning "Systemd service file not found"
fi

# Step 9: Set up log rotation
print_warning "Step 9: Setting up log rotation..."
cat > /etc/logrotate.d/chirpsyncer <<EOF
$INSTALL_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $SERVICE_USER $SERVICE_USER
    sharedscripts
    postrotate
        systemctl reload chirpsyncer > /dev/null 2>&1 || true
    endscript
}
EOF
print_success "Log rotation configured"

# Step 10: Create backup cron job
print_warning "Step 10: Setting up automated backups..."
cat > /etc/cron.daily/chirpsyncer-backup <<EOF
#!/bin/bash
# Backup ChirpSyncer database daily
BACKUP_DIR="$INSTALL_DIR/backups"
TIMESTAMP=\$(date +%Y%m%d)
sqlite3 "$INSTALL_DIR/chirpsyncer.db" ".backup \$BACKUP_DIR/chirpsyncer_\$TIMESTAMP.db"
# Keep only last 30 days
find "\$BACKUP_DIR" -name "chirpsyncer_*.db" -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/chirpsyncer-backup
print_success "Daily backups configured"

# Final summary
echo ""
echo "==================================="
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo "==================================="
echo ""
echo "Installation location: $INSTALL_DIR"
echo "Service user: $SERVICE_USER"
echo ""
echo "Next steps:"
echo "  1. Edit configuration: nano $INSTALL_DIR/.env"
echo "  2. Add your Twitter and Bluesky credentials"
echo "  3. Start service: systemctl start chirpsyncer"
echo "  4. Check status: systemctl status chirpsyncer"
echo "  5. View logs: journalctl -u chirpsyncer -f"
echo "  6. Access dashboard: http://localhost:5000"
echo ""
print_warning "⚠️  Don't forget to configure your credentials in .env!"
echo ""

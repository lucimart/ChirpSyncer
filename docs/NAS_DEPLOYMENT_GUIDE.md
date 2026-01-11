# ChirpSyncer NAS Deployment Guide

Complete guide for deploying ChirpSyncer to your NAS on a local network.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [SSH Connection Setup](#ssh-connection-setup)
3. [Deployment Methods](#deployment-methods)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### NAS Requirements
- **OS**: Linux-based NAS (Synology DSM, QNAP QTS, TrueNAS, or generic Linux)
- **Python**: 3.10 or 3.11
- **Memory**: 2GB RAM minimum
- **Disk**: 500MB + database growth
- **Network**: Static IP or DHCP reservation recommended

### Local Machine Requirements
- SSH client (OpenSSH, PuTTY, or Terminal)
- Git (for cloning repository)
- Network access to NAS

---

## SSH Connection Setup

### Step 1: Enable SSH on Your NAS

#### Synology DSM
1. Open Control Panel → Terminal & SNMP
2. Enable SSH service (default port 22)
3. Optional: Change SSH port for security

#### QNAP QTS
1. Open Control Panel → Network & File Services → Telnet/SSH
2. Enable "Allow SSH connection"
3. Set SSH port (default 22)

#### TrueNAS/Generic Linux
SSH is usually enabled by default. Verify with:
```bash
sudo systemctl status sshd
```

### Step 2: Test SSH Connection

From your local machine:
```bash
# Replace with your NAS IP and username
ssh username@192.168.1.100

# Or if using custom port:
ssh -p 2222 username@192.168.1.100
```

**Common NAS default usernames:**
- Synology: `admin`
- QNAP: `admin`
- TrueNAS: `root`
- Ubuntu: `your-username`

### Step 3: Set Up SSH Key Authentication (Recommended)

Generate SSH key on local machine:
```bash
ssh-keygen -t ed25519 -C "chirpsyncer-deployment"
# Save to: ~/.ssh/chirpsyncer_nas
```

Copy key to NAS:
```bash
ssh-copy-id -i ~/.ssh/chirpsyncer_nas.pub username@192.168.1.100

# Or manually:
cat ~/.ssh/chirpsyncer_nas.pub | ssh username@192.168.1.100 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Add to SSH config for easy access:
```bash
cat >> ~/.ssh/config <<EOF
Host chirpsyncer-nas
    HostName 192.168.1.100
    User admin
    Port 22
    IdentityFile ~/.ssh/chirpsyncer_nas
    StrictHostKeyChecking no
EOF
```

Now connect with:
```bash
ssh chirpsyncer-nas
```

---

## Deployment Methods

### Method 1: Automated Installation (Recommended)

**From your local machine**, deploy directly to NAS:

```bash
# Clone repository locally
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

# Transfer to NAS
rsync -avz --exclude '.git' --exclude 'venv' --exclude '*.db' \
  ./ username@192.168.1.100:/opt/chirpsyncer/

# SSH to NAS and run installer
ssh username@192.168.1.100 "sudo /opt/chirpsyncer/scripts/install.sh"
```

**Or** combine into one script:

```bash
#!/bin/bash
# deploy-to-nas.sh

NAS_HOST="192.168.1.100"
NAS_USER="admin"
INSTALL_DIR="/opt/chirpsyncer"

echo "🚀 Deploying ChirpSyncer to NAS..."

# 1. Transfer files
echo "📤 Transferring files..."
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'venv' \
  --exclude '*.db' \
  --exclude '__pycache__' \
  ./ ${NAS_USER}@${NAS_HOST}:${INSTALL_DIR}/

# 2. Run installation
echo "⚙️  Running installation..."
ssh ${NAS_USER}@${NAS_HOST} << 'EOF'
cd /opt/chirpsyncer
sudo ./scripts/install.sh
EOF

echo "✅ Deployment complete!"
echo "Next: ssh ${NAS_USER}@${NAS_HOST} and configure /opt/chirpsyncer/.env"
```

Make executable and run:
```bash
chmod +x deploy-to-nas.sh
./deploy-to-nas.sh
```

### Method 2: Manual Installation

SSH to your NAS:
```bash
ssh username@192.168.1.100
```

Then follow manual installation steps:

```bash
# 1. Install system dependencies
# For Debian/Ubuntu-based NAS:
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv sqlite3 git

# For QNAP (Entware):
opkg update
opkg install python3 python3-pip git sqlite3

# 2. Clone repository
sudo mkdir -p /opt/chirpsyncer
cd /opt/chirpsyncer
sudo git clone https://github.com/lucimart/ChirpSyncer.git .

# 3. Run installer
sudo ./scripts/install.sh
```

### Method 3: Docker Deployment (Synology/QNAP)

For NAS with Docker support:

```bash
# 1. Transfer files to NAS
rsync -avz ./ username@192.168.1.100:/volume1/docker/chirpsyncer/

# 2. SSH to NAS
ssh username@192.168.1.100

# 3. Build and run container
cd /volume1/docker/chirpsyncer
docker-compose up -d

# 4. Check logs
docker-compose logs -f
```

---

## Post-Deployment Configuration

### Step 1: Configure Environment Variables

SSH to NAS and edit configuration:
```bash
ssh username@192.168.1.100
sudo nano /opt/chirpsyncer/.env
```

**Minimum required configuration:**
```bash
# Twitter credentials
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_email@example.com
TWITTER_EMAIL_PASSWORD=your_email_password

# Bluesky credentials
BSKY_USERNAME=your-username.bsky.social
BSKY_PASSWORD=your-app-password

# Multi-user mode
MULTI_USER_ENABLED=true
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ADMIN_EMAIL=admin@chirpsyncer.local
ADMIN_PASSWORD=YourStrongPassword123!

# SMTP (optional but recommended)
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=chirpsyncer@yourdomain.com
```

**Generate secure secrets:**
```bash
# Generate SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate ADMIN_PASSWORD
python3 -c "import secrets; import string; chars=string.ascii_letters+string.digits+'!@#$%^&*'; print('ADMIN_PASSWORD=' + ''.join(secrets.choice(chars) for _ in range(20)))"
```

### Step 2: Configure SMTP (Email Notifications)

See [SMTP_SETUP_GUIDE.md](SMTP_SETUP_GUIDE.md) for detailed instructions.

Quick setup for Gmail:
1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update `.env`:
   ```bash
   SMTP_ENABLED=true
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

Test SMTP connection:
```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
from app.notification_service import NotificationService
ns = NotificationService()
if ns.test_connection():
    print("✅ SMTP connection successful!")
else:
    print("❌ SMTP connection failed. Check credentials.")
EOF
```

### Step 3: Create Admin User

**Option A: Automatic (via .env)**

The admin user is created automatically on first run if configured in `.env`:
```bash
ADMIN_EMAIL=admin@chirpsyncer.local
ADMIN_PASSWORD=YourStrongPassword123!
```

Start the service:
```bash
sudo systemctl start chirpsyncer
```

**Option B: Manual (via Python)**

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
from app.user_manager import UserManager

um = UserManager()
user_id = um.create_user(
    username="admin",
    email="admin@chirpsyncer.local",
    password="YourStrongPassword123!",
    role="admin"
)
print(f"✅ Admin user created with ID: {user_id}")
EOF
```

### Step 4: Start Service

```bash
# Start service
sudo systemctl start chirpsyncer

# Check status
sudo systemctl status chirpsyncer

# View logs
journalctl -u chirpsyncer -f

# Enable auto-start on boot
sudo systemctl enable chirpsyncer
```

### Step 5: Access Dashboard

From any device on your local network:
```
http://192.168.1.100:5000
```

Login with admin credentials.

---

## Network Configuration

### Port Forwarding (Optional - for external access)

**⚠️ Security Warning:** Only expose if you need external access. Use VPN instead if possible.

1. Reserve static IP for NAS in router DHCP settings
2. Forward port 5000 to NAS IP
3. Enable HTTPS (see below)
4. Use strong passwords and consider fail2ban

### Enable HTTPS (Recommended for external access)

**Option 1: Use nginx reverse proxy**

```bash
sudo apt-get install nginx

sudo nano /etc/nginx/sites-available/chirpsyncer
```

```nginx
server {
    listen 443 ssl http2;
    server_name chirpsyncer.local;

    ssl_certificate /etc/ssl/certs/chirpsyncer.crt;
    ssl_certificate_key /etc/ssl/private/chirpsyncer.key;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Generate self-signed certificate:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/chirpsyncer.key \
  -out /etc/ssl/certs/chirpsyncer.crt
```

**Option 2: Use Synology/QNAP built-in reverse proxy**

Synology: Control Panel → Application Portal → Reverse Proxy
QNAP: myQNAPcloud → Auto Router Configuration

---

## Monitoring & Alerting

See [MONITORING_GUIDE.md](MONITORING_GUIDE.md) for detailed setup.

### Basic Health Monitoring

Create monitoring script:
```bash
sudo nano /opt/chirpsyncer/scripts/health-check.sh
```

```bash
#!/bin/bash
# Health check script

SERVICE_NAME="chirpsyncer"
LOG_FILE="/opt/chirpsyncer/logs/health-check.log"

# Check if service is running
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "$(date): ✅ Service is running" >> $LOG_FILE
else
    echo "$(date): ❌ Service is DOWN - attempting restart" >> $LOG_FILE
    systemctl restart $SERVICE_NAME

    # Send alert (requires SMTP configured)
    python3 << EOF
from app.notification_service import NotificationService
ns = NotificationService()
ns.send_email(
    to="admin@example.com",
    subject="ChirpSyncer Service Down",
    body="ChirpSyncer service was down and has been restarted.",
    html=False
)
EOF
fi

# Check database size
DB_SIZE=$(du -h /opt/chirpsyncer/chirpsyncer.db | cut -f1)
echo "$(date): Database size: $DB_SIZE" >> $LOG_FILE
```

```bash
chmod +x /opt/chirpsyncer/scripts/health-check.sh
```

Add to crontab:
```bash
sudo crontab -e
```

```cron
# Run health check every 5 minutes
*/5 * * * * /opt/chirpsyncer/scripts/health-check.sh
```

---

## Backup & Restore

### Automated Backups

Backups are automatically created daily by the installer.

Check backup status:
```bash
ls -lh /opt/chirpsyncer/backups/
```

### Manual Backup

```bash
# Create backup
sudo -u chirpsyncer sqlite3 /opt/chirpsyncer/chirpsyncer.db \
  ".backup /opt/chirpsyncer/backups/manual_backup_$(date +%Y%m%d_%H%M%S).db"

# Verify backup
sqlite3 /opt/chirpsyncer/backups/manual_backup_*.db "PRAGMA integrity_check;"
```

### Restore from Backup

```bash
# Stop service
sudo systemctl stop chirpsyncer

# Restore database
sudo cp /opt/chirpsyncer/backups/chirpsyncer_20260111.db \
       /opt/chirpsyncer/chirpsyncer.db

# Fix permissions
sudo chown chirpsyncer:chirpsyncer /opt/chirpsyncer/chirpsyncer.db

# Start service
sudo systemctl start chirpsyncer
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status chirpsyncer

# Check logs
journalctl -u chirpsyncer -n 50 --no-pager

# Check permissions
ls -la /opt/chirpsyncer/
# Should be owned by chirpsyncer:chirpsyncer

# Fix permissions
sudo chown -R chirpsyncer:chirpsyncer /opt/chirpsyncer
```

### Can't Access Dashboard

```bash
# Check if service is listening
sudo netstat -tlnp | grep 5000
# or
sudo ss -tlnp | grep 5000

# Check firewall (if enabled)
sudo ufw status
sudo ufw allow 5000/tcp

# Test locally on NAS
curl http://localhost:5000
```

### Database Locked

```bash
# Stop service
sudo systemctl stop chirpsyncer

# Remove WAL files
sudo rm -f /opt/chirpsyncer/chirpsyncer.db-shm
sudo rm -f /opt/chirpsyncer/chirpsyncer.db-wal

# Start service
sudo systemctl start chirpsyncer
```

### Python Version Issues

```bash
# Check Python version
python3 --version

# If Python 3.10/3.11 not available, install:
# Ubuntu/Debian:
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install python3.11 python3.11-venv

# Update virtual environment
cd /opt/chirpsyncer
sudo -u chirpsyncer python3.11 -m venv venv
sudo -u chirpsyncer venv/bin/pip install -r requirements.txt
```

### Memory Issues

```bash
# Check memory usage
free -h

# Reduce memory limit in systemd service
sudo nano /etc/systemd/system/chirpsyncer.service
# Change: MemoryMax=2G to MemoryMax=1G

sudo systemctl daemon-reload
sudo systemctl restart chirpsyncer
```

---

## Updating ChirpSyncer

```bash
# SSH to NAS
ssh username@192.168.1.100

# Stop service
sudo systemctl stop chirpsyncer

# Backup current installation
sudo cp -r /opt/chirpsyncer /opt/chirpsyncer.backup

# Pull latest changes
cd /opt/chirpsyncer
sudo -u chirpsyncer git pull origin main

# Update dependencies
sudo -u chirpsyncer venv/bin/pip install -r requirements.txt --upgrade

# Run database migrations
sudo -u chirpsyncer venv/bin/python -c "from app.db_handler import migrate_database; migrate_database()"

# Start service
sudo systemctl start chirpsyncer

# Check logs
journalctl -u chirpsyncer -f
```

---

## Uninstallation

```bash
# Stop and disable service
sudo systemctl stop chirpsyncer
sudo systemctl disable chirpsyncer

# Remove systemd service
sudo rm /etc/systemd/system/chirpsyncer.service
sudo systemctl daemon-reload

# Remove installation directory
sudo rm -rf /opt/chirpsyncer

# Remove service user (optional)
sudo userdel -r chirpsyncer

# Remove log rotation
sudo rm /etc/logrotate.d/chirpsyncer

# Remove backup cron
sudo rm /etc/cron.daily/chirpsyncer-backup
```

---

## Support

- **Issues**: https://github.com/lucimart/ChirpSyncer/issues
- **Discussions**: https://github.com/lucimart/ChirpSyncer/discussions

---

**Deployment complete! 🎉**

Access your ChirpSyncer dashboard at: `http://YOUR_NAS_IP:5000`

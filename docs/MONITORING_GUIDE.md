# ChirpSyncer Monitoring & Alerting Guide

Complete guide for monitoring ChirpSyncer in production.

## Table of Contents
1. [Basic Health Monitoring](#basic-health-monitoring)
2. [Log Monitoring](#log-monitoring)
3. [Performance Monitoring](#performance-monitoring)
4. [Email Alerts](#email-alerts)
5. [Dashboard Monitoring](#dashboard-monitoring)
6. [External Monitoring Tools](#external-monitoring-tools)

---

## Basic Health Monitoring

### Service Status Monitoring

Create health check script:

```bash
sudo nano /opt/chirpsyncer/scripts/health-check.sh
```

```bash
#!/bin/bash
# ChirpSyncer Health Check Script
# Checks service status, database integrity, and disk space

SERVICE_NAME="chirpsyncer"
LOG_DIR="/opt/chirpsyncer/logs"
DB_PATH="/opt/chirpsyncer/chirpsyncer.db"
ALERT_EMAIL="admin@example.com"
DISK_THRESHOLD=90  # Alert if disk usage > 90%

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/health-check.log"

# Timestamp function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local body="$2"

    # Send email alert using notification service
    /opt/chirpsyncer/venv/bin/python3 << EOF
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from dotenv import load_dotenv
load_dotenv('/opt/chirpsyncer/.env')
from app.notification_service import NotificationService

ns = NotificationService()
ns.send_email(
    to="$ALERT_EMAIL",
    subject="$subject",
    body="$body",
    html=False
)
EOF
}

# 1. Check if service is running
log "Checking service status..."
if systemctl is-active --quiet $SERVICE_NAME; then
    log "✅ Service is running"
else
    log "❌ Service is DOWN - attempting restart"
    systemctl restart $SERVICE_NAME
    sleep 5

    if systemctl is-active --quiet $SERVICE_NAME; then
        log "✅ Service restarted successfully"
        send_alert "ChirpSyncer Service Recovered" "Service was down but has been automatically restarted."
    else
        log "❌ Service restart FAILED"
        send_alert "ChirpSyncer Service DOWN" "Service is down and automatic restart failed. Manual intervention required."
        exit 1
    fi
fi

# 2. Check database integrity
log "Checking database integrity..."
DB_INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)
if [ "$DB_INTEGRITY" == "ok" ]; then
    log "✅ Database integrity OK"
else
    log "❌ Database integrity check FAILED: $DB_INTEGRITY"
    send_alert "ChirpSyncer Database Corruption" "Database integrity check failed: $DB_INTEGRITY"
fi

# 3. Check database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
DB_SIZE_MB=$(du -m "$DB_PATH" | cut -f1)
log "Database size: $DB_SIZE ($DB_SIZE_MB MB)"

# Alert if database is getting large (>5GB)
if [ "$DB_SIZE_MB" -gt 5000 ]; then
    log "⚠️  Database size exceeds 5GB - consider cleanup"
    send_alert "ChirpSyncer Database Size Alert" "Database size is $DB_SIZE. Consider running cleanup tasks."
fi

# 4. Check disk space
DISK_USAGE=$(df /opt/chirpsyncer | tail -1 | awk '{print $5}' | sed 's/%//')
log "Disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    log "❌ Disk usage critical: ${DISK_USAGE}%"
    send_alert "ChirpSyncer Disk Space Alert" "Disk usage is ${DISK_USAGE}%. Free up space immediately."
fi

# 5. Check process memory usage
MEM_USAGE=$(ps aux | grep '[p]ython.*chirpsyncer' | awk '{print $4}')
if [ -n "$MEM_USAGE" ]; then
    log "Memory usage: ${MEM_USAGE}%"

    # Alert if memory > 80%
    MEM_INT=$(echo "$MEM_USAGE" | cut -d. -f1)
    if [ "$MEM_INT" -gt 80 ]; then
        log "⚠️  High memory usage: ${MEM_USAGE}%"
        send_alert "ChirpSyncer High Memory Usage" "Process is using ${MEM_USAGE}% of system memory."
    fi
fi

# 6. Check recent errors in logs
ERROR_COUNT=$(journalctl -u $SERVICE_NAME --since "5 minutes ago" | grep -ci "error\|exception\|failed" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
    log "⚠️  High error rate: $ERROR_COUNT errors in last 5 minutes"
    send_alert "ChirpSyncer High Error Rate" "Detected $ERROR_COUNT errors in the last 5 minutes. Check logs."
fi

# 7. Check if Flask is responding
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 || echo "000")
if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "302" ]; then
    log "✅ Flask web server responding (HTTP $HTTP_STATUS)"
else
    log "❌ Flask web server not responding (HTTP $HTTP_STATUS)"
    send_alert "ChirpSyncer Web Server Down" "Web dashboard is not responding (HTTP $HTTP_STATUS)."
fi

log "Health check complete"
log "---"
```

Make executable:
```bash
sudo chmod +x /opt/chirpsyncer/scripts/health-check.sh
```

### Schedule Health Checks

Add to crontab:
```bash
sudo crontab -e
```

```cron
# Run health check every 5 minutes
*/5 * * * * /opt/chirpsyncer/scripts/health-check.sh

# Daily summary at 9 AM
0 9 * * * /opt/chirpsyncer/scripts/daily-summary.sh
```

---

## Log Monitoring

### View Real-Time Logs

```bash
# System logs (journalctl)
journalctl -u chirpsyncer -f

# Application logs
tail -f /opt/chirpsyncer/logs/chirpsyncer.log

# Both
tail -f /opt/chirpsyncer/logs/chirpsyncer.log & journalctl -u chirpsyncer -f
```

### Log Analysis Script

```bash
sudo nano /opt/chirpsyncer/scripts/log-analysis.sh
```

```bash
#!/bin/bash
# Analyze logs for patterns and issues

LOG_FILE="/opt/chirpsyncer/logs/chirpsyncer.log"
HOURS=${1:-24}  # Default to last 24 hours

echo "ChirpSyncer Log Analysis - Last $HOURS hours"
echo "=============================================="

# Count error levels
echo -e "\nError Levels:"
journalctl -u chirpsyncer --since "${HOURS} hours ago" | grep -oE "ERROR|WARNING|INFO|DEBUG" | sort | uniq -c | sort -rn

# Most common errors
echo -e "\nTop 10 Error Messages:"
journalctl -u chirpsyncer --since "${HOURS} hours ago" | grep ERROR | sed 's/.*ERROR - //' | sort | uniq -c | sort -rn | head -10

# Database operations
echo -e "\nDatabase Operations:"
journalctl -u chirpsyncer --since "${HOURS} hours ago" | grep -i "database\|sqlite" | wc -l

# API calls
echo -e "\nAPI Calls:"
journalctl -u chirpsyncer --since "${HOURS} hours ago" | grep -i "twitter\|bluesky" | wc -l

# Recent failures
echo -e "\nRecent Failures:"
journalctl -u chirpsyncer --since "${HOURS} hours ago" | grep -i "failed\|exception" | tail -5

# Sync statistics
echo -e "\nSync Statistics:"
journalctl -u chirpsyncer --since "${HOURS} hours ago" | grep "Sync completed" | wc -l
```

Make executable:
```bash
sudo chmod +x /opt/chirpsyncer/scripts/log-analysis.sh
```

Run it:
```bash
# Last 24 hours
sudo /opt/chirpsyncer/scripts/log-analysis.sh

# Last 7 days
sudo /opt/chirpsyncer/scripts/log-analysis.sh 168
```

### Log Rotation

Log rotation is automatically configured by the installer. Verify:

```bash
cat /etc/logrotate.d/chirpsyncer
```

Should show:
```
/opt/chirpsyncer/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 chirpsyncer chirpsyncer
    sharedscripts
    postrotate
        systemctl reload chirpsyncer > /dev/null 2>&1 || true
    endscript
}
```

Manual rotation:
```bash
sudo logrotate -f /etc/logrotate.d/chirpsyncer
```

---

## Performance Monitoring

### System Resource Usage

Create monitoring dashboard:

```bash
sudo nano /opt/chirpsyncer/scripts/performance-monitor.sh
```

```bash
#!/bin/bash
# Performance monitoring script

SERVICE="chirpsyncer"
PID=$(systemctl show -p MainPID $SERVICE | cut -d= -f2)

echo "ChirpSyncer Performance Monitor"
echo "================================"

if [ "$PID" == "0" ]; then
    echo "❌ Service is not running"
    exit 1
fi

# CPU usage
CPU=$(ps -p $PID -o %cpu | tail -1)
echo "CPU Usage: ${CPU}%"

# Memory usage
MEM=$(ps -p $PID -o %mem,rss | tail -1)
MEM_PERCENT=$(echo $MEM | awk '{print $1}')
MEM_KB=$(echo $MEM | awk '{print $2}')
MEM_MB=$((MEM_KB / 1024))
echo "Memory Usage: ${MEM_PERCENT}% (${MEM_MB} MB)"

# Threads
THREADS=$(ps -p $PID -o nlwp | tail -1)
echo "Threads: $THREADS"

# Open files
OPEN_FILES=$(lsof -p $PID 2>/dev/null | wc -l)
echo "Open Files: $OPEN_FILES"

# Network connections
CONNECTIONS=$(lsof -i -p $PID 2>/dev/null | grep ESTABLISHED | wc -l)
echo "Active Connections: $CONNECTIONS"

# Database size and operations
DB_SIZE=$(du -h /opt/chirpsyncer/chirpsyncer.db | cut -f1)
echo "Database Size: $DB_SIZE"

# Uptime
UPTIME=$(systemctl show $SERVICE -p ActiveEnterTimestamp | cut -d= -f2)
echo "Service Started: $UPTIME"

# Recent activity (last 5 minutes)
RECENT_LOGS=$(journalctl -u $SERVICE --since "5 minutes ago" | wc -l)
echo "Log Entries (last 5 min): $RECENT_LOGS"
```

Make executable:
```bash
sudo chmod +x /opt/chirpsyncer/scripts/performance-monitor.sh
```

Run it:
```bash
sudo /opt/chirpsyncer/scripts/performance-monitor.sh
```

### Database Performance

Monitor database operations:

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sqlite3
import sys
sys.path.insert(0, '/opt/chirpsyncer')

conn = sqlite3.connect('/opt/chirpsyncer/chirpsyncer.db')
cursor = conn.cursor()

print("Database Performance Metrics")
print("============================")

# Table sizes
cursor.execute("""
    SELECT name,
           (SELECT COUNT(*) FROM sqlite_master sm WHERE sm.tbl_name=m.name) as indexes,
           (SELECT COUNT(*) FROM pragma_table_info(m.name)) as columns
    FROM sqlite_master m
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
""")

print("\nTables:")
for row in cursor.fetchall():
    table_name = row[0]
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"  {table_name}: {count:,} rows, {row[1]} indexes, {row[2]} columns")

# Database file size
cursor.execute("PRAGMA page_count")
page_count = cursor.fetchone()[0]
cursor.execute("PRAGMA page_size")
page_size = cursor.fetchone()[0]
size_mb = (page_count * page_size) / (1024 * 1024)
print(f"\nTotal Size: {size_mb:.2f} MB")

# Fragmentation
cursor.execute("PRAGMA freelist_count")
freelist = cursor.fetchone()[0]
fragmentation = (freelist / page_count * 100) if page_count > 0 else 0
print(f"Fragmentation: {fragmentation:.2f}%")

if fragmentation > 20:
    print("⚠️  Consider running VACUUM to reduce fragmentation")

conn.close()
EOF
```

---

## Email Alerts

### Configure Alert Recipients

Edit `/opt/chirpsyncer/.env`:

```bash
# Admin email for alerts
ADMIN_EMAIL=admin@example.com

# Enable SMTP for alerts
SMTP_ENABLED=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Alert Types

ChirpSyncer sends alerts for:

1. **Service Down**: Service stopped or crashed
2. **Service Recovered**: Service restarted automatically
3. **Database Corruption**: Integrity check failed
4. **Disk Space**: Usage > 90%
5. **High Memory**: Usage > 80%
6. **High Error Rate**: >10 errors in 5 minutes
7. **Web Server Down**: Flask not responding
8. **Task Failures**: Scheduled tasks failing

### Test Alert System

```bash
# Test alert
sudo /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from dotenv import load_dotenv
load_dotenv('/opt/chirpsyncer/.env')
from app.notification_service import NotificationService

ns = NotificationService()
success = ns.send_email(
    to="admin@example.com",
    subject="ChirpSyncer Test Alert",
    body="This is a test alert from the monitoring system.",
    html=False
)

print("✅ Alert sent successfully" if success else "❌ Alert failed to send")
EOF
```

---

## Dashboard Monitoring

### Web Dashboard Metrics

Access dashboard: `http://your-nas-ip:5000`

**Available Metrics:**
- Active users
- Recent syncs
- Error logs
- Task scheduler status
- Database statistics
- System health

### API Health Endpoint

Create health check endpoint (add to `app/dashboard.py`):

```python
@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    import os
    import sqlite3
    from datetime import datetime

    status = {
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'service': 'chirpsyncer',
    }

    try:
        # Check database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        status['database'] = 'ok'
    except Exception as e:
        status['status'] = 'error'
        status['database'] = str(e)

    # Check disk space
    stat = os.statvfs('/opt/chirpsyncer')
    percent_used = (1 - stat.f_bavail / stat.f_blocks) * 100
    status['disk_usage_percent'] = round(percent_used, 2)

    return jsonify(status), 200 if status['status'] == 'ok' else 500
```

Test it:
```bash
curl http://localhost:5000/health
```

### Monitor from External Tools

Use the health endpoint with monitoring tools:

**Uptime Kuma:**
```
URL: http://your-nas-ip:5000/health
Method: GET
Expected Status: 200
Interval: 60 seconds
```

**Nagios/Icinga:**
```bash
#!/bin/bash
# check_chirpsyncer.sh
STATUS=$(curl -s http://localhost:5000/health | jq -r '.status')
if [ "$STATUS" == "ok" ]; then
    echo "OK - ChirpSyncer is running"
    exit 0
else
    echo "CRITICAL - ChirpSyncer is down"
    exit 2
fi
```

---

## External Monitoring Tools

### Uptime Kuma (Recommended)

Self-hosted monitoring tool - perfect for NAS deployment.

**Install on NAS:**
```bash
# Using Docker
docker run -d \
  --name uptime-kuma \
  -p 3001:3001 \
  -v /opt/uptime-kuma:/app/data \
  --restart always \
  louislam/uptime-kuma:1

# Access: http://your-nas-ip:3001
```

**Configure Monitor:**
1. Add new monitor
2. Monitor Type: HTTP(s)
3. URL: `http://localhost:5000/health`
4. Heartbeat Interval: 60 seconds
5. Retries: 3
6. Notification: Email/Discord/Slack

### Grafana + Prometheus (Advanced)

For detailed metrics:

**Install Prometheus:**
```bash
# Add Prometheus endpoint to ChirpSyncer
# Install prometheus_client: pip install prometheus-client
```

**Install Grafana:**
```bash
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -v /opt/grafana:/var/lib/grafana \
  grafana/grafana
```

### Simple Cron Monitoring

For basic uptime checks:

```bash
# Add to crontab
*/5 * * * * curl -fsS --retry 3 https://hc-ping.com/your-uuid-here > /dev/null || echo "ChirpSyncer down"
```

Use services like:
- https://healthchecks.io
- https://cronitor.io
- https://uptimerobot.com

---

## Alert Escalation

### Multi-Level Alerts

Create escalation policy:

```bash
# /opt/chirpsyncer/scripts/alert-escalation.sh
#!/bin/bash

ISSUE="$1"
SEVERITY="$2"  # info, warning, critical

case $SEVERITY in
    critical)
        # Send to all admins + SMS
        RECIPIENTS="admin1@example.com,admin2@example.com"
        # Could integrate Twilio for SMS here
        ;;
    warning)
        # Send to primary admin
        RECIPIENTS="admin@example.com"
        ;;
    info)
        # Log only
        echo "[$(date)] INFO: $ISSUE" >> /opt/chirpsyncer/logs/alerts.log
        exit 0
        ;;
esac

# Send email
/opt/chirpsyncer/venv/bin/python3 << EOF
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from app.notification_service import NotificationService
ns = NotificationService()
for recipient in "$RECIPIENTS".split(','):
    ns.send_email(
        to=recipient,
        subject=f"ChirpSyncer Alert ($SEVERITY)",
        body="$ISSUE",
        html=False
    )
EOF
```

---

## Monitoring Checklist

Production monitoring checklist:

- [ ] Health check script running every 5 minutes
- [ ] SMTP alerts configured and tested
- [ ] Log rotation configured
- [ ] Disk space monitoring enabled
- [ ] Database integrity checks scheduled
- [ ] Performance monitoring script created
- [ ] External monitoring tool configured (Uptime Kuma)
- [ ] Alert recipients configured
- [ ] Escalation policy defined
- [ ] Documentation updated with your specific config

---

## Troubleshooting Monitoring Issues

### Alerts Not Sending

```bash
# Check SMTP configuration
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
from app.notification_service import NotificationService
ns = NotificationService()
print(ns.smtp_config)
print("Enabled:", ns.smtp_config['enabled'])
print("Test:", ns.test_connection())
EOF
```

### Health Check Script Fails

```bash
# Check permissions
ls -la /opt/chirpsyncer/scripts/health-check.sh

# Check cron logs
grep chirpsyncer /var/log/syslog

# Run manually
sudo /opt/chirpsyncer/scripts/health-check.sh
```

### High False Positive Rate

Adjust thresholds in health-check.sh:
```bash
DISK_THRESHOLD=95  # Was 90
ERROR_THRESHOLD=20  # Was 10
MEMORY_THRESHOLD=90  # Was 80
```

---

## Support

For monitoring issues:
- GitHub Issues: https://github.com/lucimart/ChirpSyncer/issues
- Discussions: https://github.com/lucimart/ChirpSyncer/discussions

---

**Monitoring Setup Complete! 📊**

Your ChirpSyncer instance is now monitored and will alert you of any issues.

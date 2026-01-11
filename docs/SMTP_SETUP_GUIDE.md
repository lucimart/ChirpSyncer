# SMTP Configuration Guide for ChirpSyncer

Complete guide for setting up email notifications in ChirpSyncer.

## Table of Contents
1. [Gmail Setup](#gmail-setup-recommended)
2. [Outlook/Office 365 Setup](#outlookoffice-365-setup)
3. [Custom SMTP Server](#custom-smtp-server)
4. [Testing SMTP Connection](#testing-smtp-connection)
5. [Troubleshooting](#troubleshooting)

---

## Gmail Setup (Recommended)

### Prerequisites
- Gmail account
- 2-Factor Authentication enabled

### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the setup wizard

### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **ChirpSyncer**
5. Click **Generate**
6. **Copy the 16-character password** (spaces don't matter)

### Step 3: Configure ChirpSyncer

Edit `/opt/chirpsyncer/.env`:

```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=your-email@gmail.com
```

**Note:** You can paste the app password with or without spaces.

### Step 4: Test Configuration

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
from app.notification_service import NotificationService

# Test connection
ns = NotificationService()
if ns.test_connection():
    print("✅ SMTP connection successful!")

    # Send test email
    success = ns.send_email(
        to="your-email@gmail.com",
        subject="ChirpSyncer SMTP Test",
        body="If you receive this email, SMTP is configured correctly!",
        html=False
    )

    if success:
        print("✅ Test email sent! Check your inbox.")
    else:
        print("❌ Failed to send test email.")
else:
    print("❌ SMTP connection failed. Check credentials.")
EOF
```

### Gmail Troubleshooting

**"Username and Password not accepted"**
- Verify 2FA is enabled
- Regenerate App Password
- Make sure you're using App Password, not account password

**"Less secure app access"**
- This is outdated; use App Passwords instead

**"Daily sending limit exceeded"**
- Gmail free accounts: 500 emails/day
- Gmail Workspace: 2000 emails/day
- Solution: Use a dedicated email service or wait 24 hours

---

## Outlook/Office 365 Setup

### For Personal Outlook.com Accounts

Edit `/opt/chirpsyncer/.env`:

```bash
SMTP_ENABLED=true
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
SMTP_FROM=your-email@outlook.com
```

**Note:** Outlook doesn't require app passwords for SMTP. Use your regular account password.

### For Office 365 Business Accounts

Edit `/opt/chirpsyncer/.env`:

```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@yourdomain.com
```

### Outlook Troubleshooting

**"Authentication failed"**
- Check if SMTP is enabled in your Outlook settings
- Go to Outlook → Settings → Mail → Sync email → POP and IMAP
- Ensure "Let devices and apps use POP" is enabled

**Modern Authentication Required**
- Some Office 365 tenants require OAuth2
- Contact your IT administrator
- Alternative: Use a different SMTP provider

---

## Custom SMTP Server

### Self-Hosted Mail Server

If you're running your own mail server (Postfix, Sendmail, etc.):

```bash
SMTP_ENABLED=true
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_FROM=chirpsyncer@yourdomain.com
```

### Common SMTP Providers

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
```

#### Amazon SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

#### Mailjet
```bash
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_USER=your-api-key
SMTP_PASSWORD=your-secret-key
```

---

## Testing SMTP Connection

### Method 1: Python Script

Create test script `/tmp/test_smtp.py`:

```python
#!/usr/bin/env python3
import os
import sys

# Add app directory to path
sys.path.insert(0, '/opt/chirpsyncer')

from app.notification_service import NotificationService

# Load from .env
from dotenv import load_dotenv
load_dotenv('/opt/chirpsyncer/.env')

# Test connection
ns = NotificationService()

print("Testing SMTP connection...")
print(f"Host: {ns.smtp_config['host']}")
print(f"Port: {ns.smtp_config['port']}")
print(f"User: {ns.smtp_config['user']}")
print(f"Enabled: {ns.smtp_config['enabled']}")
print()

if ns.test_connection():
    print("✅ Connection successful!")
    print()

    # Ask for test email
    recipient = input("Send test email to (press Enter to skip): ").strip()

    if recipient:
        success = ns.send_email(
            to=recipient,
            subject="ChirpSyncer SMTP Test",
            body="<h1>Success!</h1><p>Your SMTP configuration is working correctly.</p>",
            html=True
        )

        if success:
            print(f"✅ Test email sent to {recipient}")
        else:
            print(f"❌ Failed to send email to {recipient}")
else:
    print("❌ Connection failed!")
    print("Check your SMTP credentials in /opt/chirpsyncer/.env")
```

Run it:
```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 /tmp/test_smtp.py
```

### Method 2: Direct Python One-Liner

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import os, sys
sys.path.insert(0, '/opt/chirpsyncer')
from dotenv import load_dotenv
load_dotenv('/opt/chirpsyncer/.env')
from app.notification_service import NotificationService
ns = NotificationService()
print("✅ SMTP OK" if ns.test_connection() else "❌ SMTP FAILED")
EOF
```

### Method 3: Test via Dashboard

1. Access dashboard: `http://your-nas-ip:5000`
2. Login as admin
3. Go to **Settings** → **Email Configuration**
4. Click **Test SMTP Connection**
5. Check for success message

---

## Email Templates

ChirpSyncer supports HTML email templates. Here's how emails look:

### Task Completion Email
```
Subject: Task Completed: Daily Sync

✓ Task Completed Successfully

Task: Daily Sync
Status: Completed
Completion Time: 2026-01-11 14:30:00

Items Processed: 150
Execution Duration: 23.45 seconds
```

### Task Failure Email
```
Subject: Task Failed: Daily Sync

✗ Task Failed

Task: Daily Sync
Status: Failed
Failure Time: 2026-01-11 14:30:00

Error Message:
Connection timeout to Twitter API
```

### Weekly Report
```
Subject: ChirpSyncer Weekly Report

📊 Weekly Report
Summary of all tasks for the week

Total Executions: 168
Successful: 165
Failed: 3
Success Rate: 98.2%
```

---

## Advanced Configuration

### Custom From Name

To show a friendly name in the "From" field:

```bash
SMTP_FROM=ChirpSyncer <chirpsyncer@yourdomain.com>
```

### Multiple Recipients for Alerts

ChirpSyncer supports multiple recipients. Configure in code:

```python
from app.notification_service import NotificationService

ns = NotificationService()

# Send to multiple admins
recipients = [
    "admin1@example.com",
    "admin2@example.com",
    "alerts@example.com"
]

ns.notify_task_failure(
    task_name="Daily Sync",
    error="Connection timeout",
    recipients=recipients
)
```

### Rate Limiting

To avoid hitting SMTP provider limits:

1. **Gmail Free**: 500 emails/day
2. **Gmail Workspace**: 2000 emails/day
3. **Outlook.com**: 300 emails/day
4. **Office 365**: 10,000 emails/day

Configure notification frequency in task scheduler to stay within limits.

---

## Security Best Practices

### 1. Use App Passwords (Gmail)
Never use your main account password for SMTP.

### 2. Encrypt .env File
```bash
# Set restrictive permissions
sudo chmod 600 /opt/chirpsyncer/.env
sudo chown chirpsyncer:chirpsyncer /opt/chirpsyncer/.env
```

### 3. Use TLS/SSL
Always use port 587 (STARTTLS) or 465 (SSL/TLS), never plain port 25.

### 4. Dedicated Email Account
Create a dedicated email account for ChirpSyncer notifications:
- `chirpsyncer-alerts@yourdomain.com`
- Don't use your personal email

### 5. Monitor Logs
```bash
# Watch for failed email attempts
journalctl -u chirpsyncer | grep -i "smtp\|email"
```

---

## Troubleshooting

### Connection Refused

**Symptoms:**
```
SMTPException: Connection refused
```

**Solutions:**
1. Check if port 587 is blocked by firewall
2. Try port 465 (SSL) instead:
   ```bash
   SMTP_PORT=465
   ```
3. Verify SMTP_HOST is correct

### Authentication Failed

**Symptoms:**
```
SMTPAuthenticationError: Username and Password not accepted
```

**Solutions:**
1. Verify credentials are correct
2. For Gmail: Use App Password, not account password
3. Check if 2FA is enabled (required for Gmail)
4. Regenerate app password

### TLS/SSL Errors

**Symptoms:**
```
SMTPException: STARTTLS extension not supported
```

**Solutions:**
1. Use port 465 instead of 587
2. Update Python SSL certificates:
   ```bash
   sudo apt-get install --reinstall ca-certificates
   ```

### Timeout Errors

**Symptoms:**
```
socket.timeout: timed out
```

**Solutions:**
1. Check network connectivity
2. Verify firewall isn't blocking outbound SMTP
3. Try different SMTP provider

### Emails Going to Spam

**Solutions:**
1. Add sender to contacts
2. Configure SPF/DKIM records (for custom domains)
3. Use authenticated email address matching domain
4. Avoid spam trigger words in subject/body

---

## Testing Checklist

Before going to production:

- [ ] SMTP connection test passes
- [ ] Test email received successfully
- [ ] Test email not in spam folder
- [ ] Task completion email received
- [ ] Task failure email received
- [ ] Weekly report email received
- [ ] Multiple recipients work
- [ ] HTML formatting displays correctly
- [ ] .env file has restricted permissions
- [ ] Service restart doesn't break SMTP

---

## Production Recommendations

### 1. Use Dedicated SMTP Service

For production, consider dedicated email services:
- **SendGrid**: 100 emails/day free tier
- **Mailgun**: 5,000 emails/month free tier
- **Amazon SES**: Very cheap ($0.10/1000 emails)

Benefits:
- Higher deliverability
- Better spam handling
- Detailed analytics
- No risk to personal email account

### 2. Monitor Email Delivery

Set up monitoring:
```bash
# Check email logs daily
journalctl -u chirpsyncer --since "24 hours ago" | grep "Email sent"
```

### 3. Configure Alerts for Critical Events

Only send emails for:
- Task failures (not successes)
- Critical errors
- Weekly summary reports

Reduce noise to avoid alert fatigue.

---

## Support

- **SMTP Issues**: Check provider documentation
- **ChirpSyncer Issues**: https://github.com/lucimart/ChirpSyncer/issues

---

**SMTP Configuration Complete! 📧**

You should now receive email notifications for task completions, failures, and weekly reports.

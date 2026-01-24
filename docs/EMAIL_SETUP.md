# Email Notification Setup

ChirpSyncer supports email notifications for:
- Sync completions and failures
- Password reset
- Weekly activity reports
- Rate limit warnings
- Credential expiration alerts

## Development (Mailpit)

**No configuration needed!** Mailpit is automatically configured in `docker-compose.dev.yml`.

```bash
make dev
```

- **SMTP**: Automatically configured for containers
- **View emails**: http://localhost:8025

All emails sent during development are captured and viewable in the Mailpit web UI.

---

## Production (Resend)

[Resend](https://resend.com) offers 3,000 emails/month free with custom domain support.

### Step 1: Create Resend Account

1. Go to https://resend.com and sign up
2. Verify your email

### Step 2: Add Your Domain

1. Go to **Domains** in the Resend dashboard
2. Click **Add Domain**
3. Enter your domain: `luciamartinez.xyz`

### Step 3: Configure DNS Records

Add these DNS records to your domain (exact values shown in Resend dashboard):

| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` |
| CNAME | `resend._domainkey` | `[provided by Resend]` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

**Wait for verification** (usually 5-10 minutes, can take up to 48 hours).

### Step 4: Get API Key

1. Go to **API Keys** in the Resend dashboard
2. Click **Create API Key**
3. Name it `chirpsyncer-production`
4. Copy the key (starts with `re_`)

### Step 5: Configure ChirpSyncer

Edit `.env`:

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_YOUR_API_KEY_HERE
SMTP_FROM=notifications@luciamartinez.xyz
```

### Step 6: Test

```bash
# Restart services
docker compose down && docker compose up -d

# Test via API (get token first by logging in)
curl -X POST http://localhost:5000/api/v1/settings/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Alternative: Gmail

If you prefer Gmail (100 emails/day limit):

### Step 1: Enable 2FA

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**

### Step 2: Create App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other** (enter "ChirpSyncer")
4. Click **Generate**
5. Copy the 16-character password

### Step 3: Configure

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=your-email@gmail.com
```

---

## User Preferences

Users can manage their notification preferences via the API:

```bash
# Get current preferences
curl -X GET http://localhost:5000/api/v1/settings/notifications \
  -H "Authorization: Bearer $TOKEN"

# Enable email notifications
curl -X PATCH http://localhost:5000/api/v1/settings/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_enabled": true}'

# Disable specific notification types
curl -X PATCH http://localhost:5000/api/v1/settings/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_types": {"weekly_report": false}}'

# Set quiet hours (no emails 10 PM - 8 AM)
curl -X PATCH http://localhost:5000/api/v1/settings/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quiet_hours_start": 22, "quiet_hours_end": 8}'
```

## Notification Types

| Type | Description | Default |
|------|-------------|---------|
| `sync_complete` | Sync job completed successfully | Enabled |
| `sync_failed` | Sync job failed | Enabled |
| `weekly_report` | Weekly activity summary (Mondays 9 AM UTC) | Enabled |
| `rate_limit` | Platform rate limit reached | Enabled |
| `credential_expired` | Platform credentials expired | Enabled |

## Unsubscribe

Every email includes an unsubscribe link. Users can also unsubscribe via API:

```bash
# Unsubscribe from weekly reports only
curl -X POST "http://localhost:5000/api/v1/unsubscribe?token=TOKEN&type=weekly_report"

# Unsubscribe from all emails
curl -X POST "http://localhost:5000/api/v1/unsubscribe?token=TOKEN"
```

---

## Troubleshooting

### Emails not sending

1. Check SMTP is enabled: `SMTP_ENABLED=true`
2. Check logs: `docker logs chirp-worker`
3. Verify API key is correct
4. Verify domain is verified in Resend

### Emails going to spam

1. Verify SPF, DKIM, and DMARC records are configured
2. Use a proper `SMTP_FROM` address on your verified domain
3. Check domain reputation at https://mxtoolbox.com

### Test SMTP connection

```bash
# In the API container
docker exec -it chirp-api-dev python -c "
from app.services.notification_service import NotificationService
ns = NotificationService()
print('Config:', ns.smtp_config)
print('Test:', ns.test_connection())
"
```

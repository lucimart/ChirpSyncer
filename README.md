# ChirpSyncer

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/lucimart/ChirpSyncer/ci.yml?branch=main)
![GitHub License](https://img.shields.io/github/license/lucimart/ChirpSyncer)
![Python Version](https://img.shields.io/badge/python-3.11-blue)
![Code Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
![GitHub Issues](https://img.shields.io/github/issues/lucimart/ChirpSyncer)
![GitHub Stars](https://img.shields.io/github/stars/lucimart/ChirpSyncer?style=social)

Bidirectional synchronization platform for Twitter and Bluesky with analytics, scheduling, multi-user support, and automated maintenance.

## Features

**Sync Operations**
- Bidirectional sync between Twitter and Bluesky
- Duplicate detection and loop prevention
- Media handling (images, videos)
- Thread support and detection
- Rate limit management

**Multi-User Platform**
- User authentication with role-based access control
- AES-256-GCM encrypted credential storage
- Per-user analytics and settings
- Audit logging for all operations
- Flask-based web dashboard

**Advanced Features**
- Analytics tracking with engagement metrics
- Tweet scheduler for future posting
- Rule-based automated cleanup engine
- Full-text search with FTS5
- Bookmark management and collections
- Multi-format report generation (PDF/CSV/JSON/HTML)
- Cron-based maintenance tasks

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer
cp .env.example .env
# Edit .env with your credentials
docker-compose up -d
```

Access dashboard at http://localhost:5000

### Manual Installation

```bash
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python app/main.py
```

### System Service (Linux)

```bash
sudo ./scripts/install.sh
sudo systemctl start chirpsyncer
```

See [deployment guides](docs/) for detailed instructions.

## Configuration

Required environment variables:

```bash
# Twitter (uses twscrape - no API keys needed)
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email@example.com
TWITTER_EMAIL_PASSWORD=email_password

# Bluesky
BSKY_USERNAME=username.bsky.social
BSKY_PASSWORD=app_password

# Application
MULTI_USER_ENABLED=true
SECRET_KEY=change-this-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password
```

See [.env.example](.env.example) for all available options.

## Usage

### Web Dashboard

Navigate to http://localhost:5000 after starting the application. The dashboard provides:

- Credential management
- Sync history and statistics
- Task scheduler interface
- Analytics overview
- User management (admin only)

### Python API

```python
from app.analytics_tracker import AnalyticsTracker

tracker = AnalyticsTracker(user_id=1)
tracker.record_metrics(
    tweet_id="123456",
    impressions=1000,
    likes=50,
    retweets=10
)

stats = tracker.get_user_analytics(period='24h')
top_tweets = tracker.get_top_tweets(metric='engagement', limit=10)
```

```python
from app.tweet_scheduler import TweetScheduler
from datetime import datetime, timedelta

scheduler = TweetScheduler(user_id=1)
scheduler.schedule_tweet(
    content="Scheduled tweet",
    scheduled_time=datetime.now() + timedelta(hours=2)
)
```

```python
from app.cleanup_engine import CleanupEngine

engine = CleanupEngine(user_id=1)
engine.create_rule(
    name="Delete old tweets",
    rule_type="age",
    rule_config={"days_old": 90, "exclude_threads": True}
)

preview = engine.preview_cleanup(rule_id=1)
result = engine.execute_cleanup(rule_id=1, dry_run=False)
```

See [API documentation](docs/API.md) for complete reference.

## Development

### Setup

```bash
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Testing

```bash
# Run all tests
pytest tests/

# With coverage
pytest --cov=app --cov-report=html tests/

# Specific test file
pytest tests/test_analytics_tracker.py -v
```

### Code Quality

```bash
# Linting
pylint app/ tests/

# Formatting
black app/ tests/
isort app/ tests/

# Type checking
mypy app/
```

## Project Structure

```
ChirpSyncer/
├── app/
│   ├── auth/              # Authentication and security
│   ├── features/          # Core features (analytics, scheduler, cleanup)
│   ├── integrations/      # Twitter and Bluesky API handlers
│   ├── models/            # Database models
│   ├── services/          # Business logic services
│   ├── web/               # Web dashboard (Flask)
│   └── main.py            # Entry point
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── scripts/               # Installation and deployment scripts
├── docs/                  # Documentation
└── requirements.txt       # Python dependencies
```

## Security

- All credentials encrypted with AES-256-GCM
- Password hashing with bcrypt
- SQL injection protection via parameterized queries
- CSRF protection on all forms
- Rate limiting on authentication endpoints
- Comprehensive audit logging

**Never commit `.env` to version control.**

## Documentation

- [Architecture Overview](docs/architecture/ARCHITECTURE.md)
- [Master Roadmap](docs/MASTER_ROADMAP.md)
- [Deployment Guides](docs/NAS_DEPLOYMENT_GUIDE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)

## Deployment

### Systemd Service

```bash
sudo ./scripts/install.sh
sudo systemctl enable chirpsyncer
sudo systemctl start chirpsyncer
journalctl -u chirpsyncer -f
```

### Docker

```bash
docker build -t chirpsyncer .
docker run -d -p 5000:5000 -v $(pwd)/.env:/app/.env chirpsyncer
```

### Docker Compose

```bash
docker-compose up -d
docker-compose logs -f
```

## Troubleshooting

**Database locked:**
```bash
sudo systemctl stop chirpsyncer
rm -f chirpsyncer.db-shm chirpsyncer.db-wal
sudo systemctl start chirpsyncer
```

**Twitter account issues:**
- Use a dedicated account for scraping
- Enable 2FA on the account
- Avoid running multiple instances simultaneously

**Port already in use:**
```bash
# Change FLASK_PORT in .env
sudo netstat -tlnp | grep 5000
```

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

Code should follow PEP 8 style guidelines and maintain test coverage above 80%.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [twscrape](https://github.com/vladkens/twscrape) - Twitter API-free scraping
- [atproto](https://github.com/MarshalX/atproto) - Bluesky AT Protocol
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [APScheduler](https://apscheduler.readthedocs.io/) - Task scheduling

## Support

- Report issues: [GitHub Issues](https://github.com/lucimart/ChirpSyncer/issues)
- Discussions: [GitHub Discussions](https://github.com/lucimart/ChirpSyncer/discussions)

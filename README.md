# ChirpSyncer

**ChirpSyncer** is a comprehensive Twitter-Bluesky synchronization platform with advanced analytics, multi-user support, automated cleanup, and enterprise-grade features.

## 🌟 Features

### Core Synchronization
- ✅ Bidirectional sync between Twitter and Bluesky
- ✅ Automatic duplicate detection and loop prevention
- ✅ Media handling (images, videos)
- ✅ Thread support
- ✅ Rate limit management

### Sprint 6: Multi-User Platform
- ✅ Multi-user authentication and authorization
- ✅ Role-based access control (Admin/User)
- ✅ Encrypted credential management
- ✅ Session management
- ✅ Web dashboard (Flask)
- ✅ Task scheduler with APScheduler
- ✅ Audit logging and security

### Sprint 7: Advanced Features
- ✅ **Analytics Tracker**: Track tweet metrics, engagement rates, top tweets
- ✅ **Tweet Scheduler**: Schedule tweets for future posting
- ✅ **Cleanup Engine**: Rule-based automated tweet deletion
- ✅ **Full-Text Search**: FTS5-powered search with filters
- ✅ **Saved Content**: Bookmark tweets and organize into collections
- ✅ **Report Generator**: Multi-format analytics reports (PDF/CSV/JSON/HTML)
- ✅ **Persistent Context**: State management for long-running tasks
- ✅ **Maintenance Tasks**: Automated cleanup, archiving, and backups

## 📊 System Status

**Test Coverage:** 399/408 tests passing (97.8%)
**Code Quality:** Comprehensive test suite, typed with docstrings
**Production Ready:** Multi-user mode enabled, security audited

## 🚀 Quick Start

### Prerequisites

#### System Requirements
- **OS:** Linux (Ubuntu/Debian recommended) or macOS
- **Python:** 3.10 or 3.11
- **Memory:** 2GB RAM minimum
- **Disk:** 500MB + database growth
- **Network:** Stable internet connection

#### Required Software
- Python 3.10+ with pip
- SQLite 3.35+
- Git
- Docker (optional, for containerized deployment)

### Installation Methods

#### Method 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer
```

2. Set up environment:
```bash
cp .env.example .env
nano .env  # Add your credentials
```

3. Build and start:
```bash
make docker-build
make docker-up
```

4. Access dashboard: http://localhost:5000

#### Method 2: Home Server Installation

For Linux home servers (recommended for production):

```bash
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer
sudo ./scripts/install.sh
```

This will:
- Install system dependencies
- Create service user
- Set up Python environment
- Initialize database
- Install systemd service
- Configure log rotation and backups

Then edit your credentials:
```bash
sudo nano /opt/chirpsyncer/.env
```

Start the service:
```bash
sudo systemctl start chirpsyncer
sudo systemctl status chirpsyncer
```

#### Method 3: Manual Installation

1. Install dependencies:
```bash
# System packages
sudo apt-get install python3 python3-pip python3-venv sqlite3 git

# Clone repository
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install --upgrade pip
pip install -r requirements.txt
```

2. Configure credentials:
```bash
cp .env.example .env
nano .env  # Add your credentials
```

3. Initialize database:
```bash
python -c "from app.db_handler import initialize_db, migrate_database; initialize_db(); migrate_database()"
```

4. Run:
```bash
python app/main.py
```

### Configuration

#### Required Environment Variables

```bash
# Twitter Credentials (twscrape - no API limits!)
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_twitter_email@example.com
TWITTER_EMAIL_PASSWORD=your_email_password

# Bluesky Credentials
BSKY_USERNAME=your-username.bsky.social
BSKY_PASSWORD=your-bluesky-app-password

# Multi-User Mode (Sprint 6+)
MULTI_USER_ENABLED=true
SECRET_KEY=your-secret-key-here-change-this
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-admin-password

# Database
DATABASE_PATH=chirpsyncer.db

# Server
FLASK_PORT=5000
FLASK_HOST=0.0.0.0
```

#### Optional Configuration

```bash
# Analytics (Sprint 7)
ANALYTICS_SNAPSHOT_INTERVAL=3600  # 1 hour
MAX_TOP_TWEETS=100

# Scheduler (Sprint 7)
TWEET_QUEUE_CHECK_INTERVAL=60  # 1 minute
MAX_SCHEDULED_TWEETS_PER_USER=100

# Cleanup (Sprint 7)
CLEANUP_DRY_RUN_DEFAULT=true
MAX_CLEANUP_BATCH_SIZE=1000

# Search (Sprint 7)
SEARCH_MAX_RESULTS=1000
FTS5_TOKENIZER=porter unicode61

# Reports (Sprint 7)
REPORT_OUTPUT_DIR=reports/
REPORT_FORMATS=pdf,csv,json,html

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/chirpsyncer.log
```

## 📖 Usage

### Web Dashboard

Access the dashboard at http://localhost:5000

**Features:**
- User authentication and management
- Credential management (encrypted)
- Task scheduler control
- Analytics overview
- Recent syncs view
- Error logs
- System status

### Multi-User Mode

**Admin Functions:**
- Create/manage users
- View all system activity
- Configure scheduled tasks
- Access global analytics
- Manage credentials for all users

**User Functions:**
- Manage own credentials
- View personal analytics
- Schedule tweets
- Create cleanup rules
- Search and save tweets
- Generate reports

### Analytics

Track your Twitter performance:

```python
from app.analytics_tracker import AnalyticsTracker

tracker = AnalyticsTracker(user_id=1)

# Record metrics
tracker.record_metrics(
    tweet_id="123456",
    impressions=1000,
    likes=50,
    retweets=10,
    replies=5
)

# Get analytics
stats = tracker.get_user_analytics(period='24h')
top_tweets = tracker.get_top_tweets(metric='engagement', limit=10)

# Create snapshot
tracker.create_snapshot(period='daily')
```

### Tweet Scheduler

Schedule tweets for optimal posting times:

```python
from app.tweet_scheduler import TweetScheduler
from datetime import datetime, timedelta

scheduler = TweetScheduler(user_id=1)

# Schedule a tweet
scheduler.schedule_tweet(
    content="This is a scheduled tweet!",
    scheduled_time=datetime.now() + timedelta(hours=2),
    media_paths=['image.jpg']
)

# List scheduled tweets
upcoming = scheduler.get_user_scheduled_tweets(status='pending')

# Edit scheduled tweet
scheduler.edit_scheduled_tweet(
    tweet_id=1,
    new_content="Updated content",
    new_time=datetime.now() + timedelta(hours=3)
)
```

### Cleanup Engine

Automate old tweet deletion:

```python
from app.cleanup_engine import CleanupEngine

engine = CleanupEngine(user_id=1)

# Create age-based rule
engine.create_rule(
    name="Delete old tweets",
    rule_type="age",
    rule_config={
        "days_old": 90,
        "exclude_threads": True,
        "exclude_replies": True
    }
)

# Create engagement-based rule
engine.create_rule(
    name="Delete low-engagement",
    rule_type="engagement",
    rule_config={
        "min_likes": 5,
        "min_retweets": 1,
        "days_old": 30
    }
)

# Preview before execution
preview = engine.preview_cleanup(rule_id=1)
print(f"Would delete {preview['count']} tweets")

# Execute (dry run first)
result = engine.execute_cleanup(rule_id=1, dry_run=True)

# Actually delete
result = engine.execute_cleanup(rule_id=1, dry_run=False)
```

### Search Engine

Full-text search across tweets:

```python
from app.search_engine import SearchEngine

search = SearchEngine(user_id=1)

# Simple search
results = search.search("python programming")

# Phrase search
results = search.search('"machine learning"')

# With filters
results = search.search(
    "AI",
    filters={
        'min_likes': 10,
        'has_media': True,
        'date_from': '2024-01-01',
        'date_to': '2024-12-31'
    }
)

# Trending hashtags
trending = search.get_trending_hashtags(days=7, limit=10)
```

### Report Generator

Generate analytics reports:

```python
from app.report_generator import ReportGenerator

generator = ReportGenerator(user_id=1)

# Generate weekly engagement report (PDF)
report = generator.generate_engagement_report(
    period='week',
    format='pdf'
)

# Generate growth analysis (CSV)
report = generator.generate_growth_report(
    start_date='2024-01-01',
    end_date='2024-12-31',
    format='csv'
)

# Top tweets report (JSON)
report = generator.generate_top_tweets_report(
    limit=10,
    format='json'
)

# Schedule recurring reports
generator.schedule_report(
    report_type='engagement',
    frequency='weekly',
    email='user@example.com'
)
```

## 🛠️ Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

# Install pyenv (recommended)
make pyenv-setup

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
make install-dev

# Set up pre-commit hooks
make pre-commit-setup
pre-commit install
```

### Running Tests

```bash
# Run all tests
make test

# Run with coverage
pytest --cov=app --cov-report=html tests/

# Run specific test file
pytest tests/test_analytics_tracker.py -v

# Run specific test
pytest tests/test_analytics_tracker.py::TestAnalyticsTrackerInit::test_init_creates_database_tables -v
```

### Code Quality

```bash
# Lint code
make lint

# Format code
black app/ tests/

# Sort imports
isort app/ tests/

# Type checking
mypy app/
```

### Project Structure

```
ChirpSyncer/
├── app/
│   ├── main.py                 # Entry point
│   ├── dashboard.py            # Flask web dashboard
│   ├── db_handler.py           # Database operations
│   ├── twitter_scraper.py      # Twitter integration (twscrape)
│   ├── bluesky_handler.py      # Bluesky integration
│   ├── media_handler.py        # Media processing
│   ├── thread_support.py       # Thread detection
│   ├── user_manager.py         # User management
│   ├── credential_manager.py   # Encrypted credentials
│   ├── analytics_tracker.py    # Analytics tracking
│   ├── tweet_scheduler.py      # Tweet scheduling
│   ├── cleanup_engine.py       # Automated cleanup
│   ├── search_engine.py        # Full-text search
│   ├── saved_content.py        # Bookmarks
│   ├── report_generator.py     # Report generation
│   ├── task_scheduler.py       # Cron scheduler
│   ├── maintenance_tasks.py    # Background tasks
│   └── templates/              # HTML templates
├── tests/                      # Test suite (408 tests)
├── scripts/
│   ├── install.sh             # Home server installation
│   ├── deploy.sh              # Deployment script
│   └── chirpsyncer.service    # Systemd service
├── docs/                       # Documentation
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker image
├── docker-compose.yml          # Docker orchestration
├── Makefile                    # Build automation
└── README.md                   # This file
```

## 🔒 Security

### Best Practices

1. **Credentials**: Never commit `.env` to version control
2. **Encryption**: All credentials encrypted with AES-256-GCM
3. **Passwords**: Use strong passwords (12+ characters)
4. **2FA**: Enable 2FA on Twitter account
5. **Updates**: Keep dependencies updated
6. **Backups**: Automated daily database backups
7. **Logs**: Audit logging for all actions
8. **Access**: Use dedicated Twitter account for scraping

### Security Features

- Password hashing with bcrypt
- Session management with secure tokens
- SQL injection protection (parameterized queries)
- XSS protection in templates
- CSRF protection
- Rate limiting
- Audit logging
- Encrypted credential storage

## 📋 Deployment

### Home Server (Systemd)

```bash
# Install
sudo ./scripts/install.sh

# Start service
sudo systemctl start chirpsyncer

# Enable on boot
sudo systemctl enable chirpsyncer

# View logs
journalctl -u chirpsyncer -f

# Restart
sudo systemctl restart chirpsyncer
```

### Docker

```bash
# Build
docker build -t chirpsyncer .

# Run
docker run -d \
  --name chirpsyncer \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  chirpsyncer

# Logs
docker logs -f chirpsyncer

# Stop
docker stop chirpsyncer
```

### Docker Compose

```bash
# Start
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

## 🔧 Troubleshooting

### Common Issues

**Database locked:**
```bash
# Stop service
sudo systemctl stop chirpsyncer
# Remove lock
rm -f chirpsyncer.db-shm chirpsyncer.db-wal
# Restart
sudo systemctl start chirpsyncer
```

**Twitter account locked:**
- Verify account through Twitter website
- Use dedicated account for scraping
- Enable 2FA
- Avoid multiple instances

**Dashboard not accessible:**
```bash
# Check service status
sudo systemctl status chirpsyncer
# Check logs
journalctl -u chirpsyncer -f
# Check port
sudo netstat -tlnp | grep 5000
```

**Tests failing:**
```bash
# Clean test databases
rm -f *.db test*.db
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
# Run tests
pytest tests/ -v
```

## 📚 Documentation

### Architecture & Planning
- [Architecture](ARCHITECTURE.md) - System architecture
- [Sprint 6 Summary](SPRINT6_SUMMARY.md) - Multi-user platform
- [Sprint 7 Summary](SPRINT7_SUMMARY.md) - Advanced features
- [Sprint 7 ADR](SPRINT7_ARCHITECTURE_DECISIONS.md) - Architecture decisions
- [Sprint 7 Fixes](SPRINT7_FIXES_SUMMARY.md) - Bug fixes and feature completion
- [Sprint 7 Review](SPRINT7_COMPONENT_REVIEW.md) - Component analysis

### Deployment Guides
- [NAS Deployment Guide](docs/NAS_DEPLOYMENT_GUIDE.md) - Deploy to NAS on local network
- [SMTP Setup Guide](docs/SMTP_SETUP_GUIDE.md) - Configure email notifications
- [Admin Setup Guide](docs/ADMIN_SETUP_GUIDE.md) - Create and manage admin users
- [Monitoring Guide](docs/MONITORING_GUIDE.md) - Monitor and alert setup

### Technical Reference
- [API Documentation](docs/API.md) - REST API reference
- [Database Schema](docs/DATABASE.md) - Database design

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**Development Workflow:**
- All code must have tests
- Maintain 95%+ test coverage
- Follow PEP 8 style guide
- Add docstrings to functions
- Update documentation

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [twscrape](https://github.com/vladkens/twscrape) - Twitter scraping
- [atproto](https://github.com/MarshalX/atproto) - Bluesky API
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [APScheduler](https://apscheduler.readthedocs.io/) - Task scheduling
- [SQLite](https://www.sqlite.org/) - Database

## 📞 Support

- **Issues**: https://github.com/lucimart/ChirpSyncer/issues
- **Discussions**: https://github.com/lucimart/ChirpSyncer/discussions
- **Email**: support@chirpsyncer.com

## 🗺️ Roadmap

### Completed ✅
- Sprint 1-5: Core sync functionality
- Sprint 6: Multi-user platform
- Sprint 7: Advanced features and analytics

### Planned 🚧
- Sprint 8: Real-time WebSocket dashboard
- Sprint 9: Machine learning for optimal posting
- Sprint 10: Multi-platform support (Instagram, LinkedIn)
- Sprint 11: Team collaboration features
- Sprint 12: Mobile app

---

**Made with ❤️ by the ChirpSyncer team**

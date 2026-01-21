---
layout: default
title: ChirpSyncer - Cross-Platform Social Media Management
description: Sync, schedule, and analyze your Twitter and Bluesky presence with one powerful tool
---

# ChirpSyncer
### Cross-Platform Social Media Management Made Simple

Bi-directional synchronization between Twitter (X) and Bluesky with advanced scheduling, search, analytics, and cleanup automation. Built for power users who want full control over their social media presence.

[![Tests](https://img.shields.io/badge/tests-422%20passing-brightgreen)](https://github.com/lucimart/ChirpSyncer)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/lucimart/ChirpSyncer)
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11-blue)](https://github.com/lucimart/ChirpSyncer)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/lucimart/ChirpSyncer/blob/main/LICENSE)

[🚀 Get Started](#quick-start) • [📖 Documentation](https://github.com/lucimart/ChirpSyncer/tree/main/docs) • [💬 Community](https://github.com/lucimart/ChirpSyncer/discussions) • [☁️ Managed Hosting](#managed-hosting)

---

## ✨ Features

### Core Synchronization
- **Bi-Directional Sync**: Automatically sync posts between Twitter and Bluesky
- **Thread Support**: Full conversation threading with proper ordering
- **Media Handling**: Images, videos, and GIFs with automatic compression
- **Rate Limiting**: Intelligent throttling to respect API limits
- **Deduplication**: Never post the same content twice

### Content Management
- **Advanced Search**: FTS5-powered full-text search with filters
  - Search by content, author, date range, engagement metrics
  - Boolean operators (AND, OR, NOT)
  - NEAR operator for phrase proximity
  - Save and organize search results
- **Collections**: Organize tweets into custom collections
- **Export**: Export to JSON, CSV for backup and analysis
- **Saved Content**: Bookmark important tweets with notes

### Scheduling & Automation
- **Tweet Scheduler**: Schedule tweets for optimal posting times
- **Recurring Posts**: Set up automated recurring content
- **Cleanup Rules**: Auto-delete old tweets based on custom criteria
  - Age-based cleanup (e.g., delete tweets older than 30 days)
  - Engagement thresholds (keep high-performing content)
  - Pattern matching (cleanup based on hashtags, keywords)
- **Maintenance Tasks**: Automated database cleanup and optimization

### Analytics & Reporting
- **Engagement Tracking**: Monitor likes, retweets, replies, impressions
- **Growth Analytics**: Track follower growth over time
- **Top Content**: Identify your best-performing tweets
- **Custom Reports**: Generate HTML, JSON, or CSV reports
- **Email Delivery**: Automated report delivery via SMTP

### Enterprise Features
- **Multi-User Support**: Separate accounts for teams
- **Role-Based Access**: Admin and user roles with permissions
- **Encrypted Credentials**: Secure storage of API credentials
- **Audit Logging**: Track all user actions
- **Session Management**: Secure authentication with timeout

### Developer Experience
- **REST API**: Full-featured API for integrations
- **Web Dashboard**: Beautiful Flask-powered UI
- **CLI Tools**: Command-line interface for automation
- **Self-Hosted**: Full control over your data
- **Docker Support**: One-command deployment

---

## 🚀 Quick Start

### Self-Hosted Installation

#### Option 1: Automated Installer (Recommended)

```bash
# Clone repository
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

# Run installer
sudo ./scripts/install.sh

# Configure credentials
sudo nano /opt/chirpsyncer/.env

# Start service
sudo systemctl start chirpsyncer

# Access dashboard
http://localhost:5000
```

#### Option 2: Docker

```bash
# Clone and start
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

docker-compose up -d

# Access dashboard
http://localhost:5000
```

#### Option 3: Manual Installation

```bash
# Install dependencies
sudo apt-get install python3 python3-pip python3-venv sqlite3

# Clone repository
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env

# Initialize database
python3 -c "from app.core.db_handler import init_db; init_db()"

# Start application
python3 app/main.py
```

### NAS Deployment

Deploy to your Synology, QNAP, or TrueNAS:

```bash
# From your local machine
cd ChirpSyncer
./scripts/deploy-to-nas.sh
```

See our [NAS Deployment Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/NAS_DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 💰 Pricing

### Self-Hosted (Free Forever)

**$0/month**

- ✅ All features included
- ✅ Unlimited users
- ✅ Unlimited syncs
- ✅ Full source code access
- ✅ Community support
- ✅ Self-managed updates
- ⚠️ You manage: server, updates, backups, security
- ⚠️ Requires: Linux server, basic sysadmin knowledge

**Perfect for:**
- Tech enthusiasts
- Privacy-conscious users
- Organizations with IT staff
- Users who want full control

[📖 Self-Hosting Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/NAS_DEPLOYMENT_GUIDE.md)

---

### Managed Hosting

**$2/month** (billed annually) or **$3/month** (monthly)

- ✅ All features included
- ✅ Fully managed infrastructure
- ✅ Automatic updates
- ✅ Daily backups
- ✅ 99.9% uptime SLA
- ✅ SSL/TLS encryption
- ✅ Priority email support
- ✅ No server management required
- ✅ Cancel anytime

**Perfect for:**
- Non-technical users
- Busy professionals
- Users who value convenience
- Those who want guaranteed uptime

<div style="text-align: center; margin: 30px 0;">
  <a href="#" class="button" style="background: #1DA1F2; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
    🚀 Get Managed Hosting (Coming Soon)
  </a>
</div>

**What's Included:**
- Dedicated instance (not shared hosting)
- Your own domain or subdomain
- Automatic SSL certificates (Let's Encrypt)
- Daily encrypted backups (30-day retention)
- Email notifications and alerts
- 24/7 monitoring
- Managed updates (with opt-out)

**Fair Use Policy:**
- Up to 10,000 API calls/day
- Up to 5 user accounts
- Up to 10GB database storage

Need more? Custom plans available for teams and high-volume users.

---

## 📊 Use Cases

### Personal Brand Management
- Sync your Twitter presence to Bluesky automatically
- Schedule content for optimal engagement times
- Track which posts perform best on each platform
- Auto-cleanup old low-engagement content

### Social Media Managers
- Manage multiple client accounts
- Bulk scheduling with CSV import
- Analytics reporting for clients
- Team collaboration with role-based access

### Content Creators
- Cross-post to multiple platforms effortlessly
- Search your entire tweet history instantly
- Export top-performing content for repurposing
- Automated archiving for compliance

### Researchers & Journalists
- Archive and search social media conversations
- Track specific topics with saved searches
- Export data for analysis
- Maintain compliance with data retention policies

### Businesses & Organizations
- Centralized social media management
- Team collaboration with audit trails
- Automated content distribution
- Analytics for ROI tracking

---

## 🏗️ Architecture

ChirpSyncer is built with production-ready technologies:

```
┌─────────────────────────────────────────────────┐
│                  Web Dashboard                  │
│              (Flask + Jinja2 + JS)              │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              Application Layer                  │
├─────────────────────────────────────────────────┤
│  Auth & Security  │  Features     │  Services   │
│  - User Manager   │  - Scheduler  │  - Notif.   │
│  - Credentials    │  - Analytics  │  - Tasks    │
│  - Decorators     │  - Search     │  - Stats    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│             Integration Layer                   │
├─────────────────────────────────────────────────┤
│  Twitter/X     │  Bluesky       │  Media        │
│  - Scraper     │  - AT Protocol │  - Handler    │
│  - API Wrapper │  - Auth        │  - Compress   │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│               Data Layer                        │
├─────────────────────────────────────────────────┤
│  SQLite Database (FTS5 enabled)                 │
│  - Users & Auth     - Scheduled Tweets          │
│  - Sync History     - Analytics                 │
│  - Search Index     - Saved Content             │
└─────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Backend**: Python 3.10/3.11
- **Web Framework**: Flask
- **Database**: SQLite with FTS5
- **Search**: Full-text search with porter stemming
- **Scheduler**: APScheduler (cron-based)
- **Authentication**: Secure sessions with encrypted credentials
- **API Clients**: atproto (Bluesky), twscrape (Twitter)
- **Testing**: pytest (422 tests, 100% coverage)

---

## 📖 Documentation

> **📚 [Complete Documentation Index](https://github.com/lucimart/ChirpSyncer/blob/main/docs/README.md)** - Browse all documentation organized by topic

### Getting Started
- [Installation Guide](https://github.com/lucimart/ChirpSyncer#installation)
- [Quick Start Tutorial](https://github.com/lucimart/ChirpSyncer#quick-start)
- [Configuration Guide](https://github.com/lucimart/ChirpSyncer/blob/main/.env.example)

### Deployment
- [NAS Deployment Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/NAS_DEPLOYMENT_GUIDE.md)
- [SMTP Setup Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/SMTP_SETUP_GUIDE.md)
- [Admin Setup Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/ADMIN_SETUP_GUIDE.md)
- [Monitoring Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/MONITORING_GUIDE.md)

### Technical Reference
- [API Documentation](https://github.com/lucimart/ChirpSyncer/blob/main/docs/API.md)
- [Database Schema](https://github.com/lucimart/ChirpSyncer/blob/main/docs/DATABASE.md)

### Architecture & Development
- [System Architecture](https://github.com/lucimart/ChirpSyncer/blob/main/docs/architecture/ARCHITECTURE.md)
- [Master Roadmap](https://github.com/lucimart/ChirpSyncer/blob/main/docs/MASTER_ROADMAP.md)
- [Testing Guide](https://github.com/lucimart/ChirpSyncer/blob/main/docs/testing/RUNNING_E2E_TESTS.md)

---

## 🤝 Contributing

We welcome contributions from the community!

### Ways to Contribute
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📖 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repository
- 💬 Help others in discussions

### Development Setup

```bash
# Clone repository
git clone https://github.com/lucimart/ChirpSyncer.git
cd ChirpSyncer

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/ -v

# Check coverage
pytest --cov=app --cov-report=html
```

### Code Quality Standards
- ✅ All code must have tests
- ✅ Maintain 95%+ test coverage
- ✅ Follow PEP 8 style guide
- ✅ Document all public APIs
- ✅ No breaking changes without discussion

See our [Contributing Guide](https://github.com/lucimart/ChirpSyncer/blob/main/CONTRIBUTING.md) for more details.

---

## 🌟 Why ChirpSyncer?

### vs. Manual Cross-Posting
- ❌ Manual: Copy-paste between platforms, time-consuming, error-prone
- ✅ ChirpSyncer: Automated sync, schedule once, post everywhere

### vs. Commercial Tools (Buffer, Hootsuite)
- ❌ Commercial: $15-50/month, limited features on free tier, data not owned
- ✅ ChirpSyncer: Free self-hosting or $2/month managed, all features, full data control

### vs. IFTTT/Zapier
- ❌ Automation platforms: Limited to basic triggers, no analytics, no search
- ✅ ChirpSyncer: Advanced features, analytics, full-text search, proper threading

### vs. Building Your Own
- ❌ DIY: Months of development, API complexities, ongoing maintenance
- ✅ ChirpSyncer: Production-ready, battle-tested, active development

---

## 🔒 Security & Privacy

We take security seriously:

- **Encrypted Credentials**: All API keys stored encrypted in database
- **Secure Sessions**: Flask sessions with timeout and CSRF protection
- **Role-Based Access**: Granular permissions for multi-user setups
- **Audit Logging**: Track all user actions
- **HTTPS Support**: Built-in SSL/TLS for web dashboard
- **Input Validation**: Comprehensive sanitization of all inputs
- **SQL Injection Protection**: Parameterized queries throughout
- **No Telemetry**: We don't collect any usage data (self-hosted)

### Managed Hosting Additional Security
- **Encrypted Backups**: AES-256 encryption at rest
- **Isolated Instances**: Your data never shared with other users
- **Network Security**: Firewall rules, DDoS protection
- **Regular Updates**: Security patches applied within 24 hours
- **SOC 2 Compliant Infrastructure** (coming soon)

---

## 📈 Roadmap

### v2.0 (Q2 2026)
- [ ] Mastodon integration
- [ ] Threads (Meta) integration
- [ ] LinkedIn support
- [ ] Mobile app (React Native)
- [ ] Advanced AI content suggestions
- [ ] Bulk CSV import/export
- [ ] Custom webhooks

### v2.1 (Q3 2026)
- [ ] Instagram integration
- [ ] Content calendar view
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] A/B testing for post times
- [ ] Sentiment analysis

### Future Considerations
- [ ] Browser extension
- [ ] Zapier integration
- [ ] REST API v2 with OAuth
- [ ] GraphQL API
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile push notifications

[Vote on features →](https://github.com/lucimart/ChirpSyncer/discussions)

---

## 💬 Community & Support

### Get Help
- **Documentation**: [https://github.com/lucimart/ChirpSyncer/tree/main/docs](https://github.com/lucimart/ChirpSyncer/tree/main/docs)
- **GitHub Discussions**: [https://github.com/lucimart/ChirpSyncer/discussions](https://github.com/lucimart/ChirpSyncer/discussions)
- **Issues**: [https://github.com/lucimart/ChirpSyncer/issues](https://github.com/lucimart/ChirpSyncer/issues)
- **Email**: support@chirpsyncer.com (managed hosting customers)

### Stay Updated
- **GitHub**: Star and watch the repository
- **Twitter**: [@ChirpSyncer](https://twitter.com/ChirpSyncer) (coming soon)
- **Bluesky**: [@chirpsyncer.bsky.social](https://bsky.app/profile/chirpsyncer.bsky.social) (coming soon)
- **Newsletter**: Monthly updates on features and tips (coming soon)

---

## 📜 License

ChirpSyncer is open source software licensed under the **MIT License**.

You are free to:
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Private use

See [LICENSE](https://github.com/lucimart/ChirpSyncer/blob/main/LICENSE) for full details.

---

## 🙏 Acknowledgments

ChirpSyncer is built on the shoulders of giants:

- **Flask** - Web framework
- **SQLite** - Embedded database
- **atproto** - Bluesky Python SDK
- **twscrape** - Twitter scraping library
- **APScheduler** - Task scheduling
- All our amazing contributors!

---

## 📊 Project Stats

- **422 Tests** - 100% passing
- **100% Coverage** - All code tested
- **7 Sprints** - Systematic development
- **28 Modules** - Clean architecture
- **15,000+ Lines** - Production-ready code
- **8 Components** - Modular design
- **2 Platforms** - Twitter & Bluesky

---

<div style="text-align: center; margin: 50px 0;">
  <h2>Ready to sync your social media?</h2>
  <div style="margin: 20px 0;">
    <a href="https://github.com/lucimart/ChirpSyncer" class="button" style="background: #333; color: white; padding: 15px 30px; margin: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      📚 View on GitHub
    </a>
    <a href="#quick-start" class="button" style="background: #1DA1F2; color: white; padding: 15px 30px; margin: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      🚀 Get Started Free
    </a>
  </div>
  <p style="color: #666; margin-top: 20px;">
    Self-host for free or let us manage it for $2/month
  </p>
</div>

---

<div style="text-align: center; color: #666; padding: 20px 0;">
  Made with ❤️ by the ChirpSyncer Team<br>
  © 2026 ChirpSyncer. MIT License.
</div>

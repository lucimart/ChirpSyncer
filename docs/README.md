# ChirpSyncer Documentation

Comprehensive documentation for ChirpSyncer - Cross-Platform Social Media Management.

## 📚 Table of Contents

### Getting Started
- [Quick Start](../README.md#quick-start) - Installation and first steps
- [Configuration Guide](../.env.example) - Environment variables and settings
- [Installation Options](../README.md#installation) - Docker, manual, and automated installation

### Deployment & Setup
- [NAS Deployment Guide](./NAS_DEPLOYMENT_GUIDE.md) - Deploy to Synology, QNAP, or TrueNAS
- [SMTP Setup Guide](./SMTP_SETUP_GUIDE.md) - Configure email notifications
- [Admin Setup Guide](./ADMIN_SETUP_GUIDE.md) - Initial admin configuration
- [Monitoring Guide](./MONITORING_GUIDE.md) - Monitor your ChirpSyncer instance
- [GitHub Setup Guide](./GITHUB_SETUP_GUIDE.md) - GitHub integration and CI/CD

### Architecture & Design
- [System Architecture](./architecture/ARCHITECTURE.md) - Complete system design and architecture
- [Sprint 7 Architecture Decisions](./architecture/decisions/SPRINT7_ARCHITECTURE_DECISIONS.md) - Key architectural decisions

### Technical Reference
- [API Documentation](./API.md) - Complete REST API reference
- [Database Schema](./DATABASE.md) - Database structure and relationships

### Development
- [Open Source Checklist](./development/OPEN_SOURCE_CHECKLIST.md) - Preparing for open source release
- [Restructure Summary](./development/RESTRUCTURE_SUMMARY.md) - Project restructuring details
- [GitHub Setup Summary](./development/GITHUB_SETUP_SUMMARY.md) - GitHub workflow setup

### Testing
- [E2E Implementation Summary](./testing/E2E_IMPLEMENTATION_SUMMARY.md) - End-to-end testing approach
- [E2E Setup Complete](./testing/E2E_SETUP_COMPLETE.md) - E2E test environment setup
- [Running E2E Tests](./testing/RUNNING_E2E_TESTS.md) - How to run end-to-end tests
- [Playwright E2E Tests](../tests/e2e/playwright/README.md) - Playwright test suite documentation

### Sprint Documentation
- [Implementation Roadmap](./sprints/IMPLEMENTATION_ROADMAP.md) - Overall project roadmap
- [Sprint Plans](./sprints/plans/) - Detailed plans for each sprint
  - [Sprint 2 Plan](./sprints/plans/SPRINT2_PLAN.md)
  - [Sprint 3 Plan](./sprints/plans/SPRINT3_PLAN.md)
  - [Sprint 4 Plan](./sprints/plans/SPRINT4_PLAN.md)
  - [Sprint 5 Plan](./sprints/plans/SPRINT5_PLAN.md)
  - [Sprint 6 Plan](./sprints/plans/SPRINT6_PLAN.md)
  - [Sprint 7 Plan](./sprints/plans/SPRINT7_PLAN.md)
  - [Cron System Plan](./sprints/plans/CRON_SYSTEM_PLAN.md)
- [Sprint Summaries](./sprints/summaries/) - Retrospectives and outcomes
  - [Sprint 6 Main Summary](./sprints/summaries/SPRINT6_MAIN_SUMMARY.md)
  - [Sprint 6 Cron Summary](./sprints/summaries/SPRINT6_CRON_SUMMARY.md)
  - [Sprint 7 Summary](./sprints/summaries/SPRINT7_SUMMARY.md)
  - [Sprint 7 Component Review](./sprints/summaries/SPRINT7_COMPONENT_REVIEW.md)
  - [Sprint 7 Fixes Summary](./sprints/summaries/SPRINT7_FIXES_SUMMARY.md)

### Contributing
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to ChirpSyncer
- [Code of Conduct](../CONTRIBUTING.md#code-of-conduct) - Community guidelines
- [Changelog](../CHANGELOG.md) - Project changelog

## 🎯 Quick Links by Role

### For Users
- ⚡ [Quick Start Guide](../README.md#quick-start)
- 🔧 [Configuration](../.env.example)
- 📊 [Monitoring](./MONITORING_GUIDE.md)
- 📧 [SMTP Setup](./SMTP_SETUP_GUIDE.md)

### For Administrators
- 👤 [Admin Setup](./ADMIN_SETUP_GUIDE.md)
- 🖥️ [NAS Deployment](./NAS_DEPLOYMENT_GUIDE.md)
- 📈 [Monitoring](./MONITORING_GUIDE.md)
- 🔐 [Security Best Practices](../CONTRIBUTING.md#security)

### For Developers
- 🏗️ [Architecture](./architecture/ARCHITECTURE.md)
- 🔌 [API Reference](./API.md)
- 💾 [Database Schema](./DATABASE.md)
- 🧪 [Testing Guide](./testing/RUNNING_E2E_TESTS.md)
- 🤝 [Contributing](../CONTRIBUTING.md)

### For DevOps
- 🐳 [Docker Deployment](../README.md#docker)
- 📦 [NAS Deployment](./NAS_DEPLOYMENT_GUIDE.md)
- 🔍 [Monitoring](./MONITORING_GUIDE.md)
- ⚙️ [CI/CD Setup](./development/GITHUB_SETUP_SUMMARY.md)

## 📖 Documentation Structure

```
docs/
├── README.md                          # This file - documentation index
├── index.md                           # Marketing homepage
├── _config.yml                        # Jekyll config for GitHub Pages
│
├── ADMIN_SETUP_GUIDE.md              # Admin configuration
├── API.md                             # REST API documentation
├── DATABASE.md                        # Database schema reference
├── GITHUB_SETUP_GUIDE.md             # GitHub integration
├── MONITORING_GUIDE.md               # Monitoring and observability
├── NAS_DEPLOYMENT_GUIDE.md           # NAS deployment instructions
├── SMTP_SETUP_GUIDE.md               # Email configuration
│
├── architecture/                      # Architecture documentation
│   ├── ARCHITECTURE.md               # System architecture
│   └── decisions/                    # Architecture Decision Records
│       └── SPRINT7_ARCHITECTURE_DECISIONS.md
│
├── development/                       # Development documentation
│   ├── GITHUB_SETUP_SUMMARY.md       # GitHub workflow setup
│   ├── OPEN_SOURCE_CHECKLIST.md      # Open source preparation
│   └── RESTRUCTURE_SUMMARY.md        # Project restructuring
│
├── testing/                           # Testing documentation
│   ├── E2E_IMPLEMENTATION_SUMMARY.md # E2E testing implementation
│   ├── E2E_SETUP_COMPLETE.md         # E2E environment setup
│   └── RUNNING_E2E_TESTS.md          # Running E2E tests
│
└── sprints/                           # Sprint documentation
    ├── IMPLEMENTATION_ROADMAP.md     # Overall roadmap
    ├── plans/                        # Sprint plans
    │   ├── CRON_SYSTEM_PLAN.md
    │   ├── SPRINT2_PLAN.md
    │   ├── SPRINT3_PLAN.md
    │   ├── SPRINT4_PLAN.md
    │   ├── SPRINT5_PLAN.md
    │   ├── SPRINT6_PLAN.md
    │   └── SPRINT7_PLAN.md
    └── summaries/                    # Sprint retrospectives
        ├── SPRINT6_CRON_SUMMARY.md
        ├── SPRINT6_MAIN_SUMMARY.md
        ├── SPRINT7_COMPONENT_REVIEW.md
        ├── SPRINT7_FIXES_SUMMARY.md
        └── SPRINT7_SUMMARY.md
```

## 🔍 Finding What You Need

### I want to...

**...get started quickly**
→ Start with the [Quick Start Guide](../README.md#quick-start)

**...deploy to my NAS**
→ Follow the [NAS Deployment Guide](./NAS_DEPLOYMENT_GUIDE.md)

**...understand the architecture**
→ Read the [System Architecture](./architecture/ARCHITECTURE.md)

**...use the API**
→ Check the [API Documentation](./API.md)

**...contribute code**
→ See the [Contributing Guide](../CONTRIBUTING.md)

**...run tests**
→ Follow the [Testing Guide](./testing/RUNNING_E2E_TESTS.md)

**...monitor my instance**
→ Use the [Monitoring Guide](./MONITORING_GUIDE.md)

**...configure email**
→ Follow the [SMTP Setup Guide](./SMTP_SETUP_GUIDE.md)

**...understand the database**
→ Study the [Database Schema](./DATABASE.md)

**...see the project history**
→ Read the [Sprint Documentation](./sprints/)

## 💡 Help & Support

- **Issues**: [GitHub Issues](https://github.com/lucimart/ChirpSyncer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lucimart/ChirpSyncer/discussions)
- **Security**: See [Security Policy](../.github/SECURITY.md)

---

**Need something else?** Check the main [README](../README.md) or [open an issue](https://github.com/lucimart/ChirpSyncer/issues/new).

# SCRIPTS

## OVERVIEW
Dev/startup, deployment, and migration tooling.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Dev start | scripts/dev-start.sh | Local orchestration
| Windows dev | scripts/dev-start.ps1 | PowerShell variant
| Deploy | scripts/deploy.sh | Backup + restart flow
| NAS deploy | scripts/deploy-to-nas.sh | rsync + remote setup
| Install | scripts/install.sh | Systemd + logrotate
| Migration | scripts/migrate_to_multi_user.py | Single-user -> multi-user

## CONVENTIONS
- Shell scripts use set -e and structured logging helpers.
- Deployment scripts assume .env is present and valid.

## ANTI-PATTERNS
- Avoid running migration scripts without backups.

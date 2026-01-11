# GitHub Repository Setup Guide

Complete guide for configuring your ChirpSyncer repository with security, automation, and quality controls.

## Table of Contents
1. [Branch Protection Rules](#branch-protection-rules)
2. [Repository Rulesets](#repository-rulesets)
3. [GitHub Actions](#github-actions)
4. [Dependabot Configuration](#dependabot-configuration)
5. [Security Settings](#security-settings)
6. [Webhooks (Optional)](#webhooks-optional)
7. [GitHub Features](#github-features)

---

## 1. Branch Protection Rules

### Configure Main Branch Protection

Go to: **Settings → Branches → Add branch protection rule**

#### Rule Configuration for `main` branch:

**Branch name pattern**: `main`

**Protect matching branches**:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners
  - ⬜ Require approval of the most recent reviewable push
  - ⬜ Require conversation resolution before merging

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks** (select these):
    - ✅ `Test (3.10)`
    - ✅ `Test (3.11)`
    - ✅ `Lint`
    - ✅ `Docker Build`
    - ✅ `CodeQL Security Scan / Analyze (python)`
    - ✅ `Bandit Security Scan`
    - ✅ `Safety Dependency Check`
    - ✅ `PR Quality Checks / code-quality`
    - ✅ `PR Quality Checks / test-coverage`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (recommended)

- ✅ **Require linear history** (prevents merge commits, keeps git history clean)

- ⬜ **Require merge queue** (optional, for high-traffic repos)

- ✅ **Require deployments to succeed before merging** (if using deployments)

- ⬜ **Lock branch** (only for archived/frozen branches)

- ✅ **Do not allow bypassing the above settings**
  - ⬜ Allow specified actors to bypass (only for emergency fixes by admins)

- ✅ **Restrict who can push to matching branches**
  - Add: Maintainers, Admins only

- ✅ **Allow force pushes**
  - ⬜ Everyone
  - ⬜ Specify who can force push

- ✅ **Allow deletions** ❌ (UNCHECK THIS - prevents accidental deletion)

**Save changes**

---

## 2. Repository Rulesets

Go to: **Settings → Rules → Rulesets → New ruleset → New branch ruleset**

### Ruleset 1: Protected Branches (Main & Release)

**Ruleset name**: `Protected Branches`

**Enforcement status**: **Active**

**Bypass list**:
- Repository admin (for emergency fixes only)

**Target branches**:
- Include default branch: ✅
- Add pattern: `release/*`

**Rules**:

**Branch protections**:
- ✅ Restrict deletions
- ✅ Require linear history
- ✅ Require deployments to succeed
- ✅ Require signed commits
- ✅ Require a pull request before merging
  - Required approvals: 1
  - Dismiss stale pull request approvals: ✅
  - Require review from Code Owners: ✅
- ✅ Require status checks to pass
  - Require branches to be up to date: ✅
  - Status checks: (same as branch protection)
- ✅ Block force pushes

**Metadata restrictions**:
- ✅ Require commit message to match pattern
  - Pattern: `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,100}`
  - Operator: Must match
  - Error message: "Commit must follow conventional commits format"

### Ruleset 2: Feature Branches

**Ruleset name**: `Feature Branches`

**Enforcement status**: **Active**

**Bypass list**: None

**Target branches**:
- Add pattern: `feature/*`
- Add pattern: `bugfix/*`
- Add pattern: `hotfix/*`

**Rules**:
- ✅ Require status checks to pass
  - All CI tests must pass
- ✅ Block force pushes
- ⬜ Restrict deletions (allow deletion after merge)

### Ruleset 3: Dependabot Branches

**Ruleset name**: `Dependabot Auto-merge`

**Enforcement status**: **Active**

**Target branches**:
- Add pattern: `dependabot/**`

**Rules**:
- ✅ Require status checks to pass (all tests)
- ✅ Allow auto-merge when tests pass
- ✅ Restrict deletions

---

## 3. GitHub Actions

### Enable Actions

Go to: **Settings → Actions → General**

**Actions permissions**:
- ✅ Allow all actions and reusable workflows

**Artifact and log retention**:
- **90 days** (default)

**Fork pull request workflows**:
- ✅ Require approval for first-time contributors
- ✅ Require approval for all outside collaborators

**Workflow permissions**:
- ⚪ Read repository contents and packages permissions
- ⚫ Read and write permissions (needed for some workflows)
- ✅ Allow GitHub Actions to create and approve pull requests

### Required Workflows

The following workflows are already configured in `.github/workflows/`:

1. **ci.yml** - Continuous Integration
   - Runs on: push to main, PRs
   - Tests: Python 3.10 & 3.11
   - Linting, Docker build, coverage

2. **codeql.yml** - Security Analysis (NEW)
   - Runs on: push to main, PRs, weekly schedule
   - Detects: Security vulnerabilities in Python/JavaScript

3. **security-scan.yml** - Additional Security (NEW)
   - Runs on: push to main, PRs, daily schedule
   - Tools: Bandit, Safety, Semgrep

4. **pr-checks.yml** - PR Quality Checks (NEW)
   - Runs on: PRs only
   - Checks: PR size, code quality, coverage, documentation

5. **deploy.yml** - Deployment
   - Runs on: workflow_dispatch, tags
   - Deploys to production

---

## 4. Dependabot Configuration

### Enable Dependabot

Go to: **Settings → Code security and analysis**

**Dependabot**:
- ✅ **Dependabot alerts** (free)
- ✅ **Dependabot security updates** (free)
- ✅ **Dependabot version updates** (free)

**Dependency graph**:
- ✅ Enable dependency graph

**Code scanning**:
- ✅ Enable CodeQL scanning

### Dependabot Configuration

Already configured in `.github/dependabot.yml`:
- ✅ Python dependencies (weekly)
- ✅ GitHub Actions (weekly)
- ✅ Docker (weekly)
- Auto-labels PRs
- Groups updates

### Dependabot Auto-merge

To auto-merge minor/patch updates:

```bash
# Install GitHub CLI
gh auth login

# Enable auto-merge for dependabot PRs
gh pr list --author "app/dependabot" --json number,title --jq '.[] | "\(.number) \(.title)"' | while read -r pr; do
  PR_NUMBER=$(echo $pr | awk '{print $1}')
  gh pr merge $PR_NUMBER --auto --squash
done
```

Or use GitHub Actions (add to `.github/workflows/dependabot-automerge.yml`):

```yaml
name: Dependabot Auto-merge
on: pull_request_target

permissions:
  pull-requests: write
  contents: write

jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Enable auto-merge for Dependabot PRs
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GH_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

---

## 5. Security Settings

Go to: **Settings → Code security and analysis**

### Enable All Security Features (Free for Public Repos)

**Private vulnerability reporting**:
- ✅ **Enable** (allows security researchers to privately report vulnerabilities)

**Dependency graph**:
- ✅ **Enable** (automatically enabled for public repos)

**Dependabot alerts**:
- ✅ **Enable**
- ✅ Alert for vulnerable dependencies

**Dependabot security updates**:
- ✅ **Enable**
- ✅ Auto-create PRs to fix vulnerabilities

**Code scanning**:
- ✅ **Set up CodeQL analysis** (use workflow from `.github/workflows/codeql.yml`)

**Secret scanning**:
- ✅ **Enable** (automatically scans for exposed secrets)
- ✅ Push protection (prevents pushing secrets)

**Security policy**:
- ✅ Already created in `.github/SECURITY.md`

### Additional Security Setup

**Secrets**:
- Go to **Settings → Secrets and variables → Actions**
- Add any required secrets (API keys, etc.)
- Never commit secrets to code!

**Code scanning alerts**:
- Configure notifications: **Settings → Notifications → Security alerts**
- ✅ Email notifications for security alerts

---

## 6. Webhooks (Optional)

Webhooks are useful for integrations with external services.

### Example: Slack Notifications

Go to: **Settings → Webhooks → Add webhook**

**Payload URL**: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`

**Content type**: `application/json`

**Events**:
- ✅ Pull requests
- ✅ Pull request reviews
- ✅ Issues
- ✅ Releases
- ✅ Workflow runs

### Example: Discord Notifications

Similar setup with Discord webhook URL.

### Example: Custom CI/CD

If you have custom deployment infrastructure:

**Payload URL**: `https://your-ci-server.com/webhook`

**Events**:
- ✅ Push
- ✅ Releases
- ✅ Workflow runs

**Note**: Webhooks are optional. GitHub Actions usually suffice for most automation needs.

---

## 7. GitHub Features

Go to: **Settings → General**

### Features to Enable

**Features**:
- ✅ **Wikis** (optional - for extensive documentation)
- ✅ **Issues** (bug tracking, feature requests)
- ✅ **Sponsorships** (if you want to accept sponsors)
- ✅ **Preserve this repository** (archive important repos)
- ✅ **Discussions** ⭐ (community Q&A, announcements)
- ✅ **Projects** (kanban boards for project management)

**Pull Requests**:
- ✅ Allow merge commits
- ✅ Allow squash merging ⭐ (recommended for clean history)
- ✅ Allow rebase merging
- ✅ Always suggest updating pull request branches
- ✅ Allow auto-merge
- ✅ Automatically delete head branches ⭐ (cleanup after merge)

**Archives**:
- ⬜ Include Git LFS objects in archives (only if using LFS)

**Pushes**:
- ⬜ Limit how many branches and tags can be updated in a single push (optional)

---

## 8. GitHub Copilot & AI Features

### Copilot (Paid Features)

**GitHub Copilot** requires a paid subscription:
- Individual: $10/month
- Business: $19/user/month
- Enterprise: $39/user/month

**Free alternatives** already configured:
- ✅ CodeQL (free security scanning)
- ✅ Dependabot (free dependency updates)
- ✅ GitHub Actions (2,000 minutes/month free)

### Code Review Automation (Free)

Instead of paid Copilot code review, use:

1. **CodeQL** - Security-focused code review (configured)
2. **CODEOWNERS** - Automatic reviewer assignment (configured)
3. **PR Templates** - Standardized PR descriptions (configured)
4. **Required Status Checks** - Automated quality gates (configured)

### Recommended VS Code Extensions (Free)

For contributors:
- **Pylint** - Python linting
- **Black Formatter** - Code formatting
- **isort** - Import sorting
- **GitLens** - Git superpowers
- **Better Comments** - Highlight TODOs

---

## 9. Repository Topics

Go to: **Repository main page → ⚙️ Settings icon (top right)**

**Add topics** (improves discoverability):
```
twitter, bluesky, social-media, automation, scheduler, analytics,
self-hosted, python, flask, sqlite, cross-posting, multi-platform,
tweet-scheduler, social-media-management, twitter-bot, bluesky-bot
```

---

## 10. Social Preview

Go to: **Settings → General → Social preview**

**Upload an image** (1280x640px recommended):
- Use ChirpSyncer logo or banner
- Displays when sharing on social media

---

## 11. Repository Insights

Go to: **Insights tab**

**Recommended settings**:
- ✅ Community standards: 100% completion
  - ✅ Description
  - ✅ README
  - ✅ Code of conduct (optional)
  - ✅ Contributing guide
  - ✅ License
  - ✅ Issue templates
  - ✅ Pull request template
  - ✅ Security policy

---

## 12. Quick Setup Checklist

After pushing all the new files, configure these via GitHub UI:

### Immediate (Required)
- [ ] Enable branch protection for `main`
- [ ] Enable Dependabot alerts & security updates
- [ ] Enable CodeQL scanning
- [ ] Enable secret scanning
- [ ] Enable Discussions

### Recommended
- [ ] Configure repository rulesets
- [ ] Set up CODEOWNERS auto-assignment
- [ ] Add repository topics
- [ ] Upload social preview image
- [ ] Enable auto-delete head branches

### Optional
- [ ] Set up webhooks (Slack, Discord, etc.)
- [ ] Enable GitHub Projects (for roadmap tracking)
- [ ] Configure GitHub Wiki
- [ ] Set up GitHub Sponsors

---

## 13. Testing the Setup

### Test Branch Protection
```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" >> README.md
git commit -am "test"
git push origin main  # Should be rejected

# Use PR workflow instead
git checkout -b test-branch
echo "test" >> README.md
git commit -am "test: branch protection"
git push origin test-branch
# Create PR via GitHub UI
```

### Test Dependabot
- Wait for Monday 9 AM UTC
- Check for automatic dependency update PRs
- Review and merge

### Test CodeQL
- Push changes to trigger scan
- Check **Security → Code scanning alerts**
- Should show 0 vulnerabilities

### Test PR Checks
- Create a PR
- Verify all status checks run:
  - Tests (3.10, 3.11)
  - Linting
  - CodeQL
  - Bandit
  - Safety
  - PR quality checks
  - Coverage check

---

## 14. Maintenance

### Weekly
- [ ] Review Dependabot PRs
- [ ] Check security alerts
- [ ] Review failed CI runs

### Monthly
- [ ] Review CodeQL reports
- [ ] Update branch protection rules if needed
- [ ] Review and close stale issues

### Quarterly
- [ ] Security audit
- [ ] Review and update SECURITY.md
- [ ] Update contributor guidelines

---

## Support

Questions about setup?
- **GitHub Discussions**: https://github.com/lucimart/ChirpSyncer/discussions
- **Documentation**: https://lucimart.github.io/ChirpSyncer/

---

**Setup complete! Your repository is now production-ready with enterprise-grade security and automation.** 🎉

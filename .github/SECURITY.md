# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

**Note**: We always recommend using the latest version from the `main` branch for the most up-to-date security fixes.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Private Disclosure

Report vulnerabilities privately through GitHub Security Advisories:

1. Go to https://github.com/lucimart/ChirpSyncer/security/advisories/new
2. Fill in the details of the vulnerability
3. Click "Submit report"

Alternatively, email security concerns to: **security@chirpsyncer.com** (coming soon)

### 2. Information to Include

Please include as much of the following information as possible:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Location** of the affected source code (file path and line numbers)
- **Step-by-step instructions** to reproduce the vulnerability
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the vulnerability (what an attacker could do)
- **Suggested fix** (if you have one)

### 3. Response Timeline

- **Within 24 hours**: We'll acknowledge receipt of your vulnerability report
- **Within 7 days**: We'll provide a detailed response including:
  - Assessment of the vulnerability
  - Expected timeline for a fix
  - Any additional information we need from you
- **Within 30 days**: We aim to release a fix for confirmed vulnerabilities

### 4. Disclosure Policy

- We ask that you **do not publicly disclose** the vulnerability until we've had a chance to address it
- Once fixed, we'll:
  - Credit you in the security advisory (unless you prefer to remain anonymous)
  - Publish a security advisory on GitHub
  - Release a new version with the fix
- We coordinate public disclosure timing with you

## Security Best Practices

### For Self-Hosted Users

1. **Keep ChirpSyncer Updated**
   ```bash
   cd /opt/chirpsyncer
   git pull origin main
   pip install -r requirements.txt --upgrade
   systemctl restart chirpsyncer
   ```

2. **Secure Your Environment**
   - Never commit `.env` file to version control
   - Use strong `SECRET_KEY` (32+ characters, generated randomly)
   - Use strong admin passwords (20+ characters)
   - Restrict `.env` file permissions: `chmod 600 .env`

3. **Database Security**
   - Restrict database file permissions: `chmod 600 chirpsyncer.db`
   - Enable SQLite encryption if handling sensitive data
   - Regular backups with encryption

4. **Network Security**
   - Use HTTPS (not HTTP) for web dashboard
   - Use firewall to restrict access to port 5000
   - Consider VPN for remote access instead of port forwarding

5. **SMTP Security**
   - Use app-specific passwords (not main account password)
   - Use TLS/SSL for SMTP connections (port 587 or 465)
   - Restrict SMTP credentials to read-only access if possible

### For Managed Hosting Users

Our managed hosting includes:
- ✅ Automatic security updates
- ✅ Encrypted backups
- ✅ SSL/TLS encryption
- ✅ Regular security scans
- ✅ Isolated instances
- ✅ Firewall protection

## Known Security Considerations

### Credential Storage
- Twitter/Bluesky credentials are encrypted at rest using AES-256
- Encryption key stored in `SECRET_KEY` environment variable
- **Critical**: Never share or commit your `SECRET_KEY`

### Session Management
- Sessions expire after inactivity
- CSRF protection enabled for all forms
- Secure session cookies (HTTPOnly, SameSite)

### SQL Injection Protection
- All queries use parameterized statements
- No string concatenation in SQL queries
- ORM-style query building where appropriate

### Input Validation
- All user inputs validated before processing
- XSS protection via template auto-escaping
- File upload restrictions (if applicable)

### API Rate Limiting
- Built-in rate limiting for external APIs
- Respects Twitter/Bluesky API limits
- Prevents abuse of web dashboard

## Security Audits

We perform regular security audits:

- **Automated**: CodeQL, Bandit, Safety (daily)
- **Dependency Scanning**: Dependabot (weekly)
- **Manual Reviews**: Security-focused code reviews on all PRs

### Recent Audits

| Date       | Type      | Findings | Status   |
|------------|-----------|----------|----------|
| 2026-01-11 | CodeQL    | 0        | ✅ Clean |
| 2026-01-11 | Bandit    | 0        | ✅ Clean |
| 2026-01-11 | Safety    | 0        | ✅ Clean |

## Security Contact

- **GitHub**: https://github.com/lucimart/ChirpSyncer/security/advisories/new
- **Email**: security@chirpsyncer.com (coming soon)
- **PGP Key**: Coming soon

## Hall of Fame

We appreciate security researchers who responsibly disclose vulnerabilities:

<!-- Contributors will be listed here -->

*Be the first to contribute to our security!*

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://www.sans.org/top25-software-errors/)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security_warnings.html)

---

**Thank you for helping keep ChirpSyncer secure!**

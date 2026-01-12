# CodeQL Configuration

This directory contains CodeQL configuration and documentation for security analysis.

## Suppressed Security Warnings

### 1. Clear-text logging of sensitive information (py/clear-text-logging-sensitive-data)

**Status:** ⚠️ **SUPPRESSED** (intentional design decision)

**Why this warning appears:**
During initial application setup or database migration, we generate a random admin password and display it to the user via terminal output (stdout). CodeQL flags this as "clear-text logging" of sensitive information.

**Why this is necessary:**
- **Initial setup scenario**: No admin account exists, so we must communicate the password somehow
- **User needs the password**: Without seeing it, they cannot log in to the application
- **No better alternative**: File storage triggers different warnings, email requires configuration, etc.

**Security measures in place:**
- ✅ **Password displayed once** - Only shown during initial setup, never logged to files
- ✅ **Strong randomization** - 16-character password using `secrets` module
- ✅ **Immediate hashing** - Password is immediately bcrypt-hashed before database storage
- ✅ **Clear warnings** - User sees prominent warnings to save the password
- ✅ **Environment override** - User can set ADMIN_PASSWORD in .env to avoid generation

**Why suppression is appropriate:**
This is not a security vulnerability - it's the intended functionality. The password MUST be communicated to the user during initial setup. The alternatives would be:
1. ❌ **Don't generate password** - Breaks setup automation
2. ❌ **Write to file** - Triggers py/clear-text-storage-sensitive-data warning
3. ❌ **Email it** - Requires email configuration during setup
4. ✅ **Display in terminal** - Current approach, suppressed via config

**Suppression configuration:**
- File: `.github/codeql-config.yml`
- Applies to: `app/main.py`, `scripts/migrate_to_multi_user.py`
- Query ID: `py/clear-text-logging-sensitive-data`

**Affected locations:**
- `app/main.py:307` - Initial admin password display
- `scripts/migrate_to_multi_user.py:74` - Migration admin password display

## CodeQL Configuration

### Suppression Strategy

We use a **configuration-based suppression** approach via `.github/codeql-config.yml`:

**Configuration file:** `.github/codeql-config.yml`
```yaml
query-filters:
  - exclude:
      id: py/clear-text-logging-sensitive-data
      paths:
        - app/main.py
        - scripts/migrate_to_multi_user.py
```

**Workflow integration:** `.github/workflows/codeql.yml`
```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    config-file: ./.github/codeql-config.yml
```

### Why Configuration-Based Suppression?

CodeQL suppression options:

1. **Global rule suppression** - Would disable check for entire codebase ❌
2. **File exclusion** - Would disable all checks for the file ❌
3. **Inline comments** - Not fully supported by CodeQL ⚠️
4. **Configuration file** - Our approach ✅ **RECOMMENDED**
5. **Documentation only** - Warnings still appear ❌

The configuration-based approach allows us to:
- Suppress specific query IDs (not all security checks)
- Limit suppression to specific files only
- Maintain security scanning for the rest of the codebase
- Document suppressions in version control

We've chosen to document and accept these warnings rather than compromise security checking for the rest of the codebase.

## References

- [CodeQL Python Queries](https://codeql.github.com/codeql-query-help/python/)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

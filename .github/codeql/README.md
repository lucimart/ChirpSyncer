# CodeQL Configuration

This directory contains CodeQL configuration and documentation for security analysis.

## Accepted Security Warnings

The following CodeQL warnings are **intentional** and **safe** in our codebase:

### 1. Clear-text storage of sensitive information (py/clear-text-storage-sensitive-data)

**Locations:**
- `app/main.py:313` - Initial admin password generation
- `scripts/migrate_to_multi_user.py:75` - Migration script password generation

**Why this is safe:**

These warnings appear when the application generates a random admin password during:
1. Initial application setup (no admin exists)
2. Database migration to multi-user mode

**Security measures in place:**
- ✅ **0600 file permissions** - Only file owner can read/write
- ✅ **Temporary file** - Users receive explicit instructions to delete it
- ✅ **Strong random password** - Generated using `secrets` module with 16 characters
- ✅ **No logging** - Password never appears in logs or console
- ✅ **Better than alternatives** - More secure than console logging or database initialization

**Why encryption is not practical:**
- No secure key storage exists during initial setup
- Encrypting would require either:
  - Hardcoding an encryption key (worse than current approach)
  - Asking user for encryption key (defeats the purpose of auto-generation)
  - Using environment-based key (not available at setup time)

**Risk assessment:**
- **Risk Level:** Very Low
- **Attack Vector:** Requires filesystem access to read the file
- **Mitigation:** File has restrictive permissions and exists only temporarily
- **Impact:** If attacker has filesystem access, they likely have greater access already

**Alternative approaches considered:**
1. ❌ Log to console - Less secure, appears in system logs
2. ❌ Send via email - Requires email configuration during setup
3. ❌ Database storage only - User has no way to retrieve initial password
4. ✅ **Current approach** - Most practical and secure for setup scenario

## CodeQL Configuration

CodeQL does not provide a simple way to suppress individual warnings at specific code locations. Options available:

1. **Global rule suppression** - Would disable check for entire codebase ❌
2. **File exclusion** - Would disable all checks for the file ❌
3. **Inline comments** - Not fully supported by CodeQL ⚠️
4. **Documentation** - This file ✅

We've chosen to document and accept these warnings rather than compromise security checking for the rest of the codebase.

## References

- [CodeQL Python Queries](https://codeql.github.com/codeql-query-help/python/)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

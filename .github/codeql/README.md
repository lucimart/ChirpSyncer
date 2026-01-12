# CodeQL Configuration

This directory contains CodeQL configuration and documentation for security analysis.

## Resolved Security Issues

### 1. Clear-text storage of sensitive information (py/clear-text-storage-sensitive-data)

**Status:** ✅ **RESOLVED** (as of commit a41a0f5)

**Previous Issue:**
The application previously wrote generated admin passwords to a temporary file (`.admin_password_GENERATED.txt`) with 0600 permissions, which triggered CodeQL warnings about clear-text password storage.

**Solution Implemented:**
Changed password delivery method to display passwords directly in terminal/console output instead of writing to files.

**Current Approach:**
- Passwords are displayed in terminal with clear visual warnings
- No file storage = no clear-text storage on disk
- User must copy password immediately from terminal
- More secure: password never touches filesystem

**Benefits:**
- ✅ **Eliminates CodeQL warnings** - No clear-text file storage
- ✅ **More secure** - Password never written to disk
- ✅ **Simpler** - No temporary files to clean up
- ✅ **Better UX** - Immediate visibility, no file management

**Locations Changed:**
- `app/main.py:302-319` - Initial admin password generation
- `scripts/migrate_to_multi_user.py:68-79` - Migration script password generation

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

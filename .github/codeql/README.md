# CodeQL Configuration

This directory contains CodeQL configuration and documentation for security analysis.

## Resolved Security Issues

### 1. Clear-text logging/storage of sensitive information

**Status:** ✅ **RESOLVED** (as of latest commit)

**Previous Issues:**
The application previously had two approaches that triggered CodeQL warnings:
1. **File storage** - Writing generated passwords to `.admin_password_GENERATED.txt` file
2. **Console logging** - Printing generated passwords to stdout/terminal

Both approaches triggered CodeQL warnings about clear-text handling of sensitive data.

**Solution Implemented:**
Changed password handling to use **interactive password entry** with `getpass`:

**New Approach:**
- If `ADMIN_PASSWORD` is set in `.env`, use it (no prompting)
- If not set, prompt user to enter password interactively using `getpass.getpass()`
- Password input is hidden (no echo to terminal)
- Password is validated (min 8 characters, confirmation match)
- Password is never printed, logged, or written to files

**Benefits:**
- ✅ **Eliminates all CodeQL warnings** - No clear-text logging or storage
- ✅ **More secure** - Password never visible on screen or in files
- ✅ **Better UX** - Standard interactive password entry
- ✅ **User control** - Users choose their own password
- ✅ **Industry standard** - Same pattern used by mysql, postgresql, etc.

**Files Modified:**
- `app/main.py:294-324` - Interactive password entry for initial setup
- `scripts/migrate_to_multi_user.py:60-88` - Interactive password entry for migration

**Implementation:**
```python
import getpass

while True:
    admin_password = getpass.getpass("Enter admin password: ")
    if not admin_password:
        print("❌ Password cannot be empty. Please try again.\n")
        continue

    password_confirm = getpass.getpass("Confirm admin password: ")
    if admin_password != password_confirm:
        print("❌ Passwords do not match. Please try again.\n")
        continue

    if len(admin_password) < 8:
        print("❌ Password must be at least 8 characters. Please try again.\n")
        continue

    break
```

**No Configuration Files Needed:**
Since the password is never logged or stored in clear-text, no CodeQL suppressions or special configurations are required.

## References

- [Python getpass Module](https://docs.python.org/3/library/getpass.html)
- [CodeQL Python Queries](https://codeql.github.com/codeql-query-help/python/)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/data/definitions/532.html)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

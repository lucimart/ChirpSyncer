# ChirpSyncer Admin User Setup Guide

Complete guide for creating and managing admin users in ChirpSyncer.

## Table of Contents
1. [First-Time Admin Setup](#first-time-admin-setup)
2. [Creating Additional Admins](#creating-additional-admins)
3. [Managing Users via CLI](#managing-users-via-cli)
4. [Managing Users via Dashboard](#managing-users-via-dashboard)
5. [Password Management](#password-management)
6. [Troubleshooting](#troubleshooting)

---

## First-Time Admin Setup

### Method 1: Automatic Creation (Recommended)

The easiest way is to configure admin credentials in `.env` before starting the service for the first time.

**Step 1: Edit .env**

```bash
sudo nano /opt/chirpsyncer/.env
```

Add these lines:
```bash
# Multi-user mode
MULTI_USER_ENABLED=true

# Secret key for encryption (GENERATE NEW ONE!)
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Admin credentials (will be created on first run)
ADMIN_EMAIL=admin@chirpsyncer.local
ADMIN_PASSWORD=YourStrongPassword123!
```

**Step 2: Generate Secure Credentials**

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate ADMIN_PASSWORD
python3 -c "import secrets; import string; chars=string.ascii_letters+string.digits+'!@#$%^&*'; print('ADMIN_PASSWORD=' + ''.join(secrets.choice(chars) for _ in range(20)))"
```

Copy the output to your `.env` file.

**Step 3: Start Service**

```bash
sudo systemctl start chirpsyncer
```

**Step 4: Verify Admin Created**

Check logs:
```bash
journalctl -u chirpsyncer | grep -i "admin user"
```

Should show:
```
Created admin user: admin@chirpsyncer.local
```

**Step 5: Login**

Access dashboard: `http://your-nas-ip:5000`

```
Email: admin@chirpsyncer.local
Password: YourStrongPassword123!
```

---

### Method 2: Manual Creation via Python

If the service is already running or you skipped automatic creation:

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/chirpsyncer')

from app.user_manager import UserManager
from getpass import getpass

# Initialize UserManager
um = UserManager()

# Get admin details
print("Create Admin User")
print("=================")

username = input("Username (default: admin): ").strip() or "admin"
email = input("Email (default: admin@chirpsyncer.local): ").strip() or "admin@chirpsyncer.local"
password = getpass("Password: ")
password_confirm = getpass("Confirm password: ")

if password != password_confirm:
    print("❌ Passwords don't match!")
    sys.exit(1)

if len(password) < 8:
    print("❌ Password must be at least 8 characters!")
    sys.exit(1)

# Create admin user
try:
    user_id = um.create_user(
        username=username,
        email=email,
        password=password,
        role="admin"
    )
    print(f"✅ Admin user created successfully!")
    print(f"   User ID: {user_id}")
    print(f"   Username: {username}")
    print(f"   Email: {email}")
    print(f"   Role: admin")
except Exception as e:
    print(f"❌ Failed to create admin user: {e}")
    sys.exit(1)
EOF
```

---

### Method 3: Quick One-Liner

Create admin with predefined credentials:

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from app.user_manager import UserManager

um = UserManager()
user_id = um.create_user(
    username="admin",
    email="admin@chirpsyncer.local",
    password="ChangeMe123!",
    role="admin"
)
print(f"✅ Admin created (ID: {user_id}). Login: admin@chirpsyncer.local / ChangeMe123!")
EOF
```

**⚠️ Security Warning:** Change the password immediately after first login!

---

## Creating Additional Admins

### Via Dashboard (Recommended)

1. Login as existing admin
2. Go to **Users** → **Add User**
3. Fill in details:
   - Username: `alice`
   - Email: `alice@example.com`
   - Password: (auto-generated or custom)
   - Role: **Admin**
4. Click **Create User**
5. Send credentials to new admin

### Via CLI

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from app.user_manager import UserManager

um = UserManager()

# Create second admin
user_id = um.create_user(
    username="alice",
    email="alice@example.com",
    password="SecurePassword456!",
    role="admin"
)

print(f"✅ Additional admin created: alice@example.com (ID: {user_id})")
EOF
```

---

## Managing Users via CLI

### List All Users

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
import sqlite3
sys.path.insert(0, '/opt/chirpsyncer')
from app.config import DB_PATH

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, username, email, role, created_at
    FROM users
    ORDER BY created_at
""")

print("ID | Username | Email | Role | Created")
print("-" * 70)

for row in cursor.fetchall():
    print(f"{row[0]:2d} | {row[1]:15s} | {row[2]:25s} | {row[3]:5s} | {row[4]}")

conn.close()
EOF
```

### Check Admin Users

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
import sqlite3
sys.path.insert(0, '/opt/chirpsyncer')
from app.config import DB_PATH

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT username, email FROM users WHERE role = 'admin'")
admins = cursor.fetchall()

print(f"Total Admins: {len(admins)}")
for username, email in admins:
    print(f"  - {username} ({email})")

conn.close()
EOF
```

### Delete User

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from app.user_manager import UserManager

um = UserManager()

# Get user ID to delete
user_id = int(input("Enter user ID to delete: "))

# Confirm
print(f"⚠️  WARNING: This will permanently delete user ID {user_id}")
confirm = input("Type 'DELETE' to confirm: ")

if confirm == "DELETE":
    um.delete_user(user_id)
    print(f"✅ User {user_id} deleted")
else:
    print("❌ Cancelled")
EOF
```

### Change User Role

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
import sqlite3
sys.path.insert(0, '/opt/chirpsyncer')
from app.config import DB_PATH

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Promote user to admin
user_id = int(input("Enter user ID to promote to admin: "))

cursor.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user_id,))
conn.commit()

if cursor.rowcount > 0:
    print(f"✅ User {user_id} is now an admin")
else:
    print(f"❌ User {user_id} not found")

conn.close()
EOF
```

---

## Managing Users via Dashboard

### Access User Management

1. Login as admin
2. Navigate to **Users** in the sidebar
3. View all users with:
   - Username
   - Email
   - Role (admin/user)
   - Created date
   - Last login

### Create New User

1. Click **Add User** button
2. Fill in form:
   ```
   Username: john_doe
   Email: john@example.com
   Password: (auto-generated)
   Role: user
   ```
3. Click **Create**
4. Copy the auto-generated password
5. Send credentials to user securely

### Edit User

1. Click user row in table
2. Modify details:
   - Username
   - Email
   - Role
3. Save changes

### Reset User Password

1. Go to user detail page
2. Click **Reset Password**
3. New password is generated
4. Copy and send to user

### Delete User

1. Go to user detail page
2. Click **Delete User**
3. Confirm deletion
4. User and all associated data removed

---

## Password Management

### Password Requirements

ChirpSyncer enforces:
- Minimum 8 characters
- At least one letter
- At least one number
- At least one special character (recommended)

### Generate Secure Passwords

```bash
# Generate strong password
python3 << 'EOF'
import secrets
import string

# 20 characters with letters, digits, and symbols
chars = string.ascii_letters + string.digits + '!@#$%^&*'
password = ''.join(secrets.choice(chars) for _ in range(20))
print(f"Generated password: {password}")
EOF
```

### Change Admin Password (CLI)

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/chirpsyncer')
from app.user_manager import UserManager
from getpass import getpass

um = UserManager()

# Get user
email = input("Admin email: ")
new_password = getpass("New password: ")
confirm_password = getpass("Confirm password: ")

if new_password != confirm_password:
    print("❌ Passwords don't match!")
    sys.exit(1)

# Get user ID
import sqlite3
from app.config import DB_PATH
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
row = cursor.fetchone()

if not row:
    print(f"❌ User not found: {email}")
    sys.exit(1)

user_id = row[0]

# Update password
um.update_user(user_id, password=new_password)
print(f"✅ Password updated for {email}")

conn.close()
EOF
```

### Change Password via Dashboard

1. Login as admin
2. Go to **Settings** → **Account**
3. Click **Change Password**
4. Enter current password
5. Enter new password (twice)
6. Save changes

### Reset Forgotten Admin Password

If you're locked out:

```bash
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sys
import sqlite3
sys.path.insert(0, '/opt/chirpsyncer')
from app.config import DB_PATH
from werkzeug.security import generate_password_hash

# New password
NEW_PASSWORD = "TempPassword123!"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Reset first admin user's password
hashed = generate_password_hash(NEW_PASSWORD)
cursor.execute("""
    UPDATE users
    SET password_hash = ?
    WHERE role = 'admin'
    ORDER BY id LIMIT 1
""", (hashed,))

conn.commit()

if cursor.rowcount > 0:
    print(f"✅ Admin password reset to: {NEW_PASSWORD}")
    print("⚠️  Change this password immediately after logging in!")
else:
    print("❌ No admin users found")

conn.close()
EOF
```

---

## User Roles & Permissions

### Admin Role

**Can:**
- Create/edit/delete users
- View all users' data
- Manage system settings
- Configure scheduled tasks
- View audit logs
- Manage credentials for all users
- Access all reports and analytics

### User Role

**Can:**
- Manage own credentials
- Schedule tweets
- Create cleanup rules
- Search and save tweets
- Generate personal reports
- View own analytics

**Cannot:**
- Create other users
- View other users' data
- Access system settings
- View audit logs

---

## Best Practices

### 1. Dedicated Admin Account

Create a dedicated admin account, don't use for daily operations:

```bash
# Admin account (rarely used)
admin@chirpsyncer.local

# Personal user account (daily use)
yourname@example.com
```

### 2. Strong Passwords

Use password manager to generate:
```
Minimum 20 characters
Mix of uppercase, lowercase, numbers, symbols
Example: kP9#mL2$xR4@nZ7!qW8&
```

### 3. Regular Password Rotation

Change admin passwords every 90 days:
```bash
# Set reminder
echo "0 0 1 */3 * echo 'Rotate admin password' | mail -s 'Security Reminder' admin@example.com" | crontab -
```

### 4. Audit Logging

Monitor admin actions:
```bash
# View recent admin actions
journalctl -u chirpsyncer | grep "admin" | tail -20
```

### 5. Backup Admin Access

Always have 2+ admin accounts in case one is locked:
```bash
# Create backup admin
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
from app.user_manager import UserManager
um = UserManager()
um.create_user("backup_admin", "backup@chirpsyncer.local", "BackupPass123!", "admin")
print("✅ Backup admin created")
EOF
```

---

## Troubleshooting

### Can't Login as Admin

**Issue:** "Invalid credentials"

**Solutions:**

1. Check credentials:
   ```bash
   # View admin users
   sudo -u chirpsyncer sqlite3 /opt/chirpsyncer/chirpsyncer.db \
     "SELECT username, email FROM users WHERE role='admin';"
   ```

2. Reset password (see above section)

3. Check if multi-user mode is enabled:
   ```bash
   grep MULTI_USER_ENABLED /opt/chirpsyncer/.env
   ```
   Should be: `MULTI_USER_ENABLED=true`

### Admin User Not Created

**Issue:** No admin user exists

**Solution:**

1. Check logs:
   ```bash
   journalctl -u chirpsyncer | grep -i "admin\|user"
   ```

2. Manually create:
   ```bash
   sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
   from app.user_manager import UserManager
   um = UserManager()
   um.create_user("admin", "admin@chirpsyncer.local", "Admin123!", "admin")
   print("✅ Admin created manually")
   EOF
   ```

### Multiple Admin Accounts

**Issue:** Too many admins, need to audit

**Solution:**

```bash
# List all admins
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sqlite3
from app.config import DB_PATH
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT id, username, email, created_at FROM users WHERE role='admin'")
for row in cursor.fetchall():
    print(f"ID {row[0]}: {row[1]} ({row[2]}) - Created: {row[3]}")
conn.close()
EOF

# Demote user to regular user (if needed)
sudo -u chirpsyncer /opt/chirpsyncer/venv/bin/python3 << 'EOF'
import sqlite3
from app.config import DB_PATH
user_id = int(input("Demote user ID: "))
conn = sqlite3.connect(DB_PATH)
conn.execute("UPDATE users SET role='user' WHERE id=?", (user_id,))
conn.commit()
print(f"✅ User {user_id} demoted to regular user")
EOF
```

---

## Security Checklist

Before going to production:

- [ ] Admin password is strong (20+ characters)
- [ ] SECRET_KEY is generated and secured
- [ ] .env file has restricted permissions (600)
- [ ] Backup admin account created
- [ ] Changed default passwords
- [ ] Tested login functionality
- [ ] Verified admin can create users
- [ ] Verified regular users can't access admin functions
- [ ] Audit logging enabled
- [ ] Password rotation schedule set

---

## Support

For user management issues:
- GitHub Issues: https://github.com/lucimart/ChirpSyncer/issues

---

**Admin Setup Complete! 👤**

You can now manage ChirpSyncer users and permissions.

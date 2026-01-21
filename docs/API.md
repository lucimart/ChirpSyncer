# ChirpSyncer API Documentation

**Version:** 1.0
**Last Updated:** 2026-01-12

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
   - [UserManager](#usermanager)
   - [CredentialManager](#credentialmanager)
   - [Security Utilities](#security-utilities)
   - [Auth Decorators](#auth-decorators)
3. [Analytics & Metrics](#analytics--metrics)
   - [AnalyticsTracker](#analyticstracker)
   - [ReportGenerator](#reportgenerator)
4. [Content Management](#content-management)
   - [TweetScheduler](#tweetscheduler)
   - [CleanupEngine](#cleanupengine)
   - [SavedContentManager](#savedcontentmanager)
   - [SearchEngine](#searchengine)
5. [Platform Integrations](#platform-integrations)
   - [Twitter Integration](#twitter-integration)
   - [Bluesky Integration](#bluesky-integration)
   - [Media Handler](#media-handler)
6. [Web Dashboard](#web-dashboard)
   - [Authentication Routes](#authentication-routes)
   - [User Management Routes](#user-management-routes)
   - [Credential Management Routes](#credential-management-routes)
   - [Analytics Routes](#analytics-routes)
   - [Task Management Routes](#task-management-routes)
7. [Core Utilities](#core-utilities)
   - [Database Handler](#database-handler)
   - [Utils](#utils)
   - [Logger](#logger)
   - [Configuration](#configuration)
8. [Maintenance Tasks](#maintenance-tasks)
9. [Common Workflows](#common-workflows)

---

## Overview

ChirpSyncer is a comprehensive Twitter/Bluesky synchronization and management platform. This API documentation covers all public APIs, classes, and functions across the entire codebase.

**Key Features:**
- Multi-user authentication and authorization
- Encrypted credential storage (AES-256-GCM)
- Analytics tracking with time-series data
- Automated tweet scheduling and cleanup
- Full-text search with SQLite FTS5
- Report generation (CSV, JSON, HTML, PDF)
- Web dashboard with Flask
- Bidirectional Twitter ↔ Bluesky sync

---

## Authentication & Authorization

### UserManager

**Location:** `app/auth/user_manager.py`

Manages user accounts with bcrypt authentication, session management, and CRUD operations.

#### Class: `UserManager`

```python
from app.auth.user_manager import UserManager

user_manager = UserManager(db_path='chirpsyncer.db')
```

##### `__init__(db_path: str = 'chirpsyncer.db')`

Initialize UserManager.

**Parameters:**
- `db_path` (str): Path to SQLite database. Default: `'chirpsyncer.db'`

**Example:**
```python
user_manager = UserManager('/path/to/database.db')
```

##### `init_db()`

Initialize database tables for users and sessions.

**Returns:** None

**Tables Created:**
- `users`: User accounts with bcrypt password hashes
- `user_sessions`: Active user sessions with tokens

**Example:**
```python
user_manager.init_db()
```

##### `create_user(username: str, email: str, password: str, is_admin: bool = False) -> int`

Create a new user with hashed password.

**Parameters:**
- `username` (str): Unique username
- `email` (str): Unique email address
- `password` (str): Plain text password (will be hashed with bcrypt)
- `is_admin` (bool): Whether user should be admin. Default: `False`

**Returns:**
- `int`: User ID of created user

**Raises:**
- `ValueError`: If username/email already exists or password is weak

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

**Example:**
```python
try:
    user_id = user_manager.create_user(
        username='john_doe',
        email='john@example.com',
        password='SecureP@ss123',
        is_admin=False
    )
    print(f"Created user with ID: {user_id}")
except ValueError as e:
    print(f"Error: {e}")
```

**See also:** [`validate_password()`](#validate_passwordpassword-str---bool)

##### `authenticate_user(username: str, password: str) -> Optional[User]`

Authenticate user with username and password.

**Parameters:**
- `username` (str): Username
- `password` (str): Plain text password

**Returns:**
- `User` object if authentication successful
- `None` if authentication failed

**User Object Fields:**
- `id` (int): User ID
- `username` (str): Username
- `email` (str): Email address
- `created_at` (int): Unix timestamp of account creation
- `last_login` (Optional[int]): Unix timestamp of last login
- `is_active` (bool): Whether account is active
- `is_admin` (bool): Whether user has admin privileges

**Example:**
```python
user = user_manager.authenticate_user('john_doe', 'SecureP@ss123')
if user:
    print(f"Welcome {user.username}!")
    print(f"Admin: {user.is_admin}")
else:
    print("Invalid credentials")
```

**Security Notes:**
- Failed login attempts are logged in audit log
- Passwords are verified using bcrypt.checkpw()
- Last login timestamp is automatically updated

##### `get_user_by_id(user_id: int) -> Optional[User]`

Get user by ID.

**Parameters:**
- `user_id` (int): User ID

**Returns:**
- `User` object or `None` if not found

**Example:**
```python
user = user_manager.get_user_by_id(1)
if user:
    print(f"User: {user.username} ({user.email})")
```

##### `get_user_by_username(username: str) -> Optional[User]`

Get user by username.

**Parameters:**
- `username` (str): Username

**Returns:**
- `User` object or `None` if not found

**Example:**
```python
user = user_manager.get_user_by_username('john_doe')
```

##### `update_user(user_id: int, **kwargs) -> bool`

Update user fields.

**Parameters:**
- `user_id` (int): User ID
- `**kwargs`: Fields to update
  - `email` (str): New email address
  - `password` (str): New password (will be hashed)
  - `is_active` (bool): Active status
  - `is_admin` (bool): Admin status
  - `settings_json` (str): User settings as JSON string

**Returns:**
- `bool`: `True` if updated successfully, `False` otherwise

**Example:**
```python
# Update email
success = user_manager.update_user(user_id=1, email='newemail@example.com')

# Change password
success = user_manager.update_user(user_id=1, password='NewSecureP@ss456')

# Make user admin
success = user_manager.update_user(user_id=1, is_admin=True)

# Deactivate user
success = user_manager.update_user(user_id=1, is_active=False)
```

##### `delete_user(user_id: int) -> bool`

Delete user. Cascade deletes all sessions and related data.

**Parameters:**
- `user_id` (int): User ID

**Returns:**
- `bool`: `True` if deleted successfully, `False` otherwise

**Example:**
```python
if user_manager.delete_user(user_id=5):
    print("User deleted")
```

##### `list_users(admin_only: bool = False, active_only: bool = False) -> List[User]`

List users with optional filtering.

**Parameters:**
- `admin_only` (bool): Only return admin users. Default: `False`
- `active_only` (bool): Only return active users. Default: `False`

**Returns:**
- `List[User]`: List of User objects

**Example:**
```python
# Get all users
all_users = user_manager.list_users()

# Get only admins
admins = user_manager.list_users(admin_only=True)

# Get active users
active_users = user_manager.list_users(active_only=True)

for user in all_users:
    print(f"{user.username} - Admin: {user.is_admin}, Active: {user.is_active}")
```

##### `create_session(user_id: int, ip_address: str, user_agent: str, expires_in: int = 604800) -> str`

Create a new session for user.

**Parameters:**
- `user_id` (int): User ID
- `ip_address` (str): Client IP address
- `user_agent` (str): Client user agent
- `expires_in` (int): Session duration in seconds. Default: `604800` (7 days)

**Returns:**
- `str`: Session token (32-byte URL-safe random token)

**Example:**
```python
session_token = user_manager.create_session(
    user_id=1,
    ip_address='192.168.1.100',
    user_agent='Mozilla/5.0...',
    expires_in=86400  # 1 day
)
print(f"Session token: {session_token}")
```

##### `validate_session(session_token: str) -> Optional[User]`

Validate session token and return user.

**Parameters:**
- `session_token` (str): Session token

**Returns:**
- `User` object if session is valid
- `None` if session is invalid or expired

**Behavior:**
- Expired sessions are automatically deleted
- Returns None for non-existent or expired tokens

**Example:**
```python
user = user_manager.validate_session(session_token)
if user:
    print(f"Valid session for {user.username}")
else:
    print("Session expired or invalid")
```

##### `delete_session(session_token: str) -> bool`

Delete session (logout).

**Parameters:**
- `session_token` (str): Session token

**Returns:**
- `bool`: `True` if deleted successfully, `False` otherwise

**Example:**
```python
# Logout user
if user_manager.delete_session(session_token):
    print("Logged out successfully")
```

---

### CredentialManager

**Location:** `app/auth/credential_manager.py`

Manages encrypted credential storage with AES-256-GCM encryption for Twitter and Bluesky credentials.

#### Class: `CredentialManager`

```python
from app.auth.credential_manager import CredentialManager
import os

# Generate or load 32-byte master key
master_key = os.urandom(32)  # In production, load from secure storage

cred_manager = CredentialManager(
    master_key=master_key,
    db_path='chirpsyncer.db'
)
```

##### `__init__(master_key: bytes, db_path: str = 'chirpsyncer.db')`

Initialize CredentialManager.

**Parameters:**
- `master_key` (bytes): 32-byte master key for AES-256 encryption
- `db_path` (str): Path to SQLite database. Default: `'chirpsyncer.db'`

**Raises:**
- `ValueError`: If master_key is not exactly 32 bytes

**Security Notes:**
- Master key must be kept secure and persistent
- Loss of master key means loss of all encrypted credentials
- Use environment variables or secure key management for production

**Example:**
```python
import os

# Load from environment or generate
master_key_hex = os.environ.get('MASTER_KEY')
if master_key_hex:
    master_key = bytes.fromhex(master_key_hex)
else:
    master_key = os.urandom(32)
    print(f"Generated master key: {master_key.hex()}")

cred_manager = CredentialManager(master_key, 'chirpsyncer.db')
```

##### `init_db()`

Initialize database table for user credentials.

**Returns:** None

**Tables Created:**
- `user_credentials`: Encrypted credentials with metadata

**Example:**
```python
cred_manager.init_db()
```

##### `save_credentials(user_id: int, platform: str, credential_type: str, data: dict) -> bool`

Save encrypted credentials for a user.

**Parameters:**
- `user_id` (int): User ID
- `platform` (str): Platform name (`'twitter'` or `'bluesky'`)
- `credential_type` (str): Type of credential
  - Twitter: `'scraping'` or `'api'`
  - Bluesky: `'api'`
- `data` (dict): Credential data as dictionary (will be encrypted)

**Returns:**
- `bool`: `True` if saved successfully

**Raises:**
- `ValueError`: If platform or credential_type is invalid
- `Exception`: If save fails (e.g., duplicate credentials)

**Credential Data Structures:**

**Twitter Scraping:**
```python
{
    'username': 'twitter_username',
    'password': 'twitter_password',
    'email': 'email@example.com',
    'email_password': 'email_password'
}
```

**Twitter API:**
```python
{
    'api_key': 'your_api_key',
    'api_secret': 'your_api_secret',
    'access_token': 'your_access_token',
    'access_secret': 'your_access_secret'
}
```

**Bluesky API:**
```python
{
    'username': 'user.bsky.social',
    'password': 'bluesky_app_password'
}
```

**Example:**
```python
# Save Twitter scraping credentials
twitter_data = {
    'username': 'mytwitter',
    'password': 'mypassword',
    'email': 'email@example.com',
    'email_password': 'emailpass'
}

try:
    success = cred_manager.save_credentials(
        user_id=1,
        platform='twitter',
        credential_type='scraping',
        data=twitter_data
    )
    if success:
        print("Twitter credentials saved")
except ValueError as e:
    print(f"Invalid credentials: {e}")

# Save Bluesky credentials
bluesky_data = {
    'username': 'user.bsky.social',
    'password': 'app-password-here'
}

cred_manager.save_credentials(
    user_id=1,
    platform='bluesky',
    credential_type='api',
    data=bluesky_data
)
```

##### `get_credentials(user_id: int, platform: str, credential_type: str) -> Optional[dict]`

Get decrypted credentials for a user.

**Parameters:**
- `user_id` (int): User ID
- `platform` (str): Platform (`'twitter'` or `'bluesky'`)
- `credential_type` (str): Credential type (`'scraping'`, `'api'`)

**Returns:**
- `dict`: Decrypted credential data
- `None`: If not found

**Side Effects:**
- Updates `last_used` timestamp in database

**Example:**
```python
creds = cred_manager.get_credentials(
    user_id=1,
    platform='twitter',
    credential_type='scraping'
)

if creds:
    print(f"Username: {creds['username']}")
    # Use credentials...
else:
    print("Credentials not found")
```

##### `update_credentials(user_id: int, platform: str, credential_type: str, data: dict) -> bool`

Update existing credentials.

**Parameters:**
- `user_id` (int): User ID
- `platform` (str): Platform
- `credential_type` (str): Credential type
- `data` (dict): New credential data

**Returns:**
- `bool`: `True` if updated, `False` if credentials don't exist

**Example:**
```python
new_data = {
    'username': 'new_username',
    'password': 'new_password'
}

if cred_manager.update_credentials(1, 'bluesky', 'api', new_data):
    print("Credentials updated")
```

##### `delete_credentials(user_id: int, platform: str, credential_type: str) -> bool`

Delete credentials.

**Parameters:**
- `user_id` (int): User ID
- `platform` (str): Platform
- `credential_type` (str): Credential type

**Returns:**
- `bool`: `True` if deleted, `False` if not found

**Example:**
```python
if cred_manager.delete_credentials(1, 'twitter', 'scraping'):
    print("Credentials deleted")
```

##### `list_user_credentials(user_id: int) -> List[dict]`

List all credentials for a user (metadata only, not decrypted).

**Parameters:**
- `user_id` (int): User ID

**Returns:**
- `List[dict]`: List of credential metadata

**Metadata Fields:**
- `id` (int): Credential ID
- `platform` (str): Platform name
- `credential_type` (str): Credential type
- `created_at` (int): Unix timestamp
- `updated_at` (int): Unix timestamp
- `last_used` (Optional[int]): Unix timestamp of last use
- `is_active` (int): Active status (0 or 1)
- `is_shared` (int): Shared status (0 or 1)
- `owner_user_id` (Optional[int]): Original owner if shared

**Example:**
```python
credentials = cred_manager.list_user_credentials(user_id=1)

for cred in credentials:
    print(f"{cred['platform']} ({cred['credential_type']})")
    print(f"  Last used: {cred['last_used']}")
    print(f"  Shared: {bool(cred['is_shared'])}")
```

##### `share_credentials(owner_user_id: int, platform: str, credential_type: str, shared_with_user_ids: List[int]) -> bool`

Share credentials with other users (creates read-only copies).

**Parameters:**
- `owner_user_id` (int): Owner user ID
- `platform` (str): Platform
- `credential_type` (str): Credential type
- `shared_with_user_ids` (List[int]): List of user IDs to share with

**Returns:**
- `bool`: `True` if shared successfully

**Example:**
```python
# Share Twitter credentials with users 2 and 3
success = cred_manager.share_credentials(
    owner_user_id=1,
    platform='twitter',
    credential_type='scraping',
    shared_with_user_ids=[2, 3]
)

if success:
    print("Credentials shared with 2 users")
```

##### `get_shared_credentials(user_id: int) -> List[dict]`

Get all credentials shared with a user.

**Parameters:**
- `user_id` (int): User ID

**Returns:**
- `List[dict]`: List of shared credential metadata

**Example:**
```python
shared = cred_manager.get_shared_credentials(user_id=2)

for cred in shared:
    print(f"Shared from user {cred['owner_user_id']}: {cred['platform']}")
```

---

### Security Utilities

**Location:** `app/auth/security_utils.py`

Provides password validation, rate limiting, and audit logging.

#### `validate_password(password: str) -> bool`

Validate password strength.

**Parameters:**
- `password` (str): Password to validate

**Returns:**
- `bool`: `True` if password meets requirements, `False` otherwise

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*(),.?":{}|<>)

**Example:**
```python
from app.auth.security_utils import validate_password

if validate_password('SecureP@ss123'):
    print("Password is strong")
else:
    print("Password is weak")

# Weak passwords
validate_password('short')        # False - too short
validate_password('alllowercase') # False - no uppercase/digit/special
validate_password('NoSpecial123') # False - no special character
```

#### Class: `RateLimiter`

In-memory rate limiter using sliding window approach.

##### `check_rate_limit(key: str, max_attempts: int, window_seconds: int) -> bool`

Check if rate limit is exceeded.

**Parameters:**
- `key` (str): Unique key (e.g., username, IP address, user_id)
- `max_attempts` (int): Maximum attempts allowed
- `window_seconds` (int): Time window in seconds

**Returns:**
- `bool`: `True` if within limits, `False` if exceeded

**Example:**
```python
from app.auth.security_utils import rate_limiter

# Check login attempts (5 attempts per 15 minutes)
user_key = f"login:{username}"
if rate_limiter.check_rate_limit(user_key, max_attempts=5, window_seconds=900):
    # Proceed with login
    pass
else:
    print("Too many login attempts. Try again later.")

# Check API calls (100 requests per minute)
api_key = f"api:{user_id}"
if rate_limiter.check_rate_limit(api_key, max_attempts=100, window_seconds=60):
    # Process API request
    pass
```

##### `reset(key: str)`

Reset rate limit for a key.

**Parameters:**
- `key` (str): Key to reset

**Example:**
```python
# Reset after successful login
rate_limiter.reset(f"login:{username}")
```

#### `check_rate_limit(user_id: int, action: str) -> bool`

Check rate limit for a user action (convenience function).

**Parameters:**
- `user_id` (int): User ID
- `action` (str): Action type (`'login'`, `'api_call'`, etc.)

**Returns:**
- `bool`: `True` if within limits, `False` if exceeded

**Predefined Limits:**
- `login`: 5 attempts per 15 minutes
- `api_call`: 100 requests per minute
- Other: 50 requests per minute (default)

**Example:**
```python
from app.auth.security_utils import check_rate_limit

if check_rate_limit(user_id=1, action='login'):
    # Proceed with login
    pass
```

#### `log_audit(user_id: Optional[int], action: str, success: bool, **kwargs)`

Log audit event to database.

**Parameters:**
- `user_id` (Optional[int]): User ID (can be None for failed logins)
- `action` (str): Action performed (e.g., `'login'`, `'logout'`, `'create_cred'`)
- `success` (bool): Whether action succeeded
- `resource_type` (str, optional): Type of resource (e.g., `'user'`, `'credential'`)
- `resource_id` (int, optional): ID of resource
- `ip_address` (str, optional): Client IP address
- `user_agent` (str, optional): Client user agent
- `details` (dict, optional): Additional details (stored as JSON)
- `db_path` (str, optional): Database path. Default: `'chirpsyncer.db'`

**Returns:** None

**Example:**
```python
from app.auth.security_utils import log_audit

# Log successful login
log_audit(
    user_id=1,
    action='login_success',
    success=True,
    ip_address='192.168.1.100',
    user_agent='Mozilla/5.0...',
    details={'username': 'john_doe'}
)

# Log failed credential creation
log_audit(
    user_id=1,
    action='credential_created',
    success=False,
    resource_type='credential',
    details={'platform': 'twitter', 'error': 'Invalid credentials'}
)
```

#### `get_audit_log(user_id: Optional[int] = None, limit: int = 100, db_path: str = 'chirpsyncer.db') -> List[Dict]`

Get audit log entries.

**Parameters:**
- `user_id` (Optional[int]): Filter by user ID (None for all users)
- `limit` (int): Maximum entries to return. Default: `100`
- `db_path` (str): Database path. Default: `'chirpsyncer.db'`

**Returns:**
- `List[Dict]`: List of audit log entries

**Log Entry Fields:**
- `id` (int): Log entry ID
- `user_id` (Optional[int]): User ID
- `action` (str): Action performed
- `resource_type` (Optional[str]): Resource type
- `resource_id` (Optional[int]): Resource ID
- `ip_address` (Optional[str]): IP address
- `user_agent` (Optional[str]): User agent
- `success` (int): Success status (0 or 1)
- `details` (Optional[dict]): Additional details (parsed from JSON)
- `created_at` (int): Unix timestamp

**Example:**
```python
from app.auth.security_utils import get_audit_log

# Get all audit logs
all_logs = get_audit_log(limit=50)

# Get logs for specific user
user_logs = get_audit_log(user_id=1, limit=20)

for log in user_logs:
    print(f"{log['action']} - Success: {log['success']}")
    if log.get('details'):
        print(f"  Details: {log['details']}")
```

---

### Auth Decorators

**Location:** `app/auth/auth_decorators.py`

Flask decorators for authentication and authorization.

#### `@require_auth`

Decorator that requires user to be authenticated.

**Behavior:**
- Redirects to login page if user is not authenticated
- Checks for `user_id` in session

**Example:**
```python
from flask import Flask
from app.auth.auth_decorators import require_auth

app = Flask(__name__)

@app.route('/dashboard')
@require_auth
def dashboard():
    return 'Protected dashboard content'
```

#### `@require_admin`

Decorator that requires user to be authenticated as admin.

**Behavior:**
- Redirects to login if not authenticated
- Returns 403 Forbidden if authenticated but not admin
- Checks `is_admin` flag in user account

**Example:**
```python
@app.route('/admin')
@require_admin
def admin_panel():
    return 'Admin-only content'
```

#### `@require_self_or_admin`

Decorator that requires user to be accessing their own resource or be admin.

**Behavior:**
- Redirects to login if not authenticated
- Returns 403 if trying to access another user's resource without being admin
- The decorated function must have a `user_id` parameter

**Example:**
```python
@app.route('/users/<int:user_id>/profile')
@require_self_or_admin
def user_profile(user_id):
    # User can only view their own profile unless they're admin
    return f'Profile for user {user_id}'
```

---

## Analytics & Metrics

### AnalyticsTracker

**Location:** `app/features/analytics_tracker.py`

Tracks and analyzes Twitter/Bluesky engagement metrics with time-series storage.

#### Class: `AnalyticsTracker`

```python
from app.features.analytics_tracker import AnalyticsTracker

tracker = AnalyticsTracker(db_path='chirpsyncer.db')
```

##### `__init__(db_path: str = 'chirpsyncer.db')`

Initialize AnalyticsTracker.

**Parameters:**
- `db_path` (str): Path to SQLite database

##### `init_db()`

Initialize database tables and indexes.

**Returns:** None

**Tables Created:**
- `tweet_metrics`: Time-series engagement data
- `analytics_snapshots`: Period-based aggregated snapshots

**Example:**
```python
tracker.init_db()
```

##### `record_metrics(tweet_id: str, user_id: int, metrics: dict) -> bool`

Record or update metrics for a tweet.

**Parameters:**
- `tweet_id` (str): Twitter/Bluesky tweet ID
- `user_id` (int): User ID who owns the tweet
- `metrics` (dict): Metrics dictionary

**Metrics Dictionary:**
```python
{
    'impressions': int,  # Number of views
    'likes': int,        # Number of likes
    'retweets': int,     # Number of retweets/reposts
    'replies': int,      # Number of replies
    'engagements': int   # Total engagements
}
```

**Returns:**
- `bool`: `True` if successful, `False` otherwise

**Example:**
```python
success = tracker.record_metrics(
    tweet_id='1234567890',
    user_id=1,
    metrics={
        'impressions': 1000,
        'likes': 50,
        'retweets': 10,
        'replies': 5,
        'engagements': 65
    }
)

if success:
    print("Metrics recorded")
```

##### `get_metrics(tweet_id: str) -> Optional[dict]`

Get latest metrics for a tweet.

**Parameters:**
- `tweet_id` (str): Tweet ID

**Returns:**
- `dict`: Metrics dictionary with all fields
- `None`: If not found

**Returned Fields:**
- `tweet_id` (str)
- `user_id` (int)
- `timestamp` (int): Unix timestamp
- `impressions` (int)
- `likes` (int)
- `retweets` (int)
- `replies` (int)
- `engagements` (int)
- `engagement_rate` (float): Percentage (0.0 - 100.0)

**Example:**
```python
metrics = tracker.get_metrics('1234567890')
if metrics:
    print(f"Impressions: {metrics['impressions']}")
    print(f"Engagement rate: {metrics['engagement_rate']}%")
```

##### `get_user_analytics(user_id: int, period: str) -> dict`

Get aggregated analytics for a user for a specific period.

**Parameters:**
- `user_id` (int): User ID
- `period` (str): Period type
  - `'hourly'`: Last 1 hour
  - `'daily'`: Last 24 hours
  - `'weekly'`: Last 7 days
  - `'monthly'`: Last 30 days

**Returns:**
- `dict`: Aggregated analytics

**Returned Fields:**
```python
{
    'user_id': int,
    'period': str,
    'total_tweets': int,
    'total_impressions': int,
    'total_engagements': int,
    'avg_engagement_rate': float,
    'total_likes': int,
    'total_retweets': int,
    'total_replies': int
}
```

**Example:**
```python
# Get daily analytics
daily = tracker.get_user_analytics(user_id=1, period='daily')
print(f"Daily tweets: {daily['total_tweets']}")
print(f"Average engagement: {daily['avg_engagement_rate']}%")

# Get monthly analytics
monthly = tracker.get_user_analytics(user_id=1, period='monthly')
print(f"Monthly impressions: {monthly['total_impressions']}")
```

##### `calculate_engagement_rate(metrics: dict) -> float`

Calculate engagement rate as percentage.

**Parameters:**
- `metrics` (dict): Dictionary with `'impressions'` and `'engagements'` keys

**Returns:**
- `float`: Engagement rate percentage (0.0 - 100.0)

**Formula:** `(engagements / impressions) * 100`

**Example:**
```python
rate = tracker.calculate_engagement_rate({
    'impressions': 1000,
    'engagements': 50
})
print(f"Engagement rate: {rate}%")  # 5.0%
```

##### `create_snapshot(user_id: int, period: str) -> bool`

Create analytics snapshot for a period.

**Parameters:**
- `user_id` (int): User ID
- `period` (str): Period type (`'hourly'`, `'daily'`, `'weekly'`, `'monthly'`)

**Returns:**
- `bool`: `True` if successful

**Example:**
```python
# Create daily snapshot
tracker.create_snapshot(user_id=1, period='daily')
```

##### `get_top_tweets(user_id: int, metric: str = 'engagement_rate', limit: int = 10) -> List[dict]`

Get top performing tweets for a user.

**Parameters:**
- `user_id` (int): User ID
- `metric` (str): Metric to sort by. Default: `'engagement_rate'`
  - Valid metrics: `'engagement_rate'`, `'likes'`, `'retweets'`, `'impressions'`, `'engagements'`, `'replies'`
- `limit` (int): Maximum tweets to return. Default: `10`

**Returns:**
- `List[dict]`: List of tweet dictionaries sorted by metric

**Example:**
```python
# Get top tweets by engagement rate
top_tweets = tracker.get_top_tweets(user_id=1, metric='engagement_rate', limit=5)

for i, tweet in enumerate(top_tweets, 1):
    print(f"{i}. Tweet {tweet['tweet_id']}")
    print(f"   Engagement rate: {tweet['engagement_rate']}%")
    print(f"   Likes: {tweet['likes']}, Retweets: {tweet['retweets']}")

# Get top tweets by impressions
top_impressions = tracker.get_top_tweets(user_id=1, metric='impressions', limit=10)
```

**See also:** [`ReportGenerator.generate_top_tweets_report()`](#generate_top_tweets_reportuser_id-int-limit-int-format-str---bytes)

---

### ReportGenerator

**Location:** `app/features/report_generator.py`

Generates analytics reports in multiple formats (CSV, JSON, HTML, PDF).

#### Class: `ReportGenerator`

```python
from app.features.report_generator import ReportGenerator

generator = ReportGenerator(db_path='chirpsyncer.db')
```

##### `__init__(db_path: str = 'chirpsyncer.db')`

Initialize ReportGenerator.

**Parameters:**
- `db_path` (str): Path to SQLite database

##### `generate_engagement_report(user_id: int, period: str, format: str) -> bytes`

Generate engagement report for specified period.

**Parameters:**
- `user_id` (int): User ID
- `period` (str): Time period
  - `'week'`: Last 7 days
  - `'month'`: Last 30 days
  - `'year'`: Last 365 days
  - `'30d'`, `'7d'`, etc.: Custom days
- `format` (str): Output format
  - `'csv'`: Comma-separated values
  - `'json'`: JSON format
  - `'html'`: HTML report with styling
  - `'pdf'`: PDF report (requires WeasyPrint)

**Returns:**
- `bytes`: Report content

**Raises:**
- `ValueError`: If format or period is invalid

**Report Contents:**
- Total tweets in period
- Total likes, retweets, replies
- Total engagements
- Average engagement rate
- Top tweet information
- Generation timestamp

**Example:**
```python
# Generate weekly HTML report
html_report = generator.generate_engagement_report(
    user_id=1,
    period='week',
    format='html'
)

# Save to file
with open('weekly_report.html', 'wb') as f:
    f.write(html_report)

# Generate monthly CSV report
csv_report = generator.generate_engagement_report(
    user_id=1,
    period='month',
    format='csv'
)

# Generate JSON report
json_report = generator.generate_engagement_report(
    user_id=1,
    period='30d',
    format='json'
)

import json
data = json.loads(json_report)
print(f"Total tweets: {data['total_tweets']}")
```

##### `generate_growth_report(user_id: int, format: str) -> bytes`

Generate growth report comparing two periods.

**Parameters:**
- `user_id` (int): User ID
- `format` (str): Output format (`'csv'`, `'json'`, `'html'`, `'pdf'`)

**Returns:**
- `bytes`: Report content

**Report Contents:**
Compares last 7 days vs previous 7 days:
- Tweet count change
- Engagement trend (increasing/decreasing/stable)
- Period-over-period metrics

**Example:**
```python
# Generate growth report
growth_report = generator.generate_growth_report(
    user_id=1,
    format='html'
)

with open('growth_report.html', 'wb') as f:
    f.write(growth_report)
```

##### `generate_top_tweets_report(user_id: int, limit: int, format: str) -> bytes`

Generate top tweets report.

**Parameters:**
- `user_id` (int): User ID
- `limit` (int): Maximum number of tweets to include
- `format` (str): Output format (`'csv'`, `'json'`, `'html'`, `'pdf'`)

**Returns:**
- `bytes`: Report content

**Example:**
```python
# Get top 10 tweets as CSV
top_tweets = generator.generate_top_tweets_report(
    user_id=1,
    limit=10,
    format='csv'
)

with open('top_tweets.csv', 'wb') as f:
    f.write(top_tweets)
```

##### `export_data(user_id: int, data_type: str, format: str) -> bytes`

Export data in specified format.

**Parameters:**
- `user_id` (int): User ID
- `data_type` (str): Type of data to export
  - `'tweets'`: All tweets
  - `'engagement'`: Engagement metrics
- `format` (str): Output format (`'csv'`, `'json'`, `'html'`, `'pdf'`)

**Returns:**
- `bytes`: Exported data

**Example:**
```python
# Export all tweets as JSON
tweets_json = generator.export_data(
    user_id=1,
    data_type='tweets',
    format='json'
)

# Export engagement data as CSV
engagement_csv = generator.export_data(
    user_id=1,
    data_type='engagement',
    format='csv'
)
```

##### `email_report(report_content: bytes, report_type: str, format: str, recipient_email: str) -> Dict[str, Any]`

Email a generated report to specified recipient.

**Parameters:**
- `report_content` (bytes): The report content
- `report_type` (str): Type of report (`'engagement'`, `'growth'`, `'top_tweets'`)
- `format` (str): Report format (`'pdf'`, `'csv'`, `'json'`, `'html'`)
- `recipient_email` (str): Email address to send to

**Returns:**
- `dict`: Status dictionary

**Example:**
```python
# Generate and email report
report = generator.generate_engagement_report(1, 'week', 'html')

result = generator.email_report(
    report_content=report,
    report_type='engagement',
    format='html',
    recipient_email='user@example.com'
)

if result['success']:
    print(f"Report sent to {recipient_email}")
else:
    print(f"Error: {result['error']}")
```

##### `generate_and_email_engagement_report(user_id: int, period: str, format: str, recipient_email: str) -> Dict[str, Any]`

Generate engagement report and email it (convenience method).

**Parameters:**
- `user_id` (int): User ID
- `period` (str): Time period
- `format` (str): Report format
- `recipient_email` (str): Email address

**Returns:**
- `dict`: Status dictionary

**Example:**
```python
result = generator.generate_and_email_engagement_report(
    user_id=1,
    period='week',
    format='pdf',
    recipient_email='user@example.com'
)
```

---

## Content Management

### TweetScheduler

**Location:** `app/features/tweet_scheduler.py`

Database-backed tweet scheduling system with queue management.

#### Class: `TweetScheduler`

```python
from app.features.tweet_scheduler import TweetScheduler

scheduler = TweetScheduler(db_path='chirpsyncer.db')
```

##### `__init__(db_path: str = 'chirpsyncer.db')`

Initialize TweetScheduler.

**Parameters:**
- `db_path` (str): Path to SQLite database

##### `init_db()`

Initialize database table for scheduled tweets.

**Returns:** None

**Example:**
```python
scheduler.init_db()
```

##### `schedule_tweet(user_id: int, content: str, scheduled_time: datetime, media: List[str]) -> int`

Schedule a tweet for future posting.

**Parameters:**
- `user_id` (int): User ID who owns this tweet
- `content` (str): Tweet text content
- `scheduled_time` (datetime): When to post the tweet
- `media` (List[str]): List of media file paths

**Returns:**
- `int`: ID of scheduled tweet

**Raises:**
- `ValueError`: If content is empty or time is in the past

**Example:**
```python
from datetime import datetime, timedelta

# Schedule tweet for 1 hour from now
scheduled_time = datetime.now() + timedelta(hours=1)

tweet_id = scheduler.schedule_tweet(
    user_id=1,
    content="Check out this scheduled tweet!",
    scheduled_time=scheduled_time,
    media=['/path/to/image.jpg']
)

print(f"Scheduled tweet ID: {tweet_id}")

# Schedule tweet without media
tweet_id = scheduler.schedule_tweet(
    user_id=1,
    content="Another scheduled tweet",
    scheduled_time=datetime.now() + timedelta(days=1),
    media=[]
)
```

##### `cancel_scheduled_tweet(tweet_id: int, user_id: int) -> bool`

Cancel a scheduled tweet.

**Parameters:**
- `tweet_id` (int): ID of scheduled tweet
- `user_id` (int): User ID (for authorization)

**Returns:**
- `bool`: `True` if cancelled, `False` otherwise

**Notes:**
- Cannot cancel already posted tweets
- User must own the tweet

**Example:**
```python
if scheduler.cancel_scheduled_tweet(tweet_id=5, user_id=1):
    print("Tweet cancelled")
else:
    print("Cannot cancel tweet (already posted or not found)")
```

##### `get_scheduled_tweets(user_id: int, status: str = None) -> List[dict]`

Get scheduled tweets for a user.

**Parameters:**
- `user_id` (int): User ID
- `status` (str, optional): Filter by status
  - `'pending'`: Not yet posted
  - `'posted'`: Successfully posted
  - `'failed'`: Failed to post
  - `'cancelled'`: Cancelled by user
  - `None`: All tweets

**Returns:**
- `List[dict]`: List of scheduled tweet dictionaries

**Tweet Fields:**
- `id` (int): Tweet ID
- `user_id` (int): User ID
- `content` (str): Tweet text
- `media_paths` (List[str]): Media file paths (parsed from JSON)
- `scheduled_time` (int): Unix timestamp
- `status` (str): Current status
- `posted_at` (Optional[int]): Unix timestamp when posted
- `tweet_id` (Optional[str]): Platform tweet ID
- `error` (Optional[str]): Error message if failed
- `created_at` (int): Unix timestamp when scheduled

**Example:**
```python
# Get all scheduled tweets
all_tweets = scheduler.get_scheduled_tweets(user_id=1)

# Get pending tweets only
pending = scheduler.get_scheduled_tweets(user_id=1, status='pending')

for tweet in pending:
    print(f"ID: {tweet['id']}")
    print(f"Content: {tweet['content'][:50]}...")
    print(f"Scheduled: {tweet['scheduled_time']}")
    print(f"Media: {len(tweet['media_paths'])} files")
```

##### `process_queue() -> Dict`

Process the queue of scheduled tweets.

**Returns:**
- `dict`: Processing statistics

**Statistics:**
```python
{
    'processed': int,    # Total tweets processed
    'successful': int,   # Successfully posted
    'failed': int       # Failed to post
}
```

**Notes:**
- Called by cron every minute
- Processes all pending tweets that are due
- Updates status for each tweet

**Example:**
```python
stats = scheduler.process_queue()
print(f"Processed: {stats['processed']}")
print(f"Successful: {stats['successful']}")
print(f"Failed: {stats['failed']}")
```

##### `update_status(scheduled_tweet_id: int, status: str, tweet_id: str = None, error: str = None) -> bool`

Update the status of a scheduled tweet.

**Parameters:**
- `scheduled_tweet_id` (int): ID of scheduled tweet
- `status` (str): New status (`'pending'`, `'posted'`, `'failed'`, `'cancelled'`)
- `tweet_id` (str, optional): Twitter tweet ID (for posted tweets)
- `error` (str, optional): Error message (for failed tweets)

**Returns:**
- `bool`: `True` if updated successfully

**Example:**
```python
# Mark as posted
scheduler.update_status(
    scheduled_tweet_id=5,
    status='posted',
    tweet_id='1234567890'
)

# Mark as failed
scheduler.update_status(
    scheduled_tweet_id=6,
    status='failed',
    error='Authentication failed'
)
```

---

### CleanupEngine

**Location:** `app/features/cleanup_engine.py`

Automated tweet cleanup system with rule-based deletion.

#### Class: `CleanupEngine`

```python
from app.features.cleanup_engine import CleanupEngine
from app.auth.credential_manager import CredentialManager

cred_mgr = CredentialManager(db_path='chirpsyncer.db')
engine = CleanupEngine(db_path='chirpsyncer.db', credential_manager=cred_mgr)
```

##### `__init__(db_path: str = 'chirpsyncer.db', credential_manager=None)`

Initialize CleanupEngine.

**Parameters:**
- `db_path` (str): Path to SQLite database
- `credential_manager` (CredentialManager, optional): For real Twitter API access. If None, fetch/delete are stubs.

**Sprint 8 Features:**
- Real tweet fetching via twscrape
- Real tweet deletion via Twitter API v2
- Rate limiting (900 read/15min, 50 delete/15min)
- Exponential backoff on failures
- Correlation ID tracking for audit

##### `init_db()`

Initialize database tables for cleanup system.

**Returns:** None

**Tables Created:**
- `cleanup_rules`: User-defined cleanup rules
- `cleanup_history`: Execution history

**Example:**
```python
engine.init_db()
```

##### `create_rule(user_id: int, name: str, rule_type: str, config: dict) -> int`

Create a new cleanup rule.

**Parameters:**
- `user_id` (int): User ID who owns this rule
- `name` (str): Human-readable name for the rule
- `rule_type` (str): Type of rule
  - `'age'`: Delete tweets older than X days
  - `'engagement'`: Delete tweets below engagement threshold
  - `'pattern'`: Delete tweets matching regex pattern
- `config` (dict): Rule configuration

**Returns:**
- `int`: Rule ID

**Raises:**
- `ValueError`: If config is not a dictionary

**Rule Configurations:**

**Age Rule:**
```python
{
    'max_age_days': int,           # Delete tweets older than this
    'exclude_with_replies': bool   # Don't delete tweets with replies
}
```

**Engagement Rule:**
```python
{
    'min_likes': int,         # Minimum likes threshold
    'delete_if_below': bool   # True = delete if below, False = delete if above
}
```

**Pattern Rule:**
```python
{
    'regex': str  # Regular expression pattern to match
}
```

**Example:**
```python
# Create age-based rule (delete tweets older than 30 days)
age_rule_id = engine.create_rule(
    user_id=1,
    name='Delete old tweets',
    rule_type='age',
    config={
        'max_age_days': 30,
        'exclude_with_replies': True
    }
)

# Create engagement rule (delete tweets with < 10 likes)
engagement_rule_id = engine.create_rule(
    user_id=1,
    name='Low engagement cleanup',
    rule_type='engagement',
    config={
        'min_likes': 10,
        'delete_if_below': True
    }
)

# Create pattern rule (delete tweets with specific hashtag)
pattern_rule_id = engine.create_rule(
    user_id=1,
    name='Remove test tweets',
    rule_type='pattern',
    config={
        'regex': r'#test|#draft'
    }
)

print(f"Created rules: {age_rule_id}, {engagement_rule_id}, {pattern_rule_id}")
```

##### `get_user_rules(user_id: int, enabled_only: bool = False) -> List[dict]`

Get all cleanup rules for a user.

**Parameters:**
- `user_id` (int): User ID
- `enabled_only` (bool): If True, only return enabled rules. Default: `False`

**Returns:**
- `List[dict]`: List of rule dictionaries

**Example:**
```python
# Get all rules
all_rules = engine.get_user_rules(user_id=1)

# Get enabled rules only
enabled_rules = engine.get_user_rules(user_id=1, enabled_only=True)

for rule in all_rules:
    print(f"{rule['name']} ({rule['rule_type']})")
    print(f"  Enabled: {rule['enabled']}")
    print(f"  Deleted: {rule['deleted_count']} tweets")
```

##### `preview_cleanup(user_id: int, rule_id: int) -> Dict[str, Any]`

Preview what would be deleted by a rule without actually deleting.

**Parameters:**
- `user_id` (int): User ID
- `rule_id` (int): Rule ID to preview

**Returns:**
- `dict`: Preview results

**Preview Results:**
```python
{
    'count': int,              # Number of tweets that would be deleted
    'tweet_ids': List[str],    # IDs of tweets that would be deleted
    'tweets': List[dict]       # Full tweet objects
}
```

**Example:**
```python
preview = engine.preview_cleanup(user_id=1, rule_id=5)

print(f"Would delete {preview['count']} tweets:")
for tweet in preview['tweets']:
    print(f"  - {tweet['id']}: {tweet['text'][:50]}...")

# Review before executing
if preview['count'] < 100:
    # Safe to execute
    pass
```

##### `execute_cleanup(user_id: int, rule_id: int, dry_run: bool = True) -> Dict[str, Any]`

Execute a cleanup rule.

**Parameters:**
- `user_id` (int): User ID
- `rule_id` (int): Rule ID to execute
- `dry_run` (bool): If True, don't actually delete. Default: `True`

**Returns:**
- `dict`: Execution results

**Execution Results:**
```python
{
    'success': bool,
    'dry_run': bool,
    'tweets_deleted': int,
    'would_delete': int,  # Only if dry_run=True
    'rule_id': int,
    'rule_name': str,
    'errors': List[dict]  # Optional, if any errors occurred
}
```

**Example:**
```python
# Dry run first (preview without deleting)
result = engine.execute_cleanup(user_id=1, rule_id=5, dry_run=True)
print(f"Dry run: would delete {result['would_delete']} tweets")

# Execute for real
if result['would_delete'] < 50:  # Safety check
    result = engine.execute_cleanup(user_id=1, rule_id=5, dry_run=False)
    print(f"Deleted {result['tweets_deleted']} tweets")

    if result.get('errors'):
        print(f"Errors: {len(result['errors'])}")
```

##### `delete_rule(rule_id: int, user_id: int) -> bool`

Delete a cleanup rule.

**Parameters:**
- `rule_id` (int): Rule ID to delete
- `user_id` (int): User ID (for authorization)

**Returns:**
- `bool`: `True` if deleted, `False` otherwise

**Example:**
```python
if engine.delete_rule(rule_id=5, user_id=1):
    print("Rule deleted")
```

##### `disable_rule(rule_id: int, user_id: int) -> bool`

Disable a cleanup rule (without deleting).

**Parameters:**
- `rule_id` (int): Rule ID to disable
- `user_id` (int): User ID (for authorization)

**Returns:**
- `bool`: `True` if disabled, `False` otherwise

**Example:**
```python
# Temporarily disable rule
engine.disable_rule(rule_id=5, user_id=1)

# Re-enable later
engine.enable_rule(rule_id=5, user_id=1)
```

##### `enable_rule(rule_id: int, user_id: int) -> bool`

Enable a cleanup rule.

**Parameters:**
- `rule_id` (int): Rule ID to enable
- `user_id` (int): User ID (for authorization)

**Returns:**
- `bool`: `True` if enabled, `False` otherwise

##### `get_cleanup_history(user_id: int, limit: int = 50) -> List[dict]`

Get cleanup execution history for a user.

**Parameters:**
- `user_id` (int): User ID
- `limit` (int): Maximum entries to return. Default: `50`

**Returns:**
- `List[dict]`: List of history entries

**History Entry Fields:**
- `id` (int): History entry ID
- `rule_id` (int): Rule ID
- `rule_name` (str): Rule name
- `user_id` (int): User ID
- `tweets_deleted` (int): Number of tweets deleted
- `executed_at` (int): Unix timestamp
- `dry_run` (int): Whether it was a dry run (0 or 1)

**Example:**
```python
history = engine.get_cleanup_history(user_id=1, limit=20)

for entry in history:
    mode = "Dry run" if entry['dry_run'] else "Live"
    print(f"{entry['rule_name']}: {entry['tweets_deleted']} tweets ({mode})")
```

---

### SavedContentManager

**Location:** `app/features/saved_content.py`

Manages saved tweets and collections for organizing bookmarked content.

#### Class: `SavedContentManager`

```python
from app.features.saved_content import SavedContentManager

manager = SavedContentManager(db_path='chirpsyncer.db')
```

##### `__init__(db_path: str = 'chirpsyncer.db')`

Initialize SavedContentManager.

**Parameters:**
- `db_path` (str): Path to SQLite database

##### `init_db()`

Initialize database tables for saved content.

**Returns:** None

**Tables Created:**
- `collections`: User's collections
- `saved_tweets`: Saved tweets with collection assignment

**Example:**
```python
manager.init_db()
```

##### `save_tweet(user_id: int, tweet_id: str, collection_id: Optional[int] = None, notes: Optional[str] = None) -> bool`

Save a tweet for the user.

**Parameters:**
- `user_id` (int): User ID
- `tweet_id` (str): Tweet ID to save
- `collection_id` (Optional[int]): Collection ID (None = uncategorized)
- `notes` (Optional[str]): Optional notes about the tweet

**Returns:**
- `bool`: `True` if saved successfully, `False` if already saved

**Example:**
```python
# Save tweet without collection (uncategorized)
success = manager.save_tweet(
    user_id=1,
    tweet_id='1234567890',
    notes='Interesting thread about Python'
)

# Save tweet to specific collection
success = manager.save_tweet(
    user_id=1,
    tweet_id='9876543210',
    collection_id=5,
    notes='Good example for tutorial'
)

if success:
    print("Tweet saved")
else:
    print("Tweet already saved")
```

##### `unsave_tweet(user_id: int, tweet_id: str) -> bool`

Remove a saved tweet.

**Parameters:**
- `user_id` (int): User ID
- `tweet_id` (str): Tweet ID to unsave

**Returns:**
- `bool`: `True` if unsaved, `False` if not found

**Example:**
```python
if manager.unsave_tweet(user_id=1, tweet_id='1234567890'):
    print("Tweet unsaved")
```

##### `get_saved_tweets(user_id: int, collection_id: Optional[int] = None) -> List[Dict[str, Any]]`

Get saved tweets for a user, optionally filtered by collection.

**Parameters:**
- `user_id` (int): User ID
- `collection_id` (Optional[int]): Filter by collection (None = all tweets)

**Returns:**
- `List[Dict]`: List of saved tweet dictionaries

**Tweet Fields:**
- `id` (int): Saved tweet ID
- `user_id` (int): User ID
- `tweet_id` (str): Tweet ID
- `collection_id` (Optional[int]): Collection ID
- `notes` (Optional[str]): Notes
- `saved_at` (int): Unix timestamp

**Example:**
```python
# Get all saved tweets
all_saved = manager.get_saved_tweets(user_id=1)

# Get tweets from specific collection
collection_tweets = manager.get_saved_tweets(user_id=1, collection_id=5)

for tweet in all_saved:
    print(f"Tweet {tweet['tweet_id']}")
    if tweet['notes']:
        print(f"  Notes: {tweet['notes']}")
    if tweet['collection_id']:
        print(f"  Collection: {tweet['collection_id']}")
```

##### `create_collection(user_id: int, name: str, description: Optional[str] = None) -> Optional[int]`

Create a new collection for organizing saved tweets.

**Parameters:**
- `user_id` (int): User ID
- `name` (str): Collection name (must be unique per user)
- `description` (Optional[str]): Optional description

**Returns:**
- `int`: Collection ID if created successfully
- `None`: If failed (e.g., duplicate name)

**Example:**
```python
# Create collection
collection_id = manager.create_collection(
    user_id=1,
    name='Python Resources',
    description='Useful Python tutorials and tips'
)

if collection_id:
    print(f"Created collection ID: {collection_id}")
else:
    print("Collection name already exists")

# Create another collection
tutorials = manager.create_collection(
    user_id=1,
    name='Tutorials'
)
```

##### `get_collections(user_id: int) -> List[Dict[str, Any]]`

Get all collections for a user.

**Parameters:**
- `user_id` (int): User ID

**Returns:**
- `List[Dict]`: List of collection dictionaries

**Collection Fields:**
- `id` (int): Collection ID
- `user_id` (int): User ID
- `name` (str): Collection name
- `description` (Optional[str]): Description
- `created_at` (int): Unix timestamp

**Example:**
```python
collections = manager.get_collections(user_id=1)

for coll in collections:
    print(f"{coll['name']}: {coll['description']}")

    # Get tweets in this collection
    tweets = manager.get_saved_tweets(user_id=1, collection_id=coll['id'])
    print(f"  {len(tweets)} tweets")
```

##### `delete_collection(collection_id: int, user_id: int) -> bool`

Delete a collection. Tweets in the collection are moved to uncategorized.

**Parameters:**
- `collection_id` (int): Collection ID to delete
- `user_id` (int): User ID (for authorization)

**Returns:**
- `bool`: `True` if deleted, `False` otherwise

**Example:**
```python
if manager.delete_collection(collection_id=5, user_id=1):
    print("Collection deleted, tweets moved to uncategorized")
```

##### `move_to_collection(user_id: int, tweet_id: str, collection_id: Optional[int]) -> bool`

Move a saved tweet to a different collection.

**Parameters:**
- `user_id` (int): User ID
- `tweet_id` (str): Tweet ID to move
- `collection_id` (Optional[int]): Target collection ID (None = uncategorized)

**Returns:**
- `bool`: `True` if moved successfully

**Example:**
```python
# Move tweet to collection
success = manager.move_to_collection(
    user_id=1,
    tweet_id='1234567890',
    collection_id=5
)

# Move tweet to uncategorized
success = manager.move_to_collection(
    user_id=1,
    tweet_id='1234567890',
    collection_id=None
)
```

##### `search_saved(user_id: int, query: str, collection_id: Optional[int] = None) -> List[Dict[str, Any]]`

Search within user's saved tweets.

**Parameters:**
- `user_id` (int): User ID
- `query` (str): Search query (searches in notes and tweet_id)
- `collection_id` (Optional[int]): Optional collection filter

**Returns:**
- `List[Dict]`: List of matching saved tweets

**Example:**
```python
# Search all saved tweets
results = manager.search_saved(user_id=1, query='python')

# Search within specific collection
results = manager.search_saved(
    user_id=1,
    query='tutorial',
    collection_id=5
)

for tweet in results:
    print(f"Found: {tweet['tweet_id']}")
    print(f"  Notes: {tweet['notes']}")
```

##### `export_to_json(user_id: int, collection_id: Optional[int] = None) -> str`

Export saved tweets to JSON format.

**Parameters:**
- `user_id` (int): User ID
- `collection_id` (Optional[int]): Optional collection filter

**Returns:**
- `str`: JSON string of saved tweets

**Example:**
```python
# Export all saved tweets
json_export = manager.export_to_json(user_id=1)

with open('saved_tweets.json', 'w') as f:
    f.write(json_export)

# Export specific collection
collection_json = manager.export_to_json(user_id=1, collection_id=5)
```

##### `export_to_csv(user_id: int, collection_id: Optional[int] = None) -> str`

Export saved tweets to CSV format.

**Parameters:**
- `user_id` (int): User ID
- `collection_id` (Optional[int]): Optional collection filter

**Returns:**
- `str`: CSV string of saved tweets

**Example:**
```python
csv_export = manager.export_to_csv(user_id=1)

with open('saved_tweets.csv', 'w') as f:
    f.write(csv_export)
```

---

### SearchEngine

**Location:** `app/features/search_engine.py`

Full-text search engine using SQLite FTS5.

#### Class: `SearchEngine`

```python
from app.features.search_engine import SearchEngine

search = SearchEngine(db_path='chirpsyncer.db')
```

##### `__init__(db_path: str = 'chirpsyncer.db')`

Initialize SearchEngine.

**Parameters:**
- `db_path` (str): Path to SQLite database

##### `init_fts_index() -> bool`

Initialize FTS5 virtual table and triggers.

**Returns:**
- `bool`: `True` if successful

**Features:**
- Creates FTS5 virtual table with porter tokenizer
- Sets up automatic sync triggers
- Unicode61 tokenization

**Example:**
```python
if search.init_fts_index():
    print("Search index initialized")
```

##### `index_tweet(tweet_id: str, user_id: int, content: str, hashtags: str, author: str, posted_at: Optional[int] = None) -> bool`

Index a single tweet for search.

**Parameters:**
- `tweet_id` (str): Unique tweet ID
- `user_id` (int): User ID who owns the tweet
- `content` (str): Tweet text content
- `hashtags` (str): Space/comma separated hashtags
- `author` (str): Tweet author username
- `posted_at` (Optional[int]): Unix timestamp (defaults to now)

**Returns:**
- `bool`: `True` if successful

**Example:**
```python
success = search.index_tweet(
    tweet_id='1234567890',
    user_id=1,
    content='Exploring full-text search with SQLite FTS5',
    hashtags='#sqlite #fts5 #search',
    author='john_doe',
    posted_at=1640000000
)
```

##### `search(query: str, user_id: Optional[int] = None, limit: int = 50) -> List[Dict]`

Search tweets with full-text query.

**Parameters:**
- `query` (str): Search query (supports FTS5 syntax)
- `user_id` (Optional[int]): Filter by user ID
- `limit` (int): Maximum results. Default: `50`

**Returns:**
- `List[Dict]`: List of matching tweets with metadata

**Query Syntax:**
- Simple terms: `python tutorial`
- Phrase search: `"exact phrase"`
- Boolean: `term1 AND term2`, `term1 OR term2`
- Proximity: `NEAR(term1 term2, N)` - words within N positions

**Result Fields:**
- `tweet_id` (str)
- `user_id` (int)
- `content` (str)
- `hashtags` (str)
- `author` (str)
- `posted_at` (int)
- `rank` (float): Relevance score

**Example:**
```python
# Simple search
results = search.search('python tutorial', user_id=1, limit=10)

# Phrase search
results = search.search('"machine learning"', user_id=1)

# Boolean search
results = search.search('python AND (tutorial OR guide)', user_id=1)

# Proximity search (words within 5 positions)
results = search.search('NEAR(deep learning, 5)', user_id=1)

for result in results:
    print(f"Tweet {result['tweet_id']}: {result['content'][:50]}...")
    print(f"  Rank: {result['rank']}")
```

##### `search_with_filters(query: str, user_id: int, filters: Optional[Dict[str, Any]] = None) -> List[Dict]`

Search with additional filters.

**Parameters:**
- `query` (str): Search query
- `user_id` (int): User ID to filter by
- `filters` (Optional[Dict]): Dictionary of filters

**Filter Options:**
```python
{
    'date_from': int,           # Minimum Unix timestamp
    'date_to': int,             # Maximum Unix timestamp
    'hashtags': List[str],      # Filter by hashtags
    'author': str,              # Filter by author username
    'has_media': bool,          # Has media (placeholder)
    'min_likes': int            # Minimum likes (placeholder)
}
```

**Returns:**
- `List[Dict]`: List of matching tweets

**Example:**
```python
import time
from datetime import timedelta

# Search tweets from last 7 days with specific hashtag
filters = {
    'date_from': int(time.time()) - (7 * 86400),
    'hashtags': ['python']
}

results = search.search_with_filters(
    query='tutorial',
    user_id=1,
    filters=filters
)

# Search by author and date range
filters = {
    'author': 'john_doe',
    'date_from': int(time.time()) - (30 * 86400),
    'date_to': int(time.time())
}

results = search.search_with_filters('', user_id=1, filters=filters)

for result in results:
    print(f"{result['author']}: {result['content'][:50]}...")
```

##### `rebuild_index(user_id: Optional[int] = None) -> int`

Rebuild search index from synced_posts table.

**Parameters:**
- `user_id` (Optional[int]): Rebuild for specific user only (None = all)

**Returns:**
- `int`: Number of tweets indexed

**Example:**
```python
# Rebuild index for all users
count = search.rebuild_index()
print(f"Indexed {count} tweets")

# Rebuild for specific user
count = search.rebuild_index(user_id=1)
print(f"Indexed {count} tweets for user 1")
```

##### `get_search_stats(user_id: int) -> Dict[str, Any]`

Get search statistics for a user.

**Parameters:**
- `user_id` (int): User ID

**Returns:**
- `dict`: Statistics dictionary

**Statistics:**
```python
{
    'user_id': int,
    'total_indexed': int,    # Total tweets indexed
    'last_indexed': int      # Timestamp of most recent tweet
}
```

**Example:**
```python
stats = search.get_search_stats(user_id=1)
print(f"Total indexed: {stats['total_indexed']}")
```

---

## Platform Integrations

### Twitter Integration

**Location:** `app/integrations/twitter_scraper.py`

Twitter scraping using twscrape library (free alternative to Twitter API).

#### Class: `TweetAdapter`

Adapter class to provide backward compatibility with tweepy tweet objects.

```python
from app.integrations.twitter_scraper import TweetAdapter

# TweetAdapter wraps twscrape tweets
# Provides .id and .text attributes
```

**Attributes:**
- `id`: Tweet ID
- `text`: Full tweet text (rawContent)

#### `fetch_tweets(count: int = 5) -> List[TweetAdapter]`

Fetch recent tweets using twscrape.

**Parameters:**
- `count` (int): Maximum number of tweets to fetch. Default: `5`

**Returns:**
- `List[TweetAdapter]`: List of unseen tweets

**Features:**
- Filters out already-seen tweets
- Automatically marks tweets as seen
- Excludes replies and retweets
- No rate limiting (scraping-based)

**Example:**
```python
from app.integrations.twitter_scraper import fetch_tweets

# Fetch 10 recent tweets
tweets = fetch_tweets(count=10)

for tweet in tweets:
    print(f"Tweet {tweet.id}")
    print(f"Text: {tweet.text}")
    print("---")

# Fetch default (5 tweets)
tweets = fetch_tweets()
```

**Security Notes:**
- Requires twscrape account pool setup (one-time manual configuration)
- Uses TWITTER_USERNAME from config
- No API credentials needed

#### `async is_thread(tweet) -> bool`

Detect if a tweet is part of a thread.

**Parameters:**
- `tweet`: Tweet object from twscrape

**Returns:**
- `bool`: `True` if part of thread, `False` otherwise

**Example:**
```python
import asyncio
from app.integrations.twitter_scraper import is_thread, fetch_tweets

async def check_threads():
    tweets = fetch_tweets(count=5)

    for tweet in tweets:
        if await is_thread(tweet._tweet):  # Access underlying twscrape object
            print(f"Tweet {tweet.id} is part of a thread")

asyncio.run(check_threads())
```

#### `async fetch_thread(tweet_id: str, username: str) -> list`

Fetch all tweets in a thread, ordered chronologically.

**Parameters:**
- `tweet_id` (str): ID of any tweet in the thread
- `username` (str): Thread author username

**Returns:**
- `list`: List of tweet objects in chronological order (oldest to newest)

**Features:**
- Follows reply chain to find root tweet
- Fetches subsequent replies
- Limited to 10 tweets maximum
- Handles deleted tweets gracefully

**Example:**
```python
import asyncio
from app.integrations.twitter_scraper import fetch_thread

async def get_full_thread():
    thread = await fetch_thread(
        tweet_id='1234567890',
        username='elonmusk'
    )

    print(f"Thread has {len(thread)} tweets:")
    for i, tweet in enumerate(thread, 1):
        print(f"{i}. {tweet.text[:50]}...")

asyncio.run(get_full_thread())
```

---

### Bluesky Integration

**Location:** `app/integrations/bluesky_handler.py`

Bluesky platform integration using atproto library.

#### `login_to_bluesky()`

Login to Bluesky with retry logic.

**Returns:** None

**Raises:**
- Exception if login fails after 2 attempts

**Example:**
```python
from app.integrations.bluesky_handler import login_to_bluesky

try:
    login_to_bluesky()
    print("Logged in to Bluesky")
except Exception as e:
    print(f"Login failed: {e}")
```

#### `validate_and_truncate_text(text: str, max_length: int = 300) -> str`

Validate text length for Bluesky.

**Parameters:**
- `text` (str): Original text
- `max_length` (int): Maximum allowed length. Default: `300`

**Returns:**
- `str`: Original text if within limit, truncated text with '...' otherwise

**Example:**
```python
from app.integrations.bluesky_handler import validate_and_truncate_text

# Text within limit
short_text = validate_and_truncate_text("Hello world")
print(short_text)  # "Hello world"

# Text too long
long_text = "x" * 350
truncated = validate_and_truncate_text(long_text)
print(len(truncated))  # 300
print(truncated[-3:])  # "..."
```

#### `post_to_bluesky(content: str)`

Post to Bluesky with retry logic.

**Parameters:**
- `content` (str): Tweet content (will be validated and truncated if needed)

**Returns:** None

**Raises:**
- Exception if posting fails after 3 retries

**Example:**
```python
from app.integrations.bluesky_handler import post_to_bluesky, login_to_bluesky

# Login first
login_to_bluesky()

# Post content
try:
    post_to_bluesky("Hello from ChirpSyncer!")
    print("Posted successfully")
except Exception as e:
    print(f"Failed to post: {e}")
```

#### Class: `Post`

Simple Post class for Bluesky posts.

**Attributes:**
- `uri` (str): Post URI
- `text` (str): Post text content

```python
from app.integrations.bluesky_handler import Post

post = Post(
    uri='at://did:plc:abc123/app.bsky.feed.post/xyz789',
    text='Hello world'
)

print(post.uri)
print(post.text)
```

#### `fetch_posts_from_bluesky(username: str, count: int = 10) -> list`

Fetch recent posts from Bluesky user's feed.

**Parameters:**
- `username` (str): Bluesky username (e.g., `'user.bsky.social'`)
- `count` (int): Maximum posts to fetch. Default: `10`

**Returns:**
- `list`: List of Post objects with .text and .uri attributes

**Features:**
- Filters out reposts and quote posts
- Only returns original posts
- Retry logic for network errors

**Example:**
```python
from app.integrations.bluesky_handler import fetch_posts_from_bluesky, login_to_bluesky

# Login first
login_to_bluesky()

# Fetch posts
posts = fetch_posts_from_bluesky('user.bsky.social', count=5)

for post in posts:
    print(f"URI: {post.uri}")
    print(f"Text: {post.text}")
    print("---")
```

#### `post_thread_to_bluesky(tweets: list) -> list`

Post a thread to Bluesky maintaining reply chain.

**Parameters:**
- `tweets` (list): List of TweetAdapter objects representing the thread

**Returns:**
- `list`: List of URIs for the posted tweets

**Features:**
- Maintains reply chain structure
- Rate limiting (1 second between posts)
- Validates and truncates each tweet
- Handles partial failures gracefully

**Example:**
```python
from app.integrations.bluesky_handler import post_thread_to_bluesky, login_to_bluesky
from app.integrations.twitter_scraper import fetch_thread

import asyncio

async def sync_thread():
    # Login to Bluesky
    login_to_bluesky()

    # Fetch Twitter thread
    thread = await fetch_thread('1234567890', 'username')

    # Post to Bluesky
    uris = post_thread_to_bluesky(thread)

    print(f"Posted {len(uris)} tweets to Bluesky")
    for uri in uris:
        print(f"  - {uri}")

asyncio.run(sync_thread())
```

---

### Media Handler

**Location:** `app/integrations/media_handler.py`

Media handling for bidirectional Twitter ↔ Bluesky sync.

#### `async download_media(url: str, media_type: str) -> bytes`

Download media from URL asynchronously.

**Parameters:**
- `url` (str): URL of media to download
- `media_type` (str): Type of media (`'image'` or `'video'`)

**Returns:**
- `bytes`: Downloaded media data

**Raises:**
- `Exception`: If download fails

**Example:**
```python
import asyncio
from app.integrations.media_handler import download_media

async def download():
    media_data = await download_media(
        url='https://example.com/photo.jpg',
        media_type='image'
    )

    print(f"Downloaded {len(media_data)} bytes")

    # Save to file
    with open('photo.jpg', 'wb') as f:
        f.write(media_data)

asyncio.run(download())
```

#### `async upload_media_to_bluesky(media_data: bytes, mime_type: str, alt_text: str = '') -> dict`

Upload media to Bluesky and return blob reference.

**Parameters:**
- `media_data` (bytes): Binary media data
- `mime_type` (str): MIME type (e.g., `'image/jpeg'`, `'video/mp4'`)
- `alt_text` (str): Alternative text for accessibility. Default: `''`

**Returns:**
- `dict`: Blob reference with metadata from Bluesky

**Raises:**
- `Exception`: If upload fails

**Example:**
```python
import asyncio
from app.integrations.media_handler import download_media, upload_media_to_bluesky

async def sync_media():
    # Download from Twitter
    media_data = await download_media(
        'https://twitter.com/photo.jpg',
        'image'
    )

    # Upload to Bluesky
    blob = await upload_media_to_bluesky(
        media_data=media_data,
        mime_type='image/jpeg',
        alt_text='Sunset photo'
    )

    print(f"Uploaded: {blob['blob']['ref']}")

asyncio.run(sync_media())
```

#### `upload_media_to_twitter(media_data: bytes, mime_type: str) -> str`

Upload media to Twitter and return media ID.

**Parameters:**
- `media_data` (bytes): Binary media data
- `mime_type` (str): MIME type

**Returns:**
- `str`: Media ID string from Twitter

**Raises:**
- `Exception`: If upload fails or Twitter API not configured

**Example:**
```python
from app.integrations.media_handler import upload_media_to_twitter

# Read image file
with open('photo.jpg', 'rb') as f:
    media_data = f.read()

# Upload to Twitter
media_id = upload_media_to_twitter(
    media_data=media_data,
    mime_type='image/jpeg'
)

print(f"Twitter media ID: {media_id}")
# Use media_id when posting tweet
```

#### `get_mime_type(url: str) -> str`

Detect MIME type from URL or file extension.

**Parameters:**
- `url` (str): URL or filename

**Returns:**
- `str`: MIME type (e.g., `'image/jpeg'`, `'video/mp4'`)

**Supported Types:**
- Images: .jpg, .jpeg, .png, .gif, .webp
- Videos: .mp4, .mov, .avi

**Example:**
```python
from app.integrations.media_handler import get_mime_type

mime = get_mime_type('https://example.com/photo.jpg')
print(mime)  # 'image/jpeg'

mime = get_mime_type('video.mp4')
print(mime)  # 'video/mp4'

mime = get_mime_type('unknown.xyz')
print(mime)  # 'application/octet-stream'
```

#### `validate_media_size(data: bytes, platform: str) -> bool`

Validate media size against platform limits.

**Parameters:**
- `data` (bytes): Binary media data
- `platform` (str): Target platform (`'bluesky'` or `'twitter'`)

**Returns:**
- `bool`: `True` if within limits, `False` otherwise

**Platform Limits:**
- Bluesky: 1MB for images
- Twitter: 5MB for images

**Example:**
```python
from app.integrations.media_handler import validate_media_size

# Check if image is valid for Bluesky
with open('photo.jpg', 'rb') as f:
    data = f.read()

if validate_media_size(data, 'bluesky'):
    print("Valid for Bluesky")
else:
    print("Too large for Bluesky")

# Check for Twitter
if validate_media_size(data, 'twitter'):
    print("Valid for Twitter")
```

#### `should_process_media(media_urls: list, max_count: int = 4) -> bool`

Check if media should be processed based on count and validity.

**Parameters:**
- `media_urls` (list): List of media URLs
- `max_count` (int): Maximum media items. Default: `4`

**Returns:**
- `bool`: `True` if media should be processed

**Example:**
```python
from app.integrations.media_handler import should_process_media

urls = [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg'
]

if should_process_media(urls, max_count=4):
    # Process media
    pass
```

---

## Web Dashboard

**Location:** `app/web/dashboard.py`

Flask web dashboard with multi-user authentication and management.

### Authentication Routes

#### `POST /login`

Login page and handler.

**Form Parameters:**
- `username` (str): Username
- `password` (str): Password

**Response:**
- Redirect to dashboard on success
- Render login page with error on failure

**Example:**
```html
<form method="POST" action="/login">
    <input type="text" name="username" required>
    <input type="password" name="password" required>
    <button type="submit">Login</button>
</form>
```

#### `POST /logout`

Logout handler.

**Response:**
- Clears session
- Redirects to login page

**Example:**
```html
<form method="POST" action="/logout">
    <button type="submit">Logout</button>
</form>
```

#### `POST /register`

Registration page and handler.

**Form Parameters:**
- `username` (str): Username
- `email` (str): Email address
- `password` (str): Password
- `confirm_password` (str): Password confirmation

**Response:**
- Redirect to login on success
- Render registration page with error on failure

**Example:**
```html
<form method="POST" action="/register">
    <input type="text" name="username" required>
    <input type="email" name="email" required>
    <input type="password" name="password" required>
    <input type="password" name="confirm_password" required>
    <button type="submit">Register</button>
</form>
```

#### `GET /api/auth/check`

Check if user is authenticated (JSON API).

**Response:**
```json
{
    "authenticated": true,
    "user_id": 1,
    "username": "john_doe",
    "is_admin": false
}
```

**Example:**
```javascript
fetch('/api/auth/check')
    .then(res => res.json())
    .then(data => {
        if (data.authenticated) {
            console.log(`Logged in as ${data.username}`);
        }
    });
```

---

### User Management Routes

#### `GET /users`

List all users (admin only).

**Response:**
- Renders user list page

**Access:** Admin only (`@require_admin`)

#### `GET /users/<int:user_id>`

User detail page.

**Path Parameters:**
- `user_id` (int): User ID

**Response:**
- Renders user detail page with credentials

**Access:** Own profile or admin (`@require_self_or_admin`)

#### `POST /users/<int:user_id>/edit`

Edit user.

**Path Parameters:**
- `user_id` (int): User ID

**Form Parameters:**
- `email` (str): New email
- `password` (str): New password
- `is_active` (str): Active status ('1' or '0') - admin only
- `is_admin` (str): Admin status ('1' or '0') - admin only

**Response:**
- Redirects to user detail page

**Access:** Own profile or admin

#### `POST /users/<int:user_id>/delete`

Delete user.

**Path Parameters:**
- `user_id` (int): User ID

**Response:**
- Redirects to users list

**Access:** Admin only

---

### Credential Management Routes

#### `GET /credentials`

List user's credentials.

**Response:**
- Renders credentials management page
- Shows owned and shared credentials

**Access:** Authenticated users

#### `POST /credentials/add`

Add new credentials.

**Form Parameters:**
- `platform` (str): `'twitter'` or `'bluesky'`
- `credential_type` (str): `'scraping'` or `'api'`
- Additional fields based on platform/type

**Twitter Scraping:**
- `username`, `password`, `email`, `email_password`

**Twitter API:**
- `api_key`, `api_secret`, `access_token`, `access_secret`

**Bluesky:**
- `username`, `password`

**Response:**
- Redirects to credentials list

#### `POST /credentials/<int:cred_id>/edit`

Edit credentials.

**Path Parameters:**
- `cred_id` (int): Credential ID

**Response:**
- Redirects to credentials list

#### `POST /credentials/<int:cred_id>/delete`

Delete credentials.

**Path Parameters:**
- `cred_id` (int): Credential ID

**Response:**
- Redirects to credentials list

#### `POST /credentials/<int:cred_id>/test`

Test credentials.

**Path Parameters:**
- `cred_id` (int): Credential ID

**Response:**
```json
{
    "success": true,
    "message": "Credentials loaded successfully",
    "platform": "twitter",
    "credential_type": "scraping"
}
```

#### `POST /credentials/share`

Share credentials with other users.

**Form Parameters:**
- `credential_id` (int): Credential ID to share
- `user_ids` (str): Comma-separated list of user IDs

**Response:**
- Redirects to credentials list

---

### Analytics Routes

#### `GET /analytics`

Analytics dashboard page.

**Response:**
- Renders analytics dashboard

**Access:** Authenticated users

#### `GET /api/analytics/overview`

Get analytics overview (JSON API).

**Response:**
```json
{
    "success": true,
    "daily": {
        "user_id": 1,
        "period": "daily",
        "total_tweets": 10,
        "total_impressions": 5000,
        "total_engagements": 250,
        "avg_engagement_rate": 5.0
    },
    "weekly": { ... },
    "monthly": { ... },
    "top_tweet": { ... }
}
```

**Example:**
```javascript
fetch('/api/analytics/overview')
    .then(res => res.json())
    .then(data => {
        console.log(`Daily tweets: ${data.daily.total_tweets}`);
        console.log(`Weekly engagement: ${data.weekly.total_engagements}`);
    });
```

#### `GET /api/analytics/top-tweets`

Get top performing tweets (JSON API).

**Query Parameters:**
- `metric` (str): Metric to sort by. Default: `'engagement_rate'`
- `limit` (int): Maximum tweets. Default: `10`

**Response:**
```json
{
    "success": true,
    "tweets": [
        {
            "tweet_id": "1234567890",
            "likes": 100,
            "retweets": 20,
            "engagement_rate": 8.5
        }
    ],
    "metric": "engagement_rate",
    "count": 10
}
```

**Example:**
```javascript
fetch('/api/analytics/top-tweets?metric=likes&limit=5')
    .then(res => res.json())
    .then(data => {
        data.tweets.forEach(tweet => {
            console.log(`Tweet ${tweet.tweet_id}: ${tweet.likes} likes`);
        });
    });
```

#### `POST /api/analytics/record-metrics`

Record metrics for a tweet (JSON API).

**Request Body:**
```json
{
    "tweet_id": "1234567890",
    "metrics": {
        "impressions": 1000,
        "likes": 50,
        "retweets": 10,
        "replies": 5,
        "engagements": 65
    }
}
```

**Response:**
```json
{
    "success": true,
    "tweet_id": "1234567890"
}
```

**Example:**
```javascript
fetch('/api/analytics/record-metrics', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        tweet_id: '1234567890',
        metrics: {
            impressions: 1000,
            likes: 50,
            retweets: 10,
            replies: 5,
            engagements: 65
        }
    })
})
.then(res => res.json())
.then(data => console.log('Metrics recorded:', data.success));
```

#### `POST /api/analytics/create-snapshot`

Create analytics snapshot (JSON API).

**Request Body:**
```json
{
    "period": "daily"
}
```

**Response:**
```json
{
    "success": true,
    "period": "daily"
}
```

---

### Task Management Routes

#### `GET /tasks`

List all scheduled tasks with status.

**Response:**
- Renders task list page

**Access:** Authenticated users

#### `GET /tasks/<task_name>`

Show task execution history and details.

**Path Parameters:**
- `task_name` (str): Task name

**Response:**
- Renders task detail page

#### `POST /tasks/<task_name>/trigger`

Manually trigger a task now.

**Path Parameters:**
- `task_name` (str): Task name

**Response:**
- Redirects to task detail page

**Access:** Admin only

#### `POST /tasks/<task_name>/toggle`

Enable or disable a task.

**Path Parameters:**
- `task_name` (str): Task name

**Response:**
```json
{
    "success": true,
    "action": "paused"
}
```

**Access:** Admin only

#### `POST /tasks/<task_name>/configure`

Update task schedule.

**Path Parameters:**
- `task_name` (str): Task name

**Form Parameters:**
- `schedule` (str): New cron schedule

**Response:**
- Redirects to task detail page

**Access:** Admin only

#### `GET /api/tasks/status`

Get current task status (JSON API).

**Response:**
```json
{
    "tasks": [
        {
            "name": "cleanup_sessions",
            "enabled": true,
            "next_run": 1640000000,
            "last_run": 1639999000
        }
    ],
    "count": 5
}
```

---

## Core Utilities

### Database Handler

**Location:** `app/core/db_handler.py`

Database utilities for ChirpSyncer.

#### `initialize_db(db_path=None)`

Initialize database with required tables.

**Parameters:**
- `db_path` (str, optional): Database path. Default: `'data.db'`

**Tables Created:**
- `seen_tweets`: Tracks seen tweet IDs
- `api_usage`: Stores API rate limit info

**Example:**
```python
from app.core.db_handler import initialize_db

initialize_db('/path/to/database.db')
```

#### `is_tweet_seen(tweet_id, conn=None) -> bool`

Check if tweet has been seen.

**Parameters:**
- `tweet_id` (str): Tweet ID
- `conn` (optional): Database connection

**Returns:**
- `bool`: `True` if seen, `False` otherwise

**Example:**
```python
from app.core.db_handler import is_tweet_seen

if is_tweet_seen('1234567890'):
    print("Already processed this tweet")
```

#### `mark_tweet_as_seen(tweet_id, conn=None)`

Mark tweet as seen.

**Parameters:**
- `tweet_id` (str): Tweet ID
- `conn` (optional): Database connection

**Example:**
```python
from app.core.db_handler import mark_tweet_as_seen

mark_tweet_as_seen('1234567890')
```

#### `migrate_database(db_path=None)`

Migrate from seen_tweets to synced_posts schema.

**Parameters:**
- `db_path` (str, optional): Database path

**Tables Created:**
- `synced_posts`: Full metadata tracking for bidirectional sync

**Example:**
```python
from app.core.db_handler import migrate_database

migrate_database()
```

#### `add_stats_tables(db_path=None)`

Create sync_stats and hourly_stats tables.

**Parameters:**
- `db_path` (str, optional): Database path

**Tables Created:**
- `sync_stats`: Detailed sync tracking
- `hourly_stats`: Aggregated hourly metrics

**Example:**
```python
from app.core.db_handler import add_stats_tables

add_stats_tables()
```

#### `should_sync_post(content: str, source: str, post_id: str, db_path=None) -> bool`

Check if post should be synced (not a duplicate).

**Parameters:**
- `content` (str): Post text content
- `source` (str): `'twitter'` or `'bluesky'`
- `post_id` (str): Platform-specific ID
- `db_path` (str, optional): Database path

**Returns:**
- `bool`: `True` if should sync, `False` if duplicate

**Example:**
```python
from app.core.db_handler import should_sync_post

if should_sync_post('Hello world', 'twitter', '1234567890'):
    # Sync this post
    pass
```

#### `save_synced_post(twitter_id=None, bluesky_uri=None, source=None, synced_to=None, content=None, db_path=None)`

Save synced post to database.

**Parameters:**
- `twitter_id` (str, optional): Twitter tweet ID
- `bluesky_uri` (str, optional): Bluesky post URI
- `source` (str): `'twitter'` or `'bluesky'`
- `synced_to` (str): `'bluesky'`, `'twitter'`, or `'both'`
- `content` (str): Original post text
- `db_path` (str, optional): Database path

**Example:**
```python
from app.core.db_handler import save_synced_post

save_synced_post(
    twitter_id='1234567890',
    bluesky_uri='at://did:plc:abc/app.bsky.feed.post/xyz',
    source='twitter',
    synced_to='bluesky',
    content='Hello world'
)
```

#### `get_post_by_hash(content_hash: str, db_path=None)`

Get post by content hash.

**Parameters:**
- `content_hash` (str): SHA256 hash of content
- `db_path` (str, optional): Database path

**Returns:**
- Tuple of post data or None

**Example:**
```python
from app.core.db_handler import get_post_by_hash
from app.core.utils import compute_content_hash

hash = compute_content_hash('Hello world')
post = get_post_by_hash(hash)

if post:
    print(f"Found post: {post}")
```

---

### Utils

**Location:** `app/core/utils.py`

Utility functions.

#### `compute_content_hash(text: str) -> str`

Compute SHA256 hash of normalized content.

**Parameters:**
- `text` (str): Text content to hash

**Returns:**
- `str`: SHA256 hash as hexadecimal string

**Normalization:**
- Lowercase
- Strip whitespace
- Remove URLs
- Normalize whitespace

**Example:**
```python
from app.core.utils import compute_content_hash

hash1 = compute_content_hash('Hello World')
hash2 = compute_content_hash('hello world')
hash3 = compute_content_hash('Hello   World  https://example.com')

print(hash1 == hash2 == hash3)  # True (normalized)
```

---

### Logger

**Location:** `app/core/logger.py`

Logging utilities.

#### `setup_logger(name) -> logging.Logger`

Setup logger with rotation and formatting.

**Parameters:**
- `name` (str): Logger name (typically `__name__`)

**Returns:**
- `logging.Logger`: Configured logger instance

**Configuration:**
- Format: `'%(asctime)s - %(name)s - %(levelname)s - %(message)s'`
- Console handler: INFO level
- File handler: DEBUG level, rotate at 10MB, keep 5 backups
- File location: `logs/chirpsyncer.log`

**Example:**
```python
from app.core.logger import setup_logger

logger = setup_logger(__name__)

logger.debug('Debug message')
logger.info('Info message')
logger.warning('Warning message')
logger.error('Error message')
logger.critical('Critical message')
```

---

### Configuration

**Location:** `app/core/config.py`

Configuration variables from environment.

**Variables:**
- `TWITTER_USERNAME`: Twitter username for scraping
- `TWITTER_PASSWORD`: Twitter password
- `TWITTER_EMAIL`: Twitter email
- `TWITTER_EMAIL_PASSWORD`: Twitter email password
- `BSKY_USERNAME`: Bluesky username
- `BSKY_PASSWORD`: Bluesky password
- `POLL_INTERVAL`: Polling interval in seconds (default: 25,920 = 7.2 hours)

**Example:**
```python
from app.core.config import TWITTER_USERNAME, BSKY_USERNAME, POLL_INTERVAL

print(f"Twitter: {TWITTER_USERNAME}")
print(f"Bluesky: {BSKY_USERNAME}")
print(f"Poll interval: {POLL_INTERVAL} seconds")
```

---

## Maintenance Tasks

**Location:** `app/features/maintenance_tasks.py`

Scheduled maintenance tasks for database cleanup and backups.

### `cleanup_expired_sessions(db_path: str = DB_PATH) -> Dict`

Delete sessions with expires_at < current time.

**Parameters:**
- `db_path` (str): Database path

**Returns:**
```python
{
    'deleted': int,
    'duration_ms': int
}
```

**Example:**
```python
from app.features.maintenance_tasks import cleanup_expired_sessions

result = cleanup_expired_sessions()
print(f"Deleted {result['deleted']} expired sessions")
```

### `archive_audit_logs(days_old: int = 90, db_path: str = DB_PATH) -> Dict`

Archive audit logs older than X days.

**Parameters:**
- `days_old` (int): Age threshold in days. Default: `90`
- `db_path` (str): Database path

**Returns:**
```python
{
    'archived': int,
    'duration_ms': int
}
```

**Example:**
```python
from app.features.maintenance_tasks import archive_audit_logs

result = archive_audit_logs(days_old=30)
print(f"Archived {result['archived']} log entries")
```

### `backup_database(backup_dir: str = 'backups', db_path: str = DB_PATH) -> Dict`

Create timestamped database backup.

**Parameters:**
- `backup_dir` (str): Backup directory. Default: `'backups'`
- `db_path` (str): Database path

**Returns:**
```python
{
    'backup_path': str,
    'size_bytes': int,
    'duration_ms': int
}
```

**Example:**
```python
from app.features.maintenance_tasks import backup_database

result = backup_database()
print(f"Backup created: {result['backup_path']}")
print(f"Size: {result['size_bytes'] / 1024 / 1024:.2f} MB")
```

### `cleanup_inactive_credentials(months: int = 6, db_path: str = DB_PATH) -> Dict`

Mark credentials as inactive if last_used > X months ago.

**Parameters:**
- `months` (int): Age threshold in months. Default: `6`
- `db_path` (str): Database path

**Returns:**
```python
{
    'marked_inactive': int,
    'duration_ms': int
}
```

**Example:**
```python
from app.features.maintenance_tasks import cleanup_inactive_credentials

result = cleanup_inactive_credentials(months=3)
print(f"Marked {result['marked_inactive']} credentials as inactive")
```

### `aggregate_daily_stats(db_path: str = DB_PATH) -> Dict`

Aggregate sync_stats into daily summary.

**Parameters:**
- `db_path` (str): Database path

**Returns:**
```python
{
    'aggregated': int,
    'duration_ms': int
}
```

**Example:**
```python
from app.features.maintenance_tasks import aggregate_daily_stats

result = aggregate_daily_stats()
print(f"Aggregated {result['aggregated']} daily stats")
```

### `cleanup_error_logs(days_old: int = 30, db_path: str = DB_PATH) -> Dict`

Delete audit log errors older than X days.

**Parameters:**
- `days_old` (int): Age threshold in days. Default: `30`
- `db_path` (str): Database path

**Returns:**
```python
{
    'deleted': int,
    'duration_ms': int
}
```

**Example:**
```python
from app.features.maintenance_tasks import cleanup_error_logs

result = cleanup_error_logs(days_old=7)
print(f"Deleted {result['deleted']} error logs")
```

### `setup_default_tasks(scheduler)`

Register all default maintenance tasks with scheduler.

**Parameters:**
- `scheduler`: TaskScheduler instance

**Default Tasks:**
- `cleanup_sessions`: Every hour
- `backup_database`: Daily at 3 AM
- `archive_audit_logs`: Daily at 2 AM
- `aggregate_daily_stats`: Daily at 1 AM
- `cleanup_error_logs`: Weekly on Sunday at 4 AM
- `cleanup_inactive_credentials`: Monthly on 1st at 5 AM

**Example:**
```python
from app.features.maintenance_tasks import setup_default_tasks
from app.services.task_scheduler import TaskScheduler

scheduler = TaskScheduler()
setup_default_tasks(scheduler)
scheduler.start()
```

---

## Common Workflows

### User Registration and Authentication

```python
from app.auth.user_manager import UserManager

# Initialize
user_manager = UserManager('chirpsyncer.db')
user_manager.init_db()

# Register new user
try:
    user_id = user_manager.create_user(
        username='john_doe',
        email='john@example.com',
        password='SecureP@ss123'
    )
    print(f"User created: {user_id}")
except ValueError as e:
    print(f"Registration failed: {e}")

# Login
user = user_manager.authenticate_user('john_doe', 'SecureP@ss123')
if user:
    # Create session
    session_token = user_manager.create_session(
        user_id=user.id,
        ip_address='192.168.1.100',
        user_agent='Mozilla/5.0...'
    )
    print(f"Session token: {session_token}")
```

### Storing and Retrieving Credentials

```python
from app.auth.credential_manager import CredentialManager
import os

# Initialize with master key
master_key = os.urandom(32)
cred_manager = CredentialManager(master_key, 'chirpsyncer.db')
cred_manager.init_db()

# Save Twitter credentials
twitter_creds = {
    'username': 'mytwitter',
    'password': 'mypassword',
    'email': 'email@example.com',
    'email_password': 'emailpass'
}

cred_manager.save_credentials(
    user_id=1,
    platform='twitter',
    credential_type='scraping',
    data=twitter_creds
)

# Retrieve credentials
creds = cred_manager.get_credentials(1, 'twitter', 'scraping')
print(f"Username: {creds['username']}")
```

### Tracking Analytics

```python
from app.features.analytics_tracker import AnalyticsTracker

# Initialize
tracker = AnalyticsTracker('chirpsyncer.db')
tracker.init_db()

# Record metrics
tracker.record_metrics(
    tweet_id='1234567890',
    user_id=1,
    metrics={
        'impressions': 1000,
        'likes': 50,
        'retweets': 10,
        'replies': 5,
        'engagements': 65
    }
)

# Get analytics
daily = tracker.get_user_analytics(user_id=1, period='daily')
print(f"Daily tweets: {daily['total_tweets']}")
print(f"Engagement rate: {daily['avg_engagement_rate']}%")

# Get top tweets
top_tweets = tracker.get_top_tweets(user_id=1, metric='engagement_rate', limit=5)
for tweet in top_tweets:
    print(f"Tweet {tweet['tweet_id']}: {tweet['engagement_rate']}%")
```

### Scheduling Tweets

```python
from app.features.tweet_scheduler import TweetScheduler
from datetime import datetime, timedelta

# Initialize
scheduler = TweetScheduler('chirpsyncer.db')
scheduler.init_db()

# Schedule tweet for 2 hours from now
scheduled_time = datetime.now() + timedelta(hours=2)
tweet_id = scheduler.schedule_tweet(
    user_id=1,
    content="Scheduled tweet content",
    scheduled_time=scheduled_time,
    media=['/path/to/image.jpg']
)

# Get scheduled tweets
pending = scheduler.get_scheduled_tweets(user_id=1, status='pending')
for tweet in pending:
    print(f"Scheduled: {tweet['content'][:50]}...")

# Process queue (normally called by cron)
stats = scheduler.process_queue()
print(f"Posted {stats['successful']} tweets")
```

### Creating Cleanup Rules

```python
from app.features.cleanup_engine import CleanupEngine
from app.auth.credential_manager import CredentialManager

# Initialize with credential manager for real API access
cred_mgr = CredentialManager('chirpsyncer.db')
engine = CleanupEngine('chirpsyncer.db', credential_manager=cred_mgr)
engine.init_db()

# Create age-based rule
rule_id = engine.create_rule(
    user_id=1,
    name='Delete old tweets',
    rule_type='age',
    config={
        'max_age_days': 30,
        'exclude_with_replies': True
    }
)

# Preview cleanup (fetches real tweets via twscrape)
preview = engine.preview_cleanup(user_id=1, rule_id=rule_id)
print(f"Would delete {preview['count']} tweets")

# Execute with dry run first
result = engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=True)
print(f"Dry run: would delete {result['would_delete']} tweets")

# Execute for real if acceptable (deletes via Twitter API v2)
# Note: Rate limited to 50 deletes per 15 minutes
if result['would_delete'] < 100:
    result = engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=False)
    print(f"Deleted {result['tweets_deleted']} tweets")
```

### Managing Saved Content

```python
from app.features.saved_content import SavedContentManager

# Initialize
manager = SavedContentManager('chirpsyncer.db')
manager.init_db()

# Create collection
collection_id = manager.create_collection(
    user_id=1,
    name='Python Resources',
    description='Useful Python tutorials'
)

# Save tweets to collection
manager.save_tweet(
    user_id=1,
    tweet_id='1234567890',
    collection_id=collection_id,
    notes='Great tutorial on asyncio'
)

# Search saved tweets
results = manager.search_saved(user_id=1, query='python')
for tweet in results:
    print(f"Found: {tweet['tweet_id']} - {tweet['notes']}")

# Export to JSON
json_export = manager.export_to_json(user_id=1, collection_id=collection_id)
with open('saved.json', 'w') as f:
    f.write(json_export)
```

### Full-Text Search

```python
from app.features.search_engine import SearchEngine

# Initialize
search = SearchEngine('chirpsyncer.db')
search.init_fts_index()

# Index tweets
search.index_tweet(
    tweet_id='1234567890',
    user_id=1,
    content='Exploring full-text search with SQLite FTS5',
    hashtags='#sqlite #fts5',
    author='john_doe'
)

# Search with various queries
results = search.search('sqlite tutorial', user_id=1)
for result in results:
    print(f"{result['content'][:50]}... (rank: {result['rank']})")

# Advanced search with filters
import time
filters = {
    'date_from': int(time.time()) - (7 * 86400),  # Last 7 days
    'hashtags': ['python']
}

results = search.search_with_filters('tutorial', user_id=1, filters=filters)
```

### Generating Reports

```python
from app.features.report_generator import ReportGenerator

# Initialize
generator = ReportGenerator('chirpsyncer.db')

# Generate engagement report
html_report = generator.generate_engagement_report(
    user_id=1,
    period='week',
    format='html'
)

with open('weekly_report.html', 'wb') as f:
    f.write(html_report)

# Generate CSV report
csv_report = generator.generate_engagement_report(
    user_id=1,
    period='month',
    format='csv'
)

# Email report
result = generator.generate_and_email_engagement_report(
    user_id=1,
    period='week',
    format='pdf',
    recipient_email='user@example.com'
)

if result['success']:
    print("Report emailed successfully")
```

### Twitter ↔ Bluesky Sync

```python
import asyncio
from app.integrations.twitter_scraper import fetch_tweets, fetch_thread, is_thread
from app.integrations.bluesky_handler import login_to_bluesky, post_to_bluesky, post_thread_to_bluesky

async def sync_tweets():
    # Login to Bluesky
    login_to_bluesky()

    # Fetch tweets from Twitter
    tweets = fetch_tweets(count=5)

    for tweet in tweets:
        # Check if it's a thread
        if await is_thread(tweet._tweet):
            # Fetch full thread
            thread = await fetch_thread(str(tweet.id), 'username')

            # Post thread to Bluesky
            uris = post_thread_to_bluesky(thread)
            print(f"Posted thread: {len(uris)} tweets")
        else:
            # Post single tweet
            post_to_bluesky(tweet.text)
            print(f"Posted tweet: {tweet.id}")

# Run sync
asyncio.run(sync_tweets())
```

### Running Flask Dashboard

```python
from app.web.dashboard import create_app
import os

# Generate master key
master_key = os.urandom(32)
print(f"Master key (save this): {master_key.hex()}")

# Create app
app = create_app(
    db_path='chirpsyncer.db',
    master_key=master_key
)

# Run server
app.run(host='0.0.0.0', port=5000, debug=False)
```

---

## Security Considerations

### Password Security
- All passwords are hashed with bcrypt (cost factor 12)
- Password validation enforces strong requirements
- Failed login attempts are logged in audit log
- Rate limiting prevents brute force attacks

### Credential Encryption
- Credentials encrypted with AES-256-GCM
- Master key must be 32 bytes (256 bits)
- Each credential has unique IV (initialization vector)
- Authentication tags prevent tampering
- **Critical:** Master key loss = credential loss

### Session Management
- Session tokens are 32-byte URL-safe random tokens
- Sessions expire after 7 days by default
- Expired sessions automatically deleted
- Session validation checks expiration

### Rate Limiting
- Login: 5 attempts per 15 minutes
- API calls: 100 requests per minute
- Configurable per action type
- In-memory sliding window approach

### Audit Logging
- All authentication events logged
- Credential operations logged
- User modifications logged
- Stores IP address and user agent
- Failed operations logged with details

### Authorization
- `@require_auth`: Requires authentication
- `@require_admin`: Requires admin privileges
- `@require_self_or_admin`: Own resource or admin
- User isolation in all queries
- Cascade deletion of user data

### Best Practices
1. **Master Key Management:**
   - Store in environment variable or secure vault
   - Never commit to version control
   - Rotate periodically
   - Keep secure backups

2. **Database Security:**
   - Use parameterized queries (prevents SQL injection)
   - Enable foreign key constraints
   - Regular backups
   - Restrict file permissions

3. **Session Security:**
   - Use HTTPS in production
   - Set secure cookie flags
   - Implement CSRF protection
   - Clear sessions on logout

4. **Credential Sharing:**
   - Shared credentials are read-only copies
   - Owner can revoke by updating original
   - Track sharing in audit log
   - Verify ownership before sharing

---

## Error Handling

### Common Exceptions

**ValueError:**
- Invalid password format
- Duplicate username/email
- Invalid time (past scheduled time)
- Invalid platform/credential type
- Invalid configuration

**Exception:**
- Database errors
- Network errors (API calls)
- Encryption/decryption failures
- Authentication failures

### Best Practices

```python
# Proper error handling example
from app.auth.user_manager import UserManager

user_manager = UserManager()

try:
    user_id = user_manager.create_user(
        username='john',
        email='john@example.com',
        password='weak'  # Will fail validation
    )
except ValueError as e:
    print(f"Validation error: {e}")
    # Show user-friendly error message
except Exception as e:
    print(f"Unexpected error: {e}")
    # Log error and show generic message
```

### Logging Errors

```python
from app.core.logger import setup_logger

logger = setup_logger(__name__)

try:
    # Some operation
    pass
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)
    # exc_info=True includes full traceback
```

### API v1 Error Codes

The REST API v1 uses standardized error responses with the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { }
  }
}
```

All error responses include a `X-Correlation-Id` header for request tracing.

#### Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body or missing required fields |
| `VALIDATION_ERROR` | 400 | Request data failed validation (details include field errors) |
| `INVALID_CREDENTIALS` | 401 | Username or password is incorrect |
| `TOKEN_EXPIRED` | 401 | JWT token has expired, client should re-authenticate |
| `INVALID_TOKEN` | 401 | JWT token is malformed or signature invalid |
| `UNAUTHORIZED` | 401 | Authentication required but not provided |
| `FORBIDDEN` | 403 | Authenticated but lacking permission for this action |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `REGISTRATION_FAILED` | 400 | User registration failed (username/email taken, weak password) |
| `RATE_LIMITED` | 429 | Too many requests, retry after cooldown |
| `INTERNAL_ERROR` | 500 | Unexpected server error (details sanitized in production) |

#### Example Error Responses

**Invalid credentials:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

**Validation error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "password": "Password must be at least 8 characters"
      }
    }
  }
}
```

**Token expired:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired"
  }
}
```

---

## Performance Optimization

### Database Indexing
- All tables have appropriate indexes
- Foreign keys indexed
- Common query fields indexed
- Composite indexes where needed

### Query Optimization
- Use parameterized queries
- Limit result sets with `LIMIT`
- Use `WHERE` clauses for filtering
- Avoid `SELECT *` when possible

### Caching
- Rate limiter uses in-memory cache
- Session validation caches user data
- Search results can be cached

### Connection Management
- Close connections after use
- Use connection pooling for high traffic
- Reuse connections when appropriate

### Batch Operations
- Process queue in batches
- Bulk insert for analytics
- Transaction batching

---

## Version History

**Version 1.0 (2026-01-12)**
- Initial comprehensive API documentation
- Coverage of all modules and classes
- Detailed examples and workflows
- Security and performance sections

---

## Support and Contributing

For issues, feature requests, or contributions, please visit:
- GitHub: [ChirpSyncer Repository](https://github.com/lucimart/ChirpSyncer)
- Documentation: See `docs/` directory for additional guides
- Issues: Report bugs via GitHub Issues

---

**End of API Documentation**

#!/usr/bin/env python3
"""
Migration Script: Single-User to Multi-User (Sprint 6)

Migrates ChirpSyncer from single-user mode to multi-user mode:
1. Creates admin user from .env credentials
2. Migrates existing credentials to encrypted storage
3. Updates database schema with user_id columns
4. Assigns existing data to admin user
5. Verifies migration integrity
"""
import os
import sys
import sqlite3
import time
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.services.user_settings import UserSettings
from dotenv import load_dotenv


def load_env_credentials():
    """Load credentials from .env file"""
    load_dotenv()

    credentials = {
        "twitter": {
            "username": os.getenv("TWITTER_USERNAME"),
            "password": os.getenv("TWITTER_PASSWORD"),
            "email": os.getenv("TWITTER_EMAIL"),
            "email_password": os.getenv("TWITTER_EMAIL_PASSWORD"),
        },
        "bluesky": {
            "username": os.getenv("BLUESKY_USERNAME"),
            "password": os.getenv("BLUESKY_PASSWORD"),
        },
    }

    return credentials


def create_admin_user(user_manager: UserManager, credentials: dict) -> int:
    """
    Create admin user from .env credentials.

    Returns:
        User ID of created admin user
    """
    print("\n[1/5] Creating admin user...")

    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@chirpsyncer.local")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_password:
        # Generate random password if not provided
        import secrets
        import string

        alphabet = string.ascii_letters + string.digits + string.punctuation
        admin_password = "".join(secrets.choice(alphabet) for i in range(16))

        # Write password to secure file instead of logging it
        password_file = ".admin_password_GENERATED.txt"
        with open(password_file, "w") as f:
            f.write(f"Generated Admin Password: {admin_password}\n")
            f.write(f"Username: {admin_username}\n")
            f.write(f"Email: {admin_email}\n")
            f.write(f"\nIMPORTANT: Delete this file after saving the password!\n")
        os.chmod(password_file, 0o600)  # Owner read/write only

        print(f"  ⚠️  Generated admin password saved to: {password_file}")
        print(f"  ⚠️  File permissions: 600 (owner read/write only)")
        print(f"  ⚠️  SAVE THIS PASSWORD and DELETE the file!")

    try:
        admin_id = user_manager.create_user(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            is_admin=True,
        )
        print(f"  ✓ Admin user created with ID: {admin_id}")
        print(f"    Username: {admin_username}")
        print(f"    Email: {admin_email}")
        return admin_id

    except ValueError as e:
        # User might already exist
        print(f"  ℹ️  Admin user might already exist: {e}")
        user = user_manager.get_user_by_username(admin_username)
        if user:
            print(f"  ✓ Using existing admin user with ID: {user.id}")
            return user.id
        raise


def migrate_credentials(
    admin_id: int, credentials: dict, cred_manager: CredentialManager
):
    """Migrate credentials from .env to encrypted storage"""
    print("\n[2/5] Migrating credentials to encrypted storage...")

    # Migrate Twitter credentials
    if credentials["twitter"]["username"]:
        try:
            cred_manager.save_credentials(
                user_id=admin_id,
                platform="twitter",
                credential_type="scraping",
                data=credentials["twitter"],
            )
            print("  ✓ Twitter scraping credentials migrated")
        except Exception as e:
            print(f"  ⚠️  Twitter credentials migration failed: {e}")

    # Migrate Bluesky credentials
    if credentials["bluesky"]["username"]:
        try:
            cred_manager.save_credentials(
                user_id=admin_id,
                platform="bluesky",
                credential_type="api",
                data=credentials["bluesky"],
            )
            print("  ✓ Bluesky credentials migrated")
        except Exception as e:
            print(f"  ⚠️  Bluesky credentials migration failed: {e}")


def update_database_schema(db_path: str = "chirpsyncer.db"):
    """Update database schema to add user_id columns"""
    print("\n[3/5] Updating database schema...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check which tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]

        # Add user_id to synced_posts if table exists
        if "synced_posts" in existing_tables:
            try:
                cursor.execute(
                    "ALTER TABLE synced_posts ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )
                print("  ✓ Added user_id to synced_posts")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print("  ℹ️  user_id already exists in synced_posts")
                else:
                    raise
        else:
            print("  ℹ️  synced_posts table doesn't exist yet (will be created by app)")

        # Add user_id to sync_stats if table exists
        if "sync_stats" in existing_tables:
            try:
                cursor.execute(
                    "ALTER TABLE sync_stats ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )
                print("  ✓ Added user_id to sync_stats")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print("  ℹ️  user_id already exists in sync_stats")
                else:
                    raise
        else:
            print("  ℹ️  sync_stats table doesn't exist yet (will be created by app)")

        # Add user_id to hourly_stats if table exists
        if "hourly_stats" in existing_tables:
            try:
                cursor.execute(
                    "ALTER TABLE hourly_stats ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )
                print("  ✓ Added user_id to hourly_stats")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print("  ℹ️  user_id already exists in hourly_stats")
                else:
                    raise
        else:
            print("  ℹ️  hourly_stats table doesn't exist yet (will be created by app)")

        # Create indexes only for existing tables
        if "synced_posts" in existing_tables:
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_synced_posts_user ON synced_posts(user_id)"
            )
        if "sync_stats" in existing_tables:
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_sync_stats_user ON sync_stats(user_id)"
            )
        if "hourly_stats" in existing_tables:
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_hourly_stats_user ON hourly_stats(user_id)"
            )
        print("  ✓ Created indexes on user_id columns (for existing tables)")

        conn.commit()
        print("  ✓ Database schema updated")

    except Exception as e:
        conn.rollback()
        print(f"  ✗ Schema update failed: {e}")
        raise
    finally:
        conn.close()


def assign_existing_data_to_admin(admin_id: int, db_path: str = "chirpsyncer.db"):
    """Assign all existing data to admin user"""
    print("\n[4/5] Assigning existing data to admin user...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check which tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]

        # Update synced_posts if exists
        if "synced_posts" in existing_tables:
            cursor.execute(
                "UPDATE synced_posts SET user_id = ? WHERE user_id IS NULL", (admin_id,)
            )
            posts_updated = cursor.rowcount
            print(f"  ✓ Assigned {posts_updated} posts to admin")
        else:
            print("  ℹ️  No synced_posts to assign (table doesn't exist yet)")

        # Update sync_stats if exists
        if "sync_stats" in existing_tables:
            cursor.execute(
                "UPDATE sync_stats SET user_id = ? WHERE user_id IS NULL", (admin_id,)
            )
            stats_updated = cursor.rowcount
            print(f"  ✓ Assigned {stats_updated} sync stats to admin")
        else:
            print("  ℹ️  No sync_stats to assign (table doesn't exist yet)")

        # Update hourly_stats if exists
        if "hourly_stats" in existing_tables:
            cursor.execute(
                "UPDATE hourly_stats SET user_id = ? WHERE user_id IS NULL", (admin_id,)
            )
            hourly_updated = cursor.rowcount
            print(f"  ✓ Assigned {hourly_updated} hourly stats to admin")
        else:
            print("  ℹ️  No hourly_stats to assign (table doesn't exist yet)")

        conn.commit()
        print("  ✓ Data assignment complete")

    except Exception as e:
        conn.rollback()
        print(f"  ✗ Data assignment failed: {e}")
        raise
    finally:
        conn.close()


def verify_migration(admin_id: int, db_path: str = "chirpsyncer.db"):
    """Verify migration integrity"""
    print("\n[5/5] Verifying migration...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check admin user exists
        cursor.execute(
            "SELECT id, username, is_admin FROM users WHERE id = ?", (admin_id,)
        )
        admin = cursor.fetchone()
        assert admin, "Admin user not found"
        assert admin[2] == 1, "User is not admin"
        print(f"  ✓ Admin user verified (ID: {admin_id}, username: {admin[1]})")

        # Check credentials
        cursor.execute(
            "SELECT COUNT(*) FROM user_credentials WHERE user_id = ?", (admin_id,)
        )
        cred_count = cursor.fetchone()[0]
        print(f"  ✓ Found {cred_count} credentials for admin")

        # Check which tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]

        # Check data assignment only for existing tables
        if "synced_posts" in existing_tables:
            cursor.execute(
                "SELECT COUNT(*) FROM synced_posts WHERE user_id = ?", (admin_id,)
            )
            posts = cursor.fetchone()[0]
            print(f"  ✓ Admin owns {posts} synced posts")

            cursor.execute("SELECT COUNT(*) FROM synced_posts WHERE user_id IS NULL")
            orphaned_posts = cursor.fetchone()[0]
            if orphaned_posts > 0:
                print(f"  ⚠️  Warning: {orphaned_posts} posts without user_id")
        else:
            print("  ℹ️  No synced_posts table to verify (will be created by app)")

        if "sync_stats" in existing_tables:
            cursor.execute(
                "SELECT COUNT(*) FROM sync_stats WHERE user_id = ?", (admin_id,)
            )
            stats = cursor.fetchone()[0]
            print(f"  ✓ Admin owns {stats} sync stats")
        else:
            print("  ℹ️  No sync_stats table to verify (will be created by app)")

        print("  ✓ Migration verification complete")

    except Exception as e:
        print(f"  ✗ Verification failed: {e}")
        raise
    finally:
        conn.close()


def main():
    """Main migration function"""
    print("=" * 60)
    print("ChirpSyncer: Single-User to Multi-User Migration")
    print("=" * 60)

    db_path = "chirpsyncer.db"

    # Check database exists
    if not Path(db_path).exists():
        print(f"\n✗ Database not found: {db_path}")
        print("  Please run ChirpSyncer at least once to create the database.")
        sys.exit(1)

    # Backup database
    import shutil

    backup_path = f"{db_path}.backup.{int(time.time())}"
    shutil.copy2(db_path, backup_path)
    print(f"\n✓ Database backed up to: {backup_path}")

    try:
        # Initialize managers
        user_manager = UserManager(db_path)
        user_manager.init_db()

        # Get master key from environment
        master_key = os.getenv("SECRET_KEY", "default-secret-key-change-me").encode(
            "utf-8"
        )
        if len(master_key) < 32:
            master_key = master_key.ljust(32, b"0")[:32]

        cred_manager = CredentialManager(master_key, db_path)
        cred_manager.init_db()

        settings_manager = UserSettings(db_path)
        settings_manager.init_db()

        # Load credentials from .env
        credentials = load_env_credentials()

        # Execute migration steps
        admin_id = create_admin_user(user_manager, credentials)
        migrate_credentials(admin_id, credentials, cred_manager)
        update_database_schema(db_path)
        assign_existing_data_to_admin(admin_id, db_path)
        verify_migration(admin_id, db_path)

        print("\n" + "=" * 60)
        print("✓ Migration completed successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Start the dashboard: python -m app.dashboard")
        print("2. Login with admin credentials")
        print("3. Add more users via the dashboard")
        print("4. Configure credentials for each user")
        print("\nYou can now run multi-user sync with: python -m app.main")

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"✗ Migration failed: {e}")
        print("=" * 60)
        print(f"\nDatabase backup available at: {backup_path}")
        print("You can restore it with: mv {backup_path} {db_path}")
        sys.exit(1)


if __name__ == "__main__":
    main()

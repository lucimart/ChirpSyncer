#!/usr/bin/env python3
"""
Seed Data Script for ChirpSyncer Development

Creates sample data for manual E2E testing:
- Admin user
- Test users
- Sample synced posts
- Sample analytics data
- Sample feed rules
- Sample webhooks
- Sample scheduled tweets

Usage:
    python scripts/seed_data.py [--clean] [--minimal]

Options:
    --clean     Remove existing data before seeding
    --minimal   Create only essential data (admin + 1 user)
"""

import argparse
import hashlib
import os
import random
import sqlite3
import sys
import time
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.features.analytics_tracker import AnalyticsTracker
from app.models.feed_rule import init_feed_rules_db
from app.models.workspace import init_workspace_db


def get_master_key() -> bytes:
    """Get or generate master key for credential encryption."""
    secret_key = os.getenv("SECRET_KEY", "dev-secret-key-for-testing-only")
    return hashlib.sha256(secret_key.encode("utf-8")).digest()


def clean_database(db_path: str):
    """Remove all data from database tables."""
    print("Cleaning existing data...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables = [
        "synced_posts",
        "sync_stats",
        "sync_jobs",
        "tweet_metrics",
        "analytics_snapshots",
        "feed_rules",
        "webhooks",
        "webhook_deliveries",
        "scheduled_tweets",
        "user_credentials",
        "user_sessions",
        "users",
        "workspaces",
        "workspace_members",
        "workspace_invites",
    ]

    for table in tables:
        try:
            cursor.execute(f"DELETE FROM {table}")
        except sqlite3.OperationalError:
            pass  # Table doesn't exist

    conn.commit()
    conn.close()
    print("Database cleaned.")


def seed_users(db_path: str, master_key: bytes) -> dict:
    """Create admin and test users."""
    print("\nSeeding users...")

    user_manager = UserManager(db_path)
    user_manager.init_db()

    cred_manager = CredentialManager(master_key, db_path)
    cred_manager.init_db()

    users = {}

    # Admin user
    admin_password = os.getenv("ADMIN_PASSWORD", "AdminPass123!")
    try:
        admin_id = user_manager.create_user(
            username="admin",
            email="admin@chirpsyncer.local",
            password=admin_password,
            is_admin=True,
        )
        users["admin"] = {
            "id": admin_id,
            "username": "admin",
            "password": admin_password,
        }
        print(f"  Created admin user (ID: {admin_id})")
    except ValueError:
        # User already exists
        user = user_manager.get_user_by_username("admin")
        if user:
            users["admin"] = {
                "id": user.id,
                "username": "admin",
                "password": admin_password,
            }
            print(f"  Admin user already exists (ID: {user.id})")

    # Test users
    test_users = [
        ("testuser", "testuser@example.com", "TestPass123!"),
        ("alice", "alice@example.com", "AlicePass123!"),
        ("bob", "bob@example.com", "BobPass123!"),
    ]

    for username, email, password in test_users:
        try:
            user_id = user_manager.create_user(
                username=username,
                email=email,
                password=password,
                is_admin=False,
            )
            users[username] = {
                "id": user_id,
                "username": username,
                "password": password,
            }
            print(f"  Created user '{username}' (ID: {user_id})")
        except ValueError:
            user = user_manager.get_user_by_username(username)
            if user:
                users[username] = {
                    "id": user.id,
                    "username": username,
                    "password": password,
                }
                print(f"  User '{username}' already exists (ID: {user.id})")

    # Add sample credentials for admin
    if "admin" in users:
        admin_id = users["admin"]["id"]

        # Sample Bluesky credentials (fake)
        cred_manager.save_credentials(
            user_id=admin_id,
            platform="bluesky",
            credential_type="api",
            data={
                "username": "demo.bsky.social",
                "password": "demo-app-password",
            },
        )
        print(f"  Added sample Bluesky credentials for admin")

        # Sample Twitter scraping credentials (fake)
        cred_manager.save_credentials(
            user_id=admin_id,
            platform="twitter",
            credential_type="scraping",
            data={
                "username": "demo_twitter",
                "password": "demo-password",
                "email": "demo@example.com",
                "email_password": "email-password",
            },
        )
        print(f"  Added sample Twitter credentials for admin")

    return users


def seed_synced_posts(db_path: str, users: dict):
    """Create sample synced posts."""
    print("\nSeeding synced posts...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ensure table exists with all columns
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS synced_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            twitter_id TEXT,
            bluesky_uri TEXT,
            original_text TEXT,
            source TEXT,
            synced_to TEXT,
            posted_at INTEGER,
            synced_at INTEGER,
            content_hash TEXT,
            twitter_username TEXT,
            hashtags TEXT,
            has_media INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            retweets_count INTEGER DEFAULT 0,
            replies_count INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,
            archived_at INTEGER,
            archive_path TEXT,
            platform TEXT,
            platform_id TEXT,
            content TEXT,
            created_at INTEGER
        )
    """)

    sample_posts = [
        "Just shipped a new feature! Excited to see how users like it. #coding #startup",
        "Beautiful sunset today. Sometimes you need to step away from the keyboard.",
        "Hot take: tabs > spaces. Fight me.",
        "Reading 'Clean Code' for the third time. Still learning new things!",
        "Coffee count today: 4. Productivity level: questionable.",
        "Finally fixed that bug that's been haunting me for weeks!",
        "Open source contribution merged! Small steps, big impact.",
        "Working from the park today. Nature + WiFi = perfect combo.",
        "New blog post: '10 Things I Learned Building a Social Media Sync Tool'",
        "Grateful for this amazing dev community. You all rock!",
        "Debugging tip: rubber duck debugging actually works. Trust me.",
        "Just discovered a new VS Code extension. Game changer!",
        "Weekend project: building a CLI tool in Rust. Wish me luck!",
        "The best code is the code you don't have to write.",
        "Pair programming session was super productive today!",
    ]

    hashtags_pool = [
        "#coding",
        "#tech",
        "#startup",
        "#developer",
        "#opensource",
        "#webdev",
        "#python",
        "#javascript",
    ]

    now = int(time.time())
    posts_created = 0

    for username, user_data in users.items():
        user_id = user_data["id"]

        # Create 5-10 posts per user
        num_posts = random.randint(5, 10)

        for i in range(num_posts):
            post_text = random.choice(sample_posts)

            # Add random hashtags
            if random.random() > 0.5:
                extra_tags = random.sample(hashtags_pool, k=random.randint(1, 3))
                post_text += " " + " ".join(extra_tags)

            # Random timestamps over the past 30 days
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            posted_at = now - (days_ago * 86400) - (hours_ago * 3600)

            twitter_id = f"tw_{user_id}_{i}_{random.randint(1000, 9999)}"
            bluesky_uri = f"at://did:plc:demo{user_id}/app.bsky.feed.post/{random.randint(1000000, 9999999)}"

            cursor.execute(
                """
                INSERT INTO synced_posts (
                    user_id, twitter_id, bluesky_uri, original_text, source, synced_to,
                    posted_at, synced_at, twitter_username, hashtags, has_media,
                    likes_count, retweets_count, replies_count, platform, platform_id,
                    content, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    user_id,
                    twitter_id,
                    bluesky_uri,
                    post_text,
                    random.choice(["twitter", "bluesky"]),
                    random.choice(["twitter", "bluesky"]),
                    posted_at,
                    posted_at + random.randint(60, 300),
                    username,
                    " ".join([tag for tag in hashtags_pool if tag in post_text]),
                    random.randint(0, 1),
                    random.randint(0, 500),
                    random.randint(0, 100),
                    random.randint(0, 50),
                    random.choice(["twitter", "bluesky"]),
                    twitter_id,
                    post_text,
                    posted_at,
                ),
            )
            posts_created += 1

    conn.commit()
    conn.close()
    print(f"  Created {posts_created} sample posts")


def seed_analytics(db_path: str, users: dict):
    """Create sample analytics data."""
    print("\nSeeding analytics data...")

    analytics = AnalyticsTracker(db_path)
    analytics.init_db()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ensure tweet_metrics table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tweet_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tweet_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            impressions INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            retweets INTEGER DEFAULT 0,
            replies INTEGER DEFAULT 0,
            engagements INTEGER DEFAULT 0,
            engagement_rate REAL DEFAULT 0.0,
            timestamp INTEGER NOT NULL
        )
    """)

    now = int(time.time())
    metrics_created = 0

    for username, user_data in users.items():
        user_id = user_data["id"]

        # Get user's posts
        cursor.execute(
            "SELECT twitter_id FROM synced_posts WHERE user_id = ?", (user_id,)
        )
        posts = cursor.fetchall()

        for (tweet_id,) in posts:
            # Create metrics for each post
            impressions = random.randint(100, 10000)
            likes = random.randint(0, int(impressions * 0.1))
            retweets = random.randint(0, int(likes * 0.3))
            replies = random.randint(0, int(likes * 0.2))
            engagements = likes + retweets + replies
            engagement_rate = (
                (engagements / impressions * 100) if impressions > 0 else 0
            )

            cursor.execute(
                """
                INSERT INTO tweet_metrics (
                    tweet_id, user_id, impressions, likes, retweets, replies,
                    engagements, engagement_rate, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tweet_id,
                    user_id,
                    impressions,
                    likes,
                    retweets,
                    replies,
                    engagements,
                    engagement_rate,
                    now - random.randint(0, 86400 * 7),
                ),
            )
            metrics_created += 1

    conn.commit()
    conn.close()
    print(f"  Created {metrics_created} analytics records")


def seed_feed_rules(db_path: str, users: dict):
    """Create sample feed rules."""
    print("\nSeeding feed rules...")

    init_feed_rules_db(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Schema: id, user_id, name, type, conditions, weight, enabled, created_at, updated_at
    sample_rules = [
        {
            "name": "Boost Tech Content",
            "type": "boost",
            "conditions": '[{"field": "content", "operator": "contains", "value": "#tech"}]',
            "weight": 50,
            "enabled": 1,
        },
        {
            "name": "Demote Low Engagement",
            "type": "demote",
            "conditions": '[{"field": "likes_count", "operator": "less_than", "value": "5"}]',
            "weight": -30,
            "enabled": 1,
        },
        {
            "name": "Filter Spam Keywords",
            "type": "filter",
            "conditions": '[{"field": "content", "operator": "contains", "value": "buy now"}]',
            "weight": 0,
            "enabled": 0,
        },
    ]

    rules_created = 0
    admin_id = users.get("admin", {}).get("id", 1)

    for rule in sample_rules:
        cursor.execute(
            """
            INSERT INTO feed_rules (
                user_id, name, type, conditions, weight, enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
            (
                admin_id,
                rule["name"],
                rule["type"],
                rule["conditions"],
                rule["weight"],
                rule["enabled"],
            ),
        )
        rules_created += 1

    conn.commit()
    conn.close()
    print(f"  Created {rules_created} feed rules")


def seed_webhooks(db_path: str, users: dict):
    """Create sample webhooks."""
    print("\nSeeding webhooks...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ensure webhooks table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS webhooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            secret TEXT,
            events TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER
        )
    """)

    sample_webhooks = [
        {
            "name": "Slack Notifications",
            "url": "https://hooks.slack.com/services/DEMO/WEBHOOK/URL",
            "events": "sync.completed,sync.failed",
        },
        {
            "name": "Discord Bot",
            "url": "https://discord.com/api/webhooks/DEMO/TOKEN",
            "events": "post.synced",
        },
        {
            "name": "Analytics Tracker",
            "url": "https://analytics.example.com/webhook",
            "events": "analytics.snapshot",
        },
    ]

    webhooks_created = 0
    admin_id = users.get("admin", {}).get("id", 1)

    for webhook in sample_webhooks:
        cursor.execute(
            """
            INSERT INTO webhooks (user_id, name, url, secret, events, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                admin_id,
                webhook["name"],
                webhook["url"],
                f"whsec_demo_{random.randint(10000, 99999)}",
                webhook["events"],
                1,
                int(time.time()),
            ),
        )
        webhooks_created += 1

    conn.commit()
    conn.close()
    print(f"  Created {webhooks_created} webhooks")


def seed_scheduled_tweets(db_path: str, users: dict):
    """Create sample scheduled tweets."""
    print("\nSeeding scheduled tweets...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ensure scheduled_tweets table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            platforms TEXT NOT NULL,
            scheduled_at INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            posted_at INTEGER,
            error_message TEXT
        )
    """)

    sample_content = [
        "Scheduled post: Check out our latest feature update!",
        "Reminder: Join us for the live Q&A session tomorrow!",
        "Weekly tip: Always backup your data before major updates.",
        "Exciting announcement coming soon... stay tuned!",
        "Thank you for 1000 followers! You're amazing!",
    ]

    tweets_created = 0
    admin_id = users.get("admin", {}).get("id", 1)
    now = int(time.time())

    for i, content in enumerate(sample_content):
        # Schedule for future (1-7 days from now)
        scheduled_at = now + (i + 1) * 86400 + random.randint(0, 43200)

        cursor.execute(
            """
            INSERT INTO scheduled_tweets (user_id, content, platforms, scheduled_at, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                admin_id,
                content,
                "twitter,bluesky",
                scheduled_at,
                "pending",
                now,
            ),
        )
        tweets_created += 1

    conn.commit()
    conn.close()
    print(f"  Created {tweets_created} scheduled tweets")


def seed_workspaces(db_path: str, users: dict):
    """Create sample workspaces."""
    print("\nSeeding workspaces...")

    init_workspace_db(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    admin_id = users.get("admin", {}).get("id", 1)
    now = int(time.time())

    # Create a team workspace
    # Schema: id, name, type, owner_user_id, created_at, updated_at
    cursor.execute(
        """
        INSERT INTO workspaces (name, type, owner_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    """,
        (
            "Marketing Team",
            "team",
            admin_id,
            now,
            now,
        ),
    )
    workspace_id = cursor.lastrowid

    # Add admin as member
    cursor.execute(
        """
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, last_active)
        VALUES (?, ?, ?, ?, ?)
    """,
        (
            workspace_id,
            admin_id,
            "admin",
            now,
            now,
        ),
    )

    # Add other members
    for username in ["testuser", "alice"]:
        if username in users:
            cursor.execute(
                """
                INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, last_active)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    workspace_id,
                    users[username]["id"],
                    "editor" if username == "testuser" else "viewer",
                    now,
                    now,
                ),
            )

    conn.commit()
    conn.close()
    print(f"  Created 1 workspace with members")


def main():
    parser = argparse.ArgumentParser(
        description="Seed ChirpSyncer development database"
    )
    parser.add_argument(
        "--clean", action="store_true", help="Remove existing data before seeding"
    )
    parser.add_argument(
        "--minimal", action="store_true", help="Create only essential data"
    )
    args = parser.parse_args()

    db_path = os.getenv("DATABASE_PATH", "chirpsyncer.db")
    master_key = get_master_key()

    print("=" * 50)
    print("ChirpSyncer Seed Data Script")
    print("=" * 50)
    print(f"Database: {db_path}")
    print(f"Mode: {'minimal' if args.minimal else 'full'}")

    if args.clean:
        clean_database(db_path)

    # Always seed users
    users = seed_users(db_path, master_key)

    if not args.minimal:
        seed_synced_posts(db_path, users)
        seed_analytics(db_path, users)
        seed_feed_rules(db_path, users)
        seed_webhooks(db_path, users)
        seed_scheduled_tweets(db_path, users)
        seed_workspaces(db_path, users)

    print("\n" + "=" * 50)
    print("Seed data created successfully!")
    print("=" * 50)
    print("\nTest Credentials:")
    print("-" * 30)
    for username, data in users.items():
        # nosec B105 - Intentional: dev seed script prints test credentials for local development
        print(f"  {username}: {data['password']}")
    print("\nYou can now start the dev environment:")
    print("  ./scripts/dev-start.sh  (Linux/macOS)")
    print("  .\\scripts\\dev-start.ps1 (Windows)")


if __name__ == "__main__":
    main()

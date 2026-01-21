"""
Integration Tests for Tweet Scheduler (SCHEDULE-001)

Comprehensive integration tests for TweetScheduler including:
- Complete scheduling workflow (schedule → store → retrieve)
- Media attachment handling
- Queue ordering by time
- Credential integration with CredentialManager
- Status transitions (pending → posted/failed/cancelled)
- Queue processing and partial failures
- Edit and cancel operations
- Error handling and edge cases

These tests verify the complete tweet scheduling system with actual
SQLite database, credential management, and Twitter API integration.
"""

import os
import sqlite3
import time
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest

from app.features.tweet_scheduler import TweetScheduler
from app.auth.credential_manager import CredentialManager


# =============================================================================
# TWEET SCHEDULER INITIALIZATION TESTS
# =============================================================================


class TestTweetSchedulerInitialization:
    """Test TweetScheduler initialization and lifecycle."""

    def test_scheduler_initialization(self, test_db_path):
        """Test that TweetScheduler initializes correctly."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Verify scheduler was created
        assert scheduler is not None
        assert scheduler.db_path == test_db_path
        assert scheduler.master_key is None

        # Verify database tables are created
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Check scheduled_tweets table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_tweets'"
        )
        assert cursor.fetchone() is not None

        # Check indexes are created
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_scheduled_user'"
        )
        assert cursor.fetchone() is not None

        conn.close()

    def test_scheduler_database_initialization(self, test_db_path):
        """Test that database schema is properly initialized."""
        _scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Verify scheduled_tweets table structure
        cursor.execute("PRAGMA table_info(scheduled_tweets)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}

        assert "id" in columns
        assert "user_id" in columns
        assert "content" in columns
        assert "media_paths" in columns
        assert "scheduled_time" in columns
        assert "status" in columns
        assert "posted_at" in columns
        assert "tweet_id" in columns
        assert "error" in columns
        assert "created_at" in columns

        conn.close()

    def test_scheduler_with_master_key(self, test_db_path):
        """Test TweetScheduler initialization with master key."""
        # Create a valid 32-byte master key
        master_key = os.urandom(32)

        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        assert scheduler.master_key == master_key


# =============================================================================
# COMPLETE SCHEDULING WORKFLOW TESTS
# =============================================================================


class TestCompleteSchedulingWorkflow:
    """Test complete tweet scheduling workflow."""

    def test_schedule_tweet_basic(self, test_db, test_db_path, test_user):
        """Test basic tweet scheduling."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Schedule a tweet
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            user_id=test_user["id"],
            content="Test tweet content",
            scheduled_time=scheduled_time,
            media=[],
        )

        # Verify tweet was scheduled
        assert tweet_id is not None
        assert isinstance(tweet_id, int)
        assert tweet_id > 0

        # Verify tweet exists in database
        cursor = test_db.cursor()
        cursor.execute("SELECT * FROM scheduled_tweets WHERE id = ?", (tweet_id,))
        row = cursor.fetchone()

        assert row is not None
        assert row["user_id"] == test_user["id"]
        assert row["content"] == "Test tweet content"
        assert row["status"] == "pending"

    def test_schedule_tweet_with_media(self, test_db, test_db_path, test_user):
        """Test scheduling tweet with media attachments."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Schedule a tweet with media
        scheduled_time = datetime.now() + timedelta(hours=2)
        media_paths = ["/path/to/image1.jpg", "/path/to/image2.png"]

        tweet_id = scheduler.schedule_tweet(
            user_id=test_user["id"],
            content="Tweet with media",
            scheduled_time=scheduled_time,
            media=media_paths,
        )

        # Retrieve and verify
        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        scheduled_tweet = next((t for t in tweets if t["id"] == tweet_id), None)

        assert scheduled_tweet is not None
        assert scheduled_tweet["media_paths"] == media_paths
        assert len(scheduled_tweet["media_paths"]) == 2

    def test_schedule_multiple_tweets_ordering(self, test_db, test_db_path, test_user):
        """Test scheduling multiple tweets and verify queue ordering by time."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Schedule tweets with different times
        time_3 = datetime.now() + timedelta(hours=3)
        time_1 = datetime.now() + timedelta(hours=1)
        time_2 = datetime.now() + timedelta(hours=2)

        _tweet_id_3 = scheduler.schedule_tweet(test_user["id"], "Tweet 3", time_3, [])
        _tweet_id_1 = scheduler.schedule_tweet(test_user["id"], "Tweet 1", time_1, [])
        _tweet_id_2 = scheduler.schedule_tweet(test_user["id"], "Tweet 2", time_2, [])

        # Get all tweets and verify ordering
        tweets = scheduler.get_scheduled_tweets(test_user["id"])

        assert len(tweets) == 3
        assert tweets[0]["content"] == "Tweet 1"
        assert tweets[1]["content"] == "Tweet 2"
        assert tweets[2]["content"] == "Tweet 3"

    def test_get_tweets_by_status(self, test_db, test_db_path, test_user):
        """Test retrieving scheduled tweets filtered by status."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)

        # Schedule tweets with different statuses
        tweet_1 = scheduler.schedule_tweet(
            test_user["id"], "Pending tweet 1", scheduled_time, []
        )
        tweet_2 = scheduler.schedule_tweet(
            test_user["id"], "Pending tweet 2", scheduled_time, []
        )

        # Manually update one to posted
        scheduler.update_status(tweet_2, "posted", tweet_id="twitter_123")

        # Get pending tweets
        pending = scheduler.get_scheduled_tweets(test_user["id"], status="pending")
        assert len(pending) == 1
        assert pending[0]["id"] == tweet_1

        # Get posted tweets
        posted = scheduler.get_scheduled_tweets(test_user["id"], status="posted")
        assert len(posted) == 1
        assert posted[0]["id"] == tweet_2

    def test_schedule_tweet_validation(self, test_db_path, test_user):
        """Test tweet scheduling validation."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Test empty content
        with pytest.raises(ValueError, match="Content cannot be empty"):
            scheduler.schedule_tweet(
                test_user["id"], "", datetime.now() + timedelta(hours=1), []
            )

        # Test whitespace-only content
        with pytest.raises(ValueError, match="Content cannot be empty"):
            scheduler.schedule_tweet(
                test_user["id"], "   ", datetime.now() + timedelta(hours=1), []
            )

        # Test time in the past
        with pytest.raises(ValueError, match="Scheduled time cannot be in the past"):
            scheduler.schedule_tweet(
                test_user["id"], "Test content", datetime.now() - timedelta(hours=1), []
            )


# =============================================================================
# CREDENTIAL INTEGRATION TESTS
# =============================================================================


class TestCredentialIntegration:
    """Test credential manager integration for posting tweets."""

    def test_post_with_credentials(self, test_db, test_db_path, test_user):
        """Test posting tweet with credentials from CredentialManager."""
        # Create master key for credentials
        master_key = os.urandom(32)

        # Initialize credential manager (database table already exists from conftest)
        CredentialManager(master_key, test_db_path)

        # Store test credentials in the existing table (manually since init_db expects different schema)
        cursor = test_db.cursor()
        now = int(time.time())

        credentials_json = json.dumps(
            {
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "access_token": "test_access_token",
                "access_secret": "test_access_secret",
            }
        )

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", credentials_json, now, now),
        )

        test_db.commit()

        # Create scheduler with master key
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Schedule a tweet for a time slightly in the future to test posting
        scheduled_time = datetime.now() + timedelta(seconds=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet for posting", scheduled_time, []
        )

        # Mock the CredentialManager to return our test credentials
        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred

            # Return credentials on get_credentials call
            test_creds = {
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "access_token": "test_access_token",
                "access_secret": "test_access_secret",
            }
            mock_cred.get_credentials.return_value = test_creds

            # Mock the Twitter API posting function
            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.return_value = "twitter_tweet_id_123"

                # Post the tweet
                success = scheduler.post_scheduled_tweet(tweet_id)

                assert success is True
                mock_post.assert_called_once()

                # Verify tweet status updated
                tweets = scheduler.get_scheduled_tweets(
                    test_user["id"], status="posted"
                )
                assert len(tweets) == 1
                assert tweets[0]["tweet_id"] == "twitter_tweet_id_123"

    def test_post_without_master_key(self, test_db_path, test_user):
        """Test posting fails when master key not configured."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(seconds=10)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Try to post without master key
        success = scheduler.post_scheduled_tweet(tweet_id)
        assert success is False

        # Verify status is failed
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="failed")
        assert len(tweets) == 1
        assert "master_key" in tweets[0]["error"].lower()

    def test_post_with_missing_credentials(self, test_db, test_db_path, test_user):
        """Test posting fails when user credentials are missing."""
        master_key = os.urandom(32)
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        scheduled_time = datetime.now() + timedelta(seconds=10)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Mock CredentialManager to return None (no credentials found)
        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = None

            # Try to post - credentials don't exist
            success = scheduler.post_scheduled_tweet(tweet_id)
            assert success is False

            # Verify status is failed with appropriate error
            tweets = scheduler.get_scheduled_tweets(test_user["id"], status="failed")
            assert len(tweets) == 1
            assert "No Twitter API credentials" in tweets[0]["error"]

    def test_post_with_invalid_credentials(self, test_db, test_db_path, test_user):
        """Test posting fails with invalid credentials."""
        master_key = os.urandom(32)

        # Store invalid credentials in database
        cursor = test_db.cursor()
        now = int(time.time())

        invalid_creds = {
            "api_key": "invalid",
            "api_secret": "invalid",
            "access_token": "invalid",
            "access_secret": "invalid",
        }

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", json.dumps(invalid_creds), now, now),
        )

        test_db.commit()

        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        scheduled_time = datetime.now() + timedelta(seconds=10)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Mock the CredentialManager and Twitter API
        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = invalid_creds

            # Mock the Twitter API to fail with invalid credentials
            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.side_effect = ValueError("Invalid credentials")

                success = scheduler.post_scheduled_tweet(tweet_id)
                assert success is False

                # Verify error is stored
                tweets = scheduler.get_scheduled_tweets(
                    test_user["id"], status="failed"
                )
                assert len(tweets) == 1
                assert "Invalid credentials" in tweets[0]["error"]


# =============================================================================
# STATUS TRANSITIONS TESTS
# =============================================================================


class TestStatusTransitions:
    """Test status transitions and persistence."""

    def test_pending_to_posted_transition(self, test_db_path, test_user):
        """Test tweet status transition from pending to posted."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Verify initial status
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="pending")
        assert len(tweets) == 1

        # Update to posted
        scheduler.update_status(tweet_id, "posted", tweet_id="twitter_123")

        # Verify status changed
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="posted")
        assert len(tweets) == 1
        assert tweets[0]["tweet_id"] == "twitter_123"
        assert tweets[0]["posted_at"] is not None

    def test_pending_to_failed_transition(self, test_db_path, test_user):
        """Test tweet status transition from pending to failed with error."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        error_msg = "API rate limit exceeded"

        # Update to failed
        scheduler.update_status(tweet_id, "failed", error=error_msg)

        # Verify status and error
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="failed")
        assert len(tweets) == 1
        assert tweets[0]["error"] == error_msg

    def test_pending_to_cancelled_transition(self, test_db_path, test_user):
        """Test tweet status transition from pending to cancelled."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Cancel the tweet
        success = scheduler.cancel_scheduled_tweet(tweet_id, test_user["id"])
        assert success is True

        # Verify status
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="cancelled")
        assert len(tweets) == 1

    def test_cannot_cancel_posted_tweet(self, test_db_path, test_user):
        """Test that posted tweets cannot be cancelled."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Mark as posted
        scheduler.update_status(tweet_id, "posted", tweet_id="twitter_123")

        # Try to cancel
        success = scheduler.cancel_scheduled_tweet(tweet_id, test_user["id"])
        assert success is False

    def test_cannot_cancel_other_users_tweet(self, test_db, test_db_path):
        """Test that users cannot cancel other users' tweets."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Create two users
        cursor = test_db.cursor()
        now = int(time.time())

        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, created_at, is_active)
            VALUES (?, ?, ?, ?, 1)
        """,
            ("user1", "user1@example.com", "hash1", now),
        )

        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, created_at, is_active)
            VALUES (?, ?, ?, ?, 1)
        """,
            ("user2", "user2@example.com", "hash2", now),
        )

        test_db.commit()

        user1_id = 1
        user2_id = 2

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            user1_id, "User 1 tweet", scheduled_time, []
        )

        # Try to cancel as different user
        success = scheduler.cancel_scheduled_tweet(tweet_id, user2_id)
        assert success is False

        # Verify tweet is still pending
        tweets = scheduler.get_scheduled_tweets(user1_id, status="pending")
        assert len(tweets) == 1

    def test_status_updates_persist_in_db(self, test_db, test_db_path, test_user):
        """Test that status updates persist across database connections."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Update status
        scheduler.update_status(tweet_id, "posted", tweet_id="twitter_456")

        # Create new scheduler instance to verify persistence
        scheduler2 = TweetScheduler(db_path=test_db_path, master_key=None)
        tweets = scheduler2.get_scheduled_tweets(test_user["id"])

        assert len(tweets) == 1
        assert tweets[0]["status"] == "posted"
        assert tweets[0]["tweet_id"] == "twitter_456"


# =============================================================================
# QUEUE PROCESSING TESTS
# =============================================================================


class TestQueueProcessing:
    """Test batch processing of scheduled tweets."""

    def test_process_queue_single_due_tweet(self, test_db, test_db_path, test_user):
        """Test processing queue with single due tweet."""
        master_key = os.urandom(32)
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Store credentials in database
        cursor = test_db.cursor()
        now = int(time.time())

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_secret",
        }

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", json.dumps(credentials), now, now),
        )

        test_db.commit()

        # Schedule tweet for slightly in the future
        scheduled_time = datetime.now() + timedelta(seconds=10)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Due tweet", scheduled_time, []
        )

        # Manually mark it as past-due by directly updating the database
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        past_time = int(time.time()) - 60  # 1 minute ago
        cursor.execute(
            """
            UPDATE scheduled_tweets
            SET scheduled_time = ?
            WHERE id = ?
        """,
            (past_time, tweet_id),
        )
        conn.commit()
        conn.close()

        # Mock the credential manager and posting function
        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = credentials

            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.return_value = "twitter_id_001"

                stats = scheduler.process_queue()

                assert stats["processed"] == 1
                assert stats["successful"] == 1
                assert stats["failed"] == 0

    def test_process_queue_multiple_tweets(self, test_db, test_db_path, test_user):
        """Test processing queue with multiple due tweets."""
        master_key = os.urandom(32)
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Store credentials in database
        cursor = test_db.cursor()
        now = int(time.time())

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_secret",
        }

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", json.dumps(credentials), now, now),
        )

        test_db.commit()

        # Schedule multiple tweets for the future
        tweet_ids = []
        for i in range(3):
            scheduled_time = datetime.now() + timedelta(hours=i + 1)
            tweet_id = scheduler.schedule_tweet(
                test_user["id"], f"Tweet {i+1}", scheduled_time, []
            )
            tweet_ids.append(tweet_id)

        # Manually mark all as past-due
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        past_time = int(time.time()) - 60
        for tweet_id in tweet_ids:
            cursor.execute(
                """
                UPDATE scheduled_tweets
                SET scheduled_time = ?
                WHERE id = ?
            """,
                (past_time - (3600 * (tweet_ids.index(tweet_id))), tweet_id),
            )
        conn.commit()
        conn.close()

        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = credentials

            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.return_value = "twitter_id_123"

                stats = scheduler.process_queue()

                assert stats["processed"] == 3
                assert stats["successful"] == 3
                assert stats["failed"] == 0

    def test_process_queue_partial_failures(self, test_db, test_db_path, test_user):
        """Test queue processing with partial failures."""
        master_key = os.urandom(32)
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Store credentials in database
        cursor = test_db.cursor()
        now = int(time.time())

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_secret",
        }

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", json.dumps(credentials), now, now),
        )

        test_db.commit()

        # Schedule 3 tweets for the future
        ids = []
        for i in range(3):
            scheduled_time = datetime.now() + timedelta(hours=i + 1)
            tweet_id = scheduler.schedule_tweet(
                test_user["id"], f"Tweet {i+1}", scheduled_time, []
            )
            ids.append(tweet_id)

        # Manually mark all as past-due
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        past_time = int(time.time()) - 60
        for idx, tweet_id in enumerate(ids):
            cursor.execute(
                """
                UPDATE scheduled_tweets
                SET scheduled_time = ?
                WHERE id = ?
            """,
                (past_time - (3600 * idx), tweet_id),
            )
        conn.commit()
        conn.close()

        # Mock posting - first succeeds, second fails, third succeeds
        def mock_post_side_effect(creds, content, media):
            if "Tweet 2" in content:
                raise ValueError("API error")
            return "twitter_id_123"

        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = credentials

            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.side_effect = mock_post_side_effect

                stats = scheduler.process_queue()

                assert stats["processed"] == 3
                assert stats["successful"] == 2
                assert stats["failed"] == 1

        # Verify statuses
        pending = scheduler.get_scheduled_tweets(test_user["id"], status="pending")
        posted = scheduler.get_scheduled_tweets(test_user["id"], status="posted")
        failed = scheduler.get_scheduled_tweets(test_user["id"], status="failed")

        assert len(pending) == 0
        assert len(posted) == 2
        assert len(failed) == 1

    def test_process_queue_skips_future_tweets(self, test_db_path, test_user):
        """Test that queue processing skips tweets scheduled for future."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Schedule tweets for the future
        future_time_1 = datetime.now() + timedelta(hours=1)
        future_time_2 = datetime.now() + timedelta(hours=2)

        tweet_1 = scheduler.schedule_tweet(
            test_user["id"], "Near future tweet", future_time_1, []
        )
        tweet_2 = scheduler.schedule_tweet(
            test_user["id"], "Far future tweet", future_time_2, []
        )

        # Manually make one tweet due
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        past_time = int(time.time()) - 60
        cursor.execute(
            """
            UPDATE scheduled_tweets
            SET scheduled_time = ?
            WHERE id = ?
        """,
            (past_time, tweet_1),
        )
        conn.commit()
        conn.close()

        stats = scheduler.process_queue()

        # Only past tweet should be processed
        assert stats["processed"] == 1

        # Future tweet should still be pending
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="pending")
        assert len(tweets) == 1
        assert tweets[0]["content"] == "Far future tweet"

    def test_queue_processing_updates_timestamps(
        self, test_db, test_db_path, test_user
    ):
        """Test that successful queue processing updates posted_at timestamp."""
        master_key = os.urandom(32)
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Store credentials in database
        cursor = test_db.cursor()
        now = int(time.time())

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_secret",
        }

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", json.dumps(credentials), now, now),
        )

        test_db.commit()

        # Schedule tweet for the future
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Manually mark it as past-due
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        past_time = int(time.time()) - 60
        cursor.execute(
            """
            UPDATE scheduled_tweets
            SET scheduled_time = ?
            WHERE id = ?
        """,
            (past_time, tweet_id),
        )
        conn.commit()
        conn.close()

        # Verify posted_at is None before posting
        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["posted_at"] is None

        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = credentials

            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.return_value = "twitter_id_789"

                before_time = int(time.time())
                scheduler.process_queue()
                after_time = int(time.time())

                # Verify posted_at is set and within expected range
                tweets = scheduler.get_scheduled_tweets(
                    test_user["id"], status="posted"
                )
                posted_at = tweets[0]["posted_at"]

                assert posted_at is not None
                assert before_time <= posted_at <= after_time


# =============================================================================
# EDIT AND CANCEL OPERATIONS TESTS
# =============================================================================


class TestEditAndCancelOperations:
    """Test editing and cancelling scheduled tweets."""

    def test_cancel_pending_tweet(self, test_db_path, test_user):
        """Test cancelling a pending scheduled tweet."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=2)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Tweet to cancel", scheduled_time, []
        )

        # Cancel the tweet
        success = scheduler.cancel_scheduled_tweet(tweet_id, test_user["id"])

        assert success is True

        # Verify status
        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["status"] == "cancelled"

    def test_cancel_nonexistent_tweet(self, test_db_path, test_user):
        """Test cancelling a nonexistent tweet."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        success = scheduler.cancel_scheduled_tweet(9999, test_user["id"])
        assert success is False

    def test_cannot_edit_posted_tweet(self, test_db_path, test_user):
        """Test that posted tweets cannot be edited or cancelled."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Original content", scheduled_time, []
        )

        # Mark as posted
        scheduler.update_status(tweet_id, "posted", tweet_id="twitter_123")

        # Try to cancel
        success = scheduler.cancel_scheduled_tweet(tweet_id, test_user["id"])
        assert success is False

        # Verify tweet is still posted with original content
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="posted")
        assert tweets[0]["content"] == "Original content"

    def test_cannot_edit_failed_tweet(self, test_db_path, test_user):
        """Test behavior with failed tweets."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Tweet that will fail", scheduled_time, []
        )

        # Mark as failed
        scheduler.update_status(tweet_id, "failed", error="API error")

        # Can cancel a failed tweet
        success = scheduler.cancel_scheduled_tweet(tweet_id, test_user["id"])
        assert success is True

        # Status should now be cancelled
        tweets = scheduler.get_scheduled_tweets(test_user["id"], status="cancelled")
        assert len(tweets) == 1


# =============================================================================
# ERROR HANDLING AND EDGE CASES
# =============================================================================


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge cases."""

    def test_large_content(self, test_db_path, test_user):
        """Test scheduling tweet with large content."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        large_content = "a" * 1000  # Very large content
        scheduled_time = datetime.now() + timedelta(hours=1)

        tweet_id = scheduler.schedule_tweet(
            test_user["id"], large_content, scheduled_time, []
        )

        # Should schedule successfully (Twitter API will validate length)
        assert tweet_id is not None

        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["content"] == large_content

    def test_special_characters_in_content(self, test_db_path, test_user):
        """Test scheduling tweet with special characters."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        special_content = "Hello 🌍! Testing @mentions #hashtags & special chars!!! ♦️"
        scheduled_time = datetime.now() + timedelta(hours=1)

        tweet_id = scheduler.schedule_tweet(
            test_user["id"], special_content, scheduled_time, []
        )

        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["content"] == special_content

    def test_many_media_attachments(self, test_db_path, test_user):
        """Test scheduling tweet with many media attachments."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        media_paths = [f"/path/to/image{i}.jpg" for i in range(10)]
        scheduled_time = datetime.now() + timedelta(hours=1)

        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Tweet with many images", scheduled_time, media_paths
        )

        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert len(tweets[0]["media_paths"]) == 10

    def test_concurrent_scheduling(self, test_db_path, test_user):
        """Test that multiple tweets can be scheduled for the same time."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)

        # Schedule multiple tweets for same time
        ids = []
        for i in range(5):
            tweet_id = scheduler.schedule_tweet(
                test_user["id"], f"Tweet {i+1}", scheduled_time, []
            )
            ids.append(tweet_id)

        # Verify all scheduled
        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert len(tweets) == 5
        assert all(
            t["scheduled_time"] == int(scheduled_time.timestamp()) for t in tweets
        )

    def test_empty_media_list(self, test_db_path, test_user):
        """Test scheduling tweet with empty media list."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)

        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Tweet without media", scheduled_time, []
        )

        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["media_paths"] == []

    def test_none_media_list(self, test_db_path, test_user):
        """Test scheduling tweet with None media list."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)

        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Tweet without media", scheduled_time, None
        )

        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["media_paths"] == [] or tweets[0]["media_paths"] is None

    def test_update_status_with_all_fields(self, test_db_path, test_user):
        """Test updating status with all possible fields."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(
            test_user["id"], "Test tweet", scheduled_time, []
        )

        # Update with all fields
        scheduler.update_status(
            tweet_id, "posted", tweet_id="twitter_final_id", error=None
        )

        tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert tweets[0]["status"] == "posted"
        assert tweets[0]["tweet_id"] == "twitter_final_id"
        assert tweets[0]["error"] is None

    def test_post_nonexistent_tweet(self, test_db_path, test_user):
        """Test attempting to post a nonexistent tweet."""
        master_key = os.urandom(32)
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Try to post a tweet that doesn't exist
        success = scheduler.post_scheduled_tweet(9999)
        assert success is False


# =============================================================================
# INTEGRATION WORKFLOW TESTS
# =============================================================================


class TestIntegrationWorkflow:
    """Test complete integration workflows."""

    def test_end_to_end_scheduling_to_posting(self, test_db, test_db_path, test_user):
        """Test complete workflow from scheduling to posting."""
        master_key = os.urandom(32)

        # Step 1: Initialize
        scheduler = TweetScheduler(db_path=test_db_path, master_key=master_key)

        # Step 2: Store credentials in database
        cursor = test_db.cursor()
        now = int(time.time())

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_secret",
        }

        cursor.execute(
            """
            INSERT INTO user_credentials
            (user_id, platform, credential_type, encrypted_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (test_user["id"], "twitter", "api", json.dumps(credentials), now, now),
        )

        test_db.commit()

        # Step 3: Schedule tweets
        scheduled_time_1 = datetime.now() + timedelta(seconds=30)
        scheduled_time_2 = datetime.now() + timedelta(hours=1)

        tweet_1 = scheduler.schedule_tweet(
            test_user["id"], "Immediate tweet", scheduled_time_1, ["/path/to/image.jpg"]
        )

        tweet_2 = scheduler.schedule_tweet(
            test_user["id"], "Future tweet", scheduled_time_2, []
        )

        # Mark tweet_1 as due
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        past_time = int(time.time()) - 60
        cursor.execute(
            """
            UPDATE scheduled_tweets
            SET scheduled_time = ?
            WHERE id = ?
        """,
            (past_time, tweet_1),
        )
        conn.commit()
        conn.close()

        # Step 4: Verify both scheduled
        all_tweets = scheduler.get_scheduled_tweets(test_user["id"])
        assert len(all_tweets) == 2

        # Step 5: Process queue
        with patch("app.auth.credential_manager.CredentialManager") as mock_cred_class:
            mock_cred = MagicMock()
            mock_cred_class.return_value = mock_cred
            mock_cred.get_credentials.return_value = credentials

            with patch(
                "app.integrations.twitter_api_handler.post_tweet_with_credentials"
            ) as mock_post:
                mock_post.return_value = "twitter_id_123"

                stats = scheduler.process_queue()

                assert stats["processed"] == 1  # Only first is due
                assert stats["successful"] == 1

        # Step 6: Verify statuses
        posted = scheduler.get_scheduled_tweets(test_user["id"], status="posted")
        pending = scheduler.get_scheduled_tweets(test_user["id"], status="pending")

        assert len(posted) == 1
        assert len(pending) == 1

        # Step 7: Cancel the future tweet
        success = scheduler.cancel_scheduled_tweet(tweet_2, test_user["id"])
        assert success is True

        # Step 8: Verify final states
        cancelled = scheduler.get_scheduled_tweets(test_user["id"], status="cancelled")
        assert len(cancelled) == 1

    def test_multi_user_isolation(self, test_db, test_db_path):
        """Test that tweets are properly isolated between users."""
        scheduler = TweetScheduler(db_path=test_db_path, master_key=None)

        # Create two users
        cursor = test_db.cursor()
        now = int(time.time())

        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, created_at, is_active)
            VALUES (?, ?, ?, ?, 1)
        """,
            ("user_a", "a@example.com", "hash_a", now),
        )

        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, created_at, is_active)
            VALUES (?, ?, ?, ?, 1)
        """,
            ("user_b", "b@example.com", "hash_b", now),
        )

        test_db.commit()

        user_a_id = 1
        user_b_id = 2

        scheduled_time = datetime.now() + timedelta(hours=1)

        # Schedule tweets for both users
        scheduler.schedule_tweet(user_a_id, "User A tweet 1", scheduled_time, [])
        scheduler.schedule_tweet(user_a_id, "User A tweet 2", scheduled_time, [])
        scheduler.schedule_tweet(user_b_id, "User B tweet 1", scheduled_time, [])

        # Verify isolation
        user_a_tweets = scheduler.get_scheduled_tweets(user_a_id)
        user_b_tweets = scheduler.get_scheduled_tweets(user_b_id)

        assert len(user_a_tweets) == 2
        assert len(user_b_tweets) == 1
        assert all(t["user_id"] == user_a_id for t in user_a_tweets)
        assert all(t["user_id"] == user_b_id for t in user_b_tweets)

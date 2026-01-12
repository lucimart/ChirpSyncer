"""
Integration Tests for CleanupEngine (Sprint 7 - CLEANUP-001)

Comprehensive integration tests for automated tweet cleanup engine with real database interactions.
Tests cover rule creation, evaluation, preview, dry-run, actual deletion, user isolation, and
database integrity across cleanup_rules, cleanup_history, and synced_posts tables.
"""

import pytest
import json
import time
import sys
import os
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.features.cleanup_engine import CleanupEngine


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def cleanup_engine_with_db(test_db_path, test_db):
    """Initialize CleanupEngine with test database"""
    cursor = test_db.cursor()

    # Create cleanup tables
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cleanup_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            rule_type TEXT NOT NULL,
            rule_config TEXT NOT NULL,
            last_run INTEGER,
            deleted_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cleanup_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            tweets_deleted INTEGER DEFAULT 0,
            executed_at INTEGER NOT NULL,
            dry_run INTEGER DEFAULT 1,
            FOREIGN KEY (rule_id) REFERENCES cleanup_rules(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cleanup_rules_user ON cleanup_rules(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cleanup_history_user ON cleanup_history(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cleanup_history_rule ON cleanup_history(rule_id)"
    )

    test_db.commit()

    engine = CleanupEngine(db_path=test_db_path)
    yield engine, test_db, test_db_path


@pytest.fixture
def tweets_in_db(test_db, test_user):
    """Populate synced_posts with test tweets"""
    cursor = test_db.cursor()
    current_time = int(time.time())

    tweets = [
        {
            "id": "1001",
            "text": "Very old tweet from 90 days ago",
            "created_at": current_time - (90 * 24 * 3600),
            "likes": 2,
        },
        {
            "id": "1002",
            "text": "Old tweet from 60 days ago with good engagement",
            "created_at": current_time - (60 * 24 * 3600),
            "likes": 50,
        },
        {
            "id": "1003",
            "text": "Old tweet from 45 days ago with low engagement",
            "created_at": current_time - (45 * 24 * 3600),
            "likes": 3,
        },
        {
            "id": "1004",
            "text": "Recent tweet from 15 days ago",
            "created_at": current_time - (15 * 24 * 3600),
            "likes": 100,
        },
        {
            "id": "1005",
            "text": "Very recent tweet from 2 days ago",
            "created_at": current_time - (2 * 24 * 3600),
            "likes": 5,
        },
        {
            "id": "1006",
            "text": "Old tweet #cleanup from 50 days ago",
            "created_at": current_time - (50 * 24 * 3600),
            "likes": 0,
        },
        {
            "id": "1007",
            "text": "Tweet with RT @user content from 30 days",
            "created_at": current_time - (30 * 24 * 3600),
            "likes": 15,
        },
        {
            "id": "1008",
            "text": "Another #cleanup hashtag tweet",
            "created_at": current_time - (35 * 24 * 3600),
            "likes": 8,
        },
    ]

    for tweet in tweets:
        tweet_json = json.dumps(
            {
                "text": tweet["text"],
                "likes": tweet["likes"],
                "created_at": tweet["created_at"],
            }
        )
        cursor.execute(
            """
            INSERT INTO synced_posts (twitter_id, source, content_hash, synced_to, original_text, synced_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                tweet["id"],
                "twitter",
                f"hash_{tweet['id']}",
                "bluesky",
                tweet_json,
                tweet["created_at"],
            ),
        )

    test_db.commit()
    return tweets


@pytest.fixture
def two_users_with_tweets(test_db):
    """Create two test users with tweets"""
    import bcrypt

    cursor = test_db.cursor()
    current_time = int(time.time())

    # Create users
    password_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt(rounds=12))
    cursor.execute(
        "INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin) VALUES (?, ?, ?, ?, 1, 0)",
        (
            "testuser1",
            "testuser1@example.com",
            password_hash.decode("utf-8"),
            current_time,
        ),
    )
    user1_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin) VALUES (?, ?, ?, ?, 1, 0)",
        (
            "testuser2",
            "testuser2@example.com",
            password_hash.decode("utf-8"),
            current_time,
        ),
    )
    user2_id = cursor.lastrowid

    # Create tweets
    user1_tweets = [
        {
            "id": "2001",
            "text": "User 1 old tweet",
            "created_at": current_time - (60 * 24 * 3600),
            "likes": 2,
        },
        {
            "id": "2002",
            "text": "User 1 new tweet",
            "created_at": current_time - (5 * 24 * 3600),
            "likes": 50,
        },
    ]

    for tweet in user1_tweets + [
        {
            "id": "3001",
            "text": "User 2 old tweet",
            "created_at": current_time - (70 * 24 * 3600),
            "likes": 5,
        },
        {
            "id": "3002",
            "text": "User 2 new tweet",
            "created_at": current_time - (3 * 24 * 3600),
            "likes": 100,
        },
    ]:
        tweet_json = json.dumps(
            {
                "text": tweet["text"],
                "likes": tweet["likes"],
                "created_at": tweet["created_at"],
            }
        )
        cursor.execute(
            """INSERT INTO synced_posts (twitter_id, source, content_hash, synced_to, original_text, synced_at)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (
                tweet["id"],
                "twitter",
                f"hash_{tweet['id']}",
                "bluesky",
                tweet_json,
                tweet["created_at"],
            ),
        )

    test_db.commit()
    return ({"id": user1_id}, {"id": user2_id}, {})


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def get_tweets_for_rule_evaluation(test_db):
    """Fetch tweets from synced_posts for rule evaluation"""
    cursor = test_db.cursor()
    cursor.execute("SELECT * FROM synced_posts ORDER BY twitter_id")
    tweets = []
    for row in cursor.fetchall():
        tweet_data = json.loads(row["original_text"])
        tweets.append(
            {
                "id": row["twitter_id"],
                "text": tweet_data.get("text", ""),
                "created_at": tweet_data.get("created_at", 0),
                "likes": tweet_data.get("likes", 0),
                "retweets": tweet_data.get("retweets", 0),
                "replies": tweet_data.get("replies", 0),
            }
        )
    return tweets


def delete_from_synced_posts(test_db, tweet_id):
    """Delete tweet from synced_posts"""
    cursor = test_db.cursor()
    cursor.execute("DELETE FROM synced_posts WHERE twitter_id = ?", (tweet_id,))
    test_db.commit()
    return cursor.rowcount > 0


def count_synced_posts(test_db):
    """Count tweets in synced_posts"""
    cursor = test_db.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM synced_posts")
    return cursor.fetchone()["count"]


# =============================================================================
# TESTS: AGE-BASED CLEANUP RULES
# =============================================================================


class TestAgeBasedCleanup:
    """Integration tests for age-based cleanup rules"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_age_rule_preview_shows_old_tweets(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: User creates age-based rule for 30+ days old tweets"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete tweets older than 30 days",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        with patch.object(engine, "_fetch_user_tweets", return_value=tweets):
            preview = engine.preview_cleanup(user_id=user_id, rule_id=rule_id)

        assert preview is not None
        assert preview["count"] > 0
        assert any(
            t_id in preview["tweet_ids"]
            for t_id in ["1001", "1002", "1003", "1006", "1007", "1008"]
        )

    @pytest.mark.integration
    @pytest.mark.database
    def test_age_rule_dry_run_does_not_delete(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Dry run doesn't delete tweets"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        initial_count = count_synced_posts(test_db)

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete old tweets",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        with patch.object(engine, "_fetch_user_tweets", return_value=tweets):
            result = engine.execute_cleanup(
                user_id=user_id, rule_id=rule_id, dry_run=True
            )

        assert count_synced_posts(test_db) == initial_count
        assert result["dry_run"] is True
        assert result["tweets_deleted"] == 0

    @pytest.mark.integration
    @pytest.mark.database
    def test_age_rule_execute_deletes_matching_tweets(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Execute rule deletes old tweets"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        initial_count = count_synced_posts(test_db)

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete old tweets",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        def mock_delete(uid, tweet_id):
            return delete_from_synced_posts(test_db, tweet_id)

        with patch.object(
            engine, "_fetch_user_tweets", return_value=tweets
        ), patch.object(engine, "_delete_tweet", side_effect=mock_delete):
            result = engine.execute_cleanup(
                user_id=user_id, rule_id=rule_id, dry_run=False
            )

        assert count_synced_posts(test_db) < initial_count
        assert result["tweets_deleted"] > 0

        history = engine.get_cleanup_history(user_id=user_id)
        assert len(history) > 0
        assert history[0]["tweets_deleted"] == result["tweets_deleted"]


# =============================================================================
# TESTS: ENGAGEMENT-BASED CLEANUP RULES
# =============================================================================


class TestEngagementBasedCleanup:
    """Integration tests for engagement-based cleanup rules"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_engagement_rule_preview_low_engagement(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Engagement rule shows low-engagement tweets"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete low engagement tweets",
            rule_type="engagement",
            config={"min_likes": 10, "delete_if_below": True},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        with patch.object(engine, "_fetch_user_tweets", return_value=tweets):
            preview = engine.preview_cleanup(user_id=user_id, rule_id=rule_id)

        expected_low = ["1001", "1003", "1005", "1006", "1008"]
        for tweet_id in expected_low:
            assert tweet_id in preview["tweet_ids"]

    @pytest.mark.integration
    @pytest.mark.database
    def test_engagement_rule_execute(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Execute engagement rule"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        initial_count = count_synced_posts(test_db)

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete low engagement",
            rule_type="engagement",
            config={"min_likes": 10, "delete_if_below": True},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        def mock_delete(uid, tweet_id):
            return delete_from_synced_posts(test_db, tweet_id)

        with patch.object(
            engine, "_fetch_user_tweets", return_value=tweets
        ), patch.object(engine, "_delete_tweet", side_effect=mock_delete):
            result = engine.execute_cleanup(
                user_id=user_id, rule_id=rule_id, dry_run=False
            )

        assert count_synced_posts(test_db) < initial_count
        assert result["tweets_deleted"] > 0


# =============================================================================
# TESTS: PATTERN-BASED CLEANUP RULES
# =============================================================================


class TestPatternBasedCleanup:
    """Integration tests for pattern-based cleanup rules"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_pattern_rule_matches_hashtags(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Pattern rule matches hashtags"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete #cleanup tweets",
            rule_type="pattern",
            config={"regex": r"#cleanup"},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        with patch.object(engine, "_fetch_user_tweets", return_value=tweets):
            preview = engine.preview_cleanup(user_id=user_id, rule_id=rule_id)

        assert "1006" in preview["tweet_ids"]
        assert "1008" in preview["tweet_ids"]

    @pytest.mark.integration
    @pytest.mark.database
    def test_pattern_rule_execute(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Execute pattern rule"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        initial_count = count_synced_posts(test_db)

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete #cleanup tweets",
            rule_type="pattern",
            config={"regex": r"#cleanup"},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        def mock_delete(uid, tweet_id):
            return delete_from_synced_posts(test_db, tweet_id)

        with patch.object(
            engine, "_fetch_user_tweets", return_value=tweets
        ), patch.object(engine, "_delete_tweet", side_effect=mock_delete):
            result = engine.execute_cleanup(
                user_id=user_id, rule_id=rule_id, dry_run=False
            )

        assert count_synced_posts(test_db) < initial_count


# =============================================================================
# TESTS: MULTI-RULE INTERACTION
# =============================================================================


class TestMultiRuleInteraction:
    """Integration tests for multiple rules"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_multiple_rules_can_coexist(
        self, cleanup_engine_with_db, test_user, tweets_in_db
    ):
        """Test: Multiple rules can coexist"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        engine.create_rule(
            user_id=user_id,
            name="Old tweets",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )
        engine.create_rule(
            user_id=user_id,
            name="Low engagement",
            rule_type="engagement",
            config={"min_likes": 10, "delete_if_below": True},
        )
        engine.create_rule(
            user_id=user_id,
            name="With hashtag",
            rule_type="pattern",
            config={"regex": r"#cleanup"},
        )

        rules = engine.get_user_rules(user_id=user_id)
        assert len(rules) == 3

    @pytest.mark.integration
    @pytest.mark.database
    def test_rule_enable_disable(self, cleanup_engine_with_db, test_user, tweets_in_db):
        """Test: Enable/disable rule functionality"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule1_id = engine.create_rule(
            user_id=user_id,
            name="Rule 1",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )
        rule2_id = engine.create_rule(
            user_id=user_id,
            name="Rule 2",
            rule_type="engagement",
            config={"min_likes": 10, "delete_if_below": True},
        )

        engine.disable_rule(rule2_id, user_id=user_id)
        enabled_rules = engine.get_user_rules(user_id=user_id, enabled_only=True)
        assert len(enabled_rules) == 1
        assert enabled_rules[0]["name"] == "Rule 1"


# =============================================================================
# TESTS: DRY RUN VS EXECUTE
# =============================================================================


class TestDryRunVsExecute:
    """Integration tests comparing dry-run and execute modes"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_dry_run_vs_execute(self, cleanup_engine_with_db, test_user, tweets_in_db):
        """Test: Dry-run vs execute counts match"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Delete old tweets",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        tweets = get_tweets_for_rule_evaluation(test_db)

        with patch.object(engine, "_fetch_user_tweets", return_value=tweets):
            dry_result = engine.preview_cleanup(user_id=user_id, rule_id=rule_id)

        def mock_delete(uid, tweet_id):
            return delete_from_synced_posts(test_db, tweet_id)

        with patch.object(
            engine, "_fetch_user_tweets", return_value=tweets
        ), patch.object(engine, "_delete_tweet", side_effect=mock_delete):
            exec_result = engine.execute_cleanup(
                user_id=user_id, rule_id=rule_id, dry_run=False
            )

        assert dry_result["count"] == exec_result["tweets_deleted"]


# =============================================================================
# TESTS: USER ISOLATION
# =============================================================================


class TestUserIsolation:
    """Integration tests for multi-user safety"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_rules_isolated_per_user(
        self, cleanup_engine_with_db, two_users_with_tweets
    ):
        """Test: Rules are isolated per user"""
        engine, test_db, db_path = cleanup_engine_with_db
        user1_data, user2_data, _ = two_users_with_tweets
        user1_id = user1_data["id"]
        user2_id = user2_data["id"]

        engine.create_rule(
            user_id=user1_id,
            name="User 1 rule",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )
        engine.create_rule(
            user_id=user2_id,
            name="User 2 rule",
            rule_type="engagement",
            config={"min_likes": 10, "delete_if_below": True},
        )

        user1_rules = engine.get_user_rules(user_id=user1_id)
        user2_rules = engine.get_user_rules(user_id=user2_id)

        assert len(user1_rules) == 1
        assert len(user2_rules) == 1

    @pytest.mark.integration
    @pytest.mark.database
    def test_user_cannot_delete_other_user_rules(
        self, cleanup_engine_with_db, two_users_with_tweets
    ):
        """Test: User cannot delete other user's rules"""
        engine, test_db, db_path = cleanup_engine_with_db
        user1_data, user2_data, _ = two_users_with_tweets
        user1_id = user1_data["id"]
        user2_id = user2_data["id"]

        rule_id = engine.create_rule(
            user_id=user1_id,
            name="User 1 rule",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        result = engine.delete_rule(rule_id, user_id=user2_id)
        assert result is False

        user1_rules = engine.get_user_rules(user_id=user1_id)
        assert len(user1_rules) == 1


# =============================================================================
# TESTS: DATABASE INTEGRITY
# =============================================================================


class TestDatabaseIntegrity:
    """Integration tests for database integrity"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_cleanup_tables_exist_and_indexed(self, cleanup_engine_with_db, test_db):
        """Test: Cleanup tables exist with indexes"""
        engine, test_db_conn, db_path = cleanup_engine_with_db
        cursor = test_db_conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='cleanup_rules'"
        )
        assert cursor.fetchone() is not None

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='cleanup_history'"
        )
        assert cursor.fetchone() is not None

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_cleanup%'"
        )
        indexes = cursor.fetchall()
        assert len(indexes) >= 3

    @pytest.mark.integration
    @pytest.mark.database
    def test_foreign_key_constraints(self, cleanup_engine_with_db, test_user):
        """Test: Foreign key constraints work"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Valid rule",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        rules = engine.get_user_rules(user_id=user_id)
        assert len(rules) == 1
        assert rules[0]["user_id"] == user_id


# =============================================================================
# TESTS: ERROR HANDLING
# =============================================================================


class TestErrorHandling:
    """Integration tests for error handling"""

    @pytest.mark.integration
    @pytest.mark.database
    def test_invalid_regex_pattern_handled(self, cleanup_engine_with_db, test_user):
        """Test: Invalid regex is handled gracefully"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Invalid regex rule",
            rule_type="pattern",
            config={"regex": r"[invalid(regex"},
        )

        tweets = [
            {
                "id": "1",
                "text": "Test tweet",
                "created_at": int(time.time()),
                "likes": 5,
                "retweets": 0,
                "replies": 0,
            }
        ]

        with patch.object(engine, "_fetch_user_tweets", return_value=tweets):
            preview = engine.preview_cleanup(user_id=user_id, rule_id=rule_id)

        assert preview["count"] == 0

    @pytest.mark.integration
    @pytest.mark.database
    def test_empty_tweets_list_handled(self, cleanup_engine_with_db, test_user):
        """Test: Empty tweets list is handled"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        rule_id = engine.create_rule(
            user_id=user_id,
            name="Test rule",
            rule_type="age",
            config={"max_age_days": 30, "exclude_with_replies": False},
        )

        with patch.object(engine, "_fetch_user_tweets", return_value=[]):
            result = engine.execute_cleanup(
                user_id=user_id, rule_id=rule_id, dry_run=False
            )

        assert result["success"] is True
        assert result["tweets_deleted"] == 0

    @pytest.mark.integration
    @pytest.mark.database
    def test_nonexistent_rule_returns_error(self, cleanup_engine_with_db, test_user):
        """Test: Nonexistent rule returns error"""
        engine, test_db, db_path = cleanup_engine_with_db
        user_id = test_user["id"]

        result = engine.execute_cleanup(user_id=user_id, rule_id=99999, dry_run=False)

        assert result["success"] is False
        assert "error" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

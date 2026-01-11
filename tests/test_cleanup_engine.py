"""
Tests for CleanupEngine (Sprint 7 - CLEANUP-001)

Comprehensive tests for automated tweet cleanup engine with rule-based deletion.
Tests cover rule creation, evaluation, preview, dry-run, actual deletion, and user isolation.
"""
import pytest
import time
import os
import json
import tempfile
import re
from unittest.mock import Mock, patch, MagicMock
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.cleanup_engine import CleanupEngine


@pytest.fixture
def temp_db():
    """Create temporary test database"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def cleanup_engine(temp_db):
    """Create CleanupEngine instance with test database"""
    engine = CleanupEngine(db_path=temp_db)
    engine.init_db()
    return engine


@pytest.fixture
def sample_tweets():
    """Generate sample tweets for testing"""
    current_time = int(time.time())
    return [
        {
            'id': '1001',
            'text': 'Old tweet from 60 days ago',
            'created_at': current_time - (60 * 24 * 3600),
            'likes': 5,
            'retweets': 2,
            'replies': 0  # No replies - should match when exclude_with_replies is True
        },
        {
            'id': '1002',
            'text': 'Recent tweet from 10 days ago',
            'created_at': current_time - (10 * 24 * 3600),
            'likes': 50,
            'retweets': 20,
            'replies': 10
        },
        {
            'id': '1003',
            'text': 'RT @someone: Retweeted content',
            'created_at': current_time - (20 * 24 * 3600),
            'likes': 0,
            'retweets': 0,
            'replies': 0
        },
        {
            'id': '1004',
            'text': 'Low engagement tweet',
            'created_at': current_time - (15 * 24 * 3600),
            'likes': 2,
            'retweets': 0,
            'replies': 0
        },
        {
            'id': '1005',
            'text': 'Tweet with replies',
            'created_at': current_time - (40 * 24 * 3600),
            'likes': 15,
            'retweets': 5,
            'replies': 8
        }
    ]


class TestRuleCreation:
    """Tests for creating cleanup rules"""

    def test_create_age_rule(self, cleanup_engine):
        """Test creating an age-based cleanup rule"""
        rule_config = {
            'type': 'age',
            'max_age_days': 30,
            'exclude_with_replies': True
        }

        rule_id = cleanup_engine.create_rule(
            user_id=1,
            name='Delete old tweets',
            rule_type='age',
            config=rule_config
        )

        assert rule_id is not None
        assert rule_id > 0

        # Verify rule exists
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert len(rules) == 1
        assert rules[0]['name'] == 'Delete old tweets'
        assert rules[0]['rule_type'] == 'age'
        assert rules[0]['enabled'] == 1

    def test_create_engagement_rule(self, cleanup_engine):
        """Test creating an engagement-based cleanup rule"""
        rule_config = {
            'type': 'engagement',
            'min_likes': 10,
            'delete_if_below': True
        }

        rule_id = cleanup_engine.create_rule(
            user_id=1,
            name='Delete low engagement',
            rule_type='engagement',
            config=rule_config
        )

        assert rule_id is not None
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert len(rules) == 1
        assert rules[0]['rule_type'] == 'engagement'

    def test_create_pattern_rule(self, cleanup_engine):
        """Test creating a pattern-based cleanup rule"""
        rule_config = {
            'type': 'pattern',
            'regex': r'^RT @',
            'action': 'delete'
        }

        rule_id = cleanup_engine.create_rule(
            user_id=2,
            name='Delete retweets',
            rule_type='pattern',
            config=rule_config
        )

        assert rule_id is not None
        rules = cleanup_engine.get_user_rules(user_id=2, enabled_only=False)
        assert len(rules) == 1
        assert rules[0]['rule_type'] == 'pattern'

    def test_create_rule_with_invalid_config(self, cleanup_engine):
        """Test that invalid config raises error"""
        with pytest.raises(ValueError, match='config must be a dictionary'):
            cleanup_engine.create_rule(
                user_id=1,
                name='Invalid rule',
                rule_type='age',
                config='not a dict'
            )


class TestRuleRetrieval:
    """Tests for retrieving cleanup rules"""

    def test_get_user_rules_all(self, cleanup_engine):
        """Test getting all rules for a user"""
        # Create multiple rules
        cleanup_engine.create_rule(1, 'Rule 1', 'age', {'type': 'age', 'max_age_days': 30})
        cleanup_engine.create_rule(1, 'Rule 2', 'engagement', {'type': 'engagement', 'min_likes': 10})
        cleanup_engine.create_rule(2, 'Rule 3', 'pattern', {'type': 'pattern', 'regex': '^RT'})

        # Get user 1's rules
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert len(rules) == 2

        # Get user 2's rules
        rules = cleanup_engine.get_user_rules(user_id=2, enabled_only=False)
        assert len(rules) == 1

    def test_get_user_rules_enabled_only(self, cleanup_engine):
        """Test getting only enabled rules"""
        rule_id1 = cleanup_engine.create_rule(1, 'Enabled', 'age', {'type': 'age', 'max_age_days': 30})
        rule_id2 = cleanup_engine.create_rule(1, 'Disabled', 'engagement', {'type': 'engagement', 'min_likes': 10})

        # Disable one rule
        cleanup_engine.disable_rule(rule_id2, user_id=1)

        # Get only enabled rules
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=True)
        assert len(rules) == 1
        assert rules[0]['name'] == 'Enabled'

    def test_user_isolation(self, cleanup_engine):
        """Test that users can only see their own rules"""
        cleanup_engine.create_rule(1, 'User 1 Rule', 'age', {'type': 'age', 'max_age_days': 30})
        cleanup_engine.create_rule(2, 'User 2 Rule', 'age', {'type': 'age', 'max_age_days': 30})

        user1_rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        user2_rules = cleanup_engine.get_user_rules(user_id=2, enabled_only=False)

        assert len(user1_rules) == 1
        assert len(user2_rules) == 1
        assert user1_rules[0]['name'] == 'User 1 Rule'
        assert user2_rules[0]['name'] == 'User 2 Rule'


class TestRuleEvaluation:
    """Tests for evaluating rules against tweets"""

    def test_evaluate_age_rule(self, cleanup_engine, sample_tweets):
        """Test evaluating age-based rule"""
        rule = {
            'rule_type': 'age',
            'rule_config': json.dumps({
                'type': 'age',
                'max_age_days': 30,
                'exclude_with_replies': False
            })
        }

        matching_tweets = cleanup_engine.evaluate_rule(rule, sample_tweets)

        # Should match tweets older than 30 days (ids: 1001, 1005)
        assert len(matching_tweets) == 2
        assert any(t['id'] == '1001' for t in matching_tweets)
        assert any(t['id'] == '1005' for t in matching_tweets)

    def test_evaluate_age_rule_exclude_replies(self, cleanup_engine, sample_tweets):
        """Test age rule that excludes tweets with replies"""
        rule = {
            'rule_type': 'age',
            'rule_config': json.dumps({
                'type': 'age',
                'max_age_days': 30,
                'exclude_with_replies': True
            })
        }

        matching_tweets = cleanup_engine.evaluate_rule(rule, sample_tweets)

        # Should match old tweets without replies (id: 1001 only, not 1005)
        assert len(matching_tweets) == 1
        assert matching_tweets[0]['id'] == '1001'

    def test_evaluate_engagement_rule(self, cleanup_engine, sample_tweets):
        """Test evaluating engagement-based rule"""
        rule = {
            'rule_type': 'engagement',
            'rule_config': json.dumps({
                'type': 'engagement',
                'min_likes': 10,
                'delete_if_below': True
            })
        }

        matching_tweets = cleanup_engine.evaluate_rule(rule, sample_tweets)

        # Should match tweets with < 10 likes (ids: 1001, 1003, 1004)
        assert len(matching_tweets) == 3
        tweet_ids = [t['id'] for t in matching_tweets]
        assert '1001' in tweet_ids
        assert '1003' in tweet_ids
        assert '1004' in tweet_ids

    def test_evaluate_pattern_rule(self, cleanup_engine, sample_tweets):
        """Test evaluating pattern-based rule"""
        rule = {
            'rule_type': 'pattern',
            'rule_config': json.dumps({
                'type': 'pattern',
                'regex': r'^RT @',
                'action': 'delete'
            })
        }

        matching_tweets = cleanup_engine.evaluate_rule(rule, sample_tweets)

        # Should match retweets (id: 1003)
        assert len(matching_tweets) == 1
        assert matching_tweets[0]['id'] == '1003'


class TestPreviewCleanup:
    """Tests for previewing cleanup operations"""

    def test_preview_cleanup_returns_count(self, cleanup_engine):
        """Test that preview returns count of tweets to delete"""
        rule_config = {
            'type': 'age',
            'max_age_days': 30,
            'exclude_with_replies': False
        }
        rule_id = cleanup_engine.create_rule(1, 'Old tweets', 'age', rule_config)

        # Mock tweet fetching
        with patch.object(cleanup_engine, '_fetch_user_tweets') as mock_fetch:
            current_time = int(time.time())
            mock_fetch.return_value = [
                {'id': '1', 'created_at': current_time - (60 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0},
                {'id': '2', 'created_at': current_time - (10 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0}
            ]

            preview = cleanup_engine.preview_cleanup(user_id=1, rule_id=rule_id)

        assert preview is not None
        assert 'count' in preview
        assert preview['count'] == 1
        assert 'tweet_ids' in preview
        assert len(preview['tweet_ids']) == 1

    def test_preview_nonexistent_rule(self, cleanup_engine):
        """Test previewing with non-existent rule returns empty"""
        preview = cleanup_engine.preview_cleanup(user_id=1, rule_id=9999)
        assert preview is not None
        assert preview['count'] == 0


class TestDryRunExecution:
    """Tests for dry-run execution"""

    def test_dry_run_does_not_delete(self, cleanup_engine):
        """Test that dry run doesn't actually delete tweets"""
        rule_config = {'type': 'age', 'max_age_days': 30, 'exclude_with_replies': False}
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', rule_config)

        with patch.object(cleanup_engine, '_fetch_user_tweets') as mock_fetch, \
             patch.object(cleanup_engine, '_delete_tweet') as mock_delete:

            current_time = int(time.time())
            mock_fetch.return_value = [
                {'id': '1', 'created_at': current_time - (60 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0}
            ]

            result = cleanup_engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=True)

        # Verify deletion was NOT called
        mock_delete.assert_not_called()

        # Verify result shows what would be deleted
        assert result['dry_run'] is True
        assert result['tweets_deleted'] == 0
        assert result['would_delete'] == 1

    def test_dry_run_creates_history_entry(self, cleanup_engine):
        """Test that dry run creates a history entry"""
        rule_config = {'type': 'age', 'max_age_days': 30, 'exclude_with_replies': False}
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', rule_config)

        with patch.object(cleanup_engine, '_fetch_user_tweets') as mock_fetch:
            mock_fetch.return_value = []
            cleanup_engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=True)

        # Verify history entry was created with dry_run flag
        history = cleanup_engine.get_cleanup_history(user_id=1, limit=10)
        assert len(history) > 0
        assert history[0]['dry_run'] == 1


class TestActualDeletion:
    """Tests for actual tweet deletion"""

    def test_execute_cleanup_deletes_tweets(self, cleanup_engine):
        """Test that actual execution deletes tweets"""
        rule_config = {'type': 'age', 'max_age_days': 30, 'exclude_with_replies': False}
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', rule_config)

        with patch.object(cleanup_engine, '_fetch_user_tweets') as mock_fetch, \
             patch.object(cleanup_engine, '_delete_tweet') as mock_delete:

            current_time = int(time.time())
            mock_fetch.return_value = [
                {'id': '1', 'created_at': current_time - (60 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0},
                {'id': '2', 'created_at': current_time - (50 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0}
            ]
            mock_delete.return_value = True

            result = cleanup_engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=False)

        # Verify deletion WAS called
        assert mock_delete.call_count == 2
        assert result['dry_run'] is False
        assert result['tweets_deleted'] == 2

    def test_execute_cleanup_updates_rule_stats(self, cleanup_engine):
        """Test that execution updates rule statistics"""
        rule_config = {'type': 'age', 'max_age_days': 30, 'exclude_with_replies': False}
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', rule_config)

        with patch.object(cleanup_engine, '_fetch_user_tweets') as mock_fetch, \
             patch.object(cleanup_engine, '_delete_tweet') as mock_delete:

            current_time = int(time.time())
            mock_fetch.return_value = [
                {'id': '1', 'created_at': current_time - (60 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0}
            ]
            mock_delete.return_value = True

            cleanup_engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=False)

        # Get updated rule
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert rules[0]['deleted_count'] == 1
        assert rules[0]['last_run'] is not None

    def test_execute_cleanup_handles_deletion_errors(self, cleanup_engine):
        """Test that execution handles deletion errors gracefully"""
        rule_config = {'type': 'age', 'max_age_days': 30, 'exclude_with_replies': False}
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', rule_config)

        with patch.object(cleanup_engine, '_fetch_user_tweets') as mock_fetch, \
             patch.object(cleanup_engine, '_delete_tweet') as mock_delete:

            current_time = int(time.time())
            mock_fetch.return_value = [
                {'id': '1', 'created_at': current_time - (60 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0},
                {'id': '2', 'created_at': current_time - (50 * 24 * 3600), 'likes': 0, 'retweets': 0, 'replies': 0}
            ]
            # First succeeds, second fails
            mock_delete.side_effect = [True, False]

            result = cleanup_engine.execute_cleanup(user_id=1, rule_id=rule_id, dry_run=False)

        # Should report partial success
        assert result['tweets_deleted'] == 1
        assert 'errors' in result or result['tweets_deleted'] < 2


class TestRuleDeletion:
    """Tests for deleting cleanup rules"""

    def test_delete_rule(self, cleanup_engine):
        """Test deleting a cleanup rule"""
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', {'type': 'age', 'max_age_days': 30})

        result = cleanup_engine.delete_rule(rule_id, user_id=1)
        assert result is True

        # Verify rule no longer exists
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert len(rules) == 0

    def test_delete_rule_user_isolation(self, cleanup_engine):
        """Test that users cannot delete other users' rules"""
        rule_id = cleanup_engine.create_rule(1, 'User 1 rule', 'age', {'type': 'age', 'max_age_days': 30})

        # Try to delete as user 2
        result = cleanup_engine.delete_rule(rule_id, user_id=2)
        assert result is False

        # Verify rule still exists for user 1
        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert len(rules) == 1


class TestRuleEnabling:
    """Tests for enabling/disabling rules"""

    def test_disable_rule(self, cleanup_engine):
        """Test disabling a rule"""
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', {'type': 'age', 'max_age_days': 30})

        result = cleanup_engine.disable_rule(rule_id, user_id=1)
        assert result is True

        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert rules[0]['enabled'] == 0

    def test_enable_rule(self, cleanup_engine):
        """Test enabling a rule"""
        rule_id = cleanup_engine.create_rule(1, 'Test rule', 'age', {'type': 'age', 'max_age_days': 30})
        cleanup_engine.disable_rule(rule_id, user_id=1)

        result = cleanup_engine.enable_rule(rule_id, user_id=1)
        assert result is True

        rules = cleanup_engine.get_user_rules(user_id=1, enabled_only=False)
        assert rules[0]['enabled'] == 1


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])

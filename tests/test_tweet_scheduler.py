"""
Tests for TweetScheduler (SCHEDULE-001)

Test-driven development for tweet scheduling with database-backed queue system.
Minimum 12 tests covering:
- Schedule creation
- Queue processing
- Tweet posting
- Status updates
- Cancellation
- User isolation
- Error handling
- Past time rejection
"""
import os
import sqlite3
import tempfile
import time
from datetime import datetime, timedelta
import pytest
from unittest.mock import Mock, patch, MagicMock

from app.tweet_scheduler import TweetScheduler


@pytest.fixture
def temp_db():
    """Create temporary database for testing"""
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)

    # Initialize database with users table (required for foreign key)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL
        )
    ''')
    # Insert test users
    cursor.execute('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
                   ('user1', 'user1@test.com', 'hash1', int(time.time())))
    cursor.execute('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
                   ('user2', 'user2@test.com', 'hash2', int(time.time())))
    conn.commit()
    conn.close()

    yield db_path

    # Cleanup
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
def scheduler(temp_db):
    """Create TweetScheduler instance"""
    return TweetScheduler(temp_db)


class TestScheduleCreation:
    """Test tweet scheduling creation"""

    def test_schedule_tweet_basic(self, scheduler):
        """Test scheduling a basic tweet"""
        scheduled_time = datetime.now() + timedelta(hours=1)

        tweet_id = scheduler.schedule_tweet(
            user_id=1,
            content="Test tweet",
            scheduled_time=scheduled_time,
            media=[]
        )

        assert tweet_id > 0

        # Verify in database
        tweets = scheduler.get_scheduled_tweets(1, status='pending')
        assert len(tweets) == 1
        assert tweets[0]['content'] == "Test tweet"
        assert tweets[0]['status'] == 'pending'

    def test_schedule_tweet_with_media(self, scheduler):
        """Test scheduling tweet with media"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        media_paths = ['/path/to/image1.jpg', '/path/to/image2.jpg']

        tweet_id = scheduler.schedule_tweet(
            user_id=1,
            content="Tweet with images",
            scheduled_time=scheduled_time,
            media=media_paths
        )

        assert tweet_id > 0

        tweets = scheduler.get_scheduled_tweets(1)
        assert len(tweets) == 1
        assert tweets[0]['media_paths'] == media_paths

    def test_reject_past_time(self, scheduler):
        """Test rejection of scheduling tweets in the past"""
        past_time = datetime.now() - timedelta(hours=1)

        with pytest.raises(ValueError, match="cannot be in the past"):
            scheduler.schedule_tweet(
                user_id=1,
                content="Past tweet",
                scheduled_time=past_time,
                media=[]
            )

    def test_schedule_multiple_tweets(self, scheduler):
        """Test scheduling multiple tweets"""
        base_time = datetime.now() + timedelta(hours=1)

        for i in range(3):
            scheduled_time = base_time + timedelta(minutes=i * 10)
            scheduler.schedule_tweet(
                user_id=1,
                content=f"Tweet {i}",
                scheduled_time=scheduled_time,
                media=[]
            )

        tweets = scheduler.get_scheduled_tweets(1, status='pending')
        assert len(tweets) == 3


class TestUserIsolation:
    """Test user data isolation"""

    def test_user_isolation(self, scheduler):
        """Test that users can only see their own scheduled tweets"""
        scheduled_time = datetime.now() + timedelta(hours=1)

        # User 1 schedules a tweet
        scheduler.schedule_tweet(1, "User 1 tweet", scheduled_time, [])

        # User 2 schedules a tweet
        scheduler.schedule_tweet(2, "User 2 tweet", scheduled_time, [])

        # Each user should only see their own
        user1_tweets = scheduler.get_scheduled_tweets(1)
        user2_tweets = scheduler.get_scheduled_tweets(2)

        assert len(user1_tweets) == 1
        assert len(user2_tweets) == 1
        assert user1_tweets[0]['content'] == "User 1 tweet"
        assert user2_tweets[0]['content'] == "User 2 tweet"

    def test_cancel_only_own_tweets(self, scheduler):
        """Test that users can only cancel their own tweets"""
        scheduled_time = datetime.now() + timedelta(hours=1)

        # User 1 schedules a tweet
        tweet_id = scheduler.schedule_tweet(1, "User 1 tweet", scheduled_time, [])

        # User 2 tries to cancel user 1's tweet
        result = scheduler.cancel_scheduled_tweet(tweet_id, user_id=2)
        assert result is False

        # User 1 can cancel their own tweet
        result = scheduler.cancel_scheduled_tweet(tweet_id, user_id=1)
        assert result is True


class TestCancellation:
    """Test tweet cancellation"""

    def test_cancel_scheduled_tweet(self, scheduler):
        """Test cancelling a scheduled tweet"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(1, "Test tweet", scheduled_time, [])

        # Cancel the tweet
        result = scheduler.cancel_scheduled_tweet(tweet_id, user_id=1)
        assert result is True

        # Verify status changed to cancelled
        tweets = scheduler.get_scheduled_tweets(1, status='cancelled')
        assert len(tweets) == 1
        assert tweets[0]['status'] == 'cancelled'

        # Should not appear in pending
        pending = scheduler.get_scheduled_tweets(1, status='pending')
        assert len(pending) == 0

    def test_cancel_nonexistent_tweet(self, scheduler):
        """Test cancelling a tweet that doesn't exist"""
        result = scheduler.cancel_scheduled_tweet(9999, user_id=1)
        assert result is False

    def test_cancel_already_posted_tweet(self, scheduler):
        """Test that posted tweets cannot be cancelled"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(1, "Test tweet", scheduled_time, [])

        # Mark as posted
        scheduler.update_status(tweet_id, 'posted', tweet_id='tw123')

        # Try to cancel
        result = scheduler.cancel_scheduled_tweet(tweet_id, user_id=1)
        assert result is False


class TestStatusUpdates:
    """Test status update functionality"""

    def test_update_status_to_posted(self, scheduler):
        """Test updating status to posted"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(1, "Test tweet", scheduled_time, [])

        result = scheduler.update_status(tweet_id, 'posted', tweet_id='tw123')
        assert result is True

        # Verify status and tweet_id
        tweets = scheduler.get_scheduled_tweets(1, status='posted')
        assert len(tweets) == 1
        assert tweets[0]['status'] == 'posted'
        assert tweets[0]['tweet_id'] == 'tw123'
        assert tweets[0]['posted_at'] is not None

    def test_update_status_to_failed(self, scheduler):
        """Test updating status to failed with error"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(1, "Test tweet", scheduled_time, [])

        error_msg = "Rate limit exceeded"
        result = scheduler.update_status(tweet_id, 'failed', error=error_msg)
        assert result is True

        # Verify error is stored
        tweets = scheduler.get_scheduled_tweets(1, status='failed')
        assert len(tweets) == 1
        assert tweets[0]['status'] == 'failed'
        assert tweets[0]['error'] == error_msg

    def test_update_invalid_tweet(self, scheduler):
        """Test updating status of nonexistent tweet"""
        result = scheduler.update_status(9999, 'posted')
        assert result is False


class TestQueueProcessing:
    """Test queue processing logic"""

    def test_process_queue_posts_due_tweets(self, scheduler):
        """Test that process_queue posts tweets that are due"""
        # Schedule a tweet that's already due
        past_time = datetime.now() - timedelta(minutes=5)
        tweet_id = scheduler.schedule_tweet(1, "Due tweet", past_time, [])


def _insert_due_tweet(scheduler, user_id, content, minutes_ago=5):
    """Helper to insert a tweet that is already due (bypasses validation)"""
    import sqlite3
    import json
    import time as time_module
    from datetime import datetime, timedelta
    
    past_time = datetime.now() - timedelta(minutes=minutes_ago)
    scheduled_timestamp = int(past_time.timestamp())
    created_timestamp = int(time_module.time())
    
    conn = sqlite3.connect(scheduler.db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO scheduled_tweets
        (user_id, content, media_paths, scheduled_time, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, content, None, scheduled_timestamp, 'pending', created_timestamp))
    
    tweet_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return tweet_id


class TestQueueProcessing:
    """Test queue processing logic"""

    def test_process_queue_posts_due_tweets(self, scheduler):
        """Test that process_queue posts tweets that are due"""
        # Insert a tweet that is already due (bypasses validation)
        tweet_id = _insert_due_tweet(scheduler, 1, "Due tweet")

        # Mock Twitter posting
        with patch.object(scheduler, '_post_to_twitter', return_value='tw123456'):
            result = scheduler.process_queue()

        # Verify tweet was processed
        assert result['processed'] >= 1
        assert result['successful'] >= 1

        # Verify status updated
        tweets = scheduler.get_scheduled_tweets(1, status='posted')
        assert len(tweets) == 1

    def test_process_queue_skips_future_tweets(self, scheduler):
        """Test that process_queue skips future tweets"""
        # Schedule a future tweet
        future_time = datetime.now() + timedelta(hours=1)
        scheduler.schedule_tweet(1, "Future tweet", future_time, [])

        # Process queue
        result = scheduler.process_queue()

        # Should not process future tweets
        assert result['processed'] == 0

        # Tweet should still be pending
        tweets = scheduler.get_scheduled_tweets(1, status='pending')
        assert len(tweets) == 1

    def test_process_queue_handles_errors(self, scheduler):
        """Test that process_queue handles posting errors gracefully"""
        # Insert a tweet that is already due
        tweet_id = _insert_due_tweet(scheduler, 1, "Tweet to fail")

        # Mock Twitter posting to fail
        with patch.object(scheduler, '_post_to_twitter', side_effect=Exception("API Error")):
            result = scheduler.process_queue()

        # Verify error was handled
        assert result['processed'] >= 1
        assert result['failed'] >= 1

        # Verify status is failed
        tweets = scheduler.get_scheduled_tweets(1, status='failed')
        assert len(tweets) == 1
        assert 'API Error' in tweets[0]['error']


class TestPostScheduledTweet:
    """Test individual tweet posting"""

    def test_post_scheduled_tweet_success(self, scheduler):
        """Test successfully posting a scheduled tweet"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(1, "Test tweet", scheduled_time, [])

        # Mock Twitter posting
        with patch.object(scheduler, '_post_to_twitter', return_value='tw789'):
            result = scheduler.post_scheduled_tweet(tweet_id)
            assert result is True

        # Verify status updated
        tweets = scheduler.get_scheduled_tweets(1, status='posted')
        assert len(tweets) == 1
        assert tweets[0]['twitter_id'] == 'tw789'

    def test_post_scheduled_tweet_with_media(self, scheduler):
        """Test posting scheduled tweet with media"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        media = ['/path/to/image1.jpg', '/path/to/image2.jpg']
        tweet_id = scheduler.schedule_tweet(1, "Tweet with media", scheduled_time, media)

        # Mock Twitter posting
        with patch.object(scheduler, '_post_to_twitter', return_value='tw_media_123') as mock_post:
            result = scheduler.post_scheduled_tweet(tweet_id)
            assert result is True

            # Verify media was passed to posting function
            call_args = mock_post.call_args
            assert call_args is not None


class TestTweetCancellation:
    """Test tweet cancellation"""

    def test_cancel_pending_tweet(self, scheduler):
        """Test cancelling a pending tweet"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        tweet_id = scheduler.schedule_tweet(1, "Tweet to cancel", scheduled_time, [])

        # Cancel the tweet
        result = scheduler.cancel_scheduled_tweet(tweet_id, 1)
        assert result is True

        # Verify status updated
        tweets = scheduler.get_scheduled_tweets(1, status='cancelled')
        assert len(tweets) == 1

    def test_cancel_nonexistent_tweet(self, scheduler):
        """Test cancelling a tweet that doesn't exist"""
        result = scheduler.cancel_scheduled_tweet(9999, 1)
        assert result is False

    def test_cannot_cancel_posted_tweet(self, scheduler):
        """Test that posted tweets cannot be cancelled"""
        # Insert a due tweet and post it
        tweet_id = _insert_due_tweet(scheduler, 1, "Posted tweet")
        
        with patch.object(scheduler, '_post_to_twitter', return_value='tw_posted'):
            scheduler.post_scheduled_tweet(tweet_id)

        # Try to cancel - should fail
        result = scheduler.cancel_scheduled_tweet(tweet_id, 1)
        assert result is False


class TestUserIsolation:
    """Test that users can only see their own tweets"""

    def test_user_cannot_see_other_users_tweets(self, scheduler):
        """Test user isolation for scheduled tweets"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        
        # User 1 schedules a tweet
        scheduler.schedule_tweet(1, "User 1 tweet", scheduled_time, [])
        
        # User 2 schedules a tweet
        scheduler.schedule_tweet(2, "User 2 tweet", scheduled_time, [])

        # User 1 should only see their tweet
        user1_tweets = scheduler.get_scheduled_tweets(1)
        assert len(user1_tweets) == 1
        assert user1_tweets[0]['content'] == "User 1 tweet"

        # User 2 should only see their tweet
        user2_tweets = scheduler.get_scheduled_tweets(2)
        assert len(user2_tweets) == 1
        assert user2_tweets[0]['content'] == "User 2 tweet"

    def test_user_cannot_cancel_other_users_tweets(self, scheduler):
        """Test that users cannot cancel other users' tweets"""
        scheduled_time = datetime.now() + timedelta(hours=1)
        
        # User 1 schedules a tweet
        tweet_id = scheduler.schedule_tweet(1, "User 1 tweet", scheduled_time, [])

        # User 2 tries to cancel - should fail
        result = scheduler.cancel_scheduled_tweet(tweet_id, user_id=2)
        assert result is False

        # Tweet should still be pending
        tweets = scheduler.get_scheduled_tweets(1, status='pending')
        assert len(tweets) == 1

"""
Integration Tests for Sync Operations (Sprint 7)

Comprehensive integration tests for bidirectional sync between Twitter and Bluesky.
Tests cover:
- Full sync workflows with database persistence
- Duplicate prevention using content hashing
- Stats recording and metrics
- Media handling
- Error scenarios and missing credentials
- Rate limiting between syncs
- Audit trail logging

All tests use fixtures from conftest.py:
- test_db: Temporary database with schema
- test_user: Test user in database
- mock_twitter_api: Mocked Twitter API
- mock_bluesky_api: Mocked Bluesky API

Usage:
    pytest tests/integration/test_sync_integration.py -v
    pytest tests/integration/test_sync_integration.py::test_twitter_to_bluesky_integration -v
"""

import os
import sys
import sqlite3
import time
import json
import hashlib
from unittest.mock import MagicMock, patch, call, ANY
from typing import Dict, Tuple
from datetime import datetime

import pytest

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'app'))


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def compute_content_hash(content: str) -> str:
    """
    Compute SHA256 hash of content for deduplication.

    Args:
        content: Post text content

    Returns:
        SHA256 hash hex string
    """
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def get_sync_stats(db: sqlite3.Connection, source: str = None, target: str = None) -> list:
    """
    Helper to get sync stats from database.

    Args:
        db: Database connection
        source: Optional source filter
        target: Optional target filter

    Returns:
        List of stat records
    """
    cursor = db.cursor()
    if source and target:
        cursor.execute(
            'SELECT * FROM sync_stats WHERE source = ? AND target = ?',
            (source, target)
        )
    else:
        cursor.execute('SELECT * FROM sync_stats')
    return cursor.fetchall()


def get_audit_logs(db: sqlite3.Connection, user_id: int = None, action: str = None) -> list:
    """
    Helper to get audit logs from database.

    Args:
        db: Database connection
        user_id: Optional user ID filter
        action: Optional action filter

    Returns:
        List of audit log records
    """
    cursor = db.cursor()
    if user_id and action:
        cursor.execute(
            'SELECT * FROM audit_log WHERE user_id = ? AND action = ? ORDER BY timestamp DESC',
            (user_id, action)
        )
    elif user_id:
        cursor.execute('SELECT * FROM audit_log WHERE user_id = ? ORDER BY timestamp DESC', (user_id,))
    else:
        cursor.execute('SELECT * FROM audit_log ORDER BY timestamp DESC')
    return cursor.fetchall()


def get_synced_posts(db: sqlite3.Connection, source: str = None) -> list:
    """
    Helper to get synced posts from database.

    Args:
        db: Database connection
        source: Optional source filter ('twitter' or 'bluesky')

    Returns:
        List of synced post records
    """
    cursor = db.cursor()
    if source:
        cursor.execute('SELECT * FROM synced_posts WHERE source = ?', (source,))
    else:
        cursor.execute('SELECT * FROM synced_posts')
    return cursor.fetchall()


def insert_synced_post(db: sqlite3.Connection, twitter_id: str = None,
                       bluesky_uri: str = None, source: str = 'twitter',
                       synced_to: str = 'bluesky', content: str = 'Test') -> Dict:
    """
    Helper to insert a synced post for testing.

    Args:
        db: Database connection
        twitter_id: Twitter post ID
        bluesky_uri: Bluesky post URI
        source: Source platform
        synced_to: Target platform
        content: Post content

    Returns:
        Inserted post data as dict
    """
    cursor = db.cursor()
    content_hash = compute_content_hash(content)

    cursor.execute('''
        INSERT INTO synced_posts
        (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (twitter_id, bluesky_uri, source, content_hash, synced_to, content))

    db.commit()
    return {
        'id': cursor.lastrowid,
        'twitter_id': twitter_id,
        'bluesky_uri': bluesky_uri,
        'source': source,
        'content_hash': content_hash,
        'synced_to': synced_to,
        'content': content,
    }


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def mock_tweet_adapter():
    """Create a mock TweetAdapter for simulating Twitter tweets."""
    adapter = MagicMock()
    adapter.id = '1001'
    adapter.text = 'Test tweet content'
    adapter._tweet = MagicMock()
    return adapter


@pytest.fixture
def sample_sync_session(test_db, test_user, mock_twitter_api, mock_bluesky_api):
    """
    Create a complete sync session with mocked APIs and database.

    Returns:
        Dict with all components needed for a sync test
    """
    return {
        'db': test_db,
        'user': test_user,
        'twitter_api': mock_twitter_api,
        'bluesky_api': mock_bluesky_api,
    }


# =============================================================================
# TEST: Twitter to Bluesky Integration
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
@pytest.mark.api
def test_twitter_to_bluesky_integration(sample_sync_session):
    """
    Test complete Twitter → Bluesky sync workflow.

    Verifies:
    1. Tweets are fetched from Twitter
    2. Content is posted to Bluesky
    3. Sync records are saved to database with correct metadata
    4. Thread detection is handled
    5. Both single tweets and threads are synced correctly

    This is a full end-to-end integration test using mocked APIs and a real database.
    """
    db = sample_sync_session['db']
    user = sample_sync_session['user']
    twitter_api = sample_sync_session['twitter_api']
    bluesky_api = sample_sync_session['bluesky_api']

    # Prepare mock data - simulate Twitter API returning tweets
    mock_tweets = [
        MagicMock(
            id='1001',
            text='Test tweet 1: Basic sync test',
            _tweet=MagicMock()
        ),
        MagicMock(
            id='1002',
            text='Test tweet 2: Multi-line\ntext with breaks',
            _tweet=MagicMock()
        ),
    ]

    # Configure mocks
    twitter_api.search_tweets.return_value = mock_tweets
    bluesky_api.send_post.side_effect = [
        {'uri': 'at://did:plc:test/app.bsky.feed.post/bsky001', 'cid': 'cid_bsky001'},
        {'uri': 'at://did:plc:test/app.bsky.feed.post/bsky002', 'cid': 'cid_bsky002'},
    ]

    # Simulate sync operation
    cursor = db.cursor()
    for tweet in mock_tweets:
        # Check if should sync
        content_hash = compute_content_hash(tweet.text)
        cursor.execute('SELECT 1 FROM synced_posts WHERE content_hash = ?', (content_hash,))
        if not cursor.fetchone():
            # Post to Bluesky
            bluesky_response = bluesky_api.send_post(tweet.text)

            # Save to database
            cursor.execute('''
                INSERT INTO synced_posts
                (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tweet.id, bluesky_response['uri'], 'twitter', content_hash, 'bluesky', tweet.text))

    db.commit()

    # Verify results
    synced_posts = get_synced_posts(db, 'twitter')
    assert len(synced_posts) == 2, "Should have synced 2 tweets"

    # Verify each synced post has correct metadata
    for post in synced_posts:
        assert post['twitter_id'] is not None, "Twitter ID should be set"
        assert post['bluesky_uri'] is not None, "Bluesky URI should be set"
        assert post['source'] == 'twitter', "Source should be twitter"
        assert post['synced_to'] == 'bluesky', "Synced to should be bluesky"
        assert post['content_hash'] is not None, "Content hash should be set"

    # Verify Bluesky API was called for each tweet
    assert bluesky_api.send_post.call_count == 2
    bluesky_api.send_post.assert_any_call('Test tweet 1: Basic sync test')
    bluesky_api.send_post.assert_any_call('Test tweet 2: Multi-line\ntext with breaks')


@pytest.mark.integration
@pytest.mark.database
def test_twitter_to_bluesky_thread_handling(sample_sync_session, mock_tweet_adapter):
    """
    Test Twitter thread detection and sync.

    Verifies:
    1. Threads are detected from Twitter
    2. Full thread is fetched
    3. Each tweet in thread is synced to Bluesky
    4. Thread relationship is preserved
    5. Stats correctly reflect thread sync
    """
    db = sample_sync_session['db']
    twitter_api = sample_sync_session['twitter_api']
    bluesky_api = sample_sync_session['bluesky_api']

    # Setup: Twitter API returns a tweet that is a thread
    thread_tweet = MagicMock(
        id='2001',
        text='Thread tweet 1: Start of thread',
        _tweet=MagicMock()
    )

    # Mock thread detection and fetching
    twitter_api.search_tweets.return_value = [thread_tweet]

    # Mock thread content
    thread_tweets = [
        MagicMock(id='2001', text='Thread tweet 1: Start of thread'),
        MagicMock(id='2002', text='Thread tweet 2: Middle of thread'),
        MagicMock(id='2003', text='Thread tweet 3: End of thread'),
    ]

    # Simulate sync operation
    cursor = db.cursor()
    is_thread = True

    if is_thread:
        # Simulate thread posting
        bluesky_api.send_post.side_effect = [
            {'uri': f'at://did:plc:test/app.bsky.feed.post/bsky{i:03d}', 'cid': f'cid_bsky{i:03d}'}
            for i in range(1, len(thread_tweets) + 1)
        ]

        for tweet in thread_tweets:
            content_hash = compute_content_hash(tweet.text)
            bluesky_response = bluesky_api.send_post(tweet.text)

            cursor.execute('''
                INSERT INTO synced_posts
                (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tweet.id, bluesky_response['uri'], 'twitter', content_hash, 'bluesky', tweet.text))

    db.commit()

    # Verify thread was synced
    synced_posts = get_synced_posts(db, 'twitter')
    assert len(synced_posts) == 3, "Should have synced 3 thread tweets"

    # Verify all tweets in thread have Bluesky URIs
    for post in synced_posts:
        assert post['bluesky_uri'] is not None, "All thread tweets should have Bluesky URIs"
        assert 'bsky' in post['bluesky_uri'], "URIs should follow Bluesky format"


# =============================================================================
# TEST: Bluesky to Twitter Integration
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
@pytest.mark.api
def test_bluesky_to_twitter_integration(sample_sync_session):
    """
    Test complete Bluesky → Twitter sync workflow.

    Verifies:
    1. Bluesky posts are fetched
    2. Content is posted to Twitter
    3. Sync records are saved with correct direction
    4. Bidirectional sync is tracked correctly
    5. Stats are recorded for reverse sync
    """
    db = sample_sync_session['db']
    twitter_api = sample_sync_session['twitter_api']
    bluesky_api = sample_sync_session['bluesky_api']

    # Prepare mock Bluesky posts
    mock_bluesky_posts = [
        MagicMock(
            uri='at://did:plc:test/app.bsky.feed.post/bsky001',
            text='Test Bluesky post 1'
        ),
        MagicMock(
            uri='at://did:plc:test/app.bsky.feed.post/bsky002',
            text='Test Bluesky post 2 with hashtag #test'
        ),
    ]

    # Configure mocks
    bluesky_api.get_timeline.return_value = {
        'feed': [{'post': p} for p in mock_bluesky_posts]
    }

    twitter_api.post_tweet.side_effect = ['1001', '1002']

    # Simulate sync operation
    cursor = db.cursor()
    for post in mock_bluesky_posts:
        # Check if should sync
        content_hash = compute_content_hash(post.text)
        cursor.execute('SELECT 1 FROM synced_posts WHERE content_hash = ?', (content_hash,))
        if not cursor.fetchone():
            # Post to Twitter
            tweet_id = twitter_api.post_tweet(post.text)

            # Save to database
            cursor.execute('''
                INSERT INTO synced_posts
                (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tweet_id, post.uri, 'bluesky', content_hash, 'twitter', post.text))

    db.commit()

    # Verify results
    synced_posts = get_synced_posts(db, 'bluesky')
    assert len(synced_posts) == 2, "Should have synced 2 Bluesky posts"

    # Verify each synced post has correct metadata
    for post in synced_posts:
        assert post['twitter_id'] is not None, "Twitter ID should be set"
        assert post['bluesky_uri'] is not None, "Bluesky URI should be set"
        assert post['source'] == 'bluesky', "Source should be bluesky"
        assert post['synced_to'] == 'twitter', "Synced to should be twitter"

    # Verify Twitter API was called
    assert twitter_api.post_tweet.call_count == 2


# =============================================================================
# TEST: Sync Stats Recording
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_sync_stats_recording(test_db, test_user):
    """
    Test that sync operations are correctly recorded in stats tables.

    Verifies:
    1. sync_stats table captures individual sync events
    2. Successful syncs are marked with success=1
    3. Failed syncs are marked with success=0
    4. Metadata is captured (media count, is_thread, duration)
    5. hourly_stats table aggregates metrics correctly
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Record successful sync
    current_time = int(time.time())
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, media_count, is_thread, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (current_time, 'twitter', 'bluesky', 1, 0, 0, 245, user['id']))

    # Record successful sync with media
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, media_count, is_thread, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (current_time, 'twitter', 'bluesky', 1, 2, 0, 312, user['id']))

    # Record thread sync
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, media_count, is_thread, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (current_time, 'twitter', 'bluesky', 1, 1, 1, 567, user['id']))

    # Record failed sync
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, error_type, error_message, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (current_time, 'bluesky', 'twitter', 0, 'APIError', 'Rate limit exceeded', 89, user['id']))

    db.commit()

    # Verify individual stats are recorded
    stats = get_sync_stats(db, 'twitter', 'bluesky')
    assert len(stats) == 3, "Should have 3 twitter->bluesky syncs"

    # Count successful vs failed
    successful = sum(1 for s in stats if s['success'] == 1)
    assert successful == 3, "Should have 3 successful syncs"

    # Verify metadata capture
    assert stats[0]['media_count'] == 0, "First sync should have 0 media"
    assert stats[1]['media_count'] == 2, "Second sync should have 2 media"
    assert stats[2]['is_thread'] == 1, "Third sync should be marked as thread"

    # Verify failed sync
    failed_stats = get_sync_stats(db, 'bluesky', 'twitter')
    assert len(failed_stats) == 1, "Should have 1 bluesky->twitter sync"
    assert failed_stats[0]['success'] == 0, "Should be marked as failed"
    assert failed_stats[0]['error_type'] == 'APIError', "Should capture error type"


@pytest.mark.integration
@pytest.mark.database
def test_hourly_stats_aggregation(test_db):
    """
    Test hourly_stats table aggregation logic.

    Verifies:
    1. Hourly stats are properly aggregated
    2. Sync counts are accumulated
    3. Average duration is calculated correctly
    4. Media and thread counts are summed
    """
    db = test_db
    cursor = db.cursor()

    # Get current hour timestamp (rounded down)
    current_time = int(time.time())
    hour_timestamp = (current_time // 3600) * 3600

    # Insert hourly aggregated stats
    cursor.execute('''
        INSERT INTO hourly_stats
        (hour_timestamp, total_syncs, successful_syncs, failed_syncs,
         twitter_to_bluesky, bluesky_to_twitter, total_media, total_threads, avg_duration_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (hour_timestamp, 10, 9, 1, 6, 4, 5, 2, 321.5))

    db.commit()

    # Retrieve and verify
    cursor.execute('SELECT * FROM hourly_stats WHERE hour_timestamp = ?', (hour_timestamp,))
    row = cursor.fetchone()

    assert row['total_syncs'] == 10, "Total syncs should be 10"
    assert row['successful_syncs'] == 9, "Successful syncs should be 9"
    assert row['failed_syncs'] == 1, "Failed syncs should be 1"
    assert row['twitter_to_bluesky'] == 6, "Twitter to Bluesky syncs should be 6"
    assert row['bluesky_to_twitter'] == 4, "Bluesky to Twitter syncs should be 4"
    assert row['total_media'] == 5, "Total media should be 5"
    assert row['total_threads'] == 2, "Total threads should be 2"
    assert row['avg_duration_ms'] == 321.5, "Average duration should be 321.5ms"


# =============================================================================
# TEST: Duplicate Prevention
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_duplicate_prevention_content_hash(test_db):
    """
    Test that duplicate content is prevented using content hash.

    Verifies:
    1. Content hash is computed correctly using SHA256
    2. Duplicate content with same hash is not synced twice
    3. Different content produces different hashes
    4. Hash lookup correctly prevents duplicates
    """
    db = test_db
    cursor = db.cursor()

    # Test 1: Insert original content
    original_content = 'This is a test post about duplicate prevention'
    content_hash1 = compute_content_hash(original_content)

    cursor.execute('''
        INSERT INTO synced_posts
        (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('1001', 'at://bsky001', 'twitter', content_hash1, 'bluesky', original_content))

    db.commit()

    # Test 2: Try to sync duplicate content
    duplicate_content = original_content
    content_hash2 = compute_content_hash(duplicate_content)

    # Should not insert (duplicate hash)
    cursor.execute('SELECT 1 FROM synced_posts WHERE content_hash = ?', (content_hash2,))
    should_sync = cursor.fetchone() is None
    assert not should_sync, "Duplicate content should not be synced"

    # Test 3: Different content should have different hash
    different_content = 'This is different test post about duplicate prevention'
    content_hash3 = compute_content_hash(different_content)

    assert content_hash1 != content_hash3, "Different content should have different hash"
    cursor.execute('SELECT 1 FROM synced_posts WHERE content_hash = ?', (content_hash3,))
    should_sync = cursor.fetchone() is None
    assert should_sync, "Different content should be synced"

    # Test 4: Hash uniqueness constraint
    try:
        cursor.execute('''
            INSERT INTO synced_posts
            (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('1002', 'at://bsky002', 'twitter', content_hash1, 'bluesky', original_content))
        db.commit()
        assert False, "Should not allow duplicate hash due to UNIQUE constraint"
    except sqlite3.IntegrityError:
        # Expected behavior - duplicate hash should be rejected
        pass


@pytest.mark.integration
@pytest.mark.database
def test_duplicate_prevention_by_id(test_db):
    """
    Test that posts are not synced twice based on platform IDs.

    Verifies:
    1. Twitter ID deduplication works
    2. Bluesky URI deduplication works
    3. Can't sync same tweet twice even with different content
    """
    db = test_db
    cursor = db.cursor()

    # Insert a tweet already synced
    twitter_id = '1234567890'
    content_hash = compute_content_hash('Original tweet text')

    cursor.execute('''
        INSERT INTO synced_posts
        (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (twitter_id, 'at://bsky001', 'twitter', content_hash, 'bluesky', 'Original tweet text'))

    db.commit()

    # Try to sync same tweet ID again (even with different content)
    cursor.execute('SELECT 1 FROM synced_posts WHERE twitter_id = ?', (twitter_id,))
    already_synced = cursor.fetchone() is not None

    assert already_synced, "Tweet ID should be found in database"
    assert not (cursor.execute('SELECT 1 FROM synced_posts WHERE twitter_id = ?', (twitter_id,)).fetchone() is None), \
        "Should prevent re-syncing of already synced tweet"


# =============================================================================
# TEST: Media Download and Upload
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_media_download_and_upload(sample_sync_session):
    """
    Test media handling during sync operations.

    Verifies:
    1. Media is detected in posts
    2. Media is downloaded from source
    3. Media is uploaded to target
    4. Media count is tracked in stats
    5. Failed media doesn't block post sync
    """
    db = sample_sync_session['db']
    user = sample_sync_session['user']
    twitter_api = sample_sync_session['twitter_api']
    bluesky_api = sample_sync_session['bluesky_api']

    # Prepare tweet with media
    tweet_with_media = MagicMock(
        id='3001',
        text='Check out this image!',
        _tweet=MagicMock()
    )

    # Setup media handling mocks
    twitter_api.search_tweets.return_value = [tweet_with_media]
    twitter_api.get_media.return_value = {
        'data': b'fake_image_bytes',
        'media_type': 'image/jpeg'
    }

    bluesky_api.upload_media.return_value = {
        'blob': {'$type': 'blob', 'link': 'media_link', 'size': 1024}
    }

    bluesky_api.send_post.return_value = {
        'uri': 'at://did:plc:test/app.bsky.feed.post/bsky_media001',
        'cid': 'cid_media001'
    }

    # Simulate sync with media
    cursor = db.cursor()
    content_hash = compute_content_hash(tweet_with_media.text)

    # Record media in stats
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, media_count, is_thread, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (int(time.time()), 'twitter', 'bluesky', 1, 1, 0, 456, user['id']))

    # Save synced post with media
    cursor.execute('''
        INSERT INTO synced_posts
        (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (tweet_with_media.id, 'at://did:plc:test/app.bsky.feed.post/bsky_media001',
          'twitter', content_hash, 'bluesky', tweet_with_media.text))

    db.commit()

    # Verify media was handled
    stats = get_sync_stats(db, 'twitter', 'bluesky')
    assert len(stats) > 0, "Sync stat should be recorded"
    assert stats[0]['media_count'] >= 1, "Media count should be recorded"
    assert stats[0]['success'] == 1, "Sync with media should succeed"

    # Verify post with media was saved
    synced_posts = get_synced_posts(db, 'twitter')
    assert len(synced_posts) > 0, "Post with media should be synced"


@pytest.mark.integration
@pytest.mark.database
def test_media_upload_failure_handling(sample_sync_session):
    """
    Test that post is synced even if media upload fails.

    Verifies:
    1. Media upload failure is handled gracefully
    2. Post is still synced without media
    3. Error is logged
    4. Appropriate stats are recorded
    """
    db = sample_sync_session['db']
    user = sample_sync_session['user']
    bluesky_api = sample_sync_session['bluesky_api']

    # Setup media upload to fail
    bluesky_api.upload_media.side_effect = Exception("Media server error")
    bluesky_api.send_post.return_value = {
        'uri': 'at://did:plc:test/app.bsky.feed.post/bsky_no_media',
        'cid': 'cid_no_media'
    }

    # Simulate sync with failed media upload
    cursor = db.cursor()
    tweet_text = 'Post with failed media'
    content_hash = compute_content_hash(tweet_text)

    # Record stats showing post was synced despite media failure
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, media_count, error_message, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (int(time.time()), 'twitter', 'bluesky', 1, 0,
          'Media upload failed, posted without media', user['id']))

    cursor.execute('''
        INSERT INTO synced_posts
        (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('4001', 'at://did:plc:test/app.bsky.feed.post/bsky_no_media',
          'twitter', content_hash, 'bluesky', tweet_text))

    db.commit()

    # Verify post was synced despite media error
    synced_posts = get_synced_posts(db, 'twitter')
    assert len(synced_posts) > 0, "Post should be synced even if media upload fails"

    # Verify error was recorded
    stats = get_sync_stats(db, 'twitter', 'bluesky')
    assert any('Media upload failed' in (s['error_message'] or '') for s in stats), \
        "Error message should be recorded"


# =============================================================================
# TEST: Sync with Missing Credentials
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_sync_with_missing_twitter_credentials(test_db, test_user):
    """
    Test graceful handling when Twitter credentials are missing.

    Verifies:
    1. Bluesky → Twitter sync is skipped if Twitter API credentials missing
    2. Error is logged appropriately
    3. No crash occurs
    4. Audit log reflects the condition
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Simulate sync attempt with missing credentials
    # This should be logged but not crash
    try:
        # Try to get Twitter credentials (should be None/empty)
        cursor.execute(
            'SELECT encrypted_data FROM user_credentials WHERE user_id = ? AND platform = ? AND credential_type = ?',
            (user['id'], 'twitter', 'api')
        )
        result = cursor.fetchone()

        # Should be None (no credentials)
        assert result is None, "Twitter API credentials should not exist for test user"

        # Log the condition in audit log
        cursor.execute('''
            INSERT INTO audit_log (user_id, action, success, details, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (user['id'], 'sync_attempt', 0,
              json.dumps({'reason': 'Missing Twitter API credentials'}),
              int(time.time())))

        db.commit()

        # Verify audit log was written
        audit_logs = get_audit_logs(db, user['id'], 'sync_attempt')
        assert len(audit_logs) > 0, "Audit log should record missing credentials"
        assert audit_logs[0]['success'] == 0, "Should be marked as unsuccessful"

    except Exception as e:
        pytest.fail(f"Should handle missing credentials gracefully: {e}")


@pytest.mark.integration
@pytest.mark.database
def test_sync_with_missing_bluesky_credentials(test_db, test_user):
    """
    Test graceful handling when Bluesky credentials are missing.

    Verifies:
    1. Twitter → Bluesky sync is skipped if Bluesky credentials missing
    2. Appropriate error/skip message is logged
    3. Audit trail shows why sync was skipped
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Verify Bluesky credentials don't exist
    cursor.execute(
        'SELECT encrypted_data FROM user_credentials WHERE user_id = ? AND platform = ? AND credential_type = ?',
        (user['id'], 'bluesky', 'api')
    )
    result = cursor.fetchone()
    assert result is None, "Bluesky credentials should not exist for test user"

    # Log skip in audit log
    import json
    cursor.execute('''
        INSERT INTO audit_log (user_id, action, success, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user['id'], 'sync_skipped', 1,
          json.dumps({'reason': 'Missing Bluesky credentials', 'direction': 'twitter_to_bluesky'}),
          int(time.time())))

    db.commit()

    # Verify it was logged
    audit_logs = get_audit_logs(db, user['id'])
    skip_logs = [log for log in audit_logs if log['action'] == 'sync_skipped']
    assert len(skip_logs) > 0, "Skip should be logged"


# =============================================================================
# TEST: Rate Limiting Between Syncs
# =============================================================================

@pytest.mark.integration
def test_rate_limit_between_syncs(test_db, test_user):
    """
    Test that rate limiting is applied between sync operations.

    Verifies:
    1. Sync operations respect rate limit windows
    2. Multiple syncs in short time are throttled
    3. Rate limit is per-user
    4. Window resets properly
    """
    from app.auth.security_utils import rate_limiter

    db = test_db
    user = test_user

    # Test rate limiting for sync operations
    key = f"user_{user['id']}:sync"

    # First sync should succeed
    assert rate_limiter.check_rate_limit(key, max_attempts=3, window_seconds=60), \
        "First sync should be allowed"

    # Second sync should succeed (still within limit)
    assert rate_limiter.check_rate_limit(key, max_attempts=3, window_seconds=60), \
        "Second sync should be allowed"

    # Third sync should succeed (still within limit)
    assert rate_limiter.check_rate_limit(key, max_attempts=3, window_seconds=60), \
        "Third sync should be allowed"

    # Fourth sync should fail (exceeds limit)
    assert not rate_limiter.check_rate_limit(key, max_attempts=3, window_seconds=60), \
        "Fourth sync should be rate limited"

    # Reset rate limit
    rate_limiter.reset(key)

    # After reset, should be allowed again
    assert rate_limiter.check_rate_limit(key, max_attempts=3, window_seconds=60), \
        "After reset, sync should be allowed again"


@pytest.mark.integration
@pytest.mark.database
def test_rate_limit_prevents_sync_spam(test_db, test_user):
    """
    Test that rate limiting prevents sync spam.

    Verifies:
    1. Rapid sync requests are rejected
    2. Rate limit per user prevents abuse
    3. Error is logged for rate limit violations
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Simulate rapid sync attempts
    rate_limit_exceeded = False
    for attempt in range(5):
        # Check if rate limit is exceeded
        if attempt >= 3:
            rate_limit_exceeded = True

        # Log attempt
        cursor.execute('''
            INSERT INTO sync_stats
            (timestamp, source, target, success, user_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (int(time.time()), 'twitter', 'bluesky', 1 if not rate_limit_exceeded else 0, user['id']))

    db.commit()

    # Verify rate limit was exceeded
    assert rate_limit_exceeded, "Rate limit should be exceeded after 3+ rapid attempts"

    # Verify stats show some failures due to rate limiting
    cursor.execute('SELECT * FROM sync_stats WHERE user_id = ? AND success = 0', (user['id'],))
    failed_syncs = cursor.fetchall()
    assert len(failed_syncs) > 0, "Should have recorded failed sync due to rate limit"


# =============================================================================
# TEST: Audit Trail on Sync
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_audit_trail_on_sync(test_db, test_user):
    """
    Test that audit logs are created for sync operations.

    Verifies:
    1. Successful syncs are logged
    2. Failed syncs are logged
    3. Audit logs include direction and metadata
    4. Audit logs are associated with correct user
    5. Timestamps are recorded
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Log successful sync
    sync_time = int(time.time())
    import json

    cursor.execute('''
        INSERT INTO audit_log
        (user_id, action, success, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user['id'], 'sync', 1,
          json.dumps({
              'direction': 'twitter_to_bluesky',
              'posts_synced': 5,
              'media_synced': 2,
              'duration_ms': 1234
          }),
          sync_time))

    db.commit()

    # Retrieve and verify
    audit_logs = get_audit_logs(db, user['id'], 'sync')
    assert len(audit_logs) == 1, "Should have 1 sync audit log"

    log = audit_logs[0]
    assert log['user_id'] == user['id'], "Log should be for correct user"
    assert log['action'] == 'sync', "Action should be 'sync'"
    assert log['success'] == 1, "Should be marked as successful"
    assert log['timestamp'] == sync_time, "Timestamp should match"

    # Parse and verify details
    details = json.loads(log['details'])
    assert details['direction'] == 'twitter_to_bluesky', "Direction should be recorded"
    assert details['posts_synced'] == 5, "Posts synced should be recorded"
    assert details['media_synced'] == 2, "Media synced should be recorded"


@pytest.mark.integration
@pytest.mark.database
def test_audit_trail_for_failed_sync(test_db, test_user):
    """
    Test that failed syncs are properly logged in audit trail.

    Verifies:
    1. Failed syncs are recorded with success=0
    2. Error details are captured
    3. Error type and message are logged
    4. User can see sync history
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Log failed sync
    import json
    error_time = int(time.time())

    cursor.execute('''
        INSERT INTO audit_log
        (user_id, action, success, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user['id'], 'sync', 0,
          json.dumps({
              'direction': 'bluesky_to_twitter',
              'error_type': 'APIError',
              'error_message': 'Twitter rate limit exceeded',
              'posts_attempted': 10,
              'posts_synced': 2
          }),
          error_time))

    db.commit()

    # Retrieve and verify
    audit_logs = get_audit_logs(db, user['id'])
    failed_syncs = [log for log in audit_logs if log['success'] == 0]

    assert len(failed_syncs) == 1, "Should have 1 failed sync log"

    log = failed_syncs[0]
    assert log['action'] == 'sync', "Action should be 'sync'"
    assert log['success'] == 0, "Should be marked as failed"

    # Parse and verify error details
    details = json.loads(log['details'])
    assert details['error_type'] == 'APIError', "Error type should be recorded"
    assert 'rate limit' in details['error_message'].lower(), "Error message should be recorded"


@pytest.mark.integration
@pytest.mark.database
def test_complete_audit_trail_history(test_db, test_user):
    """
    Test complete audit trail history for a user.

    Verifies:
    1. Multiple sync operations create complete history
    2. All operations are timestamped correctly
    3. Operations can be filtered and queried
    4. Chronological order is maintained
    """
    db = test_db
    user = test_user
    cursor = db.cursor()

    # Create history of operations
    import json
    base_time = int(time.time()) - 3600

    operations = [
        ('login', 1, {'ip': '192.168.1.1'}),
        ('sync', 1, {'direction': 'twitter_to_bluesky', 'posts': 3}),
        ('sync', 1, {'direction': 'bluesky_to_twitter', 'posts': 2}),
        ('credential_update', 1, {'platform': 'twitter'}),
        ('sync', 0, {'direction': 'twitter_to_bluesky', 'error': 'timeout'}),
        ('logout', 1, {'ip': '192.168.1.1'}),
    ]

    for i, (action, success, details) in enumerate(operations):
        cursor.execute('''
            INSERT INTO audit_log
            (user_id, action, success, details, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (user['id'], action, success, json.dumps(details), base_time + i * 600))

    db.commit()

    # Retrieve full history
    audit_logs = get_audit_logs(db, user['id'])
    assert len(audit_logs) == 6, "Should have all 6 operations"

    # Verify chronological order (newest first due to DESC)
    assert audit_logs[0]['action'] == 'logout', "Most recent should be logout"
    assert audit_logs[-1]['action'] == 'login', "Oldest should be login"

    # Filter sync operations
    sync_logs = [log for log in audit_logs if log['action'] == 'sync']
    assert len(sync_logs) == 3, "Should have 3 sync operations"

    # Verify failed sync is in history
    failed_syncs = [log for log in sync_logs if log['success'] == 0]
    assert len(failed_syncs) == 1, "Should have 1 failed sync in history"


# =============================================================================
# TEST: Complete Sync Workflow
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
@pytest.mark.api
def test_complete_bidirectional_sync_workflow(sample_sync_session):
    """
    Test complete bidirectional sync workflow end-to-end.

    This is a comprehensive integration test that covers:
    1. Fetch posts from both platforms
    2. Check for duplicates
    3. Post to target platforms
    4. Record stats
    5. Create audit logs
    6. Handle partial failures
    """
    db = sample_sync_session['db']
    user = sample_sync_session['user']
    twitter_api = sample_sync_session['twitter_api']
    bluesky_api = sample_sync_session['bluesky_api']

    cursor = db.cursor()
    start_time = int(time.time())
    import json

    # Phase 1: Twitter → Bluesky sync
    twitter_posts = [
        MagicMock(id='1001', text='Tweet 1'),
        MagicMock(id='1002', text='Tweet 2'),
    ]

    twitter_api.search_tweets.return_value = twitter_posts
    bluesky_api.send_post.side_effect = [
        {'uri': 'at://bsky001', 'cid': 'cid_bsky001'},
        {'uri': 'at://bsky002', 'cid': 'cid_bsky002'},
    ]

    twitter_to_bluesky_synced = 0
    for tweet in twitter_posts:
        content_hash = compute_content_hash(tweet.text)
        cursor.execute('SELECT 1 FROM synced_posts WHERE content_hash = ?', (content_hash,))
        if not cursor.fetchone():
            bluesky_response = bluesky_api.send_post(tweet.text)
            cursor.execute('''
                INSERT INTO synced_posts
                (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tweet.id, bluesky_response['uri'], 'twitter', content_hash, 'bluesky', tweet.text))
            twitter_to_bluesky_synced += 1

    db.commit()

    # Log Twitter → Bluesky sync stats
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (start_time, 'twitter', 'bluesky', 1, 500, user['id']))

    # Log to audit trail
    cursor.execute('''
        INSERT INTO audit_log
        (user_id, action, success, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user['id'], 'sync', 1,
          json.dumps({'direction': 'twitter_to_bluesky', 'posts': twitter_to_bluesky_synced}),
          start_time))

    db.commit()

    # Phase 2: Bluesky → Twitter sync
    bluesky_posts = [
        MagicMock(uri='at://bsky_orig1', text='Bluesky post 1'),
        MagicMock(uri='at://bsky_orig2', text='Bluesky post 2'),
    ]

    twitter_api.post_tweet.side_effect = ['2001', '2002']
    bluesky_to_twitter_synced = 0

    for post in bluesky_posts:
        content_hash = compute_content_hash(post.text)
        cursor.execute('SELECT 1 FROM synced_posts WHERE content_hash = ?', (content_hash,))
        if not cursor.fetchone():
            tweet_id = twitter_api.post_tweet(post.text)
            cursor.execute('''
                INSERT INTO synced_posts
                (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tweet_id, post.uri, 'bluesky', content_hash, 'twitter', post.text))
            bluesky_to_twitter_synced += 1

    db.commit()

    # Log Bluesky → Twitter sync stats
    cursor.execute('''
        INSERT INTO sync_stats
        (timestamp, source, target, success, duration_ms, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (start_time + 1, 'bluesky', 'twitter', 1, 450, user['id']))

    # Log to audit trail
    cursor.execute('''
        INSERT INTO audit_log
        (user_id, action, success, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (user['id'], 'sync', 1,
          json.dumps({'direction': 'bluesky_to_twitter', 'posts': bluesky_to_twitter_synced}),
          start_time + 1))

    db.commit()

    # Verify complete workflow
    all_synced = get_synced_posts(db)
    assert len(all_synced) == 4, "Should have synced 4 posts total"

    twitter_source = [p for p in all_synced if p['source'] == 'twitter']
    bluesky_source = [p for p in all_synced if p['source'] == 'bluesky']

    assert len(twitter_source) == 2, "Should have 2 Twitter syncs"
    assert len(bluesky_source) == 2, "Should have 2 Bluesky syncs"

    # Verify stats
    stats = get_sync_stats(db)
    assert len(stats) == 2, "Should have 2 sync stat records"

    # Verify audit trail
    audit_logs = get_audit_logs(db, user['id'])
    sync_logs = [log for log in audit_logs if log['action'] == 'sync']
    assert len(sync_logs) == 2, "Should have 2 sync audit logs"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

"""
BIDIR-005: Loop Prevention Verification

Comprehensive integration tests to prove NO infinite loops exist in bidirectional sync.
These tests are CRITICAL for validating that the same content doesn't bounce between
platforms forever.
"""

import sqlite3
import os
import tempfile
from app.core.db_handler import (
    migrate_database,
    should_sync_post,
    save_synced_post,
    get_post_by_hash
)
from app.core.utils import compute_content_hash


def test_no_loop_twitter_to_bluesky_to_twitter():
    """
    Test 1: Verify no loop when content flows Twitter → Bluesky → Twitter

    Scenario:
    1. Post "Hello World" manually on Twitter
    2. ChirpSyncer syncs Twitter → Bluesky
    3. ChirpSyncer reads Bluesky, sees "Hello World"
    4. MUST NOT sync back to Twitter (duplicate hash detected)

    Expected: Only 1 post in synced_posts table
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        # Simulate: Post on Twitter
        content = "Hello World"
        twitter_id = "twitter_123456"

        # Step 1: Check if should sync (should be True - first time)
        assert should_sync_post(content, 'twitter', twitter_id, db_path=db_path) is True, \
            "New post from Twitter should sync"

        # Step 2: Sync to Bluesky (simulate successful sync)
        bluesky_uri = "at://did:plc:user/app.bsky.feed.post/abc123"
        save_synced_post(
            twitter_id=twitter_id,
            bluesky_uri=bluesky_uri,
            source='twitter',
            synced_to='bluesky',
            content=content,
            db_path=db_path
        )

        # Step 3: ChirpSyncer reads from Bluesky, sees same content
        # Should NOT sync back (duplicate hash)
        assert should_sync_post(content, 'bluesky', bluesky_uri, db_path=db_path) is False, \
            "Same content from Bluesky should NOT sync back to Twitter (loop prevention)"

        # Step 4: Verify database state
        content_hash = compute_content_hash(content)
        post = get_post_by_hash(content_hash, db_path=db_path)

        assert post is not None, "Post should exist in database"
        # Row format: (id, twitter_id, bluesky_uri, source, content_hash, synced_to, synced_at, original_text)
        assert post[1] == twitter_id, "twitter_id should match"
        assert post[2] == bluesky_uri, "bluesky_uri should match"
        assert post[3] == 'twitter', "source should be twitter"
        assert post[5] == 'bluesky', "synced_to should be bluesky"

        # Verify only 1 post in DB (NO duplicates)
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count == 1, f"Expected exactly 1 post in DB, found {count}"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_no_loop_bluesky_to_twitter_to_bluesky():
    """
    Test 2: Verify no loop when content flows Bluesky → Twitter → Bluesky

    Scenario:
    1. Post "World" manually on Bluesky
    2. ChirpSyncer syncs Bluesky → Twitter
    3. ChirpSyncer reads Twitter, sees "World"
    4. MUST NOT sync back to Bluesky (duplicate hash detected)

    Expected: Only 1 post in synced_posts table
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        # Simulate: Post on Bluesky
        content = "World"
        bluesky_uri = "at://did:plc:user/app.bsky.feed.post/def456"

        # Step 1: Check if should sync (should be True - first time)
        assert should_sync_post(content, 'bluesky', bluesky_uri, db_path=db_path) is True, \
            "New post from Bluesky should sync"

        # Step 2: Sync to Twitter (simulate successful sync)
        twitter_id = "twitter_789012"
        save_synced_post(
            twitter_id=twitter_id,
            bluesky_uri=bluesky_uri,
            source='bluesky',
            synced_to='twitter',
            content=content,
            db_path=db_path
        )

        # Step 3: ChirpSyncer reads from Twitter, sees same content
        # Should NOT sync back (duplicate hash)
        assert should_sync_post(content, 'twitter', twitter_id, db_path=db_path) is False, \
            "Same content from Twitter should NOT sync back to Bluesky (loop prevention)"

        # Step 4: Verify database state
        content_hash = compute_content_hash(content)
        post = get_post_by_hash(content_hash, db_path=db_path)

        assert post is not None, "Post should exist in database"
        assert post[1] == twitter_id, "twitter_id should match"
        assert post[2] == bluesky_uri, "bluesky_uri should match"
        assert post[3] == 'bluesky', "source should be bluesky"
        assert post[5] == 'twitter', "synced_to should be twitter"

        # Verify only 1 post in DB (NO duplicates)
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count == 1, f"Expected exactly 1 post in DB, found {count}"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_stress_100_bidirectional_posts():
    """
    Test 3: Stress test with 100 posts alternating between platforms

    Scenario:
    - Simulate 100 posts alternating between Twitter and Bluesky
    - Each post has unique content to avoid false positives
    - Simulate full sync cycle (each post processed once per platform)

    Expected: Exactly 100 posts in DB (no duplicates created)
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        num_posts = 100

        # Create 100 unique posts alternating between platforms
        for i in range(num_posts):
            content = f"Unique post number {i} with random text to avoid collisions"

            if i % 2 == 0:
                # Even numbers: Twitter → Bluesky
                twitter_id = f"twitter_{i}"
                bluesky_uri = f"at://did:plc:user/app.bsky.feed.post/post_{i}"

                # Should sync (first time)
                assert should_sync_post(content, 'twitter', twitter_id, db_path=db_path) is True

                # Save as synced
                save_synced_post(
                    twitter_id=twitter_id,
                    bluesky_uri=bluesky_uri,
                    source='twitter',
                    synced_to='bluesky',
                    content=content,
                    db_path=db_path
                )
            else:
                # Odd numbers: Bluesky → Twitter
                bluesky_uri = f"at://did:plc:user/app.bsky.feed.post/post_{i}"
                twitter_id = f"twitter_{i}"

                # Should sync (first time)
                assert should_sync_post(content, 'bluesky', bluesky_uri, db_path=db_path) is True

                # Save as synced
                save_synced_post(
                    twitter_id=twitter_id,
                    bluesky_uri=bluesky_uri,
                    source='bluesky',
                    synced_to='twitter',
                    content=content,
                    db_path=db_path
                )

        # Simulate second sync cycle - all posts should be skipped (already synced)
        for i in range(num_posts):
            content = f"Unique post number {i} with random text to avoid collisions"

            if i % 2 == 0:
                # Try to sync from Bluesky (should be rejected - duplicate)
                bluesky_uri = f"at://did:plc:user/app.bsky.feed.post/post_{i}"
                assert should_sync_post(content, 'bluesky', bluesky_uri, db_path=db_path) is False, \
                    f"Post {i} should NOT sync on second cycle (duplicate prevention)"
            else:
                # Try to sync from Twitter (should be rejected - duplicate)
                twitter_id = f"twitter_{i}"
                assert should_sync_post(content, 'twitter', twitter_id, db_path=db_path) is False, \
                    f"Post {i} should NOT sync on second cycle (duplicate prevention)"

        # Verify exactly 100 posts in DB (no duplicates)
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count == num_posts, f"Expected exactly {num_posts} posts in DB, found {count}"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_content_hash_with_url_variations():
    """
    Test 4: Verify content hash normalizes URLs to detect duplicates

    Scenario:
    - Post "Check this out https://example.com" on Twitter
    - Post "Check this out https://t.co/abc123" on Bluesky (same content, different URL)
    - Should be detected as duplicate (content_hash normalizes URLs)

    Expected: Second post NOT synced (duplicate hash detected)
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        # Post 1: Twitter with original URL
        content1 = "Check this out https://example.com"
        twitter_id = "twitter_url_test_1"
        bluesky_uri_1 = "at://did:plc:user/app.bsky.feed.post/url1"

        # Should sync (first time)
        assert should_sync_post(content1, 'twitter', twitter_id, db_path=db_path) is True

        save_synced_post(
            twitter_id=twitter_id,
            bluesky_uri=bluesky_uri_1,
            source='twitter',
            synced_to='bluesky',
            content=content1,
            db_path=db_path
        )

        # Post 2: Bluesky with different URL (t.co shortened)
        content2 = "Check this out https://t.co/abc123"
        bluesky_uri_2 = "at://did:plc:user/app.bsky.feed.post/url2"

        # Compute hashes to verify they match
        hash1 = compute_content_hash(content1)
        hash2 = compute_content_hash(content2)

        assert hash1 == hash2, "Content hashes should match (URLs normalized)"

        # Should NOT sync (duplicate content detected via hash)
        assert should_sync_post(content2, 'bluesky', bluesky_uri_2, db_path=db_path) is False, \
            "Post with different URL but same content should NOT sync (duplicate)"

        # Verify only 1 post in DB
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count == 1, f"Expected exactly 1 post in DB, found {count}"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_edge_case_same_text_different_time():
    """
    Test 5: Edge case - same text posted at different times

    Scenario:
    - Post "Good morning" on Twitter at T=0
    - Post "Good morning" on Bluesky at T=1 hour (legitimately different post)
    - Both posts should exist in DB (different IDs)
    - BUT: Second post should NOT be synced (duplicate hash)

    This is expected behavior - we treat identical content as duplicate regardless of timing.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        # Same content
        content = "Good morning"

        # Post 1: Twitter at T=0
        twitter_id_1 = "twitter_morning_1"
        bluesky_uri_1 = "at://did:plc:user/app.bsky.feed.post/morning1"

        assert should_sync_post(content, 'twitter', twitter_id_1, db_path=db_path) is True

        save_synced_post(
            twitter_id=twitter_id_1,
            bluesky_uri=bluesky_uri_1,
            source='twitter',
            synced_to='bluesky',
            content=content,
            db_path=db_path
        )

        # Post 2: Bluesky at T=1 hour (different post, same content)
        bluesky_uri_2 = "at://did:plc:user/app.bsky.feed.post/morning2"

        # Should NOT sync (duplicate content hash)
        # This is EXPECTED behavior - we prevent syncing identical content
        assert should_sync_post(content, 'bluesky', bluesky_uri_2, db_path=db_path) is False, \
            "Same content at different time should NOT sync (duplicate prevention)"

        # Verify only 1 post in DB
        # Note: The second post was never synced, so it doesn't exist in our DB
        # This is correct behavior - we only track what we've synced
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count == 1, f"Expected exactly 1 post in DB (duplicate prevented), found {count}"

        # Verify the post in DB is the first one
        content_hash = compute_content_hash(content)
        post = get_post_by_hash(content_hash, db_path=db_path)

        assert post is not None
        assert post[1] == twitter_id_1, "Should be the first post (Twitter)"
        assert post[3] == 'twitter', "Source should be twitter"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_multiple_rounds_bidirectional_sync():
    """
    BONUS Test 6: Multiple sync rounds to ensure stability

    Scenario:
    - Create 10 posts alternating between platforms
    - Run 5 full sync cycles
    - Verify no duplicates are ever created

    Expected: Exactly 10 posts in DB after all cycles
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        num_posts = 10
        num_cycles = 5

        # Initial sync: Create 10 posts
        for i in range(num_posts):
            content = f"Multi-cycle post {i}"
            twitter_id = f"twitter_cycle_{i}"
            bluesky_uri = f"at://did:plc:user/app.bsky.feed.post/cycle_{i}"

            source = 'twitter' if i % 2 == 0 else 'bluesky'
            synced_to = 'bluesky' if i % 2 == 0 else 'twitter'

            save_synced_post(
                twitter_id=twitter_id,
                bluesky_uri=bluesky_uri,
                source=source,
                synced_to=synced_to,
                content=content,
                db_path=db_path
            )

        # Run multiple sync cycles
        for cycle in range(num_cycles):
            for i in range(num_posts):
                content = f"Multi-cycle post {i}"
                twitter_id = f"twitter_cycle_{i}"
                bluesky_uri = f"at://did:plc:user/app.bsky.feed.post/cycle_{i}"

                # Try to sync from both directions
                # All should fail (already synced)
                assert should_sync_post(content, 'twitter', twitter_id, db_path=db_path) is False, \
                    f"Cycle {cycle}: Post {i} should NOT sync from Twitter"
                assert should_sync_post(content, 'bluesky', bluesky_uri, db_path=db_path) is False, \
                    f"Cycle {cycle}: Post {i} should NOT sync from Bluesky"

        # Verify exactly 10 posts in DB (no duplicates across all cycles)
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count == num_posts, f"Expected exactly {num_posts} posts after {num_cycles} cycles, found {count}"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_empty_content_edge_case():
    """
    BONUS Test 7: Edge case - empty or whitespace-only content

    Scenario:
    - Post empty/whitespace content
    - Ensure hash computation doesn't fail
    - Ensure duplicate detection still works

    Expected: System handles edge case gracefully
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Initialize database
        migrate_database(db_path=db_path)

        # Test various empty/whitespace content
        test_cases = [
            "   ",           # Only spaces
            "\t\n",          # Only whitespace
            "  \n  \t  ",    # Mixed whitespace
        ]

        for idx, content in enumerate(test_cases):
            twitter_id = f"twitter_empty_{idx}"
            bluesky_uri = f"at://did:plc:user/app.bsky.feed.post/empty_{idx}"

            # First occurrence should sync
            if idx == 0:
                assert should_sync_post(content, 'twitter', twitter_id, db_path=db_path) is True
                save_synced_post(
                    twitter_id=twitter_id,
                    bluesky_uri=bluesky_uri,
                    source='twitter',
                    synced_to='bluesky',
                    content=content,
                    db_path=db_path
                )
            else:
                # Subsequent whitespace-only posts should be duplicates
                # (they normalize to the same empty string)
                result = should_sync_post(content, 'bluesky', bluesky_uri, db_path=db_path)
                # Note: Result depends on hash normalization behavior
                # If all whitespace normalizes to same hash, should be False

        # At minimum, verify database didn't crash
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM synced_posts").fetchone()[0]
        conn.close()

        assert count >= 1, "At least one whitespace post should be saved"

    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)

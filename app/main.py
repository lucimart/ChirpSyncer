import time
import asyncio
from twitter_scraper import fetch_tweets, is_thread, fetch_thread
from bluesky_handler import post_to_bluesky, post_thread_to_bluesky, login_to_bluesky, fetch_posts_from_bluesky, is_bluesky_thread, fetch_bluesky_thread, bsky_client
from twitter_handler import post_to_twitter, post_thread_to_twitter
from config import POLL_INTERVAL, TWITTER_USERNAME, BSKY_USERNAME, TWITTER_API_KEY
from db_handler import migrate_database, should_sync_post, save_synced_post, add_stats_tables
from validation import validate_credentials
from logger import setup_logger
from stats_handler import StatsTracker

logger = setup_logger(__name__)

# Initialize stats tracker
stats_tracker = StatsTracker()


def sync_twitter_to_bluesky():
    """
    Sync Twitter → Bluesky using new DB schema.

    Fetches recent tweets and syncs them to Bluesky if not already synced.
    Uses should_sync_post() to check for duplicates and save_synced_post() to track.
    Supports thread detection and posting.
    Records statistics for monitoring and analytics.
    """
    logger.info("Starting Twitter → Bluesky sync...")
    tweets = fetch_tweets()

    synced_count = 0
    skipped_count = 0

    for tweet in tweets:
        # Check if should sync using new DB function
        if should_sync_post(tweet.text, 'twitter', tweet.id):
            # Handle threads
            start_time = time.time()
            try:
                is_thread_result = asyncio.run(is_thread(tweet._tweet))

                if is_thread_result:
                    logger.info(f"Thread detected for tweet {tweet.id}, fetching full thread...")
                    # Fetch the complete thread
                    thread = asyncio.run(fetch_thread(str(tweet.id), TWITTER_USERNAME))

                    if thread and len(thread) > 0:
                        logger.info(f"Posting thread with {len(thread)} tweets to Bluesky...")
                        # Post entire thread to Bluesky
                        from twitter_scraper import TweetAdapter
                        adapted_thread = [TweetAdapter(t) for t in thread]
                        bluesky_uris = post_thread_to_bluesky(adapted_thread)

                        # Save each tweet in thread
                        for t, uri in zip(thread, bluesky_uris):
                            # Get text from thread tweet
                            tweet_text = t.text if hasattr(t, 'text') else str(t)
                            tweet_id = t.id if hasattr(t, 'id') else str(t)

                            save_synced_post(
                                twitter_id=str(tweet_id),
                                bluesky_uri=uri,
                                source='twitter',
                                synced_to='bluesky',
                                content=tweet_text
                            )

                        duration_ms = int((time.time() - start_time) * 1000)
                        stats_tracker.record_sync(
                            source='twitter',
                            target='bluesky',
                            success=True,
                            media_count=0,
                            is_thread=True,
                            duration_ms=duration_ms
                        )
                        synced_count += len(thread)
                        logger.info(f"Synced thread ({len(thread)} tweets) to Bluesky")
                    else:
                        logger.warning(f"Could not fetch thread for tweet {tweet.id}, posting as single tweet")
                        # Fallback to single tweet
                        bluesky_uri = post_to_bluesky(tweet.text)
                        save_synced_post(
                            twitter_id=tweet.id,
                            bluesky_uri=bluesky_uri,
                            source='twitter',
                            synced_to='bluesky',
                            content=tweet.text
                        )
                        duration_ms = int((time.time() - start_time) * 1000)
                        stats_tracker.record_sync(
                            source='twitter',
                            target='bluesky',
                            success=True,
                            media_count=0,
                            is_thread=False,
                            duration_ms=duration_ms
                        )
                        synced_count += 1
                        logger.info(f"Synced tweet {tweet.id} to Bluesky")
                else:
                    # Single tweet: post normally
                    bluesky_uri = post_to_bluesky(tweet.text)
                    save_synced_post(
                        twitter_id=tweet.id,
                        bluesky_uri=bluesky_uri,
                        source='twitter',
                        synced_to='bluesky',
                        content=tweet.text
                    )
                    duration_ms = int((time.time() - start_time) * 1000)
                    stats_tracker.record_sync(
                        source='twitter',
                        target='bluesky',
                        success=True,
                        media_count=0,
                        is_thread=False,
                        duration_ms=duration_ms
                    )
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky")

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.error(f"Error processing tweet {tweet.id}: {e}")

                # Record error in stats
                stats_tracker.record_error(
                    source='twitter',
                    target='bluesky',
                    error_type=type(e).__name__,
                    error_message=str(e)
                )

                # Fallback: post as single tweet
                try:
                    fallback_start = time.time()
                    bluesky_uri = post_to_bluesky(tweet.text)
                    save_synced_post(
                        twitter_id=tweet.id,
                        bluesky_uri=bluesky_uri,
                        source='twitter',
                        synced_to='bluesky',
                        content=tweet.text
                    )
                    fallback_duration = int((time.time() - fallback_start) * 1000)
                    stats_tracker.record_sync(
                        source='twitter',
                        target='bluesky',
                        success=True,
                        media_count=0,
                        is_thread=False,
                        duration_ms=fallback_duration
                    )
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky (fallback)")
                except Exception as post_error:
                    fallback_duration = int((time.time() - fallback_start) * 1000)
                    logger.error(f"Failed to post tweet {tweet.id}: {post_error}")
                    stats_tracker.record_error(
                        source='twitter',
                        target='bluesky',
                        error_type=type(post_error).__name__,
                        error_message=str(post_error)
                    )
        else:
            skipped_count += 1
            logger.debug(f"Skipped tweet {tweet.id} (already synced or duplicate content)")

    logger.info(f"Twitter → Bluesky sync complete: {synced_count} synced, {skipped_count} skipped")


def sync_bluesky_to_twitter():
    """
    Sync Bluesky → Twitter with thread support.

    Fetches recent Bluesky posts and syncs them to Twitter if:
    1. Twitter API credentials are available
    2. Post not already synced (checked via should_sync_post)

    Supports thread detection and posting:
    - Detects if post is part of a thread
    - Fetches complete thread from Bluesky
    - Posts as threaded reply chain on Twitter

    Gracefully skips if Twitter API credentials are missing.
    Records statistics for monitoring and analytics.
    """
    # Check if Twitter API credentials are available
    if not TWITTER_API_KEY:
        logger.debug("Twitter API credentials not configured. Skipping Bluesky→Twitter sync.")
        return

    logger.info("Starting Bluesky → Twitter sync...")
    posts = fetch_posts_from_bluesky(BSKY_USERNAME, count=10)

    synced_count = 0
    skipped_count = 0

    for post in posts:
        # Check if should sync
        if should_sync_post(post.text, 'bluesky', post.uri):
            start_time = time.time()
            try:
                # Check if post is part of a thread
                if is_bluesky_thread(post):
                    logger.info(f"Thread detected for Bluesky post {post.uri}, fetching full thread...")

                    # Fetch the complete thread
                    thread = fetch_bluesky_thread(post.uri, bsky_client)

                    if thread and len(thread) > 0:
                        logger.info(f"Posting thread with {len(thread)} posts to Twitter...")

                        # Extract text from each post in thread
                        tweet_texts = [p.text if hasattr(p, 'text') else p.record.text for p in thread]

                        # Post entire thread to Twitter
                        tweet_ids = post_thread_to_twitter(tweet_texts)

                        # Save each post in thread to database
                        for p, tweet_id in zip(thread, tweet_ids):
                            post_text = p.text if hasattr(p, 'text') else p.record.text
                            post_uri = p.uri if hasattr(p, 'uri') else str(p)

                            save_synced_post(
                                twitter_id=tweet_id,
                                bluesky_uri=post_uri,
                                source='bluesky',
                                synced_to='twitter',
                                content=post_text
                            )

                        duration_ms = int((time.time() - start_time) * 1000)
                        stats_tracker.record_sync(
                            source='bluesky',
                            target='twitter',
                            success=True,
                            media_count=0,
                            is_thread=True,
                            duration_ms=duration_ms
                        )
                        synced_count += len(thread)
                        logger.info(f"Synced thread ({len(thread)} posts) to Twitter")
                    else:
                        logger.warning(f"Could not fetch thread for post {post.uri}, posting as single tweet")
                        # Fallback to single tweet
                        tweet_id = post_to_twitter(post.text)
                        save_synced_post(
                            twitter_id=tweet_id,
                            bluesky_uri=post.uri,
                            source='bluesky',
                            synced_to='twitter',
                            content=post.text
                        )
                        duration_ms = int((time.time() - start_time) * 1000)
                        stats_tracker.record_sync(
                            source='bluesky',
                            target='twitter',
                            success=True,
                            media_count=0,
                            is_thread=False,
                            duration_ms=duration_ms
                        )
                        synced_count += 1
                        logger.info(f"Synced Bluesky post {post.uri} to Twitter (fallback)")
                else:
                    # Single post: post normally
                    tweet_id = post_to_twitter(post.text)

                    # Save to DB
                    save_synced_post(
                        twitter_id=tweet_id,
                        bluesky_uri=post.uri,
                        source='bluesky',
                        synced_to='twitter',
                        content=post.text
                    )

                    duration_ms = int((time.time() - start_time) * 1000)
                    stats_tracker.record_sync(
                        source='bluesky',
                        target='twitter',
                        success=True,
                        media_count=0,
                        is_thread=False,
                        duration_ms=duration_ms
                    )

                    synced_count += 1
                    logger.info(f"Synced Bluesky post {post.uri} to Twitter (tweet ID: {tweet_id})")

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.error(f"Failed to sync Bluesky post {post.uri} to Twitter: {e}")

                # Record error in stats
                stats_tracker.record_error(
                    source='bluesky',
                    target='twitter',
                    error_type=type(e).__name__,
                    error_message=str(e)
                )

                # Fallback: try posting as single tweet
                try:
                    fallback_start = time.time()
                    tweet_id = post_to_twitter(post.text)
                    save_synced_post(
                        twitter_id=tweet_id,
                        bluesky_uri=post.uri,
                        source='bluesky',
                        synced_to='twitter',
                        content=post.text
                    )
                    fallback_duration = int((time.time() - fallback_start) * 1000)
                    stats_tracker.record_sync(
                        source='bluesky',
                        target='twitter',
                        success=True,
                        media_count=0,
                        is_thread=False,
                        duration_ms=fallback_duration
                    )
                    synced_count += 1
                    logger.info(f"Synced Bluesky post {post.uri} to Twitter (fallback)")
                except Exception as post_error:
                    fallback_duration = int((time.time() - fallback_start) * 1000)
                    logger.error(f"Failed to post Bluesky post {post.uri}: {post_error}")
                    stats_tracker.record_error(
                        source='bluesky',
                        target='twitter',
                        error_type=type(post_error).__name__,
                        error_message=str(post_error)
                    )
        else:
            skipped_count += 1
            logger.debug(f"Skipped Bluesky post {post.uri} (already synced or duplicate content)")

    logger.info(f"Bluesky → Twitter sync complete: {synced_count} synced, {skipped_count} skipped")


def main():
    """
    Main loop with bidirectional sync orchestration.

    Workflow:
    1. Validate credentials
    2. Migrate database schema (if needed)
    3. Add stats tables (if needed)
    4. Login to Bluesky
    5. Check if bidirectional or unidirectional mode
    6. Run sync loop:
       - Twitter → Bluesky (always)
       - Bluesky → Twitter (if API credentials available)
    7. Handle errors gracefully (one direction can fail without stopping the other)
    """
    # Validate credentials
    validate_credentials()

    # Migrate database schema if needed
    migrate_database()

    # Add stats tables if needed
    add_stats_tables()

    # Login to Bluesky
    login_to_bluesky()

    logger.info("Starting bidirectional sync...")

    # Check if bidirectional or unidirectional
    if TWITTER_API_KEY:
        logger.info("Bidirectional sync enabled (Twitter ↔ Bluesky)")
    else:
        logger.info("Unidirectional sync only (Twitter → Bluesky)")
        logger.info("To enable Bluesky→Twitter sync, configure Twitter API credentials in .env")

    while True:
        try:
            # Sync Twitter → Bluesky
            try:
                sync_twitter_to_bluesky()
            except Exception as e:
                logger.error(f"Error in Twitter→Bluesky sync: {e}")
                # Continue to next sync direction

            # Sync Bluesky → Twitter (if credentials available)
            try:
                sync_bluesky_to_twitter()
            except Exception as e:
                logger.error(f"Error in Bluesky→Twitter sync: {e}")
                # Continue to next cycle

            logger.info(f"Sync cycle complete. Sleeping {POLL_INTERVAL/3600:.1f} hours...")
            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            logger.info("Shutting down gracefully...")
            break
        except Exception as e:
            logger.error(f"Error in sync cycle: {e}")
            logger.info("Waiting 1 minute before retry...")
            time.sleep(60)  # Wait 1 minute before retry


if __name__ == "__main__":
    main()

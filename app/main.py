import time
import asyncio
from twitter_scraper import fetch_tweets, is_thread, fetch_thread
from bluesky_handler import (
    post_to_bluesky,
    post_thread_to_bluesky,
    login_to_bluesky,
    fetch_posts_from_bluesky,
    is_bluesky_thread,
    fetch_bluesky_thread
)
from twitter_handler import post_to_twitter, post_thread_to_twitter
from config import POLL_INTERVAL, TWITTER_USERNAME, BSKY_USERNAME, TWITTER_API_KEY
from db_handler import (
    migrate_database,
    should_sync_post,
    save_synced_post,
    save_synced_thread,
    is_thread_synced
)
from validation import validate_credentials
from logger import setup_logger

logger = setup_logger(__name__)


def sync_twitter_to_bluesky():
    """
    Sync Twitter → Bluesky with bidirectional thread support.

    Fetches recent tweets and syncs them to Bluesky if not already synced.
    Supports both single posts and threads with deduplication.
    """
    logger.info("Starting Twitter → Bluesky sync...")
    tweets = fetch_tweets()

    synced_count = 0
    skipped_count = 0

    for tweet in tweets:
        try:
            # Detect if tweet is part of a thread
            is_thread_result = asyncio.run(is_thread(tweet._tweet))

            if is_thread_result:
                # Handle thread
                logger.info(f"Thread detected for tweet {tweet.id}, fetching full thread...")
                thread = asyncio.run(fetch_thread(str(tweet.id), TWITTER_USERNAME))

                if thread and len(thread) > 0:
                    # Create thread_id from first tweet
                    thread_id = f"twitter_{thread[0].id}"

                    # Check if thread already synced
                    if is_thread_synced(thread_id):
                        logger.info(f"Thread {thread_id} already synced, skipping")
                        skipped_count += len(thread)
                        continue

                    # Sync thread completo
                    logger.info(f"Syncing thread {thread_id} ({len(thread)} tweets)")
                    from twitter_scraper import TweetAdapter
                    adapted_thread = [TweetAdapter(t) for t in thread]
                    bluesky_uris = post_thread_to_bluesky(adapted_thread)

                    # Save thread to DB
                    posts = [
                        {
                            'twitter_id': str(t.id),
                            'bluesky_uri': uri,
                            'content': t.text if hasattr(t, 'text') else t.rawContent
                        }
                        for t, uri in zip(thread, bluesky_uris)
                    ]
                    save_synced_thread(posts, 'twitter', 'bluesky', thread_id)

                    synced_count += len(thread)
                    logger.info(f"Synced thread ({len(thread)} tweets) to Bluesky")
                else:
                    logger.warning(f"Could not fetch thread for tweet {tweet.id}, posting as single tweet")
                    # Fallback to single tweet
                    if should_sync_post(tweet.text, 'twitter', tweet.id):
                        bluesky_uri = post_to_bluesky(tweet.text)
                        save_synced_post(
                            twitter_id=tweet.id,
                            bluesky_uri=bluesky_uri,
                            source='twitter',
                            synced_to='bluesky',
                            content=tweet.text
                        )
                        synced_count += 1
                        logger.info(f"Synced tweet {tweet.id} to Bluesky (fallback)")
                    else:
                        skipped_count += 1
            else:
                # Single tweet: post normally
                if should_sync_post(tweet.text, 'twitter', tweet.id):
                    bluesky_uri = post_to_bluesky(tweet.text)
                    save_synced_post(
                        twitter_id=tweet.id,
                        bluesky_uri=bluesky_uri,
                        source='twitter',
                        synced_to='bluesky',
                        content=tweet.text
                    )
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky")
                else:
                    skipped_count += 1
                    logger.debug(f"Skipped tweet {tweet.id} (already synced or duplicate content)")

        except Exception as e:
            logger.error(f"Error processing tweet {tweet.id}: {e}")
            # Fallback: try to post as single tweet
            try:
                if should_sync_post(tweet.text, 'twitter', tweet.id):
                    bluesky_uri = post_to_bluesky(tweet.text)
                    save_synced_post(
                        twitter_id=tweet.id,
                        bluesky_uri=bluesky_uri,
                        source='twitter',
                        synced_to='bluesky',
                        content=tweet.text
                    )
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky (fallback)")
            except Exception as post_error:
                logger.error(f"Failed to post tweet {tweet.id}: {post_error}")

    logger.info(f"Twitter → Bluesky sync complete: {synced_count} synced, {skipped_count} skipped")


def sync_bluesky_to_twitter():
    """
    Sync Bluesky → Twitter with bidirectional thread support.

    Fetches recent Bluesky posts and syncs them to Twitter if:
    1. Twitter API credentials are available
    2. Post not already synced (checked via should_sync_post or is_thread_synced)

    Supports both single posts and threads with deduplication.
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
        try:
            # Detect if post is part of a thread
            if is_bluesky_thread(post):
                # Handle thread
                logger.info(f"Thread detected for post {post.uri}, fetching full thread...")
                thread_posts = asyncio.run(fetch_bluesky_thread(post.uri, BSKY_USERNAME))

                if thread_posts and len(thread_posts) > 0:
                    # Create thread_id from first post URI
                    thread_id = f"bluesky_{thread_posts[0].uri}"

                    # Check if thread already synced
                    if is_thread_synced(thread_id):
                        logger.info(f"Thread {thread_id} already synced, skipping")
                        skipped_count += len(thread_posts)
                        continue

                    # Sync thread completo
                    logger.info(f"Syncing thread {thread_id} ({len(thread_posts)} posts)")
                    tweet_ids = post_thread_to_twitter([p.text for p in thread_posts])

                    # Save thread to DB
                    posts_data = [
                        {
                            'twitter_id': tid,
                            'bluesky_uri': p.uri,
                            'content': p.text
                        }
                        for p, tid in zip(thread_posts, tweet_ids)
                    ]
                    save_synced_thread(posts_data, 'bluesky', 'twitter', thread_id)

                    synced_count += len(thread_posts)
                    logger.info(f"Synced thread ({len(thread_posts)} posts) to Twitter")
                else:
                    logger.warning(f"Could not fetch thread for post {post.uri}, posting as single post")
                    # Fallback to single post
                    if should_sync_post(post.text, 'bluesky', post.uri):
                        tweet_id = post_to_twitter(post.text)
                        save_synced_post(
                            twitter_id=tweet_id,
                            bluesky_uri=post.uri,
                            source='bluesky',
                            synced_to='twitter',
                            content=post.text
                        )
                        synced_count += 1
                        logger.info(f"Synced Bluesky post {post.uri} to Twitter (fallback)")
                    else:
                        skipped_count += 1
            else:
                # Single post: post normally
                if should_sync_post(post.text, 'bluesky', post.uri):
                    tweet_id = post_to_twitter(post.text)
                    save_synced_post(
                        twitter_id=tweet_id,
                        bluesky_uri=post.uri,
                        source='bluesky',
                        synced_to='twitter',
                        content=post.text
                    )
                    synced_count += 1
                    logger.info(f"Synced Bluesky post {post.uri} to Twitter (tweet ID: {tweet_id})")
                else:
                    skipped_count += 1
                    logger.debug(f"Skipped Bluesky post {post.uri} (already synced or duplicate content)")

        except Exception as e:
            logger.error(f"Error processing Bluesky post {post.uri}: {e}")
            # Fallback: try to post as single post
            try:
                if should_sync_post(post.text, 'bluesky', post.uri):
                    tweet_id = post_to_twitter(post.text)
                    save_synced_post(
                        twitter_id=tweet_id,
                        bluesky_uri=post.uri,
                        source='bluesky',
                        synced_to='twitter',
                        content=post.text
                    )
                    synced_count += 1
                    logger.info(f"Synced Bluesky post {post.uri} to Twitter (fallback)")
            except Exception as post_error:
                logger.error(f"Failed to sync Bluesky post {post.uri}: {post_error}")

    logger.info(f"Bluesky → Twitter sync complete: {synced_count} synced, {skipped_count} skipped")


def main():
    """
    Main loop with bidirectional sync orchestration.

    Workflow:
    1. Validate credentials
    2. Migrate database schema (if needed)
    3. Login to Bluesky
    4. Check if bidirectional or unidirectional mode
    5. Run sync loop:
       - Twitter → Bluesky (always)
       - Bluesky → Twitter (if API credentials available)
    6. Handle errors gracefully (one direction can fail without stopping the other)
    """
    # Validate credentials
    validate_credentials()

    # Migrate database schema if needed
    migrate_database()

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

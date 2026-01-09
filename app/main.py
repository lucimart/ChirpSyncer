import time
import asyncio
from twitter_scraper import fetch_tweets, is_thread, fetch_thread
from bluesky_handler import post_to_bluesky, post_thread_to_bluesky, login_to_bluesky, fetch_posts_from_bluesky
from twitter_handler import post_to_twitter
from config import POLL_INTERVAL, TWITTER_USERNAME, BSKY_USERNAME, TWITTER_API_KEY
from db_handler import migrate_database, should_sync_post, save_synced_post
from validation import validate_credentials
from logger import setup_logger

logger = setup_logger(__name__)


def sync_twitter_to_bluesky():
    """
    Sync Twitter → Bluesky using new DB schema.

    Fetches recent tweets and syncs them to Bluesky if not already synced.
    Uses should_sync_post() to check for duplicates and save_synced_post() to track.
    Supports thread detection and posting.
    """
    logger.info("Starting Twitter → Bluesky sync...")
    tweets = fetch_tweets()

    synced_count = 0
    skipped_count = 0

    for tweet in tweets:
        # Check if should sync using new DB function
        if should_sync_post(tweet.text, 'twitter', tweet.id):
            # Handle threads
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
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky")

            except Exception as e:
                logger.error(f"Error processing tweet {tweet.id}: {e}")
                # Fallback: post as single tweet
                try:
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
        else:
            skipped_count += 1
            logger.debug(f"Skipped tweet {tweet.id} (already synced or duplicate content)")

    logger.info(f"Twitter → Bluesky sync complete: {synced_count} synced, {skipped_count} skipped")


def sync_bluesky_to_twitter():
    """
    Sync Bluesky → Twitter (NEW function for bidirectional sync).

    Fetches recent Bluesky posts and syncs them to Twitter if:
    1. Twitter API credentials are available
    2. Post not already synced (checked via should_sync_post)

    Gracefully skips if Twitter API credentials are missing.
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
            try:
                # Post to Twitter
                tweet_id = post_to_twitter(post.text)

                # Save to DB
                save_synced_post(
                    twitter_id=tweet_id,
                    bluesky_uri=post.uri,
                    source='bluesky',
                    synced_to='twitter',
                    content=post.text
                )

                synced_count += 1
                logger.info(f"Synced Bluesky post {post.uri} to Twitter (tweet ID: {tweet_id})")

            except Exception as e:
                logger.error(f"Failed to sync Bluesky post {post.uri} to Twitter: {e}")
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

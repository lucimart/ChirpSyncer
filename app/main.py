import time
import asyncio
from twitter_scraper import fetch_tweets, is_thread, fetch_thread  # Updated to use twscrape instead of tweepy
from bluesky_handler import post_to_bluesky, post_thread_to_bluesky, login_to_bluesky
from config import POLL_INTERVAL, TWITTER_USERNAME
from db_handler import initialize_db
from validation import validate_credentials
from logger import setup_logger

logger = setup_logger(__name__)

def main():
    validate_credentials()
    initialize_db()
    login_to_bluesky()
    while True:
        logger.info("Polling for new tweets...")
        tweets = fetch_tweets()
        for tweet in tweets:
            # Check if tweet is part of a thread
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
                        post_thread_to_bluesky(adapted_thread)
                    else:
                        logger.warning(f"Could not fetch thread for tweet {tweet.id}, posting as single tweet")
                        post_to_bluesky(tweet.text)
                else:
                    # Single tweet: post normally
                    post_to_bluesky(tweet.text)

            except Exception as e:
                logger.error(f"Error processing tweet {tweet.id}: {e}")
                # Fallback: post as single tweet
                try:
                    post_to_bluesky(tweet.text)
                except Exception as post_error:
                    logger.error(f"Failed to post tweet {tweet.id}: {post_error}")

        logger.info(f"Sleeping for {POLL_INTERVAL / 3600:.1f} hours...")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()

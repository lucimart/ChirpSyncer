import time
import logging
import tweepy
from tweepy import OAuth1UserHandler
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log, after_log
from db_handler import is_tweet_seen, mark_tweet_as_seen, store_api_rate_limit
from config import TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
from logger import setup_logger

logger = setup_logger(__name__)

# Initialize Twitter API
auth = OAuth1UserHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
twitter_api = tweepy.API(auth)


# Fetch recent tweets
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def fetch_tweets():
    remaining_reads, reset_time = get_rate_limit_status()
    if remaining_reads <= 0:
        wait_time = reset_time - time.time()
        if wait_time > 0:
            logger.info(f"Rate limit reached. Sleeping {wait_time:.0f} seconds until reset")
            time.sleep(wait_time)
        return []
    logger.info("Fetching tweets from Twitter API")
    tweets = twitter_api.user_timeline(count=5, exclude_replies=True, include_rts=False)
    unseen_tweets = [tweet for tweet in tweets if not is_tweet_seen(tweet.id)]
    logger.info(f"Found {len(unseen_tweets)} new unseen tweets")
    for tweet in unseen_tweets:
        mark_tweet_as_seen(tweet.id)
    return unseen_tweets

# Get Twitter API rate limit status
def get_rate_limit_status():
    rate_limit = twitter_api.rate_limit_status()
    remaining = rate_limit['resources']['statuses']['/statuses/user_timeline']['remaining']
    reset = rate_limit['resources']['statuses']['/statuses/user_timeline']['reset']
    store_api_rate_limit(remaining, reset)
    return remaining, reset


# ===== BIDIR-002: Twitter Writer =====

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def post_to_twitter(content: str) -> str:
    """
    Post content to Twitter.

    Args:
        content: Text content to post (will be truncated to 280 chars if needed)

    Returns:
        Tweet ID as string

    Raises:
        tweepy.TooManyRequests: Rate limit exceeded
        tweepy.Unauthorized: Authentication error
        Exception: On persistent failures after retries
    """
    # Validate and truncate content to 280 chars
    original_length = len(content)
    if original_length > 280:
        content = content[:277] + "..."
        logger.warning(f"Tweet truncated from {original_length} to 280 chars")

    # Initialize tweepy client with API v2
    logger.info("Initializing Twitter API v2 client for posting")
    client = tweepy.Client(
        consumer_key=TWITTER_API_KEY,
        consumer_secret=TWITTER_API_SECRET,
        access_token=TWITTER_ACCESS_TOKEN,
        access_token_secret=TWITTER_ACCESS_SECRET
    )

    # Post tweet using API v2
    logger.info(f"Posting tweet to Twitter (length: {len(content)} chars)")
    response = client.create_tweet(text=content)

    # Extract tweet ID and return as string
    tweet_id = str(response.data['id'])
    logger.info(f"Successfully posted tweet with ID: {tweet_id}")

    return tweet_id


# ===== THREAD-001: Twitter Thread Posting =====

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def post_thread_to_twitter(tweets: list, media_ids_per_tweet: list = None) -> list:
    """Post a thread to Twitter maintaining reply chain.

    This function posts a list of tweets as a thread on Twitter, maintaining
    the reply chain structure. Each tweet after the first will be posted as
    a reply to the previous one.

    Args:
        tweets: List of tweet text strings to post
        media_ids_per_tweet: Optional list of media IDs for each tweet (not implemented yet)

    Returns:
        list: List of tweet IDs (as strings) for the posted tweets

    Raises:
        tweepy.TooManyRequests: Rate limit exceeded
        tweepy.Unauthorized: Authentication error (credentials not configured)
        Exception: On persistent failures after retries

    Note:
        - Validates and truncates each tweet to 280 characters
        - Includes rate limiting (1 second sleep between tweets)
        - Handles Twitter API credentials check
        - Returns empty list if credentials not configured

    Example:
        >>> tweets = ["First tweet in thread", "Second tweet", "Third tweet"]
        >>> tweet_ids = post_thread_to_twitter(tweets)
        >>> print(f"Posted {len(tweet_ids)} tweets")
    """
    # Check if Twitter API credentials are configured
    if not TWITTER_API_KEY:
        logger.warning("Twitter API credentials not configured. Cannot post thread.")
        return []

    if not tweets:
        logger.warning("Empty thread provided to post_thread_to_twitter")
        return []

    # Initialize tweepy client with API v2
    logger.info("Initializing Twitter API v2 client for thread posting")
    client = tweepy.Client(
        consumer_key=TWITTER_API_KEY,
        consumer_secret=TWITTER_API_SECRET,
        access_token=TWITTER_ACCESS_TOKEN,
        access_token_secret=TWITTER_ACCESS_SECRET
    )

    posted_tweet_ids = []
    previous_tweet_id = None

    for i, tweet_text in enumerate(tweets):
        try:
            # Validate and truncate content to 280 chars
            original_length = len(tweet_text)
            if original_length > 280:
                tweet_text = tweet_text[:277] + "..."
                logger.warning(f"Tweet {i+1} truncated from {original_length} to 280 chars")

            # Post tweet
            if i == 0:
                # First tweet: no reply
                logger.info(f"Posting tweet 1/{len(tweets)} to Twitter")
                response = client.create_tweet(text=tweet_text)
            else:
                # Subsequent tweets: reply to previous tweet
                logger.info(f"Posting tweet {i+1}/{len(tweets)} to Twitter (reply to {previous_tweet_id})")
                response = client.create_tweet(
                    text=tweet_text,
                    in_reply_to_tweet_id=previous_tweet_id
                )

            # Extract tweet ID
            tweet_id = str(response.data['id'])
            posted_tweet_ids.append(tweet_id)
            previous_tweet_id = tweet_id

            logger.info(f"Successfully posted tweet {i+1}/{len(tweets)}: {tweet_id}")

            # Rate limiting: sleep between tweets (except after last one)
            if i < len(tweets) - 1:
                time.sleep(1)

        except Exception as e:
            logger.error(f"Error posting tweet {i+1} in thread: {e}")
            # Re-raise to allow retry mechanism to work
            raise

    logger.info(f"Posted thread: {len(posted_tweet_ids)}/{len(tweets)} tweets successful")
    return posted_tweet_ids

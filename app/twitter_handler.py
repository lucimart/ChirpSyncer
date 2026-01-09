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

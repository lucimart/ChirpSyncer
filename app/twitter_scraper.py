"""Twitter scraper using twscrape library.

This module provides a free alternative to Twitter's official API by using
twscrape for scraping tweets. It maintains backward compatibility with the
original twitter_handler.py interface.

Key features:
- No API rate limits (scraping-based)
- Async implementation with sync wrapper for compatibility
- Adapter pattern to match twitter_handler interface
- Returns tweet objects with .id and .text attributes
"""

import asyncio
from typing import List
from twscrape import API, gather
from db_handler import is_tweet_seen, mark_tweet_as_seen
from config import TWITTER_USERNAME
from logger import setup_logger

logger = setup_logger(__name__)


class TweetAdapter:
    """Adapter class to provide backward compatibility with tweepy tweet objects.

    This class wraps twscrape tweet objects and provides the same interface
    as tweepy.Status objects (with .id and .text attributes).
    """

    def __init__(self, twscrape_tweet):
        """Initialize adapter with a twscrape tweet object.

        Args:
            twscrape_tweet: A tweet object from twscrape library
        """
        self._tweet = twscrape_tweet
        self.id = twscrape_tweet.id
        # Use rawContent for the full tweet text
        self.text = twscrape_tweet.rawContent

    def __repr__(self):
        return f"TweetAdapter(id={self.id}, text='{self.text[:50]}...')"


async def _fetch_tweets_async(count: int = 5) -> List[TweetAdapter]:
    """Async implementation to fetch tweets using twscrape.

    This function uses twscrape to scrape recent tweets from the configured
    Twitter username. It filters out already-seen tweets and marks new ones
    as seen in the database.

    Args:
        count: Maximum number of tweets to fetch (default: 5)

    Returns:
        List of TweetAdapter objects containing unseen tweets

    Note:
        - Requires twscrape account pool to be set up (one-time manual setup)
        - No rate limiting needed (scraping-based approach)
        - Filters replies and retweets automatically via search query
    """
    # Initialize twscrape API
    api = API()

    # Build search query to fetch tweets from specific user
    # -filter:replies excludes reply tweets
    # -filter:retweets excludes retweets
    query = f"from:{TWITTER_USERNAME} -filter:replies -filter:retweets"

    # Fetch tweets using twscrape
    tweets = []
    try:
        # Use gather to collect tweets from async generator
        # Limit results to the requested count
        async for tweet in api.search(query, limit=count):
            tweets.append(tweet)
            if len(tweets) >= count:
                break
    except Exception as e:
        logger.error(f"Error fetching tweets from twscrape: {e}")
        return []

    # Filter out already-seen tweets
    unseen_tweets = []
    for tweet in tweets:
        if not is_tweet_seen(tweet.id):
            # Wrap in adapter for compatibility
            adapted_tweet = TweetAdapter(tweet)
            unseen_tweets.append(adapted_tweet)
            # Mark as seen in database
            mark_tweet_as_seen(tweet.id)

    return unseen_tweets


def fetch_tweets(count: int = 5) -> List[TweetAdapter]:
    """Fetch recent tweets using twscrape (synchronous wrapper).

    This is the main entry point for fetching tweets. It provides a synchronous
    interface by wrapping the async implementation, maintaining compatibility
    with the existing codebase.

    Args:
        count: Maximum number of tweets to fetch (default: 5)

    Returns:
        List of TweetAdapter objects containing unseen tweets.
        Each tweet object has .id and .text attributes for compatibility.

    Example:
        >>> tweets = fetch_tweets(count=10)
        >>> for tweet in tweets:
        ...     print(f"Tweet {tweet.id}: {tweet.text}")

    Note:
        This function uses asyncio.run() to execute the async implementation
        in a synchronous context, making it compatible with non-async code.
    """
    # Run the async function using asyncio.run for sync compatibility
    try:
        return asyncio.run(_fetch_tweets_async(count))
    except RuntimeError as e:
        # Handle case where event loop is already running
        # This can happen in some environments (e.g., Jupyter notebooks)
        if "asyncio.run() cannot be called from a running event loop" in str(e):
            # Get the current event loop and run the coroutine
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(_fetch_tweets_async(count))
        raise

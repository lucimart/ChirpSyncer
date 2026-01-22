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
import sqlite3
from typing import List, Optional, Any

from twscrape import API

from app.core.db_handler import is_tweet_seen, mark_tweet_as_seen
from app.core import config
from app.core.logger import setup_logger

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


async def _fetch_tweets_async(
    count: int = 5,
    username: Optional[str] = None,
    db_path: Optional[str] = None,
) -> List[TweetAdapter]:
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
    target_username = username or config.TWITTER_USERNAME
    if not target_username:
        logger.error("Twitter username not configured")
        return []
    query = f"from:{target_username} -filter:replies -filter:retweets"

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
    conn = sqlite3.connect(db_path) if db_path else None
    try:
        for tweet in tweets:
            if not is_tweet_seen(tweet.id, conn):
                adapted_tweet = TweetAdapter(tweet)
                unseen_tweets.append(adapted_tweet)
                mark_tweet_as_seen(tweet.id, conn)
    finally:
        if conn:
            conn.close()

    return unseen_tweets


def fetch_tweets(
    count: int = 5,
    username: Optional[str] = None,
    db_path: Optional[str] = None,
) -> List[TweetAdapter]:
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
        return asyncio.run(
            _fetch_tweets_async(count, username=username, db_path=db_path)
        )
    except RuntimeError as e:
        # Handle case where event loop is already running
        # This can happen in some environments (e.g., Jupyter notebooks)
        if "asyncio.run() cannot be called from a running event loop" in str(e):
            # Get the current event loop and run the coroutine
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(
                _fetch_tweets_async(count, username=username, db_path=db_path)
            )
        raise


async def is_thread(tweet) -> bool:
    """Detect if a tweet is part of a thread (self-reply chain).

    A tweet is considered part of a thread if it has an inReplyToTweetId,
    indicating it's a reply to another tweet (typically the author's own tweet).

    Args:
        tweet: A tweet object from twscrape with inReplyToTweetId attribute

    Returns:
        bool: True if tweet is part of a thread, False otherwise

    Example:
        >>> tweet = await fetch_single_tweet(tweet_id)
        >>> if await is_thread(tweet):
        ...     thread = await fetch_thread(tweet.id, tweet.user.username)
    """
    # Check if tweet has inReplyToTweetId (indicates it's a reply/thread)
    return tweet.inReplyToTweetId is not None


async def fetch_thread(tweet_id: str, username: str) -> list:
    """Fetch all tweets in a thread, ordered chronologically.

    This function retrieves a complete thread starting from the given tweet ID.
    It follows the reply chain to get all connected tweets in chronological order.

    Args:
        tweet_id: The ID of a tweet in the thread (can be any tweet in the chain)
        username: The username of the thread author

    Returns:
        list: List of tweet objects in chronological order (oldest to newest)

    Note:
        - Limited to 10 tweets maximum to avoid rate limiting issues
        - Handles deleted tweets gracefully by skipping them
        - Uses tweet_details API to fetch individual tweets by ID

    Example:
        >>> thread = await fetch_thread("123456789", "elonmusk")
        >>> for tweet in thread:
        ...     print(tweet.text)
    """
    api = API()
    thread_tweets = []

    try:
        # Fetch the initial tweet to start building the thread
        tweet_ids = [int(tweet_id)]
        fetched_tweet = None

        async def _get_tweet_details(tweet_id_value: int):
            tweet_details = getattr(api, "tweet_details")
            result: Any
            try:
                result = tweet_details([tweet_id_value])
            except TypeError:
                result = tweet_details(tweet_id_value)

            if asyncio.iscoroutine(result):
                result = await result

            if hasattr(result, "__aiter__"):
                async for item in result:
                    return item
                return None

            return result

        fetched_tweet = await _get_tweet_details(int(tweet_id))

        if not fetched_tweet:
            logger.warning(f"Could not fetch initial tweet {tweet_id}")
            return []

        # Start building thread from this tweet
        thread_tweets.append(fetched_tweet)

        # Follow reply chain backwards to find the root tweet
        current_tweet = fetched_tweet
        max_iterations = 10  # Limit to prevent infinite loops

        while current_tweet.inReplyToTweetId and max_iterations > 0:
            reply_id = current_tweet.inReplyToTweetId
            parent_found = False

            parent_tweet = await _get_tweet_details(int(reply_id))
            if parent_tweet and parent_tweet.user.username.lower() == username.lower():
                thread_tweets.insert(0, parent_tweet)
                current_tweet = parent_tweet
                parent_found = True

            if not parent_found:
                # Parent tweet not found or not by same author
                break

            max_iterations -= 1

        # Now follow forward to get any replies after the initial tweet
        # Search for replies to the root tweet
        # Fetch potential replies using search
        query = f"from:{username} to:{username}"
        reply_count = 0
        max_replies = 10 - len(thread_tweets)  # Keep total under 10

        async for reply in api.search(query, limit=max_replies):
            # Check if this is a reply in our thread chain
            if reply.inReplyToTweetId and reply.inReplyToTweetId in [
                t.id for t in thread_tweets
            ]:
                # Add to thread if not already present
                if reply.id not in [t.id for t in thread_tweets]:
                    thread_tweets.append(reply)
                    reply_count += 1

            if reply_count >= max_replies:
                break

        # Sort by ID to ensure chronological order (tweet IDs are sequential)
        thread_tweets.sort(key=lambda t: t.id)

        # Limit to 10 tweets maximum
        thread_tweets = thread_tweets[:10]

        logger.info(f"Fetched thread with {len(thread_tweets)} tweets")
        return thread_tweets

    except Exception as e:
        logger.error(f"Error fetching thread {tweet_id}: {e}")
        return []

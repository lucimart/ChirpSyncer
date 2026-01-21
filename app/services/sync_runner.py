import asyncio
import asyncio
import os
from typing import Optional

from app.auth.credential_manager import CredentialManager
from app.core.db_handler import should_sync_post, save_synced_post
from app.integrations import twitter_scraper
from app.integrations.bluesky_handler import (
    fetch_posts_from_bluesky,
    login_to_bluesky,
    post_to_bluesky,
    post_thread_to_bluesky,
)
from app.integrations.twitter_api_handler import post_tweet_with_credentials


def _run_async(coro):
    try:
        return asyncio.run(coro)
    except RuntimeError as exc:
        if "asyncio.run() cannot be called from a running event loop" in str(exc):
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(coro)
        raise


def _load_master_key() -> Optional[bytes]:
    hex_key = os.environ.get("MASTER_KEY")
    if not hex_key:
        return None
    try:
        return bytes.fromhex(hex_key)
    except ValueError:
        return None


def sync_twitter_to_bluesky(user_id: int, db_path: str) -> int:
    master_key = _load_master_key()
    if not master_key:
        raise ValueError("MASTER_KEY is not configured")

    credential_manager = CredentialManager(master_key, db_path)
    twitter_creds = credential_manager.get_credentials(user_id, "twitter", "scraping")
    bluesky_creds = credential_manager.get_credentials(user_id, "bluesky", "api")
    if not twitter_creds or not bluesky_creds:
        raise ValueError("Missing credentials for Twitter scraping or Bluesky")

    login_to_bluesky(bluesky_creds.get("username"), bluesky_creds.get("password"))

    username = twitter_creds.get("username")
    if not username:
        raise ValueError("Missing Twitter username")
    tweets = twitter_scraper.fetch_tweets(count=10, username=username, db_path=db_path)

    synced_count = 0
    for tweet in tweets:
        if not should_sync_post(tweet.text, "twitter", str(tweet.id), db_path=db_path):
            continue

        try:
            is_thread = _run_async(twitter_scraper.is_thread(tweet._tweet))
            if is_thread:
                thread = _run_async(
                    twitter_scraper.fetch_thread(str(tweet.id), username)
                )
                if thread:
                    adapted_thread = [twitter_scraper.TweetAdapter(t) for t in thread]
                    uris = post_thread_to_bluesky(adapted_thread)
                    for t, uri in zip(thread, uris):
                        text = t.text if hasattr(t, "text") else str(t)
                        tweet_id = t.id if hasattr(t, "id") else str(t)
                        save_synced_post(
                            twitter_id=str(tweet_id),
                            bluesky_uri=uri,
                            source="twitter",
                            synced_to="bluesky",
                            content=text,
                            db_path=db_path,
                        )
                    synced_count += len(thread)
                    continue
        except Exception:
            # Fall back to single tweet if thread logic fails
            pass

        uri = post_to_bluesky(tweet.text)
        save_synced_post(
            twitter_id=str(tweet.id),
            bluesky_uri=uri,
            source="twitter",
            synced_to="bluesky",
            content=tweet.text,
            db_path=db_path,
        )
        synced_count += 1

    return synced_count


def sync_bluesky_to_twitter(user_id: int, db_path: str) -> int:
    master_key = _load_master_key()
    if not master_key:
        raise ValueError("MASTER_KEY is not configured")

    credential_manager = CredentialManager(master_key, db_path)
    twitter_creds = credential_manager.get_credentials(user_id, "twitter", "api")
    bluesky_creds = credential_manager.get_credentials(user_id, "bluesky", "api")
    if not twitter_creds or not bluesky_creds:
        raise ValueError("Missing credentials for Twitter API or Bluesky")

    bsky_username = bluesky_creds.get("username")
    if not bsky_username:
        raise ValueError("Missing Bluesky username")
    login_to_bluesky(bsky_username, bluesky_creds.get("password"))
    posts = fetch_posts_from_bluesky(bsky_username, count=10)

    synced_count = 0
    for post in posts:
        if not should_sync_post(post.text, "bluesky", post.uri, db_path=db_path):
            continue

        tweet_id = post_tweet_with_credentials(twitter_creds, post.text)
        save_synced_post(
            twitter_id=str(tweet_id),
            bluesky_uri=post.uri,
            source="bluesky",
            synced_to="twitter",
            content=post.text,
            db_path=db_path,
        )
        synced_count += 1

    return synced_count

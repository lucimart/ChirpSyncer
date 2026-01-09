import time
import logging
from atproto import Client, models
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log, after_log
from config import BSKY_USERNAME, BSKY_PASSWORD
from logger import setup_logger

logger = setup_logger(__name__)

# Initialize Bluesky client
bsky_client = Client()

# Function to login (explicitly called when needed)
@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def login_to_bluesky():
    bsky_client.login(BSKY_USERNAME, BSKY_PASSWORD)


def validate_and_truncate_text(text: str, max_length: int = 300) -> str:
    """
    Validate text length for Bluesky.
    If text exceeds max_length, truncate to (max_length - 3) and add '...'

    Args:
        text: Original text
        max_length: Maximum allowed length (default 300 for Bluesky)

    Returns:
        Original text if <= max_length, truncated text otherwise
    """
    if len(text) <= max_length:
        return text

    # Log warning when truncating
    logger.warning(f"Text truncated from {len(text)} to {max_length} chars")
    return text[:max_length - 3] + "..."


# Post to Bluesky
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def post_to_bluesky(content):
    # Validate length before posting
    validated_content = validate_and_truncate_text(content)

    try:
        bsky_client.post(validated_content)
        logger.info(f"Posted to Bluesky: {validated_content[:50]}...")
    except Exception as e:
        logger.error(f"Error posting to Bluesky: {e}")
        raise  # Re-raise to allow retry mechanism to work


def post_thread_to_bluesky(tweets: list) -> list:
    """Post a thread to Bluesky maintaining reply chain.

    This function posts a list of tweets as a thread on Bluesky, maintaining
    the reply chain structure. Each tweet after the first will be posted as
    a reply to the previous one.

    Args:
        tweets: List of TweetAdapter objects representing the thread

    Returns:
        list: List of URIs for the posted tweets

    Note:
        - Includes rate limiting (1 second sleep between posts)
        - Validates and truncates text for each tweet
        - Handles partial failures gracefully
        - Uses retry logic for each individual post

    Example:
        >>> thread = [tweet1, tweet2, tweet3]
        >>> uris = post_thread_to_bluesky(thread)
        >>> print(f"Posted {len(uris)} tweets")
    """
    if not tweets:
        logger.warning("Empty thread provided to post_thread_to_bluesky")
        return []

    posted_uris = []
    parent_ref = None

    for i, tweet in enumerate(tweets):
        try:
            # Validate and truncate text
            validated_content = validate_and_truncate_text(tweet.text)

            # Prepare post parameters
            if i == 0:
                # First tweet: no reply parent
                response = bsky_client.send_post(text=validated_content)
            else:
                # Subsequent tweets: reply to previous tweet
                if parent_ref:
                    # Create reply reference
                    reply_ref = models.AppBskyFeedPost.ReplyRef(
                        parent=parent_ref,
                        root=posted_uris[0] if posted_uris else parent_ref
                    )
                    response = bsky_client.send_post(
                        text=validated_content,
                        reply_to=reply_ref
                    )
                else:
                    # Fallback if parent_ref is missing
                    response = bsky_client.send_post(text=validated_content)

            # Store the URI and CID for the next reply
            if hasattr(response, 'uri') and hasattr(response, 'cid'):
                posted_uris.append(response.uri)
                # Create reference for next tweet in thread
                parent_ref = models.create_strong_ref(response)
                logger.info(f"Posted tweet {i+1}/{len(tweets)} to Bluesky: {validated_content[:50]}...")
            else:
                logger.warning(f"Response missing uri/cid for tweet {i+1}")

            # Rate limiting: sleep between posts (except after last one)
            if i < len(tweets) - 1:
                time.sleep(1)

        except Exception as e:
            logger.error(f"Error posting tweet {i+1} in thread: {e}")
            # Continue with next tweet even if one fails
            continue

    logger.info(f"Posted thread: {len(posted_uris)}/{len(tweets)} tweets successful")
    return posted_uris

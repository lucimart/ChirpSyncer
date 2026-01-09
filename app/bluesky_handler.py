import time
import logging
from atproto import Client
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

from app.core import config
from app.core.logger import setup_logger

logger = setup_logger(__name__)


def validate_credentials():
    """
    Validates that all required environment variables are present and not empty.

    Required credentials:
    - Twitter scraping credentials (for reading tweets)
    - Bluesky credentials (for posting to Bluesky)

    Optional credentials (warning only):
    - Twitter API credentials (for bidirectional sync: Bluesky → Twitter)

    Raises:
        ValueError: If any required environment variable is missing or empty.
    """
    # Required credentials for unidirectional sync (Twitter → Bluesky)
    required_vars = {
        # Twitter scraping credentials (twscrape) - REQUIRED
        "TWITTER_USERNAME": config.TWITTER_USERNAME,
        "TWITTER_PASSWORD": config.TWITTER_PASSWORD,
        "TWITTER_EMAIL": config.TWITTER_EMAIL,
        "TWITTER_EMAIL_PASSWORD": config.TWITTER_EMAIL_PASSWORD,
        # Bluesky credentials - REQUIRED
        "BSKY_USERNAME": config.BSKY_USERNAME,
        "BSKY_PASSWORD": config.BSKY_PASSWORD,
    }

    # Optional credentials for bidirectional sync (Bluesky → Twitter)
    optional_vars = {
        "TWITTER_API_KEY": config.TWITTER_API_KEY,
        "TWITTER_API_SECRET": config.TWITTER_API_SECRET,
        "TWITTER_ACCESS_TOKEN": config.TWITTER_ACCESS_TOKEN,
        "TWITTER_ACCESS_SECRET": config.TWITTER_ACCESS_SECRET,
    }

    # Check required credentials
    missing = [
        name
        for name, value in required_vars.items()
        if not value or value.strip() == ""
    ]

    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

    # Check optional credentials and warn if missing
    missing_optional = [
        name
        for name, value in optional_vars.items()
        if not value or value.strip() == ""
    ]

    if missing_optional:
        logger.warning(
            "Twitter API credentials not found. "
            "Running in unidirectional mode (Twitter → Bluesky only). "
            "For bidirectional sync (Bluesky → Twitter), please set: "
            "TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET. "
            "Note: Free tier allows 1,500 tweets/month."
        )
    else:
        logger.info(
            "Twitter API credentials found. Bidirectional sync enabled "
            "(Twitter ↔ Bluesky). Rate limit: 1,500 tweets/month (Free tier)."
        )

from app.config import (
    TWITTER_USERNAME,
    TWITTER_PASSWORD,
    TWITTER_EMAIL,
    TWITTER_EMAIL_PASSWORD,
    BSKY_USERNAME,
    BSKY_PASSWORD
)


def validate_credentials():
    """
    Validates that all required environment variables are present and not empty.

    Raises:
        ValueError: If any required environment variable is missing or empty.
    """
    required_vars = {
        # Twitter scraping credentials (twscrape)
        'TWITTER_USERNAME': TWITTER_USERNAME,
        'TWITTER_PASSWORD': TWITTER_PASSWORD,
        'TWITTER_EMAIL': TWITTER_EMAIL,
        'TWITTER_EMAIL_PASSWORD': TWITTER_EMAIL_PASSWORD,
        # Bluesky credentials
        'BSKY_USERNAME': BSKY_USERNAME,
        'BSKY_PASSWORD': BSKY_PASSWORD
    }

    missing = [name for name, value in required_vars.items()
              if not value or value.strip() == '']

    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

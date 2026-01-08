from app.config import (
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET,
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
        'TWITTER_API_KEY': TWITTER_API_KEY,
        'TWITTER_API_SECRET': TWITTER_API_SECRET,
        'TWITTER_ACCESS_TOKEN': TWITTER_ACCESS_TOKEN,
        'TWITTER_ACCESS_SECRET': TWITTER_ACCESS_SECRET,
        'BSKY_USERNAME': BSKY_USERNAME,
        'BSKY_PASSWORD': BSKY_PASSWORD
    }

    missing = [name for name, value in required_vars.items()
              if not value or value.strip() == '']

    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

import os

# NEW: Twitter scraping credentials (for twscrape)
# These are required for scraping Twitter without using the official API
TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")
TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
TWITTER_EMAIL_PASSWORD = os.getenv("TWITTER_EMAIL_PASSWORD")

# DEPRECATED: Old Twitter API credentials (kept for backward compatibility)
# These can be removed after migration to twscrape is complete
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")  # deprecated
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")  # deprecated
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")  # deprecated
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")  # deprecated

# Bluesky API credentials
BSKY_USERNAME = os.getenv("BSKY_USERNAME")
BSKY_PASSWORD = os.getenv("BSKY_PASSWORD")

# Polling interval (in seconds) - 7.2 hours to stay within 100 requests/month limit
# Calculation: 30 days * 24 hours = 720 hours/month ÷ 100 requests = 7.2 hours/request
POLL_INTERVAL = 7.2 * 60 * 60  # 25,920 seconds

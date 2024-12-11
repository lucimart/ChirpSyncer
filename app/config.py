import os

# Twitter API credentials
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# Bluesky API credentials
BSKY_USERNAME = os.getenv("BSKY_USERNAME")
BSKY_PASSWORD = os.getenv("BSKY_PASSWORD")

# Polling interval (in seconds)
POLL_INTERVAL = 6 * 60 * 60

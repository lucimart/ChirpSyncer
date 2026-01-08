import os

# Twitter API credentials
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# Bluesky API credentials
BSKY_USERNAME = os.getenv("BSKY_USERNAME")
BSKY_PASSWORD = os.getenv("BSKY_PASSWORD")

# Polling interval (in seconds) - 7.2 hours to stay within 100 requests/month limit
# Calculation: 30 days * 24 hours = 720 hours/month ÷ 100 requests = 7.2 hours/request
POLL_INTERVAL = 7.2 * 60 * 60  # 25,920 seconds

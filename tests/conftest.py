import sys
import os
from unittest.mock import MagicMock

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "app"))

# Mock the config module before any imports
sys.modules["config"] = MagicMock()
sys.modules["config"].TWITTER_API_KEY = "test_key"
sys.modules["config"].TWITTER_API_SECRET = "test_secret"
sys.modules["config"].TWITTER_ACCESS_TOKEN = "test_token"
sys.modules["config"].TWITTER_ACCESS_SECRET = "test_secret_token"
sys.modules["config"].BSKY_USERNAME = "test_user"
sys.modules["config"].BSKY_PASSWORD = "test_password"

# Mock tweepy before any imports
mock_tweepy = MagicMock()
sys.modules["tweepy"] = mock_tweepy
sys.modules["tweepy.auth"] = MagicMock()

# Mock atproto before any imports (for Bluesky)
mock_atproto = MagicMock()
sys.modules["atproto"] = mock_atproto

# Mock db_handler before any imports
mock_db_handler = MagicMock()
sys.modules["db_handler"] = mock_db_handler

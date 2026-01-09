import sys
import os
from unittest.mock import MagicMock, patch

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

# Mock the config module before any imports
sys.modules['config'] = MagicMock()
sys.modules['config'].TWITTER_API_KEY = 'test_key'
sys.modules['config'].TWITTER_API_SECRET = 'test_secret'
sys.modules['config'].TWITTER_ACCESS_TOKEN = 'test_token'
sys.modules['config'].TWITTER_ACCESS_SECRET = 'test_secret_token'
sys.modules['config'].BSKY_USERNAME = 'test_user'
sys.modules['config'].BSKY_PASSWORD = 'test_password'

# Mock tweepy before any imports
mock_tweepy = MagicMock()
sys.modules['tweepy'] = mock_tweepy
sys.modules['tweepy.auth'] = MagicMock()

# Mock atproto before any imports (for Bluesky)
mock_atproto = MagicMock()
sys.modules['atproto'] = mock_atproto

# Mock db_handler before any imports
mock_db_handler = MagicMock()
sys.modules['db_handler'] = mock_db_handler

# Mock tenacity before any imports
# Create a pass-through decorator that doesn't actually do retries
def passthrough_decorator(*args, **kwargs):
    def decorator(func):
        return func
    return decorator

mock_tenacity = MagicMock()
mock_tenacity.retry = passthrough_decorator
mock_tenacity.stop_after_attempt = MagicMock(return_value=None)
mock_tenacity.wait_exponential = MagicMock(return_value=None)
mock_tenacity.retry_if_exception_type = MagicMock(return_value=None)
mock_tenacity.before_sleep_log = MagicMock(return_value=None)
mock_tenacity.after_log = MagicMock(return_value=None)
sys.modules['tenacity'] = mock_tenacity

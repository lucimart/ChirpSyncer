"""
Credential Validator - Test credentials against Twitter and Bluesky APIs

This module provides functions to validate credentials by attempting actual
authentication against the respective platform APIs. Used by the web dashboard
to verify stored credentials are working.
"""

import asyncio
import logging
from typing import Dict, Tuple
from atproto import Client
from twscrape import API
from app.core.logger import setup_logger

# Import tweepy at module level so it can be mocked in tests
try:
    import tweepy
except ImportError:
    tweepy = None

logger = setup_logger(__name__)


async def _validate_twitter_scraping_async(
    credentials: Dict[str, str],
) -> Tuple[bool, str]:
    """
    Validate Twitter scraping credentials using twscrape.

    Args:
        credentials: Dictionary with keys: username, password, email, email_password

    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Initialize twscrape API
        api = API()

        # Check if account exists in pool
        accounts = await api.pool.accounts_info()

        # For now, just verify credentials structure is correct
        required_fields = ["username", "password", "email", "email_password"]
        missing_fields = [
            f for f in required_fields if f not in credentials or not credentials[f]
        ]

        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"

        # Note: Full validation would require adding account to pool and logging in,
        # but that's a one-time setup operation that shouldn't be done repeatedly.
        # This validates the credential structure is correct.
        return True, "Twitter scraping credentials validated (structure check)"

    except Exception as e:
        logger.error(f"Error validating Twitter scraping credentials: {e}")
        return False, f"Validation error: {str(e)}"


def validate_twitter_scraping(credentials: Dict[str, str]) -> Tuple[bool, str]:
    """
    Validate Twitter scraping credentials (synchronous wrapper).

    Args:
        credentials: Dictionary with keys: username, password, email, email_password

    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        return asyncio.run(_validate_twitter_scraping_async(credentials))
    except RuntimeError as e:
        if "asyncio.run() cannot be called from a running event loop" in str(e):
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(
                _validate_twitter_scraping_async(credentials)
            )
        raise


def validate_twitter_api(credentials: Dict[str, str]) -> Tuple[bool, str]:
    """
    Validate Twitter API credentials by attempting authentication.

    Args:
        credentials: Dictionary with keys: api_key, api_secret, access_token, access_secret

    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Check required fields
        required_fields = ["api_key", "api_secret", "access_token", "access_secret"]
        missing_fields = [
            f for f in required_fields if f not in credentials or not credentials[f]
        ]

        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"

        # Check if tweepy is available
        if tweepy is None:
            return False, "tweepy library not installed"

        # Attempt to authenticate with Twitter API using tweepy
        try:
            # Create auth handler
            auth = tweepy.OAuthHandler(
                credentials["api_key"], credentials["api_secret"]
            )
            auth.set_access_token(
                credentials["access_token"], credentials["access_secret"]
            )

            # Create API client and verify credentials
            api = tweepy.API(auth)
            user = api.verify_credentials()

            if user:
                return (
                    True,
                    f"Twitter API credentials validated successfully (@{user.screen_name})",
                )
            else:
                return False, "Failed to verify credentials"

        except tweepy.errors.Unauthorized as e:
            logger.warning(f"Twitter API authentication failed: {e}")
            return False, "Invalid API credentials - authentication failed"
        except tweepy.errors.Forbidden as e:
            logger.warning(f"Twitter API forbidden: {e}")
            return False, "API access forbidden - check your app permissions"
        except tweepy.errors.TweepyException as e:
            logger.error(f"Twitter API error: {e}")
            error_msg = str(e)
            if "401" in error_msg or "Unauthorized" in error_msg:
                return False, "Invalid API credentials"
            elif "403" in error_msg or "Forbidden" in error_msg:
                return False, "API access denied"
            elif "429" in error_msg:
                return False, "Rate limit exceeded - try again later"
            else:
                return False, f"Twitter API error: {error_msg}"

    except Exception as e:
        logger.error(f"Error validating Twitter API credentials: {e}")
        return False, f"Validation error: {str(e)}"


def validate_bluesky(credentials: Dict[str, str]) -> Tuple[bool, str]:
    """
    Validate Bluesky credentials by attempting login.

    Args:
        credentials: Dictionary with keys: username, password (app password)

    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Check required fields
        if "username" not in credentials or not credentials["username"]:
            return False, "Missing username"
        if "password" not in credentials or not credentials["password"]:
            return False, "Missing password (app password)"

        # Attempt login to verify credentials
        client = Client()
        try:
            client.login(credentials["username"], credentials["password"])
            return True, "Bluesky credentials validated successfully"
        except Exception as login_error:
            error_msg = str(login_error)
            if "Invalid" in error_msg or "Authentication" in error_msg:
                return False, "Invalid username or password"
            elif "Network" in error_msg or "Connection" in error_msg:
                return False, "Network error - could not reach Bluesky API"
            else:
                return False, f"Login failed: {error_msg}"

    except Exception as e:
        logger.error(f"Error validating Bluesky credentials: {e}")
        return False, f"Validation error: {str(e)}"


def validate_credentials(
    platform: str, credential_type: str, credentials: Dict[str, str]
) -> Tuple[bool, str]:
    """
    Validate credentials for any platform and credential type.

    Args:
        platform: Platform name ('twitter' or 'bluesky')
        credential_type: Credential type ('scraping' or 'api')
        credentials: Credential data dictionary

    Returns:
        Tuple of (success: bool, message: str)

    Raises:
        ValueError: If platform or credential_type is invalid
    """
    if platform == "twitter":
        if credential_type == "scraping":
            return validate_twitter_scraping(credentials)
        elif credential_type == "api":
            return validate_twitter_api(credentials)
        else:
            raise ValueError(f"Invalid credential_type for Twitter: {credential_type}")
    elif platform == "bluesky":
        if credential_type == "api":
            return validate_bluesky(credentials)
        else:
            raise ValueError(f"Invalid credential_type for Bluesky: {credential_type}")
    else:
        raise ValueError(f"Invalid platform: {platform}")

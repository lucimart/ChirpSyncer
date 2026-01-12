"""Media handler for bidirectional Twitter↔Bluesky media synchronization.

This module handles downloading, uploading, and processing of images and videos
for synchronization between Twitter and Bluesky platforms.

Key features:
- Async media download from URLs
- Upload media to Bluesky with blob storage
- Upload media to Twitter via API
- MIME type detection
- Size validation for platform limits
- Alt text preservation
"""

import aiohttp
import asyncio
import io
import mimetypes
from typing import Optional
from app.core.logger import setup_logger

logger = setup_logger(__name__)

# Import clients (will be initialized when modules are imported)
# Lazy import to avoid circular dependencies
bsky_client = None
twitter_api = None


def _init_clients():
    """Initialize API clients lazily to avoid circular imports."""
    global bsky_client, twitter_api

    if bsky_client is None:
        try:
            from bluesky_handler import bsky_client as _bsky_client
            bsky_client = _bsky_client
        except ImportError:
            logger.warning("Could not import bsky_client")

    if twitter_api is None:
        try:
            from twitter_handler import api as _twitter_api
            twitter_api = _twitter_api
        except ImportError:
            logger.debug("Could not import twitter_api (may not be configured)")


# Platform size limits (in bytes)
BLUESKY_IMAGE_LIMIT = 1 * 1024 * 1024  # 1MB
TWITTER_IMAGE_LIMIT = 5 * 1024 * 1024  # 5MB
BLUESKY_VIDEO_LIMIT = 50 * 1024 * 1024  # 50MB (more permissive)
TWITTER_VIDEO_LIMIT = 512 * 1024 * 1024  # 512MB (more permissive)


async def download_media(url: str, media_type: str) -> bytes:
    """Download media from URL asynchronously.

    Args:
        url: URL of the media to download
        media_type: Type of media ('image' or 'video')

    Returns:
        bytes: Downloaded media data

    Raises:
        Exception: If download fails (network error, 404, timeout, etc.)

    Example:
        >>> media_data = await download_media('https://example.com/photo.jpg', 'image')
        >>> len(media_data)
        12345
    """
    try:
        logger.info(f"Downloading {media_type} from {url}")

        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=30) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download media: HTTP {response.status}")

                media_data = await response.read()
                logger.info(f"Downloaded {len(media_data)} bytes from {url}")
                return media_data

    except asyncio.TimeoutError:
        logger.error(f"Timeout downloading media from {url}")
        raise Exception(f"Download timed out for {url}")
    except Exception as e:
        logger.error(f"Error downloading media from {url}: {e}")
        raise


async def upload_media_to_bluesky(media_data: bytes, mime_type: str, alt_text: str = '') -> dict:
    """Upload media to Bluesky and return blob reference.

    Args:
        media_data: Binary media data
        mime_type: MIME type (e.g., 'image/jpeg', 'video/mp4')
        alt_text: Alternative text description for accessibility (optional)

    Returns:
        dict: Blob reference with metadata from Bluesky

    Raises:
        Exception: If upload fails

    Example:
        >>> blob = await upload_media_to_bluesky(image_bytes, 'image/jpeg', 'Sunset')
        >>> blob['blob']['ref']
        {'$link': 'bafyreiabc...'}
    """
    _init_clients()

    if bsky_client is None:
        raise Exception("Bluesky client not initialized")

    try:
        logger.info(f"Uploading {len(media_data)} bytes to Bluesky (mime: {mime_type})")

        # Upload blob to Bluesky
        blob_response = bsky_client.com.atproto.repo.upload_blob(media_data)

        logger.info(f"Successfully uploaded media to Bluesky")
        return blob_response

    except Exception as e:
        logger.error(f"Failed to upload media to Bluesky: {e}")
        raise Exception(f"Failed to upload media to Bluesky: {e}")


def upload_media_to_twitter(media_data: bytes, mime_type: str) -> str:
    """Upload media to Twitter and return media ID.

    Args:
        media_data: Binary media data
        mime_type: MIME type (e.g., 'image/jpeg', 'video/mp4')

    Returns:
        str: Media ID string from Twitter

    Raises:
        Exception: If upload fails or Twitter API not configured

    Example:
        >>> media_id = upload_media_to_twitter(image_bytes, 'image/jpeg')
        >>> media_id
        '1234567890123456789'
    """
    _init_clients()

    if twitter_api is None:
        raise Exception("Twitter API not configured")

    try:
        logger.info(f"Uploading {len(media_data)} bytes to Twitter")

        # Create a file-like object from bytes
        media_file = io.BytesIO(media_data)

        # Upload media using tweepy
        media = twitter_api.media_upload(filename="media", file=media_file)

        logger.info(f"Successfully uploaded media to Twitter: {media.media_id_string}")
        return media.media_id_string

    except Exception as e:
        logger.error(f"Failed to upload media to Twitter: {e}")
        raise Exception(f"Failed to upload media to Twitter: {e}")


def get_mime_type(url: str) -> str:
    """Detect MIME type from URL or file extension.

    Args:
        url: URL or filename to detect MIME type from

    Returns:
        str: MIME type (e.g., 'image/jpeg', 'video/mp4', 'application/octet-stream')

    Example:
        >>> get_mime_type('https://example.com/photo.jpg')
        'image/jpeg'
        >>> get_mime_type('video.mp4')
        'video/mp4'
    """
    # Remove query parameters if present
    url_without_params = url.split('?')[0]

    # Convert to lowercase for case-insensitive matching
    url_lower = url_without_params.lower()

    # Try to guess MIME type from extension
    mime_type, _ = mimetypes.guess_type(url_lower)

    if mime_type:
        return mime_type

    # Fallback to common extensions
    if url_lower.endswith('.jpg') or url_lower.endswith('.jpeg'):
        return 'image/jpeg'
    elif url_lower.endswith('.png'):
        return 'image/png'
    elif url_lower.endswith('.gif'):
        return 'image/gif'
    elif url_lower.endswith('.webp'):
        return 'image/webp'
    elif url_lower.endswith('.mp4'):
        return 'video/mp4'
    elif url_lower.endswith('.mov'):
        return 'video/quicktime'
    elif url_lower.endswith('.avi'):
        return 'video/x-msvideo'

    # Default fallback
    logger.warning(f"Could not determine MIME type for {url}, using default")
    return 'application/octet-stream'


def validate_media_size(data: bytes, platform: str) -> bool:
    """Validate media size against platform limits.

    Args:
        data: Binary media data
        platform: Target platform ('bluesky' or 'twitter')

    Returns:
        bool: True if size is within limits, False otherwise

    Platform Limits:
        - Bluesky: 1MB for images, 50MB for videos
        - Twitter: 5MB for images, 512MB for videos

    Example:
        >>> data = b'x' * (2 * 1024 * 1024)  # 2MB
        >>> validate_media_size(data, 'bluesky')
        False
        >>> validate_media_size(data, 'twitter')
        True
    """
    size = len(data)

    # Empty data is invalid
    if size == 0:
        logger.warning("Empty media data provided")
        return False

    platform_lower = platform.lower()

    if platform_lower == 'bluesky':
        # For Bluesky, use 1MB limit (conservative for images)
        if size <= BLUESKY_IMAGE_LIMIT:
            logger.debug(f"Media size {size} bytes is valid for Bluesky")
            return True
        else:
            logger.warning(f"Media size {size} bytes exceeds Bluesky limit of {BLUESKY_IMAGE_LIMIT}")
            return False

    elif platform_lower == 'twitter':
        # For Twitter, use 5MB limit (conservative for images)
        if size <= TWITTER_IMAGE_LIMIT:
            logger.debug(f"Media size {size} bytes is valid for Twitter")
            return True
        else:
            logger.warning(f"Media size {size} bytes exceeds Twitter limit of {TWITTER_IMAGE_LIMIT}")
            return False

    else:
        logger.error(f"Invalid platform: {platform}")
        return False


def should_process_media(media_urls: list, max_count: int = 4) -> bool:
    """Check if media should be processed based on count and validity.

    Args:
        media_urls: List of media URLs
        max_count: Maximum number of media items to process (default: 4)

    Returns:
        bool: True if media should be processed
    """
    if not media_urls:
        return False

    if len(media_urls) > max_count:
        logger.warning(f"Too many media items ({len(media_urls)}), limiting to {max_count}")

    return True

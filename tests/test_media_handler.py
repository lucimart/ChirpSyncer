"""Test suite for media_handler module - TDD approach

This test suite comprehensively tests media download, upload, and processing
functionality for bidirectional Twitter↔Bluesky media synchronization.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock, mock_open
import io


@pytest.fixture
def sample_image_bytes():
    """Fixture providing sample image data (1x1 PNG)"""
    # 1x1 transparent PNG (smallest valid PNG)
    return b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'


@pytest.fixture
def sample_video_bytes():
    """Fixture providing sample video data (mock)"""
    # Simple mock video bytes (not a real video, but sufficient for size tests)
    return b'MOCK_VIDEO_DATA' * 1000  # 15KB


@pytest.fixture
def mock_aiohttp_response(sample_image_bytes):
    """Fixture for mocked aiohttp response"""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read = AsyncMock(return_value=sample_image_bytes)
    return mock_response


# Test 1: download_media success
@pytest.mark.asyncio
@patch('app.integrations.media_handler.aiohttp.ClientSession')
async def test_download_media_success(mock_session_class, sample_image_bytes):
    """Test successful media download from URL"""
    from app.integrations.media_handler import download_media

    # Setup mock session and response
    mock_session = AsyncMock()
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read = AsyncMock(return_value=sample_image_bytes)

    # Create proper async context manager mock
    mock_get_context = AsyncMock()
    mock_get_context.__aenter__ = AsyncMock(return_value=mock_response)
    mock_get_context.__aexit__ = AsyncMock(return_value=None)
    mock_session.get = MagicMock(return_value=mock_get_context)

    mock_session_context = AsyncMock()
    mock_session_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_context.__aexit__ = AsyncMock(return_value=None)
    mock_session_class.return_value = mock_session_context

    # Test
    url = "https://example.com/image.jpg"
    result = await download_media(url, "image")

    # Assertions
    assert result == sample_image_bytes
    assert len(result) > 0
    mock_session.get.assert_called_once_with(url, timeout=30)


# Test 2: download_media failure (404)
@pytest.mark.asyncio
@patch('app.integrations.media_handler.aiohttp.ClientSession')
async def test_download_media_not_found(mock_session_class):
    """Test media download with 404 error"""
    from app.integrations.media_handler import download_media

    # Setup mock for 404 response
    mock_session = AsyncMock()
    mock_response = AsyncMock()
    mock_response.status = 404

    # Create proper async context manager mock for get()
    mock_get_context = AsyncMock()
    mock_get_context.__aenter__ = AsyncMock(return_value=mock_response)
    mock_get_context.__aexit__ = AsyncMock(return_value=None)
    mock_session.get = MagicMock(return_value=mock_get_context)

    # Create proper async context manager mock for ClientSession()
    mock_session_context = AsyncMock()
    mock_session_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_context.__aexit__ = AsyncMock(return_value=None)
    mock_session_class.return_value = mock_session_context

    # Test - should raise exception
    url = "https://example.com/missing.jpg"
    with pytest.raises(Exception, match="Failed to download media"):
        await download_media(url, "image")


# Test 3: download_media timeout
@pytest.mark.asyncio
@patch('app.integrations.media_handler.aiohttp.ClientSession')
async def test_download_media_timeout(mock_session_class):
    """Test media download with timeout error"""
    from app.integrations.media_handler import download_media
    import asyncio

    # Setup mock to raise timeout
    mock_session = AsyncMock()

    # Create an async context manager that raises TimeoutError on enter
    mock_get_context = AsyncMock()
    async def raise_on_enter():
        raise asyncio.TimeoutError("Connection timeout")
    mock_get_context.__aenter__ = AsyncMock(side_effect=raise_on_enter)
    mock_get_context.__aexit__ = AsyncMock(return_value=None)
    mock_session.get = MagicMock(return_value=mock_get_context)

    # Create proper async context manager mock for ClientSession()
    mock_session_context = AsyncMock()
    mock_session_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_context.__aexit__ = AsyncMock(return_value=None)
    mock_session_class.return_value = mock_session_context

    # Test
    url = "https://example.com/slow.jpg"
    with pytest.raises(Exception, match="Download timed out|Timeout downloading media"):
        await download_media(url, "image")


# Test 4: upload_media_to_bluesky success (image)
@pytest.mark.asyncio
@patch('app.integrations.media_handler.bsky_client')
async def test_upload_media_to_bluesky_image(mock_client, sample_image_bytes):
    """Test successful image upload to Bluesky"""
    from app.integrations.media_handler import upload_media_to_bluesky

    # Setup mock response
    mock_blob = {
        'blob': {
            'ref': {'$link': 'bafyreiabc123'},
            'mimeType': 'image/png',
            'size': len(sample_image_bytes)
        }
    }
    mock_client.com.atproto.repo.upload_blob = MagicMock(return_value=mock_blob)

    # Test
    result = await upload_media_to_bluesky(sample_image_bytes, 'image/png', 'Test image')

    # Assertions
    assert result is not None
    assert 'blob' in result
    mock_client.com.atproto.repo.upload_blob.assert_called_once()


# Test 5: upload_media_to_bluesky with alt text
@pytest.mark.asyncio
@patch('app.integrations.media_handler.bsky_client')
async def test_upload_media_to_bluesky_with_alt_text(mock_client, sample_image_bytes):
    """Test image upload to Bluesky with alt text preservation"""
    from app.integrations.media_handler import upload_media_to_bluesky

    mock_blob = {'blob': {'ref': {'$link': 'bafyreiabc123'}}}
    mock_client.com.atproto.repo.upload_blob = MagicMock(return_value=mock_blob)

    # Test with alt text
    alt_text = "A beautiful sunset over the ocean"
    result = await upload_media_to_bluesky(sample_image_bytes, 'image/jpeg', alt_text)

    # Assertions
    assert result is not None
    # Alt text handling will be verified in integration


# Test 6: upload_media_to_twitter success
@patch('app.integrations.media_handler.twitter_api')
def test_upload_media_to_twitter(mock_api, sample_image_bytes):
    """Test successful media upload to Twitter"""
    from app.integrations.media_handler import upload_media_to_twitter

    # Setup mock
    mock_media = MagicMock()
    mock_media.media_id_string = "123456789"
    mock_api.media_upload = MagicMock(return_value=mock_media)

    # Test
    result = upload_media_to_twitter(sample_image_bytes, 'image/jpeg')

    # Assertions
    assert result == "123456789"
    mock_api.media_upload.assert_called_once()


# Test 7: get_mime_type from URL
def test_get_mime_type_from_url():
    """Test MIME type detection from URL extensions"""
    from app.integrations.media_handler import get_mime_type

    # Test various extensions
    assert get_mime_type("https://example.com/photo.jpg") == "image/jpeg"
    assert get_mime_type("https://example.com/photo.jpeg") == "image/jpeg"
    assert get_mime_type("https://example.com/photo.png") == "image/png"
    assert get_mime_type("https://example.com/photo.gif") == "image/gif"
    assert get_mime_type("https://example.com/video.mp4") == "video/mp4"
    assert get_mime_type("https://example.com/video.mov") == "video/quicktime"


# Test 8: get_mime_type with query parameters
def test_get_mime_type_with_query_params():
    """Test MIME type detection with URL query parameters"""
    from app.integrations.media_handler import get_mime_type

    url = "https://example.com/photo.jpg?size=large&quality=high"
    assert get_mime_type(url) == "image/jpeg"


# Test 9: get_mime_type unknown extension
def test_get_mime_type_unknown():
    """Test MIME type detection with unknown extension"""
    from app.integrations.media_handler import get_mime_type

    url = "https://example.com/file.unknownext123"
    assert get_mime_type(url) == "application/octet-stream"


# Test 10: validate_media_size - Bluesky image under limit
def test_validate_media_size_bluesky_image_valid(sample_image_bytes):
    """Test media size validation for Bluesky images (under 1MB)"""
    from app.integrations.media_handler import validate_media_size

    # Sample image is well under 1MB
    assert validate_media_size(sample_image_bytes, 'bluesky') is True


# Test 11: validate_media_size - Bluesky image over limit
def test_validate_media_size_bluesky_image_too_large():
    """Test media size validation for Bluesky images (over 1MB)"""
    from app.integrations.media_handler import validate_media_size

    # Create 2MB of data (over Bluesky's 1MB limit)
    large_data = b'x' * (2 * 1024 * 1024)
    assert validate_media_size(large_data, 'bluesky') is False


# Test 12: validate_media_size - Twitter image under limit
def test_validate_media_size_twitter_image_valid():
    """Test media size validation for Twitter images (under 5MB)"""
    from app.integrations.media_handler import validate_media_size

    # Create 3MB of data (under Twitter's 5MB limit)
    data = b'x' * (3 * 1024 * 1024)
    assert validate_media_size(data, 'twitter') is True


# Test 13: validate_media_size - Twitter image over limit
def test_validate_media_size_twitter_image_too_large():
    """Test media size validation for Twitter images (over 5MB)"""
    from app.integrations.media_handler import validate_media_size

    # Create 6MB of data (over Twitter's 5MB limit)
    large_data = b'x' * (6 * 1024 * 1024)
    assert validate_media_size(large_data, 'twitter') is False


# Test 14: validate_media_size - invalid platform
def test_validate_media_size_invalid_platform(sample_image_bytes):
    """Test media size validation with invalid platform"""
    from app.integrations.media_handler import validate_media_size

    # Should handle gracefully (return False or raise exception)
    result = validate_media_size(sample_image_bytes, 'invalid_platform')
    assert result is False


# Test 15: upload_media_to_bluesky failure
@pytest.mark.asyncio
@patch('app.integrations.media_handler.bsky_client')
async def test_upload_media_to_bluesky_failure(mock_client, sample_image_bytes):
    """Test Bluesky media upload failure handling"""
    from app.integrations.media_handler import upload_media_to_bluesky

    # Setup mock to raise exception
    mock_client.com.atproto.repo.upload_blob = MagicMock(side_effect=Exception("Upload failed"))

    # Test - should raise exception
    with pytest.raises(Exception, match="Upload failed|Failed to upload"):
        await upload_media_to_bluesky(sample_image_bytes, 'image/png')


# Test 16: upload_media_to_twitter failure
@patch('app.integrations.media_handler.twitter_api')
def test_upload_media_to_twitter_failure(mock_api, sample_image_bytes):
    """Test Twitter media upload failure handling"""
    from app.integrations.media_handler import upload_media_to_twitter

    # Setup mock to raise exception
    mock_api.media_upload = MagicMock(side_effect=Exception("API error"))

    # Test - should raise exception
    with pytest.raises(Exception, match="API error|Failed to upload"):
        upload_media_to_twitter(sample_image_bytes, 'image/jpeg')


# Test 17: download_media with large file
@pytest.mark.asyncio
@patch('app.integrations.media_handler.aiohttp.ClientSession')
async def test_download_media_large_file(mock_session_class):
    """Test downloading large media file"""
    from app.integrations.media_handler import download_media

    # Create 10MB mock data
    large_data = b'x' * (10 * 1024 * 1024)

    mock_session = AsyncMock()
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read = AsyncMock(return_value=large_data)

    # Create proper async context manager mock for get()
    mock_get_context = AsyncMock()
    mock_get_context.__aenter__ = AsyncMock(return_value=mock_response)
    mock_get_context.__aexit__ = AsyncMock(return_value=None)
    mock_session.get = MagicMock(return_value=mock_get_context)

    # Create proper async context manager mock for ClientSession()
    mock_session_context = AsyncMock()
    mock_session_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_context.__aexit__ = AsyncMock(return_value=None)
    mock_session_class.return_value = mock_session_context

    # Test
    result = await download_media("https://example.com/large.mp4", "video")

    # Assertions
    assert len(result) == 10 * 1024 * 1024


# Test 18: get_mime_type case insensitivity
def test_get_mime_type_case_insensitive():
    """Test MIME type detection is case-insensitive"""
    from app.integrations.media_handler import get_mime_type

    assert get_mime_type("https://example.com/PHOTO.JPG") == "image/jpeg"
    assert get_mime_type("https://example.com/Photo.PNG") == "image/png"
    assert get_mime_type("https://example.com/VIDEO.MP4") == "video/mp4"


# Test 19: validate_media_size with zero bytes
def test_validate_media_size_empty():
    """Test media size validation with empty data"""
    from app.integrations.media_handler import validate_media_size

    empty_data = b''
    # Empty data should be considered invalid
    assert validate_media_size(empty_data, 'bluesky') is False
    assert validate_media_size(empty_data, 'twitter') is False


# Test 20: Edge case - validate_media_size exactly at limit
def test_validate_media_size_at_limit():
    """Test media size validation at exact size limits"""
    from app.integrations.media_handler import validate_media_size

    # Exactly 1MB for Bluesky (should be valid)
    one_mb = b'x' * (1024 * 1024)
    assert validate_media_size(one_mb, 'bluesky') is True

    # Exactly 5MB for Twitter (should be valid)
    five_mb = b'x' * (5 * 1024 * 1024)
    assert validate_media_size(five_mb, 'twitter') is True

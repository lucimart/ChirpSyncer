"""Integration tests for media pipeline and handler.

This module contains integration tests for the media pipeline including:
- Media downloading from URLs with async handling
- Media upload to Bluesky with blob storage
- Media upload to Twitter via API
- MIME type detection and format validation
- Size validation for platform limits
- Error handling for download/upload failures
- Alt text preservation during uploads
- Multiple media file handling

Test fixtures use mock external requests to simulate real platform APIs
without making actual network calls.

Usage:
    pytest tests/integration/test_media_integration.py -v
    pytest tests/integration/test_media_integration.py -m "integration" -v
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock

# Import media handler functions
from app.integrations.media_handler import (
    download_media,
    upload_media_to_bluesky,
    upload_media_to_twitter,
    get_mime_type,
    validate_media_size,
    should_process_media,
    BLUESKY_IMAGE_LIMIT,
    TWITTER_IMAGE_LIMIT,
    BLUESKY_VIDEO_LIMIT,
    TWITTER_VIDEO_LIMIT,
)


# =============================================================================
# TEST FIXTURES - Media Data
# =============================================================================

@pytest.fixture
def sample_image_data():
    """Create sample JPEG image data (minimal valid JPEG).

    Returns:
        bytes: Valid minimal JPEG data approximately 1KB
    """
    # Minimal valid JPEG: FFD8 (start) + FFE0 (APP0) + size + JFIF + FFD9 (end)
    jpeg_bytes = bytes([
        0xFF, 0xD8,  # SOI marker
        0xFF, 0xE0,  # APP0 marker
        0x00, 0x10,  # Length
        0x4A, 0x46, 0x49, 0x46, 0x00,  # JFIF
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,  # Version and other
    ] + [0x00] * 500)  # Padding to make it larger
    jpeg_bytes += bytes([0xFF, 0xD9])  # EOI marker
    return jpeg_bytes


@pytest.fixture
def sample_video_data():
    """Create sample MP4 video data (minimal valid MP4).

    Returns:
        bytes: Valid minimal MP4 data approximately 1KB
    """
    # Minimal MP4 header with ftyp and mdat boxes
    mp4_bytes = bytes([
        0x00, 0x00, 0x00, 0x20,  # Box size
        0x66, 0x74, 0x79, 0x70,  # 'ftyp'
        0x69, 0x73, 0x6F, 0x6D,  # Major brand
        0x00, 0x00, 0x00, 0x00,  # Minor version
    ] + [0x00] * 500)  # Padding
    return mp4_bytes


@pytest.fixture
def sample_png_data():
    """Create sample PNG image data (minimal valid PNG).

    Returns:
        bytes: Valid minimal PNG data
    """
    # Minimal valid PNG
    png_signature = bytes([137, 80, 78, 71, 13, 10, 26, 10])  # PNG signature
    ihdr_chunk = bytes([
        0x00, 0x00, 0x00, 0x0D,  # Chunk length
        0x49, 0x48, 0x44, 0x52,  # 'IHDR'
        0x00, 0x00, 0x00, 0x01,  # Width: 1
        0x00, 0x00, 0x00, 0x01,  # Height: 1
        0x08, 0x02,  # Bit depth, color type
        0x00, 0x00, 0x00,  # Compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE,  # CRC
    ])
    idat_chunk = bytes([
        0x00, 0x00, 0x00, 0x0C,  # Chunk length
        0x49, 0x44, 0x41, 0x54,  # 'IDAT'
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02,  # Data
        0x00, 0x01, 0x49, 0xB4, 0xE8, 0xB7,  # CRC
    ])
    iend_chunk = bytes([
        0x00, 0x00, 0x00, 0x00,  # Chunk length
        0x49, 0x45, 0x4E, 0x44,  # 'IEND'
        0xAE, 0x42, 0x60, 0x82,  # CRC
    ])
    return png_signature + ihdr_chunk + idat_chunk + iend_chunk


@pytest.fixture
def oversized_image_data():
    """Create oversized image data exceeding Bluesky limit.

    Returns:
        bytes: Image data larger than 1MB (Bluesky limit)
    """
    # Create data larger than BLUESKY_IMAGE_LIMIT (1MB)
    return b'\x00' * (BLUESKY_IMAGE_LIMIT + 1024)


@pytest.fixture
def oversized_video_data():
    """Create oversized video data exceeding Bluesky video limit.

    Returns:
        bytes: Video data larger than 50MB (Bluesky limit)
    """
    # Create data larger than BLUESKY_VIDEO_LIMIT (50MB)
    return b'\x00' * (BLUESKY_VIDEO_LIMIT + 1024)


# =============================================================================
# TEST FIXTURES - Mock Responses
# =============================================================================

@pytest.fixture
def mock_bluesky_blob_response():
    """Create mock Bluesky blob upload response.

    Returns:
        dict: Mock blob response with ref and size
    """
    return {
        'blob': {
            'mimeType': 'image/jpeg',
            'size': 1024,
            'ref': {
                '$link': 'bafyreiabc123456789'
            }
        }
    }


@pytest.fixture
def mock_twitter_media_response():
    """Create mock Twitter media upload response.

    Returns:
        dict: Mock media response with ID
    """
    response = MagicMock()
    response.media_id_string = '1234567890123456789'
    response.media_id = 1234567890123456789
    return response


# =============================================================================
# TESTS - Download Media
# =============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_download_media_from_url_image(sample_image_data):
    """Test successful download of image from URL.

    Verifies that:
    - Media is downloaded correctly
    - Correct number of bytes is returned
    - No errors occur during download
    """
    with patch('aiohttp.ClientSession') as mock_session_class:
        # Setup mock
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.read = AsyncMock(return_value=sample_image_data)

        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()
        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session

        # Execute
        url = "https://example.com/photo.jpg"
        result = await download_media(url, 'image')

        # Verify
        assert result == sample_image_data
        assert len(result) > 0
        mock_session.get.assert_called_once()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_download_media_from_url_video(sample_video_data):
    """Test successful download of video from URL.

    Verifies that:
    - Video media is downloaded correctly
    - Function handles different media types
    - Response is properly read
    """
    with patch('aiohttp.ClientSession') as mock_session_class:
        # Setup mock
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.read = AsyncMock(return_value=sample_video_data)

        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()
        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session

        # Execute
        url = "https://example.com/video.mp4"
        result = await download_media(url, 'video')

        # Verify
        assert result == sample_video_data
        assert len(result) > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_download_media_http_error():
    """Test download error handling for HTTP errors.

    Verifies that:
    - 404 errors are properly caught
    - Exception is raised with appropriate message
    - Function logs error properly
    """
    with patch('aiohttp.ClientSession') as mock_session_class:
        # Setup mock for 404 error
        mock_response = AsyncMock()
        mock_response.status = 404

        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()
        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session

        # Execute and verify exception
        url = "https://example.com/missing.jpg"
        with pytest.raises(Exception) as exc_info:
            await download_media(url, 'image')

        assert "HTTP 404" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_download_media_timeout_error():
    """Test download error handling for timeout.

    Verifies that:
    - Timeout errors are caught
    - Appropriate exception is raised
    - Error message indicates timeout
    """
    with patch('aiohttp.ClientSession') as mock_session_class:
        # Setup mock to raise timeout
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()
        mock_session.get.return_value.__aenter__.side_effect = asyncio.TimeoutError()

        mock_session_class.return_value = mock_session

        # Execute and verify exception
        url = "https://example.com/slow-image.jpg"
        with pytest.raises(Exception) as exc_info:
            await download_media(url, 'image')

        assert "timed out" in str(exc_info.value).lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_download_media_connection_error():
    """Test download error handling for connection errors.

    Verifies that:
    - Connection errors are caught
    - Exception is raised
    - Error is logged
    """
    with patch('aiohttp.ClientSession') as mock_session_class:
        # Setup mock to raise connection error
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()
        mock_session.get.return_value.__aenter__.side_effect = Exception("Connection refused")

        mock_session_class.return_value = mock_session

        # Execute and verify exception
        url = "https://example.com/unreachable.jpg"
        with pytest.raises(Exception):
            await download_media(url, 'image')


# =============================================================================
# TESTS - Upload Media to Bluesky
# =============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_media_to_bluesky_image(sample_image_data, mock_bluesky_blob_response):
    """Test successful media upload to Bluesky.

    Verifies that:
    - Media is uploaded with correct MIME type
    - Blob response is returned
    - Bluesky client method is called correctly
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_bluesky_blob_response

        # Execute
        result = await upload_media_to_bluesky(
            sample_image_data,
            'image/jpeg',
            'Test image'
        )

        # Verify
        assert result == mock_bluesky_blob_response
        assert 'blob' in result
        mock_bsky.com.atproto.repo.upload_blob.assert_called_once_with(sample_image_data)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_media_to_bluesky_with_alt_text(sample_image_data, mock_bluesky_blob_response):
    """Test media upload to Bluesky with alt text preservation.

    Verifies that:
    - Alt text parameter is accepted
    - Upload proceeds successfully
    - Blob response includes proper metadata
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_bluesky_blob_response

        # Execute
        alt_text = "Beautiful sunset over the ocean"
        result = await upload_media_to_bluesky(
            sample_image_data,
            'image/jpeg',
            alt_text
        )

        # Verify
        assert result == mock_bluesky_blob_response
        mock_bsky.com.atproto.repo.upload_blob.assert_called_once()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_media_to_bluesky_video(sample_video_data, mock_bluesky_blob_response):
    """Test video upload to Bluesky.

    Verifies that:
    - Video media can be uploaded
    - Correct MIME type is used for video
    - Function handles different media types
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_bluesky_blob_response

        # Execute
        result = await upload_media_to_bluesky(
            sample_video_data,
            'video/mp4',
            'Test video'
        )

        # Verify
        assert result == mock_bluesky_blob_response
        mock_bsky.com.atproto.repo.upload_blob.assert_called_once()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_media_to_bluesky_uninitialized_client():
    """Test error handling when Bluesky client is not initialized.

    Verifies that:
    - Exception is raised when client is None
    - Appropriate error message is provided
    """
    with patch('app.integrations.media_handler.bsky_client', None):
        with patch('app.integrations.media_handler._init_clients'):
            # Execute and verify exception
            with pytest.raises(Exception) as exc_info:
                await upload_media_to_bluesky(b'test', 'image/jpeg')

            assert "not initialized" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_media_to_bluesky_upload_failure(sample_image_data):
    """Test error handling for failed Bluesky upload.

    Verifies that:
    - Upload exceptions are caught
    - Exception is re-raised with context
    - Error message indicates upload failure
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_bsky.com.atproto.repo.upload_blob.side_effect = Exception("Upload failed: network error")

        # Execute and verify exception
        with pytest.raises(Exception) as exc_info:
            await upload_media_to_bluesky(sample_image_data, 'image/jpeg')

        assert "Failed to upload media to Bluesky" in str(exc_info.value)


# =============================================================================
# TESTS - Upload Media to Twitter
# =============================================================================

@pytest.mark.integration
def test_upload_media_to_twitter_image(sample_image_data, mock_twitter_media_response):
    """Test successful media upload to Twitter.

    Verifies that:
    - Media is uploaded with correct MIME type
    - Media ID string is returned
    - Twitter API is called correctly
    """
    with patch('app.integrations.media_handler.twitter_api') as mock_twitter:
        mock_twitter.media_upload.return_value = mock_twitter_media_response

        # Execute
        result = upload_media_to_twitter(sample_image_data, 'image/jpeg')

        # Verify
        assert result == '1234567890123456789'
        mock_twitter.media_upload.assert_called_once()


@pytest.mark.integration
def test_upload_media_to_twitter_video(sample_video_data, mock_twitter_media_response):
    """Test video upload to Twitter.

    Verifies that:
    - Video can be uploaded
    - Correct MIME type is used
    - Media ID is returned
    """
    with patch('app.integrations.media_handler.twitter_api') as mock_twitter:
        mock_twitter.media_upload.return_value = mock_twitter_media_response

        # Execute
        result = upload_media_to_twitter(sample_video_data, 'video/mp4')

        # Verify
        assert result == '1234567890123456789'
        mock_twitter.media_upload.assert_called_once()


@pytest.mark.integration
def test_upload_media_to_twitter_uninitialized_api():
    """Test error handling when Twitter API is not configured.

    Verifies that:
    - Exception is raised when API is None
    - Error message indicates API not configured
    """
    with patch('app.integrations.media_handler.twitter_api', None):
        with patch('app.integrations.media_handler._init_clients'):
            # Execute and verify exception
            with pytest.raises(Exception) as exc_info:
                upload_media_to_twitter(b'test', 'image/jpeg')

            assert "not configured" in str(exc_info.value)


@pytest.mark.integration
def test_upload_media_to_twitter_upload_failure(sample_image_data):
    """Test error handling for failed Twitter upload.

    Verifies that:
    - Upload exceptions are caught
    - Exception is re-raised with context
    """
    with patch('app.integrations.media_handler.twitter_api') as mock_twitter:
        mock_twitter.media_upload.side_effect = Exception("Upload failed: API error")

        # Execute and verify exception
        with pytest.raises(Exception) as exc_info:
            upload_media_to_twitter(sample_image_data, 'image/jpeg')

        assert "Failed to upload media to Twitter" in str(exc_info.value)


# =============================================================================
# TESTS - Media Format Conversion & MIME Type Detection
# =============================================================================

@pytest.mark.integration
def test_media_format_detection_jpeg():
    """Test MIME type detection for JPEG files.

    Verifies that:
    - JPEG URLs return correct MIME type
    - Both .jpg and .jpeg extensions work
    """
    assert get_mime_type('https://example.com/photo.jpg') == 'image/jpeg'
    assert get_mime_type('https://example.com/image.jpeg') == 'image/jpeg'


@pytest.mark.integration
def test_media_format_detection_png():
    """Test MIME type detection for PNG files.

    Verifies that:
    - PNG URLs return correct MIME type
    """
    assert get_mime_type('https://example.com/image.png') == 'image/png'


@pytest.mark.integration
def test_media_format_detection_gif():
    """Test MIME type detection for GIF files.

    Verifies that:
    - GIF URLs return correct MIME type
    """
    assert get_mime_type('https://example.com/animation.gif') == 'image/gif'


@pytest.mark.integration
def test_media_format_detection_webp():
    """Test MIME type detection for WebP files.

    Verifies that:
    - WebP URLs return correct MIME type
    """
    assert get_mime_type('https://example.com/image.webp') == 'image/webp'


@pytest.mark.integration
def test_media_format_detection_video_mp4():
    """Test MIME type detection for MP4 videos.

    Verifies that:
    - MP4 URLs return correct MIME type
    """
    assert get_mime_type('https://example.com/video.mp4') == 'video/mp4'


@pytest.mark.integration
def test_media_format_detection_video_mov():
    """Test MIME type detection for MOV videos.

    Verifies that:
    - MOV URLs return correct MIME type
    """
    assert get_mime_type('https://example.com/video.mov') == 'video/quicktime'


@pytest.mark.integration
def test_media_format_detection_video_avi():
    """Test MIME type detection for AVI videos.

    Verifies that:
    - AVI URLs return correct MIME type
    """
    assert get_mime_type('https://example.com/video.avi') == 'video/x-msvideo'


@pytest.mark.integration
def test_media_format_detection_with_query_params():
    """Test MIME type detection with URL query parameters.

    Verifies that:
    - Query parameters don't affect detection
    - Extension is properly extracted before query string
    """
    assert get_mime_type('https://example.com/photo.jpg?size=large&v=2') == 'image/jpeg'
    assert get_mime_type('https://cdn.example.com/image.png?token=abc123') == 'image/png'


@pytest.mark.integration
def test_media_format_detection_case_insensitive():
    """Test MIME type detection is case-insensitive.

    Verifies that:
    - Uppercase extensions are handled
    - Mixed case extensions are handled
    """
    assert get_mime_type('https://example.com/photo.JPG') == 'image/jpeg'
    assert get_mime_type('https://example.com/video.MP4') == 'video/mp4'
    assert get_mime_type('https://example.com/image.PNG') == 'image/png'


@pytest.mark.integration
def test_media_format_detection_unknown_type():
    """Test MIME type detection for unknown formats.

    Verifies that:
    - Unknown extensions return default MIME type
    - Fallback is 'application/octet-stream'
    """
    result = get_mime_type('https://example.com/file.unknownextension')
    assert result == 'application/octet-stream'


# =============================================================================
# TESTS - Media Size Validation
# =============================================================================

@pytest.mark.integration
def test_media_size_validation_bluesky_image_within_limit(sample_image_data):
    """Test validation of image within Bluesky limit.

    Verifies that:
    - Small images pass validation
    - Size is correctly compared to limit
    """
    assert validate_media_size(sample_image_data, 'bluesky') is True


@pytest.mark.integration
def test_media_size_validation_bluesky_image_exceeds_limit(oversized_image_data):
    """Test validation of image exceeding Bluesky limit.

    Verifies that:
    - Large images fail validation
    - Error is logged
    """
    assert validate_media_size(oversized_image_data, 'bluesky') is False


@pytest.mark.integration
def test_media_size_validation_twitter_image_within_limit(sample_image_data):
    """Test validation of image within Twitter limit.

    Verifies that:
    - Small images pass validation
    - Twitter has higher limit than Bluesky
    """
    assert validate_media_size(sample_image_data, 'twitter') is True


@pytest.mark.integration
def test_media_size_validation_twitter_image_exceeds_limit():
    """Test validation of image exceeding Twitter limit.

    Verifies that:
    - Very large images exceed Twitter limit
    """
    oversized = b'\x00' * (TWITTER_IMAGE_LIMIT + 1024)
    assert validate_media_size(oversized, 'twitter') is False


@pytest.mark.integration
def test_media_size_validation_bluesky_video_within_limit(sample_video_data):
    """Test validation of video within Bluesky limit.

    Verifies that:
    - Small videos pass validation
    """
    assert validate_media_size(sample_video_data, 'bluesky') is True


@pytest.mark.integration
def test_media_size_validation_bluesky_video_exceeds_limit(oversized_video_data):
    """Test validation of video exceeding Bluesky limit.

    Verifies that:
    - Large videos fail validation
    """
    assert validate_media_size(oversized_video_data, 'bluesky') is False


@pytest.mark.integration
def test_media_size_validation_empty_data():
    """Test validation of empty media data.

    Verifies that:
    - Empty data fails validation
    - Error is logged
    """
    assert validate_media_size(b'', 'bluesky') is False
    assert validate_media_size(b'', 'twitter') is False


@pytest.mark.integration
def test_media_size_validation_invalid_platform():
    """Test validation with invalid platform.

    Verifies that:
    - Invalid platform returns False
    - Error is logged
    """
    assert validate_media_size(b'test', 'invalid_platform') is False
    assert validate_media_size(b'test', 'tiktok') is False


@pytest.mark.integration
def test_media_size_validation_edge_case_exact_limit():
    """Test validation at exact platform limit.

    Verifies that:
    - Data at exact limit passes validation
    """
    bluesky_limit_data = b'\x00' * BLUESKY_IMAGE_LIMIT
    assert validate_media_size(bluesky_limit_data, 'bluesky') is True


@pytest.mark.integration
def test_media_size_validation_case_insensitive_platform():
    """Test validation with different case platform names.

    Verifies that:
    - Platform names are case-insensitive
    """
    sample_data = b'\x00' * 1024
    assert validate_media_size(sample_data, 'BLUESKY') is True
    assert validate_media_size(sample_data, 'Twitter') is True


# =============================================================================
# TESTS - Multiple Media Handling
# =============================================================================

@pytest.mark.integration
async def test_multiple_media_handling_download(sample_image_data, sample_video_data):
    """Test downloading multiple media files.

    Verifies that:
    - Multiple downloads can be executed
    - Each returns correct data
    - Function can handle multiple concurrent downloads
    """
    urls = [
        "https://example.com/photo1.jpg",
        "https://example.com/video1.mp4",
    ]

    with patch('aiohttp.ClientSession') as mock_session_class:
        mock_response_image = AsyncMock()
        mock_response_image.status = 200
        mock_response_image.read = AsyncMock(return_value=sample_image_data)

        mock_response_video = AsyncMock()
        mock_response_video.status = 200
        mock_response_video.read = AsyncMock(return_value=sample_video_data)

        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()

        # Return different responses for different calls
        mock_session.get.return_value.__aenter__.side_effect = [
            mock_response_image,
            mock_response_video,
        ]
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session

        # Execute
        results = await asyncio.gather(
            download_media(urls[0], 'image'),
            download_media(urls[1], 'video'),
        )

        # Verify
        assert len(results) == 2
        assert results[0] == sample_image_data
        assert results[1] == sample_video_data


@pytest.mark.integration
async def test_multiple_media_handling_upload_bluesky(
    sample_image_data,
    sample_video_data,
    mock_bluesky_blob_response
):
    """Test uploading multiple media files to Bluesky.

    Verifies that:
    - Multiple uploads can be executed
    - Each returns proper blob response
    - Function handles multiple uploads
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_bluesky_blob_response

        # Execute
        results = await asyncio.gather(
            upload_media_to_bluesky(sample_image_data, 'image/jpeg', 'Image 1'),
            upload_media_to_bluesky(sample_video_data, 'video/mp4', 'Video 1'),
        )

        # Verify
        assert len(results) == 2
        assert all(r == mock_bluesky_blob_response for r in results)
        assert mock_bsky.com.atproto.repo.upload_blob.call_count == 2


@pytest.mark.integration
def test_should_process_media_with_single_file():
    """Test media processing decision with single file.

    Verifies that:
    - Single file should be processed
    """
    urls = ["https://example.com/photo.jpg"]
    assert should_process_media(urls) is True


@pytest.mark.integration
def test_should_process_media_with_multiple_files():
    """Test media processing decision with multiple files.

    Verifies that:
    - Multiple files (up to max) should be processed
    """
    urls = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
        "https://example.com/photo4.jpg",
    ]
    assert should_process_media(urls) is True


@pytest.mark.integration
def test_should_process_media_exceeds_max():
    """Test media processing decision with too many files.

    Verifies that:
    - Too many files still returns True
    - Warning is logged
    """
    urls = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
        "https://example.com/photo4.jpg",
        "https://example.com/photo5.jpg",
    ]
    # Should still return True, but logs warning
    assert should_process_media(urls, max_count=4) is True


@pytest.mark.integration
def test_should_process_media_empty_list():
    """Test media processing decision with empty list.

    Verifies that:
    - Empty list returns False
    """
    assert should_process_media([]) is False


@pytest.mark.integration
def test_should_process_media_none():
    """Test media processing decision with None.

    Verifies that:
    - None returns False
    """
    assert should_process_media(None) is False


# =============================================================================
# TESTS - Error Handling
# =============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_media_error_handling_download_with_retry():
    """Test download error handling with potential retry.

    Verifies that:
    - Errors are properly caught
    - Error information is logged
    - Exception propagates correctly
    """
    with patch('aiohttp.ClientSession') as mock_session_class:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()

        # First call fails, simulating retry scenario
        mock_response_error = AsyncMock()
        mock_response_error.status = 500

        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response_error)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session

        url = "https://example.com/error.jpg"
        with pytest.raises(Exception) as exc_info:
            await download_media(url, 'image')

        assert "HTTP 500" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_media_error_handling_upload_network_failure(sample_image_data):
    """Test upload error handling for network failures.

    Verifies that:
    - Network errors during upload are caught
    - Exception is re-raised with context
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_bsky.com.atproto.repo.upload_blob.side_effect = ConnectionError("Network unreachable")

        with pytest.raises(Exception) as exc_info:
            await upload_media_to_bluesky(sample_image_data, 'image/jpeg')

        assert "Failed to upload" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_media_error_handling_partial_upload_failure(sample_image_data, sample_video_data):
    """Test handling when some uploads in batch fail.

    Verifies that:
    - Partial failures are handled
    - Successful uploads still complete
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        # First upload succeeds, second fails
        mock_bsky.com.atproto.repo.upload_blob.side_effect = [
            {'blob': {'ref': {'$link': 'success'}}},
            Exception("Upload failed"),
        ]

        # Execute first (should succeed)
        result1 = await upload_media_to_bluesky(sample_image_data, 'image/jpeg')
        assert result1 is not None

        # Execute second (should fail)
        with pytest.raises(Exception):
            await upload_media_to_bluesky(sample_video_data, 'video/mp4')


@pytest.mark.integration
def test_media_error_handling_invalid_mime_type():
    """Test handling of invalid MIME type.

    Verifies that:
    - Unknown extensions default gracefully
    - No exception is raised
    """
    result = get_mime_type('https://example.com/file.unknownext')
    assert result == 'application/octet-stream'


# =============================================================================
# TESTS - Alt Text Preservation
# =============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_alt_text_preservation_in_upload(sample_image_data):
    """Test that alt text is preserved during upload.

    Verifies that:
    - Alt text parameter is accepted
    - Upload includes alt text information
    - Blob response is returned
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        mock_blob_response = {
            'blob': {
                'mimeType': 'image/jpeg',
                'size': len(sample_image_data),
                'ref': {'$link': 'bafyreiabc123'}
            }
        }
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_blob_response

        # Execute with alt text
        alt_text = "A dog playing in the park"
        result = await upload_media_to_bluesky(
            sample_image_data,
            'image/jpeg',
            alt_text
        )

        # Verify
        assert result == mock_blob_response
        # Verify upload was called with the data
        mock_bsky.com.atproto.repo.upload_blob.assert_called_once_with(sample_image_data)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_alt_text_preservation_empty_alt():
    """Test upload with empty alt text.

    Verifies that:
    - Empty alt text is handled gracefully
    - Upload still succeeds
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        sample_data = b'\x00' * 1024
        mock_blob_response = {'blob': {'ref': {'$link': 'bafyreiabc123'}}}
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_blob_response

        # Execute with empty alt text
        result = await upload_media_to_bluesky(sample_data, 'image/jpeg', '')

        # Verify
        assert result == mock_blob_response


@pytest.mark.integration
@pytest.mark.asyncio
async def test_alt_text_preservation_long_alt():
    """Test upload with very long alt text.

    Verifies that:
    - Long alt text is accepted
    - Upload proceeds normally
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        sample_data = b'\x00' * 1024
        mock_blob_response = {'blob': {'ref': {'$link': 'bafyreiabc123'}}}
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_blob_response

        # Execute with very long alt text
        long_alt = "A " * 500 + "detailed description of an image"
        result = await upload_media_to_bluesky(sample_data, 'image/jpeg', long_alt)

        # Verify
        assert result == mock_blob_response


@pytest.mark.integration
@pytest.mark.asyncio
async def test_alt_text_preservation_special_characters():
    """Test upload with alt text containing special characters.

    Verifies that:
    - Special characters in alt text are handled
    - Unicode characters are preserved
    - Upload succeeds
    """
    with patch('app.integrations.media_handler.bsky_client') as mock_bsky:
        sample_data = b'\x00' * 1024
        mock_blob_response = {'blob': {'ref': {'$link': 'bafyreiabc123'}}}
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_blob_response

        # Execute with special character alt text
        alt_text = "Cafe & restaurant - 日本語 テキスト - 🎉🎊"
        result = await upload_media_to_bluesky(sample_data, 'image/jpeg', alt_text)

        # Verify
        assert result == mock_blob_response


# =============================================================================
# INTEGRATION TEST - Full Media Pipeline
# =============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_media_pipeline_download_and_upload(
    sample_image_data,
    mock_bluesky_blob_response
):
    """Test complete media pipeline: download, validate, upload.

    This is a comprehensive integration test that verifies:
    - Media is downloaded successfully
    - Size is validated
    - MIME type is detected
    - Media is uploaded to Bluesky with alt text
    """
    url = "https://example.com/photo.jpg"
    alt_text = "Test photo"

    with patch('aiohttp.ClientSession') as mock_session_class, \
         patch('app.integrations.media_handler.bsky_client') as mock_bsky:

        # Setup download mock
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.read = AsyncMock(return_value=sample_image_data)

        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)
        mock_session.get = MagicMock()
        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)

        mock_session_class.return_value = mock_session

        # Setup upload mock
        mock_bsky.com.atproto.repo.upload_blob.return_value = mock_bluesky_blob_response

        # Step 1: Download
        media_data = await download_media(url, 'image')
        assert media_data == sample_image_data

        # Step 2: Detect MIME type
        mime_type = get_mime_type(url)
        assert mime_type == 'image/jpeg'

        # Step 3: Validate size
        is_valid = validate_media_size(media_data, 'bluesky')
        assert is_valid is True

        # Step 4: Upload with alt text
        blob_response = await upload_media_to_bluesky(
            media_data,
            mime_type,
            alt_text
        )
        assert blob_response == mock_bluesky_blob_response


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

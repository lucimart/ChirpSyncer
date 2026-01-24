"""
Tests for MastodonConnector.

TDD approach - tests written before implementation.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch, AsyncMock

from app.protocols.base import (
    CanonicalPost,
    ConnectorStatus,
    PlatformCapabilities,
    SyncDirection,
)


class TestMastodonConnectorCapabilities:
    """Test MastodonConnector capabilities."""

    def test_platform_id(self):
        """Test platform ID is 'mastodon'."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        assert connector.platform_id == "mastodon"

    def test_platform_name(self):
        """Test platform name is 'Mastodon'."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        assert connector.platform_name == "Mastodon"

    def test_capabilities(self):
        """Test Mastodon capabilities are correctly defined."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        caps = connector.capabilities

        # Mastodon has 500 char limit by default
        assert caps.max_post_length == 500
        assert caps.supports_threads is True
        assert caps.supports_media is True
        assert caps.supports_video is True
        assert caps.supports_polls is True
        assert caps.can_fetch_posts is True
        assert caps.can_create_posts is True
        assert caps.can_delete_posts is True
        assert caps.can_edit_posts is True  # Mastodon supports editing
        assert caps.can_fetch_metrics is True
        assert caps.supports_hashtags is True
        assert caps.supports_mentions is True

    def test_initial_status_disconnected(self):
        """Test initial status is disconnected."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        assert connector.get_status() == ConnectorStatus.DISCONNECTED


class TestMastodonConnectorConnection:
    """Test MastodonConnector connection methods."""

    def test_connect_requires_instance_url(self):
        """Test connect requires instance_url in credentials."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        result = connector.connect({"access_token": "test_token"})
        assert result is False
        assert connector.get_status() == ConnectorStatus.DISCONNECTED

    def test_connect_requires_access_token(self):
        """Test connect requires access_token in credentials."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        result = connector.connect({"instance_url": "https://mastodon.social"})
        assert result is False
        assert connector.get_status() == ConnectorStatus.DISCONNECTED

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_connect_success(self, mock_mastodon_class):
        """Test successful connection."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "testuser",
            "acct": "testuser",
        }
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        result = connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        assert result is True
        assert connector.get_status() == ConnectorStatus.CONNECTED
        mock_mastodon_class.assert_called_once_with(
            access_token="test_token",
            api_base_url="https://mastodon.social",
        )

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_connect_failure(self, mock_mastodon_class):
        """Test connection failure."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.side_effect = Exception("Auth failed")
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        result = connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "bad_token",
            }
        )

        assert result is False
        assert connector.get_status() == ConnectorStatus.ERROR

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_disconnect(self, mock_mastodon_class):
        """Test disconnect clears client and status."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )
        assert connector.get_status() == ConnectorStatus.CONNECTED

        connector.disconnect()
        assert connector.get_status() == ConnectorStatus.DISCONNECTED

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_validate_credentials_valid(self, mock_mastodon_class):
        """Test validate_credentials with valid credentials."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {"id": "123"}
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        result = connector.validate_credentials(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "valid_token",
            }
        )

        assert result is True

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_validate_credentials_invalid(self, mock_mastodon_class):
        """Test validate_credentials with invalid credentials."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.side_effect = Exception("Invalid")
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        result = connector.validate_credentials(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "invalid_token",
            }
        )

        assert result is False


class TestMastodonConnectorFetchPosts:
    """Test MastodonConnector fetch_posts method."""

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_fetch_posts_returns_canonical_posts(self, mock_mastodon_class):
        """Test fetch_posts returns list of CanonicalPost."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.account_lookup.return_value = {"id": "456"}
        mock_client.account_statuses.return_value = [
            {
                "id": "status_1",
                "created_at": datetime(2024, 1, 15, 10, 30, 0),
                "content": "<p>Hello Mastodon!</p>",
                "account": {
                    "id": "456",
                    "username": "testuser",
                    "acct": "testuser",
                    "display_name": "Test User",
                },
                "favourites_count": 10,
                "reblogs_count": 5,
                "replies_count": 2,
                "media_attachments": [],
                "tags": [{"name": "test"}],
                "mentions": [],
                "in_reply_to_id": None,
                "visibility": "public",
            }
        ]
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        posts = connector.fetch_posts("testuser", count=10)

        assert len(posts) == 1
        assert isinstance(posts[0], CanonicalPost)
        assert posts[0].platform == "mastodon"
        assert posts[0].platform_id == "status_1"
        assert "Hello Mastodon!" in posts[0].content
        assert posts[0].likes_count == 10
        assert posts[0].reposts_count == 5
        assert posts[0].replies_count == 2
        assert "test" in posts[0].hashtags

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_fetch_posts_with_since_id(self, mock_mastodon_class):
        """Test fetch_posts respects since_id parameter."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.account_lookup.return_value = {"id": "456"}
        mock_client.account_statuses.return_value = []
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        connector.fetch_posts("testuser", count=10, since_id="old_status_id")

        mock_client.account_statuses.assert_called_once()
        call_kwargs = mock_client.account_statuses.call_args[1]
        assert call_kwargs.get("since_id") == "old_status_id"

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_fetch_posts_with_media(self, mock_mastodon_class):
        """Test fetch_posts handles media attachments."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.account_lookup.return_value = {"id": "456"}
        mock_client.account_statuses.return_value = [
            {
                "id": "status_1",
                "created_at": datetime(2024, 1, 15, 10, 30, 0),
                "content": "<p>Post with image</p>",
                "account": {
                    "id": "456",
                    "username": "testuser",
                    "acct": "testuser",
                    "display_name": "Test User",
                },
                "favourites_count": 0,
                "reblogs_count": 0,
                "replies_count": 0,
                "media_attachments": [
                    {"type": "image", "url": "https://example.com/image.jpg"},
                    {"type": "video", "url": "https://example.com/video.mp4"},
                ],
                "tags": [],
                "mentions": [],
                "in_reply_to_id": None,
                "visibility": "public",
            }
        ]
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        posts = connector.fetch_posts("testuser", count=10)

        assert len(posts[0].media_urls) == 2
        assert "https://example.com/image.jpg" in posts[0].media_urls
        assert "image" in posts[0].media_types
        assert "video" in posts[0].media_types

    def test_fetch_posts_not_connected(self):
        """Test fetch_posts returns empty list when not connected."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        posts = connector.fetch_posts("testuser", count=10)
        assert posts == []


class TestMastodonConnectorCreatePost:
    """Test MastodonConnector create_post method."""

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_create_post_success(self, mock_mastodon_class):
        """Test create_post returns platform ID on success."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.status_post.return_value = {"id": "new_status_123"}
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        post = CanonicalPost(
            id="local_1",
            platform="mastodon",
            platform_id="",
            content="Test post from ChirpSyncer",
            created_at=datetime.now(),
            author_id="123",
            author_username="testuser",
        )

        result = connector.create_post(post)

        assert result == "new_status_123"
        mock_client.status_post.assert_called_once()

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_create_post_with_media(self, mock_mastodon_class):
        """Test create_post handles media uploads."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.media_post.return_value = {"id": "media_123"}
        mock_client.status_post.return_value = {"id": "new_status_123"}
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        post = CanonicalPost(
            id="local_1",
            platform="mastodon",
            platform_id="",
            content="Post with image",
            created_at=datetime.now(),
            author_id="123",
            author_username="testuser",
            media_urls=["https://example.com/image.jpg"],
            media_types=["image"],
        )

        result = connector.create_post(post)

        assert result == "new_status_123"

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_create_post_as_reply(self, mock_mastodon_class):
        """Test create_post handles reply_to_id."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.status_post.return_value = {"id": "reply_status_123"}
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        post = CanonicalPost(
            id="local_1",
            platform="mastodon",
            platform_id="",
            content="This is a reply",
            created_at=datetime.now(),
            author_id="123",
            author_username="testuser",
            reply_to_id="original_status_456",
        )

        result = connector.create_post(post)

        assert result == "reply_status_123"
        call_kwargs = mock_client.status_post.call_args[1]
        assert call_kwargs.get("in_reply_to_id") == "original_status_456"

    def test_create_post_not_connected(self):
        """Test create_post returns None when not connected."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        post = CanonicalPost(
            id="local_1",
            platform="mastodon",
            platform_id="",
            content="Test",
            created_at=datetime.now(),
            author_id="123",
            author_username="testuser",
        )

        result = connector.create_post(post)
        assert result is None


class TestMastodonConnectorDeletePost:
    """Test MastodonConnector delete_post method."""

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_delete_post_success(self, mock_mastodon_class):
        """Test delete_post returns True on success."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.status_delete.return_value = None
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        result = connector.delete_post("status_to_delete")

        assert result is True
        mock_client.status_delete.assert_called_once_with("status_to_delete")

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_delete_post_failure(self, mock_mastodon_class):
        """Test delete_post returns False on failure."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.status_delete.side_effect = Exception("Not found")
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        result = connector.delete_post("nonexistent_status")

        assert result is False


class TestMastodonConnectorEditPost:
    """Test MastodonConnector edit_post method."""

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_edit_post_success(self, mock_mastodon_class):
        """Test edit_post returns True on success."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.status_update.return_value = {"id": "status_123"}
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        result = connector.edit_post("status_123", "Updated content")

        assert result is True
        mock_client.status_update.assert_called_once_with(
            "status_123", status="Updated content"
        )


class TestMastodonConnectorFetchMetrics:
    """Test MastodonConnector fetch_metrics method."""

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_fetch_metrics_success(self, mock_mastodon_class):
        """Test fetch_metrics returns metrics dict."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.status.return_value = {
            "id": "status_123",
            "favourites_count": 25,
            "reblogs_count": 10,
            "replies_count": 5,
        }
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        metrics = connector.fetch_metrics("status_123")

        assert metrics is not None
        assert metrics["likes"] == 25
        assert metrics["reposts"] == 10
        assert metrics["replies"] == 5


class TestMastodonConnectorContentAdaptation:
    """Test MastodonConnector content adaptation."""

    def test_adapt_content_under_limit(self):
        """Test content under 500 chars is unchanged."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        content = "Short post"
        result = connector.adapt_content(content)
        assert result == content

    def test_adapt_content_over_limit(self):
        """Test content over 500 chars is truncated."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        content = "A" * 600
        result = connector.adapt_content(content)
        assert len(result) == 500
        assert result.endswith("...")

    def test_strip_html_from_content(self):
        """Test HTML tags are stripped from fetched content."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        html_content = "<p>Hello <strong>world</strong>!</p>"
        result = connector._strip_html(html_content)
        assert result == "Hello world!"


class TestMastodonConnectorToCanonical:
    """Test MastodonConnector to_canonical conversion."""

    def test_to_canonical_basic_status(self):
        """Test conversion of basic Mastodon status to CanonicalPost."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        connector._instance_url = "https://mastodon.social"

        mastodon_status = {
            "id": "109876543210",
            "created_at": datetime(2024, 1, 15, 10, 30, 0),
            "content": "<p>Test post</p>",
            "account": {
                "id": "12345",
                "username": "testuser",
                "acct": "testuser",
                "display_name": "Test User",
            },
            "favourites_count": 10,
            "reblogs_count": 5,
            "replies_count": 2,
            "media_attachments": [],
            "tags": [{"name": "mastodon"}, {"name": "test"}],
            "mentions": [{"acct": "otheruser"}],
            "in_reply_to_id": None,
            "visibility": "public",
            "language": "en",
        }

        post = connector.to_canonical(mastodon_status)

        assert isinstance(post, CanonicalPost)
        assert post.platform == "mastodon"
        assert post.platform_id == "109876543210"
        assert post.content == "Test post"
        assert post.author_id == "12345"
        assert post.author_username == "testuser"
        assert post.author_display_name == "Test User"
        assert post.likes_count == 10
        assert post.reposts_count == 5
        assert post.replies_count == 2
        assert "mastodon" in post.hashtags
        assert "test" in post.hashtags
        assert "otheruser" in post.mentions
        assert post.language == "en"

    def test_to_canonical_with_reply(self):
        """Test conversion handles reply_to_id."""
        from app.protocols.connectors.mastodon import MastodonConnector

        connector = MastodonConnector()
        connector._instance_url = "https://mastodon.social"

        mastodon_status = {
            "id": "109876543210",
            "created_at": datetime(2024, 1, 15, 10, 30, 0),
            "content": "<p>Reply post</p>",
            "account": {
                "id": "12345",
                "username": "testuser",
                "acct": "testuser",
                "display_name": "Test User",
            },
            "favourites_count": 0,
            "reblogs_count": 0,
            "replies_count": 0,
            "media_attachments": [],
            "tags": [],
            "mentions": [],
            "in_reply_to_id": "original_post_123",
            "visibility": "public",
        }

        post = connector.to_canonical(mastodon_status)

        assert post.reply_to_id == "original_post_123"


class TestMastodonConnectorInstanceInfo:
    """Test MastodonConnector instance-specific features."""

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_get_instance_info(self, mock_mastodon_class):
        """Test fetching instance information."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.instance.return_value = {
            "uri": "mastodon.social",
            "title": "Mastodon",
            "description": "The original server",
            "configuration": {
                "statuses": {
                    "max_characters": 500,
                }
            },
        }
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://mastodon.social",
                "access_token": "test_token",
            }
        )

        info = connector.get_instance_info()

        assert info is not None
        assert info["uri"] == "mastodon.social"

    @patch("app.protocols.connectors.mastodon.Mastodon")
    def test_custom_instance_char_limit(self, mock_mastodon_class):
        """Test connector respects custom instance character limits."""
        from app.protocols.connectors.mastodon import MastodonConnector

        mock_client = MagicMock()
        mock_client.account_verify_credentials.return_value = {
            "id": "123",
            "username": "test",
        }
        mock_client.instance.return_value = {
            "uri": "custom.instance",
            "configuration": {
                "statuses": {
                    "max_characters": 10000,  # Some instances allow more
                }
            },
        }
        mock_mastodon_class.return_value = mock_client

        connector = MastodonConnector()
        connector.connect(
            {
                "instance_url": "https://custom.instance",
                "access_token": "test_token",
            }
        )

        # After connecting, capabilities should reflect instance limits
        connector._update_capabilities_from_instance()
        assert connector.capabilities.max_post_length == 10000

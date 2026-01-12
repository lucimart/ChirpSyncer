from app.integrations.bluesky_handler import post_to_bluesky, validate_and_truncate_text, fetch_posts_from_bluesky
from unittest.mock import patch


# Tests for validate_and_truncate_text function
def test_validate_text_under_limit_unchanged():
    """Test that text under the limit is returned unchanged."""
    text = "This is a short tweet."
    result = validate_and_truncate_text(text)
    assert result == text
    assert len(result) <= 300


def test_validate_text_at_limit_unchanged():
    """Test that text exactly at 300 characters is returned unchanged."""
    text = "a" * 300
    result = validate_and_truncate_text(text)
    assert result == text
    assert len(result) == 300


def test_validate_text_over_limit_truncated():
    """Test that text over 300 chars is truncated to 297 + '...'."""
    text = "a" * 301
    result = validate_and_truncate_text(text)
    assert len(result) == 300
    assert result.endswith("...")
    assert result == ("a" * 297) + "..."


def test_validate_text_way_over_limit_truncated():
    """Test that very long text (1000 chars) is truncated properly."""
    text = "b" * 1000
    result = validate_and_truncate_text(text)
    assert len(result) == 300
    assert result.endswith("...")
    assert result == ("b" * 297) + "..."


def test_truncation_adds_ellipsis():
    """Test that truncated text always ends with ellipsis."""
    text = "x" * 500
    result = validate_and_truncate_text(text)
    assert result.endswith("...")
    assert len(result) == 300


def test_validate_empty_string():
    """Test that empty string is returned unchanged."""
    text = ""
    result = validate_and_truncate_text(text)
    assert result == ""


def test_validate_unicode_characters():
    """Test that Unicode characters are counted correctly."""
    # Unicode string with emojis and special characters
    text = "Hello 👋 World 🌍! " * 20  # This should exceed 300 chars
    result = validate_and_truncate_text(text)
    assert len(result) <= 300
    if len(text) > 300:
        assert result.endswith("...")


def test_custom_max_length():
    """Test that custom max_length parameter works."""
    text = "a" * 100
    result = validate_and_truncate_text(text, max_length=50)
    assert len(result) == 50
    assert result.endswith("...")
    assert result == ("a" * 47) + "..."


@patch("app.integrations.bluesky_handler.logger")
def test_warning_logged_when_truncating(mock_logger):
    """Test that warning is logged when text is truncated."""
    text = "a" * 400
    result = validate_and_truncate_text(text)
    mock_logger.warning.assert_called_once()
    # Check that the warning message contains the original and truncated lengths
    call_args = mock_logger.warning.call_args[0][0]
    assert "400" in call_args
    assert "300" in call_args
    assert "truncated" in call_args.lower()


@patch("app.integrations.bluesky_handler.logger")
def test_no_warning_when_not_truncating(mock_logger):
    """Test that no warning is logged when text is not truncated."""
    text = "Short text"
    result = validate_and_truncate_text(text)
    mock_logger.warning.assert_not_called()


# Tests for post_to_bluesky with validation
@patch("app.integrations.bluesky_handler.bsky_client.login")
@patch("app.integrations.bluesky_handler.bsky_client.post")
def test_post_to_bluesky(mock_post, mock_login):
    """Test basic posting functionality."""
    # Mock the behavior of login
    mock_login.return_value = None

    # Mock the behavior of the post method
    mock_post.return_value = True

    # Call the function to test
    result = post_to_bluesky("Test Post")
    assert result is None
    mock_post.assert_called_once_with("Test Post")


@patch("app.integrations.bluesky_handler.bsky_client.post")
@patch("app.integrations.bluesky_handler.logger")
def test_post_to_bluesky_validates_length(mock_logger, mock_post):
    """Test that post_to_bluesky validates and truncates long text."""
    long_text = "a" * 400
    expected_text = ("a" * 297) + "..."

    mock_post.return_value = True

    post_to_bluesky(long_text)

    # Verify that the truncated text was posted, not the original
    mock_post.assert_called_once_with(expected_text)

    # Verify warning was logged
    mock_logger.warning.assert_called_once()


@patch("app.integrations.bluesky_handler.bsky_client.post")
@patch("app.integrations.bluesky_handler.logger")
def test_post_to_bluesky_short_text_unchanged(mock_logger, mock_post):
    """Test that short text is posted unchanged."""
    short_text = "Short tweet"

    mock_post.return_value = True

    post_to_bluesky(short_text)

    # Verify that the original text was posted
    mock_post.assert_called_once_with(short_text)

    # Verify no warning was logged (text wasn't truncated)
    mock_logger.warning.assert_not_called()


# Tests for fetch_posts_from_bluesky function (BIDIR-001)
@patch("app.integrations.bluesky_handler.bsky_client")
def test_fetch_posts_from_bluesky_success(mock_client):
    """Test successful fetch returns posts."""
    # Mock the API response
    mock_response = type('obj', (object,), {
        'feed': [
            {
                'post': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123',
                    'record': {
                        'text': 'First post',
                        'createdAt': '2026-01-09T10:00:00Z'
                    },
                    'author': {
                        'handle': 'user.bsky.social'
                    }
                },
                'reason': None  # None = original post
            },
            {
                'post': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/def456',
                    'record': {
                        'text': 'Second post',
                        'createdAt': '2026-01-09T09:00:00Z'
                    },
                    'author': {
                        'handle': 'user.bsky.social'
                    }
                },
                'reason': None
            }
        ]
    })()

    mock_client.app.bsky.feed.get_author_feed.return_value = mock_response

    # Call the function
    posts = fetch_posts_from_bluesky('user.bsky.social', count=10)

    # Verify results
    assert len(posts) == 2
    assert posts[0].text == 'First post'
    assert posts[0].uri == 'at://did:plc:user1/app.bsky.feed.post/abc123'
    assert posts[1].text == 'Second post'
    assert posts[1].uri == 'at://did:plc:user1/app.bsky.feed.post/def456'

    # Verify API was called correctly
    mock_client.app.bsky.feed.get_author_feed.assert_called_once_with(
        actor='user.bsky.social',
        limit=10
    )


@patch("app.integrations.bluesky_handler.bsky_client")
def test_fetch_posts_from_bluesky_empty(mock_client):
    """Test handling of user with no posts."""
    # Mock empty response
    mock_response = type('obj', (object,), {
        'feed': []
    })()

    mock_client.app.bsky.feed.get_author_feed.return_value = mock_response

    # Call the function
    posts = fetch_posts_from_bluesky('user.bsky.social', count=10)

    # Verify empty list is returned
    assert posts == []
    assert len(posts) == 0


@patch("app.integrations.bluesky_handler.bsky_client")
def test_fetch_posts_from_bluesky_filters_reposts(mock_client):
    """Test that reposts and quote posts are filtered out."""
    # Mock response with mix of original posts and reposts
    mock_response = type('obj', (object,), {
        'feed': [
            {
                'post': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123',
                    'record': {
                        'text': 'Original post 1',
                        'createdAt': '2026-01-09T10:00:00Z'
                    },
                    'author': {
                        'handle': 'user.bsky.social'
                    }
                },
                'reason': None  # Original post
            },
            {
                'post': {
                    'uri': 'at://did:plc:other/app.bsky.feed.post/xyz789',
                    'record': {
                        'text': 'Someone elses post',
                        'createdAt': '2026-01-09T09:30:00Z'
                    },
                    'author': {
                        'handle': 'other.bsky.social'
                    }
                },
                'reason': {'$type': 'app.bsky.feed.defs#reasonRepost'}  # Repost
            },
            {
                'post': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/def456',
                    'record': {
                        'text': 'Original post 2',
                        'createdAt': '2026-01-09T09:00:00Z'
                    },
                    'author': {
                        'handle': 'user.bsky.social'
                    }
                },
                'reason': None  # Original post
            }
        ]
    })()

    mock_client.app.bsky.feed.get_author_feed.return_value = mock_response

    # Call the function
    posts = fetch_posts_from_bluesky('user.bsky.social', count=10)

    # Verify only original posts are returned (reposts filtered out)
    assert len(posts) == 2
    assert posts[0].text == 'Original post 1'
    assert posts[1].text == 'Original post 2'
    # Verify no reposted content
    assert not any('Someone elses post' in post.text for post in posts)


@patch("app.integrations.bluesky_handler.bsky_client")
@patch("app.integrations.bluesky_handler.logger")
def test_fetch_posts_from_bluesky_network_error(mock_logger, mock_client):
    """Test retry behavior on network errors."""
    # Mock network error on first 2 calls, then success
    mock_client.app.bsky.feed.get_author_feed.side_effect = [
        Exception("Network error"),
        Exception("Network error"),
        type('obj', (object,), {
            'feed': [
                {
                    'post': {
                        'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123',
                        'record': {
                            'text': 'Post after retry',
                            'createdAt': '2026-01-09T10:00:00Z'
                        },
                        'author': {
                            'handle': 'user.bsky.social'
                        }
                    },
                    'reason': None
                }
            ]
        })()
    ]

    # Call the function - should retry and eventually succeed
    posts = fetch_posts_from_bluesky('user.bsky.social', count=10)

    # Verify it succeeded after retries
    assert len(posts) == 1
    assert posts[0].text == 'Post after retry'

    # Verify API was called 3 times (2 failures + 1 success)
    assert mock_client.app.bsky.feed.get_author_feed.call_count == 3


@patch("app.integrations.bluesky_handler.bsky_client")
def test_fetch_posts_from_bluesky_respects_count_limit(mock_client):
    """Test that function returns maximum 'count' posts."""
    # Mock response with 10 posts
    feed_items = []
    for i in range(10):
        feed_items.append({
            'post': {
                'uri': f'at://did:plc:user1/app.bsky.feed.post/post{i}',
                'record': {
                    'text': f'Post number {i}',
                    'createdAt': f'2026-01-09T{10-i:02d}:00:00Z'
                },
                'author': {
                    'handle': 'user.bsky.social'
                }
            },
            'reason': None
        })

    mock_response = type('obj', (object,), {'feed': feed_items})()
    mock_client.app.bsky.feed.get_author_feed.return_value = mock_response

    # Call with count=5
    posts = fetch_posts_from_bluesky('user.bsky.social', count=5)

    # Verify only 5 posts returned (not all 10)
    assert len(posts) == 5

    # Verify the API was called with limit=5
    mock_client.app.bsky.feed.get_author_feed.assert_called_once_with(
        actor='user.bsky.social',
        limit=5
    )

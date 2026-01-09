"""Tests for Bluesky thread detection and fetching (THREAD-BIDIR-001)."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.bluesky_handler import is_bluesky_thread, fetch_bluesky_thread


# Test 1: Single post (no reply field) is NOT a thread
def test_detect_single_post_not_thread():
    """Test that a single post without reply field is not detected as thread."""
    # Mock a simple post with no reply field
    post = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123',
        'record': {
            'text': 'Just a regular post',
            'createdAt': '2026-01-09T10:00:00Z'
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
        # No 'reply' field = not a thread
    }

    result = is_bluesky_thread(post)
    assert result is False


# Test 2: Reply to self IS a thread
def test_detect_reply_to_self_is_thread():
    """Test that a reply to the same author is detected as thread."""
    # Mock a post that is a reply to the same author
    post = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/def456',
        'record': {
            'text': 'This is a continuation of my previous post',
            'createdAt': '2026-01-09T10:05:00Z',
            'reply': {
                'parent': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123'
                },
                'root': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123'
                }
            }
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    # Mock the parent post (same author)
    mock_parent = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/abc123',
        'author': {
            'did': 'did:plc:user1',  # Same author DID
            'handle': 'user.bsky.social'
        }
    }

    with patch('app.bluesky_handler.bsky_client') as mock_client:
        # Mock the get_post call to return the parent post
        mock_client.app.bsky.feed.get_posts.return_value = type('obj', (object,), {
            'posts': [mock_parent]
        })()

        result = is_bluesky_thread(post)
        assert result is True


# Test 3: Reply to OTHER user is NOT a thread
def test_detect_reply_to_other_not_thread():
    """Test that a reply to a different author is not detected as thread."""
    # Mock a post that is a reply to a different author
    post = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/def456',
        'record': {
            'text': 'Replying to someone else',
            'createdAt': '2026-01-09T10:05:00Z',
            'reply': {
                'parent': {
                    'uri': 'at://did:plc:other/app.bsky.feed.post/xyz789'
                },
                'root': {
                    'uri': 'at://did:plc:other/app.bsky.feed.post/xyz789'
                }
            }
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    # Mock the parent post (different author)
    mock_parent = {
        'uri': 'at://did:plc:other/app.bsky.feed.post/xyz789',
        'author': {
            'did': 'did:plc:other',  # Different author DID
            'handle': 'other.bsky.social'
        }
    }

    with patch('app.bluesky_handler.bsky_client') as mock_client:
        # Mock the get_post call to return the parent post
        mock_client.app.bsky.feed.get_posts.return_value = type('obj', (object,), {
            'posts': [mock_parent]
        })()

        result = is_bluesky_thread(post)
        assert result is False


# Test 4: Fetch thread returns posts in chronological order
@pytest.mark.asyncio
async def test_fetch_bluesky_thread_returns_ordered():
    """Test that fetch_bluesky_thread returns posts in chronological order."""
    post_uri = 'at://did:plc:user1/app.bsky.feed.post/post3'
    username = 'user.bsky.social'

    # Mock a thread with 3 posts (out of order in the response)
    mock_post_3 = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/post3',
        'record': {
            'text': 'Third post in thread',
            'createdAt': '2026-01-09T10:10:00Z',
            'reply': {
                'parent': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/post2'
                },
                'root': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/post1'
                }
            }
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    mock_post_1 = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/post1',
        'record': {
            'text': 'First post in thread',
            'createdAt': '2026-01-09T10:00:00Z'
            # No reply field (root of thread)
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    mock_post_2 = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/post2',
        'record': {
            'text': 'Second post in thread',
            'createdAt': '2026-01-09T10:05:00Z',
            'reply': {
                'parent': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/post1'
                },
                'root': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/post1'
                }
            }
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    with patch('app.bluesky_handler.bsky_client') as mock_client:
        # Mock get_posts to return different posts based on URIs
        def mock_get_posts(uris):
            posts = []
            for uri in uris:
                if 'post1' in uri:
                    posts.append(mock_post_1)
                elif 'post2' in uri:
                    posts.append(mock_post_2)
                elif 'post3' in uri:
                    posts.append(mock_post_3)
            return type('obj', (object,), {'posts': posts})()

        mock_client.app.bsky.feed.get_posts.side_effect = mock_get_posts

        # Mock get_author_feed to return posts from the user
        mock_client.app.bsky.feed.get_author_feed.return_value = type('obj', (object,), {
            'feed': [
                {'post': mock_post_3, 'reason': None},
                {'post': mock_post_2, 'reason': None},
                {'post': mock_post_1, 'reason': None}
            ]
        })()

        # Call the function
        result = await fetch_bluesky_thread(post_uri, username)

        # Verify posts are in chronological order
        assert len(result) == 3
        assert result[0]['record']['text'] == 'First post in thread'
        assert result[1]['record']['text'] == 'Second post in thread'
        assert result[2]['record']['text'] == 'Third post in thread'

        # Verify timestamps are in ascending order
        assert result[0]['record']['createdAt'] < result[1]['record']['createdAt']
        assert result[1]['record']['createdAt'] < result[2]['record']['createdAt']


# Test 5: Handle deleted posts in thread chain
@pytest.mark.asyncio
async def test_fetch_thread_handles_deleted_posts():
    """Test that fetch_bluesky_thread handles deleted posts gracefully."""
    post_uri = 'at://did:plc:user1/app.bsky.feed.post/post3'
    username = 'user.bsky.social'

    # Mock a thread where the middle post (post2) is deleted
    mock_post_3 = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/post3',
        'record': {
            'text': 'Third post in thread',
            'createdAt': '2026-01-09T10:10:00Z',
            'reply': {
                'parent': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/post2'  # Deleted
                },
                'root': {
                    'uri': 'at://did:plc:user1/app.bsky.feed.post/post1'
                }
            }
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    mock_post_1 = {
        'uri': 'at://did:plc:user1/app.bsky.feed.post/post1',
        'record': {
            'text': 'First post in thread',
            'createdAt': '2026-01-09T10:00:00Z'
        },
        'author': {
            'did': 'did:plc:user1',
            'handle': 'user.bsky.social'
        }
    }

    with patch('app.bluesky_handler.bsky_client') as mock_client:
        # Mock get_posts - post2 is deleted (not returned)
        def mock_get_posts(uris):
            posts = []
            for uri in uris:
                if 'post1' in uri:
                    posts.append(mock_post_1)
                elif 'post3' in uri:
                    posts.append(mock_post_3)
                # post2 is not returned (deleted)
            return type('obj', (object,), {'posts': posts})()

        mock_client.app.bsky.feed.get_posts.side_effect = mock_get_posts

        # Mock get_author_feed to return only existing posts
        mock_client.app.bsky.feed.get_author_feed.return_value = type('obj', (object,), {
            'feed': [
                {'post': mock_post_3, 'reason': None},
                {'post': mock_post_1, 'reason': None}
                # post2 is missing (deleted)
            ]
        })()

        # Call the function - should not crash on deleted post
        result = await fetch_bluesky_thread(post_uri, username)

        # Verify function handles deleted posts gracefully
        assert len(result) == 2  # Only 2 posts (deleted one missing)
        assert result[0]['record']['text'] == 'First post in thread'
        assert result[1]['record']['text'] == 'Third post in thread'

        # Verify thread is still in chronological order
        assert result[0]['record']['createdAt'] < result[1]['record']['createdAt']

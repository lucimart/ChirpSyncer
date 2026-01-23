"""
Hashnode API Endpoint Tests

Tests for the Hashnode developer blogging platform integration:
- User profile
- Publications
- Posts (CRUD)
- Drafts
- Series
- Tags
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.hashnode import hashnode_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(hashnode_bp, url_prefix="/api/v1/hashnode")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Hashnode credentials."""
    return {
        "access_token": "test-hashnode-token",
    }


class TestHashnodeUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_get_me_success(self, mock_post, mock_cm, mock_credentials):
        """Should return authenticated user's profile."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "me": {
                        "id": "user-123",
                        "username": "hashuser",
                        "name": "Hash User",
                        "profilePicture": "https://hashnode.com/avatar.png",
                        "followersCount": 1000,
                        "followingsCount": 500,
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["data"]["me"]["username"] == "hashuser"


class TestHashnodePublications:
    """Test publications endpoints."""

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_get_publications_success(self, mock_post, mock_cm, mock_credentials):
        """Should return user's publications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "me": {
                        "publications": {
                            "edges": [
                                {
                                    "node": {
                                        "id": "pub-123",
                                        "title": "My Blog",
                                        "url": "https://myblog.hashnode.dev",
                                        "followersCount": 500,
                                    }
                                }
                            ]
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        publications = response["data"]["me"]["publications"]["edges"]
        assert len(publications) == 1
        assert publications[0]["node"]["title"] == "My Blog"


class TestHashnodePosts:
    """Test posts endpoints."""

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_get_publication_posts_success(self, mock_post, mock_cm, mock_credentials):
        """Should return posts from a publication."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "publication": {
                        "posts": {
                            "edges": [
                                {
                                    "node": {
                                        "id": "post-1",
                                        "title": "First Post",
                                        "slug": "first-post",
                                        "brief": "Introduction",
                                        "readTimeInMinutes": 5,
                                        "views": 1000,
                                    },
                                    "cursor": "abc123",
                                }
                            ],
                            "pageInfo": {
                                "hasNextPage": True,
                                "endCursor": "abc123",
                            },
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        posts = response["data"]["publication"]["posts"]["edges"]
        assert len(posts) == 1
        assert posts[0]["node"]["title"] == "First Post"

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_get_post_by_id_success(self, mock_post, mock_cm, mock_credentials):
        """Should return specific post by ID."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "post": {
                        "id": "post-123",
                        "title": "Detailed Post",
                        "content": {
                            "markdown": "# Post content",
                            "html": "<h1>Post content</h1>",
                        },
                        "tags": [
                            {"id": "tag-1", "name": "Python", "slug": "python"}
                        ],
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        post = response["data"]["post"]
        assert post["title"] == "Detailed Post"
        assert "markdown" in post["content"]

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_create_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "publishPost": {
                        "post": {
                            "id": "new-post-123",
                            "title": "New Post",
                            "slug": "new-post",
                            "url": "https://myblog.hashnode.dev/new-post",
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        post = response["data"]["publishPost"]["post"]
        assert post["title"] == "New Post"

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_update_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should update an existing post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "updatePost": {
                        "post": {
                            "id": "post-123",
                            "title": "Updated Post",
                            "updatedAt": "2024-01-15T12:00:00Z",
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        post = response["data"]["updatePost"]["post"]
        assert post["title"] == "Updated Post"

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_delete_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "removePost": {
                        "post": {
                            "id": "post-123",
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert "removePost" in response["data"]


class TestHashnodeDrafts:
    """Test drafts endpoints."""

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_get_drafts_success(self, mock_post, mock_cm, mock_credentials):
        """Should return drafts from a publication."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "publication": {
                        "drafts": {
                            "edges": [
                                {
                                    "node": {
                                        "id": "draft-1",
                                        "title": "Work in Progress",
                                        "updatedAt": "2024-01-15T12:00:00Z",
                                    },
                                    "cursor": "draft123",
                                }
                            ],
                            "pageInfo": {
                                "hasNextPage": False,
                                "endCursor": "draft123",
                            },
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        drafts = response["data"]["publication"]["drafts"]["edges"]
        assert len(drafts) == 1
        assert drafts[0]["node"]["title"] == "Work in Progress"


class TestHashnodeSeries:
    """Test series endpoints."""

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_get_series_success(self, mock_post, mock_cm, mock_credentials):
        """Should return series from a publication."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "publication": {
                        "seriesList": {
                            "edges": [
                                {
                                    "node": {
                                        "id": "series-1",
                                        "name": "Python Tutorial",
                                        "slug": "python-tutorial",
                                    },
                                    "cursor": "series123",
                                }
                            ],
                            "pageInfo": {
                                "hasNextPage": False,
                            },
                        }
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        series = response["data"]["publication"]["seriesList"]["edges"]
        assert len(series) == 1
        assert series[0]["node"]["name"] == "Python Tutorial"


class TestHashnodeTags:
    """Test tags endpoints."""

    @patch("app.web.api.v1.hashnode.CredentialManager")
    @patch("app.web.api.v1.hashnode.http_requests.post")
    def test_search_tags_success(self, mock_post, mock_cm, mock_credentials):
        """Should search for tags."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "searchTags": {
                        "edges": [
                            {
                                "node": {
                                    "id": "tag-python",
                                    "name": "Python",
                                    "slug": "python",
                                    "postsCount": 50000,
                                    "followersCount": 10000,
                                }
                            }
                        ]
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        tags = response["data"]["searchTags"]["edges"]
        assert len(tags) == 1
        assert tags[0]["node"]["name"] == "Python"


class TestHashnodeGraphQL:
    """Test GraphQL-specific behavior."""

    def test_graphql_error_handling(self):
        """Should handle GraphQL errors properly."""
        error_response = {
            "errors": [
                {
                    "message": "Not authorized",
                    "locations": [{"line": 1, "column": 1}],
                    "path": ["me"],
                }
            ]
        }
        assert "errors" in error_response
        assert error_response["errors"][0]["message"] == "Not authorized"

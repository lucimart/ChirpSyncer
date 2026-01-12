"""
Search API E2E Tests (Sprint 9 - TASK-901, TASK-902)

Tests the /api/search endpoint with authentication and filter validation.
Uses Flask test client for API-level testing (no browser required).
"""

import pytest
import time
import sqlite3

# Skip marker for E2E tests
pytestmark = pytest.mark.e2e


class TestSearchApiE2E:
    """E2E tests for search API endpoint."""

    @pytest.fixture
    def client(self, flask_app):
        """Create test client from flask app."""
        return flask_app.test_client()

    @pytest.fixture
    def authenticated_client(self, client, test_user):
        """Create authenticated session for API tests."""
        # Login to get session
        response = client.post('/login', data={
            'username': test_user['username'],
            'password': test_user['password']
        }, follow_redirects=True)
        assert response.status_code == 200
        return client

    def test_search_requires_authentication(self, client):
        """Test: /api/search redirects unauthenticated users."""
        response = client.get('/api/search?q=test')
        assert response.status_code == 302  # Redirect to login

    def test_search_missing_query_returns_error(self, authenticated_client):
        """Test: /api/search returns 400 when query is missing."""
        response = authenticated_client.get('/api/search')
        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False
        assert 'required' in data['error'].lower()

    def test_search_empty_query_returns_error(self, authenticated_client):
        """Test: /api/search returns 400 for empty query."""
        response = authenticated_client.get('/api/search?q=')
        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False

    def test_search_basic_query_success(self, authenticated_client):
        """Test: /api/search returns success with valid query."""
        response = authenticated_client.get('/api/search?q=test')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['query'] == 'test'
        assert 'results' in data
        assert 'count' in data

    def test_search_with_has_media_filter(self, authenticated_client):
        """Test: /api/search accepts has_media filter."""
        response = authenticated_client.get('/api/search?q=test&has_media=true')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['filters']['has_media'] is True

    def test_search_with_min_likes_filter(self, authenticated_client):
        """Test: /api/search accepts min_likes filter."""
        response = authenticated_client.get('/api/search?q=test&min_likes=50')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['filters']['min_likes'] == 50

    def test_search_with_min_retweets_filter(self, authenticated_client):
        """Test: /api/search accepts min_retweets filter."""
        response = authenticated_client.get('/api/search?q=test&min_retweets=25')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['filters']['min_retweets'] == 25

    def test_search_with_author_filter(self, authenticated_client):
        """Test: /api/search accepts author filter."""
        response = authenticated_client.get('/api/search?q=test&author=testuser')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['filters']['author'] == 'testuser'

    def test_search_with_hashtags_filter(self, authenticated_client):
        """Test: /api/search accepts hashtags filter."""
        response = authenticated_client.get('/api/search?q=test&hashtags=python,flask')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert 'python' in data['filters']['hashtags']
        assert 'flask' in data['filters']['hashtags']

    def test_search_with_date_range_filters(self, authenticated_client):
        """Test: /api/search accepts date_from and date_to filters."""
        now = int(time.time())
        yesterday = now - 86400

        response = authenticated_client.get(
            f'/api/search?q=test&date_from={yesterday}&date_to={now}'
        )
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['filters']['date_from'] == yesterday
        assert data['filters']['date_to'] == now

    def test_search_with_all_filters_combined(self, authenticated_client):
        """Test: /api/search accepts all filters combined."""
        now = int(time.time())

        response = authenticated_client.get(
            f'/api/search?q=test&has_media=true&min_likes=10&min_retweets=5'
            f'&author=testuser&hashtags=python&date_from={now - 86400}&date_to={now}'
        )
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['filters']['has_media'] is True
        assert data['filters']['min_likes'] == 10
        assert data['filters']['min_retweets'] == 5
        assert data['filters']['author'] == 'testuser'

    def test_search_invalid_date_from_returns_error(self, authenticated_client):
        """Test: /api/search returns 400 for invalid date_from."""
        response = authenticated_client.get('/api/search?q=test&date_from=invalid')
        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False
        assert 'date_from' in data['error']

    def test_search_invalid_date_to_returns_error(self, authenticated_client):
        """Test: /api/search returns 400 for invalid date_to."""
        response = authenticated_client.get('/api/search?q=test&date_to=notanumber')
        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False
        assert 'date_to' in data['error']

    def test_search_invalid_min_likes_returns_error(self, authenticated_client):
        """Test: /api/search returns 400 for invalid min_likes."""
        response = authenticated_client.get('/api/search?q=test&min_likes=abc')
        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False
        assert 'min_likes' in data['error']

    def test_search_invalid_min_retweets_returns_error(self, authenticated_client):
        """Test: /api/search returns 400 for invalid min_retweets."""
        response = authenticated_client.get('/api/search?q=test&min_retweets=xyz')
        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False
        assert 'min_retweets' in data['error']

    def test_search_limit_caps_at_100(self, authenticated_client):
        """Test: /api/search caps limit at 100."""
        response = authenticated_client.get('/api/search?q=test&limit=200')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        # Count should be capped (limit applied)
        assert data['count'] <= 100

    def test_search_default_limit(self, authenticated_client):
        """Test: /api/search uses default limit of 50."""
        response = authenticated_client.get('/api/search?q=test')
        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        # Results should be within default limit
        assert data['count'] <= 50

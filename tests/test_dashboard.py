"""
Tests for the monitoring dashboard (MONITORING-001).

Following TDD approach - tests written before implementation.
"""

import pytest
import json
import sqlite3
import os
import tempfile
import time
from unittest.mock import patch, MagicMock


@pytest.fixture
def test_db():
    """Create a temporary test database with sample data."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)

    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Create synced_posts table
    cursor.execute("""
    CREATE TABLE synced_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twitter_id TEXT,
        bluesky_uri TEXT,
        source TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,
        synced_to TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        original_text TEXT NOT NULL
    )
    """)

    # Create sync_stats table
    cursor.execute("""
    CREATE TABLE sync_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        success INTEGER NOT NULL,
        media_count INTEGER DEFAULT 0,
        is_thread INTEGER DEFAULT 0,
        error_type TEXT,
        error_message TEXT,
        duration_ms INTEGER
    )
    """)

    # Insert sample synced posts
    now = int(time.time())
    for i in range(25):
        cursor.execute("""
        INSERT INTO synced_posts (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime(?, 'unixepoch'))
        """, (
            f"tweet_{i}",
            f"at://did/app.bsky.feed.post/{i}",
            "twitter" if i % 2 == 0 else "bluesky",
            f"hash_{i}",
            "bluesky" if i % 2 == 0 else "twitter",
            f"Test post content {i}",
            now - (i * 300)  # 5 minutes apart
        ))

    # Insert sample sync stats
    for i in range(50):
        cursor.execute("""
        INSERT INTO sync_stats (timestamp, source, target, success, media_count, is_thread, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            now - (i * 600),  # 10 minutes apart
            "twitter" if i % 3 == 0 else "bluesky",
            "bluesky" if i % 3 == 0 else "twitter",
            1 if i % 5 != 0 else 0,  # 80% success rate
            i % 3,  # 0-2 media items
            1 if i % 10 == 0 else 0,  # 10% threads
            100 + (i * 10)
        ))

    # Insert some errors
    cursor.execute("""
    INSERT INTO sync_stats (timestamp, source, target, success, error_type, error_message)
    VALUES (?, ?, ?, 0, ?, ?)
    """, (now - 300, "twitter", "bluesky", "APIError", "Rate limit exceeded"))

    cursor.execute("""
    INSERT INTO sync_stats (timestamp, source, target, success, error_type, error_message)
    VALUES (?, ?, ?, 0, ?, ?)
    """, (now - 600, "bluesky", "twitter", "NetworkError", "Connection timeout"))

    conn.commit()
    conn.close()

    yield path

    # Cleanup
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def app(test_db):
    """Create Flask test app with test database."""
    # Import here to avoid import errors before dashboard is created
    from app.dashboard import create_app

    app = create_app(db_path=test_db)
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create Flask test client."""
    return app.test_client()


class TestDashboardApp:
    """Test Flask application creation and configuration."""

    def test_app_creation(self, app):
        """Test that Flask app is created successfully."""
        assert app is not None
        assert app.config['TESTING'] is True

    def test_app_has_required_routes(self, app):
        """Test that all required routes are registered."""
        routes = [rule.rule for rule in app.url_map.iter_rules()]

        assert '/' in routes
        assert '/api/stats' in routes
        assert '/api/recent' in routes
        assert '/api/errors' in routes
        assert '/api/status' in routes


class TestDashboardRoutes:
    """Test dashboard HTTP routes."""

    def test_main_dashboard_returns_200(self, client):
        """Test that main dashboard route returns 200 OK."""
        response = client.get('/')
        assert response.status_code == 200

    def test_main_dashboard_returns_html(self, client):
        """Test that main dashboard returns HTML content."""
        response = client.get('/')
        assert response.content_type.startswith('text/html')
        assert b'ChirpSyncer' in response.data or b'Dashboard' in response.data

    def test_api_stats_returns_200(self, client):
        """Test that /api/stats returns 200 OK."""
        response = client.get('/api/stats')
        assert response.status_code == 200

    def test_api_stats_returns_json(self, client):
        """Test that /api/stats returns valid JSON."""
        response = client.get('/api/stats')
        assert response.content_type == 'application/json'

        data = json.loads(response.data)
        assert isinstance(data, dict)

    def test_api_recent_returns_200(self, client):
        """Test that /api/recent returns 200 OK."""
        response = client.get('/api/recent')
        assert response.status_code == 200

    def test_api_recent_returns_json(self, client):
        """Test that /api/recent returns valid JSON."""
        response = client.get('/api/recent')
        assert response.content_type == 'application/json'

        data = json.loads(response.data)
        assert isinstance(data, list)

    def test_api_errors_returns_200(self, client):
        """Test that /api/errors returns 200 OK."""
        response = client.get('/api/errors')
        assert response.status_code == 200

    def test_api_errors_returns_json(self, client):
        """Test that /api/errors returns valid JSON."""
        response = client.get('/api/errors')
        assert response.content_type == 'application/json'

        data = json.loads(response.data)
        assert isinstance(data, list)

    def test_api_status_returns_200(self, client):
        """Test that /api/status returns 200 OK."""
        response = client.get('/api/status')
        assert response.status_code == 200

    def test_api_status_returns_json(self, client):
        """Test that /api/status returns valid JSON."""
        response = client.get('/api/status')
        assert response.content_type == 'application/json'

        data = json.loads(response.data)
        assert isinstance(data, dict)


class TestAPIDataFormat:
    """Test API endpoint data formats and content."""

    def test_stats_api_data_format(self, client):
        """Test that /api/stats returns correct data structure."""
        response = client.get('/api/stats')
        data = json.loads(response.data)

        # Check required fields exist
        assert 'total_syncs' in data
        assert 'syncs_today' in data
        assert 'success_rate_24h' in data
        assert 'active_errors' in data
        assert 'stats_24h' in data

        # Check data types
        assert isinstance(data['total_syncs'], int)
        assert isinstance(data['syncs_today'], int)
        assert isinstance(data['success_rate_24h'], (int, float))
        assert isinstance(data['active_errors'], int)
        assert isinstance(data['stats_24h'], dict)

    def test_recent_api_data_format(self, client):
        """Test that /api/recent returns correct data structure."""
        response = client.get('/api/recent')
        data = json.loads(response.data)

        assert isinstance(data, list)

        if len(data) > 0:
            item = data[0]
            assert 'id' in item
            assert 'source' in item
            assert 'synced_to' in item
            assert 'content' in item
            assert 'synced_at' in item

    def test_recent_api_limit(self, client):
        """Test that /api/recent respects limit parameter."""
        response = client.get('/api/recent?limit=5')
        data = json.loads(response.data)

        assert len(data) <= 5

    def test_errors_api_data_format(self, client):
        """Test that /api/errors returns correct data structure."""
        response = client.get('/api/errors')
        data = json.loads(response.data)

        assert isinstance(data, list)

        if len(data) > 0:
            error = data[0]
            assert 'timestamp' in error
            assert 'source' in error
            assert 'target' in error
            assert 'error_type' in error
            assert 'error_message' in error

    def test_status_api_data_format(self, client):
        """Test that /api/status returns correct data structure."""
        response = client.get('/api/status')
        data = json.loads(response.data)

        # Check required fields
        assert 'uptime' in data
        assert 'db_size' in data
        assert 'total_posts' in data

        # Check data types
        assert isinstance(data['uptime'], str)
        assert isinstance(data['db_size'], str)
        assert isinstance(data['total_posts'], int)


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_stats_with_missing_tables(self, test_db):
        """Test that stats API handles missing database tables gracefully."""
        # Create app with empty database (no tables)
        fd, empty_db = tempfile.mkstemp(suffix='.db')
        os.close(fd)

        try:
            from app.dashboard import create_app
            app = create_app(db_path=empty_db)
            client = app.test_client()

            response = client.get('/api/stats')

            # Should still return 200 with empty/zero values
            assert response.status_code == 200
            data = json.loads(response.data)
            assert isinstance(data, dict)
        finally:
            if os.path.exists(empty_db):
                os.unlink(empty_db)

    def test_recent_with_no_data(self, test_db):
        """Test that recent API handles empty table gracefully."""
        # Delete all data from synced_posts
        conn = sqlite3.connect(test_db)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM synced_posts")
        conn.commit()
        conn.close()

        from app.dashboard import create_app
        app = create_app(db_path=test_db)
        client = app.test_client()

        response = client.get('/api/recent')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) == 0

    def test_errors_with_no_errors(self, test_db):
        """Test that errors API handles no errors gracefully."""
        # Delete all errors
        conn = sqlite3.connect(test_db)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sync_stats WHERE error_type IS NOT NULL")
        conn.commit()
        conn.close()

        from app.dashboard import create_app
        app = create_app(db_path=test_db)
        client = app.test_client()

        response = client.get('/api/errors')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) == 0


class TestHelperFunctions:
    """Test helper functions in db_handler."""

    def test_get_recent_syncs(self, test_db):
        """Test get_recent_syncs helper function."""
        from app.db_handler import get_recent_syncs

        syncs = get_recent_syncs(limit=10, db_path=test_db)

        assert isinstance(syncs, list)
        assert len(syncs) <= 10

        if len(syncs) > 0:
            sync = syncs[0]
            assert isinstance(sync, dict)
            assert 'id' in sync
            assert 'source' in sync
            assert 'synced_to' in sync

    def test_get_recent_syncs_default_limit(self, test_db):
        """Test get_recent_syncs with default limit."""
        from app.db_handler import get_recent_syncs

        syncs = get_recent_syncs(db_path=test_db)

        assert isinstance(syncs, list)
        assert len(syncs) <= 50  # Default limit

    def test_get_system_stats(self, test_db):
        """Test get_system_stats helper function."""
        from app.db_handler import get_system_stats

        stats = get_system_stats(db_path=test_db)

        assert isinstance(stats, dict)
        assert 'db_size' in stats
        assert 'total_posts' in stats

        assert isinstance(stats['db_size'], str)
        assert isinstance(stats['total_posts'], int)

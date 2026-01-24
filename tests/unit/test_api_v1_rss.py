"""Unit tests for RSS API endpoints."""

import json
from unittest.mock import Mock, patch

import pytest
from flask import Flask

from app.web.api.v1.rss import rss_bp


RSS_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test feed</description>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article1</link>
      <description>Article description</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <guid>https://example.com/article1</guid>
    </item>
  </channel>
</rss>"""

ATOM_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com" rel="alternate"/>
  <subtitle>An Atom test feed</subtitle>
  <updated>2024-01-01T00:00:00Z</updated>
  <entry>
    <title>Atom Article</title>
    <link href="https://example.com/atom1" rel="alternate"/>
    <id>https://example.com/atom1</id>
    <published>2024-01-01T00:00:00Z</published>
    <summary>Atom article summary</summary>
  </entry>
</feed>"""

OPML_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>My Feeds</title>
    <dateCreated>Mon, 01 Jan 2024 00:00:00 GMT</dateCreated>
    <ownerName>Test User</ownerName>
  </head>
  <body>
    <outline text="Tech" title="Tech">
      <outline type="rss" text="Tech Blog" title="Tech Blog"
               xmlUrl="https://example.com/feed.xml"
               htmlUrl="https://example.com"/>
    </outline>
    <outline type="rss" text="News" title="News"
             xmlUrl="https://news.example.com/rss"/>
  </body>
</opml>"""


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(rss_bp, url_prefix="/api/v1/rss")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestRSSAPI:
    """Tests for RSS API endpoints."""

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_parse_rss_feed(self, mock_get, client):
        """Test parsing RSS feed."""
        mock_get.return_value = Mock(ok=True, text=RSS_SAMPLE)

        response = client.post(
            "/api/v1/rss/parse",
            json={"url": "https://example.com/feed.xml"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["type"] == "rss"
        assert data["data"]["title"] == "Test Feed"
        assert len(data["data"]["entries"]) == 1
        assert data["data"]["entries"][0]["title"] == "Test Article"

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_parse_atom_feed(self, mock_get, client):
        """Test parsing Atom feed."""
        mock_get.return_value = Mock(ok=True, text=ATOM_SAMPLE)

        response = client.post(
            "/api/v1/rss/parse",
            json={"url": "https://example.com/atom.xml"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["type"] == "atom"
        assert data["data"]["title"] == "Test Atom Feed"
        assert len(data["data"]["entries"]) == 1

    def test_parse_feed_no_url(self, client):
        """Test parse feed without URL."""
        response = client.post("/api/v1/rss/parse", json={})
        assert response.status_code == 400

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_parse_feed_invalid_xml(self, mock_get, client):
        """Test parsing invalid XML."""
        mock_get.return_value = Mock(ok=True, text="not valid xml")

        response = client.post(
            "/api/v1/rss/parse",
            json={"url": "https://example.com/bad.xml"},
        )

        assert response.status_code == 400

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_discover_feeds(self, mock_get, client):
        """Test feed discovery from HTML page."""
        html_content = """<!DOCTYPE html>
        <html>
        <head>
            <link rel="alternate" type="application/rss+xml"
                  href="/feed.xml" title="RSS Feed">
            <link rel="alternate" type="application/atom+xml"
                  href="/atom.xml" title="Atom Feed">
        </head>
        <body></body>
        </html>"""

        mock_get.return_value = Mock(ok=True, text=html_content)

        response = client.post(
            "/api/v1/rss/discover",
            json={"url": "https://example.com"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["feeds"]) == 2
        assert data["data"]["feeds"][0]["type"] == "rss"
        assert data["data"]["feeds"][1]["type"] == "atom"

    def test_discover_feeds_no_url(self, client):
        """Test discover without URL."""
        response = client.post("/api/v1/rss/discover", json={})
        assert response.status_code == 400

    def test_parse_opml(self, client):
        """Test OPML parsing."""
        response = client.post(
            "/api/v1/rss/opml/parse",
            json={"content": OPML_SAMPLE},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["total"] == 2
        assert len(data["data"]["feeds"]) == 2
        assert data["data"]["metadata"]["title"] == "My Feeds"
        assert data["data"]["metadata"]["owner_name"] == "Test User"

    def test_parse_opml_no_content(self, client):
        """Test OPML parsing without content."""
        response = client.post("/api/v1/rss/opml/parse", json={})
        assert response.status_code == 400

    def test_export_opml(self, client):
        """Test OPML export."""
        feeds = [
            {"url": "https://example.com/feed.xml", "title": "Example Feed"},
            {
                "url": "https://news.com/rss",
                "title": "News Feed",
                "folder": "News",
            },
        ]

        response = client.post(
            "/api/v1/rss/opml/export",
            json={
                "feeds": feeds,
                "title": "My Exported Feeds",
                "owner_name": "Test User",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["feed_count"] == 2
        assert "<?xml" in data["data"]["opml"]
        assert "My Exported Feeds" in data["data"]["opml"]

    def test_export_opml_no_feeds(self, client):
        """Test OPML export without feeds."""
        response = client.post("/api/v1/rss/opml/export", json={"feeds": []})
        assert response.status_code == 400

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_validate_feed(self, mock_get, client):
        """Test feed validation."""
        mock_get.return_value = Mock(ok=True, text=RSS_SAMPLE)

        response = client.post(
            "/api/v1/rss/validate",
            json={"url": "https://example.com/feed.xml"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["valid"] is True
        assert data["data"]["type"] == "rss"
        assert data["data"]["title"] == "Test Feed"
        assert data["data"]["entry_count"] == 1

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_validate_feed_invalid(self, mock_get, client):
        """Test validating invalid feed."""
        mock_get.return_value = Mock(ok=True, text="<html><body>Not a feed</body></html>")

        response = client.post(
            "/api/v1/rss/validate",
            json={"url": "https://example.com/page.html"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["valid"] is False
        assert len(data["data"]["errors"]) > 0

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_validate_feed_http_error(self, mock_get, client):
        """Test validating feed with HTTP error."""
        mock_get.return_value = Mock(ok=False, status_code=404)

        response = client.post(
            "/api/v1/rss/validate",
            json={"url": "https://example.com/missing.xml"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["valid"] is False

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_get_feed_hash(self, mock_get, client):
        """Test getting feed hash."""
        mock_get.return_value = Mock(
            ok=True,
            content=RSS_SAMPLE.encode(),
            headers={
                "ETag": '"abc123"',
                "Last-Modified": "Mon, 01 Jan 2024 00:00:00 GMT",
            },
        )

        response = client.post(
            "/api/v1/rss/hash",
            json={"url": "https://example.com/feed.xml"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "content_hash" in data["data"]
        assert len(data["data"]["content_hash"]) == 64  # SHA256 hex
        assert data["data"]["etag"] == '"abc123"'

    def test_get_feed_hash_no_url(self, client):
        """Test hash endpoint without URL."""
        response = client.post("/api/v1/rss/hash", json={})
        assert response.status_code == 400

    @patch("app.web.api.v1.rss.http_requests.get")
    def test_parse_rss_with_enclosures(self, mock_get, client):
        """Test parsing RSS with media enclosures."""
        rss_with_enclosure = """<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Podcast Feed</title>
            <link>https://podcast.example.com</link>
            <description>A podcast</description>
            <item>
              <title>Episode 1</title>
              <link>https://podcast.example.com/ep1</link>
              <enclosure url="https://podcast.example.com/ep1.mp3"
                         type="audio/mpeg" length="12345678"/>
            </item>
          </channel>
        </rss>"""

        mock_get.return_value = Mock(ok=True, text=rss_with_enclosure)

        response = client.post(
            "/api/v1/rss/parse",
            json={"url": "https://podcast.example.com/feed.xml"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["entries"][0]["enclosures"]) == 1
        assert data["data"]["entries"][0]["enclosures"][0]["type"] == "audio/mpeg"

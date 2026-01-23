"""
Tests for Unified Inbox feature (TDD approach)
"""
import pytest
import time


class TestInboxAPI:
    """Tests for /api/v1/inbox endpoints"""

    def test_get_messages_empty(self, client, auth_headers):
        """Test getting messages when inbox is empty"""
        response = client.get("/api/v1/inbox", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["messages"] == []
        assert data["data"]["total"] == 0

    def test_get_messages_returns_messages(self, client, auth_headers, test_db_path):
        """Test getting messages returns existing messages"""
        # Insert test message directly into DB
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        # Create a test message
        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-1", 1, "twitter", "mention", "@testuser", "Test User", "Hello world", int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        response = client.get("/api/v1/inbox", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["total"] >= 1
        assert len(data["messages"]) >= 1

    def test_get_messages_filtered_by_platform(self, client, auth_headers, test_db_path):
        """Test filtering messages by platform"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        # Create messages for different platforms
        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-tw", 1, "twitter", "mention", "@user1", "User 1", "Twitter msg", int(time.time()), int(time.time())))
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-bs", 1, "bluesky", "reply", "@user2", "User 2", "Bluesky msg", int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        response = client.get("/api/v1/inbox?platform=twitter", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        for msg in data["messages"]:
            assert msg["platform"] == "twitter"

    def test_get_messages_filtered_by_unread(self, client, auth_headers, test_db_path):
        """Test filtering messages by unread status"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        # Create read message
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-read", 1, "twitter", "mention", "@user1", "User 1", "Read msg", 1, int(time.time()), int(time.time())))
        # Create unread message
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-unread", 1, "twitter", "mention", "@user2", "User 2", "Unread msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        response = client.get("/api/v1/inbox?unread=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        for msg in data["messages"]:
            assert msg["is_read"] is False

    def test_mark_as_read(self, client, auth_headers, test_db_path):
        """Test marking a message as read"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-to-read", 1, "twitter", "mention", "@user1", "User 1", "Unread msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        response = client.post("/api/v1/inbox/msg-to-read/read", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True

        # Verify it's marked as read
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT is_read FROM unified_messages WHERE id = ?", ("msg-to-read",))
        row = cursor.fetchone()
        conn.close()
        assert row[0] == 1

    def test_toggle_star(self, client, auth_headers, test_db_path):
        """Test toggling star on a message"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_starred, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-to-star", 1, "twitter", "mention", "@user1", "User 1", "Msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        # First toggle - should star it
        response = client.post("/api/v1/inbox/msg-to-star/star", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["is_starred"] is True

        # Second toggle - should unstar it
        response = client.post("/api/v1/inbox/msg-to-star/star", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["is_starred"] is False

    def test_archive_message(self, client, auth_headers, test_db_path):
        """Test archiving a message"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_archived, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-to-archive", 1, "twitter", "mention", "@user1", "User 1", "Msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        response = client.post("/api/v1/inbox/msg-to-archive/archive", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True

        # Verify it's archived
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT is_archived FROM unified_messages WHERE id = ?", ("msg-to-archive",))
        row = cursor.fetchone()
        conn.close()
        assert row[0] == 1

    def test_get_stats(self, client, auth_headers, test_db_path):
        """Test getting inbox stats (unread counts per platform)"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        # Create unread messages for different platforms
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-stat-1", 1, "twitter", "mention", "@user1", "User 1", "Msg 1", 0, int(time.time()), int(time.time())))
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-stat-2", 1, "twitter", "mention", "@user2", "User 2", "Msg 2", 0, int(time.time()), int(time.time())))
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-stat-3", 1, "bluesky", "reply", "@user3", "User 3", "Msg 3", 0, int(time.time()), int(time.time())))
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("msg-stat-4", 1, "twitter", "mention", "@user4", "User 4", "Msg 4", 1, int(time.time()), int(time.time())))  # read
        conn.commit()
        conn.close()

        response = client.get("/api/v1/inbox/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "total_unread" in data
        assert "by_platform" in data
        assert data["total_unread"] == 3
        assert data["by_platform"]["twitter"] == 2
        assert data["by_platform"]["bluesky"] == 1

    def test_mark_as_read_not_found(self, client, auth_headers, test_db_path):
        """Test marking a non-existent message as read returns 404"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        response = client.post("/api/v1/inbox/nonexistent-id/read", headers=auth_headers)
        assert response.status_code == 404

    def test_unauthorized_access(self, client):
        """Test that endpoints require authentication"""
        response = client.get("/api/v1/inbox")
        assert response.status_code == 401


class TestInboxService:
    """Unit tests for InboxService"""

    def test_service_init_db(self, test_db_path):
        """Test that init_db creates the table"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='unified_messages'")
        assert cursor.fetchone() is not None
        conn.close()

    def test_service_get_messages_empty(self, test_db_path):
        """Test getting messages from empty inbox"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        messages, total = service.get_messages(user_id=1, filters={})
        assert messages == []
        assert total == 0

    def test_service_mark_as_read(self, test_db_path):
        """Test marking message as read via service"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        # Insert message
        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("svc-msg-1", 1, "twitter", "mention", "@user1", "User 1", "Msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        result = service.mark_as_read(user_id=1, message_id="svc-msg-1")
        assert result is True

    def test_service_toggle_star(self, test_db_path):
        """Test toggling star via service"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_starred, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("svc-msg-2", 1, "twitter", "mention", "@user1", "User 1", "Msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        is_starred = service.toggle_star(user_id=1, message_id="svc-msg-2")
        assert is_starred is True

        is_starred = service.toggle_star(user_id=1, message_id="svc-msg-2")
        assert is_starred is False

    def test_service_archive(self, test_db_path):
        """Test archiving message via service"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_archived, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("svc-msg-3", 1, "twitter", "mention", "@user1", "User 1", "Msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        result = service.archive(user_id=1, message_id="svc-msg-3")
        assert result is True

    def test_service_get_stats(self, test_db_path):
        """Test getting stats via service"""
        from app.features.inbox.service import InboxService
        service = InboxService(test_db_path)
        service.init_db()

        import sqlite3
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("stat-1", 1, "twitter", "mention", "@user1", "User 1", "Msg", 0, int(time.time()), int(time.time())))
        cursor.execute("""
            INSERT INTO unified_messages
            (id, user_id, platform, message_type, author_handle, author_name, content, is_read, created_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("stat-2", 1, "bluesky", "reply", "@user2", "User 2", "Msg", 0, int(time.time()), int(time.time())))
        conn.commit()
        conn.close()

        stats = service.get_stats(user_id=1)
        assert stats["total_unread"] == 2
        assert "twitter" in stats["by_platform"]
        assert "bluesky" in stats["by_platform"]

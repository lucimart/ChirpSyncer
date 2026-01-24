"""
Tests for Workflow Automations Engine.

TDD tests for app/features/workflows/
"""

import json
import os
import sqlite3
import tempfile
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest


def create_test_db():
    """Create a test database with users and workflows tables."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        )
    """)

    # Create workflows table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            trigger_config TEXT NOT NULL,
            actions_config TEXT NOT NULL,
            run_count INTEGER DEFAULT 0,
            last_run_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Create workflow_runs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflow_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL,
            trigger_data TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            actions_completed TEXT,
            error_message TEXT,
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
        )
    """)

    # Insert test user
    now = int(time.time())
    cursor.execute(
        "INSERT INTO users (username, email, is_admin, created_at) VALUES (?, ?, ?, ?)",
        ("testuser", "test@example.com", 0, now),
    )

    conn.commit()
    conn.close()
    return path


class TestWorkflowModels:
    """Test Workflow model operations."""

    def test_create_workflow(self):
        """Test creating a new workflow."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            trigger_config = {
                "type": "viral_post",
                "platform": "twitter",
                "threshold": {"likes": 1000},
            }
            actions_config = [
                {"type": "cross_post", "platforms": ["bluesky", "threads"]},
                {"type": "send_notification", "channel": "telegram"},
            ]

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Viral Post Cross-Poster",
                description="Cross-post viral tweets to other platforms",
                trigger_config=trigger_config,
                actions_config=actions_config,
            )

            assert workflow_id is not None
            assert workflow_id > 0
        finally:
            os.unlink(db_path)

    def test_get_workflow(self):
        """Test retrieving a workflow by ID."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            trigger_config = {"type": "new_post", "platform": "twitter"}
            actions_config = [{"type": "cross_post", "platforms": ["bluesky"]}]

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Auto Cross-Post",
                description="Auto cross-post new tweets",
                trigger_config=trigger_config,
                actions_config=actions_config,
            )

            workflow = manager.get_workflow(workflow_id)

            assert workflow is not None
            assert workflow["id"] == workflow_id
            assert workflow["name"] == "Auto Cross-Post"
            assert workflow["user_id"] == 1
            assert workflow["is_active"] == 1
            assert workflow["trigger_config"]["type"] == "new_post"
            assert len(workflow["actions_config"]) == 1
        finally:
            os.unlink(db_path)

    def test_list_workflows_by_user(self):
        """Test listing workflows for a user."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            # Create multiple workflows
            manager.create_workflow(
                user_id=1,
                name="Workflow 1",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )
            manager.create_workflow(
                user_id=1,
                name="Workflow 2",
                trigger_config={"type": "viral_post"},
                actions_config=[{"type": "send_notification"}],
            )

            workflows = manager.list_workflows(user_id=1)

            assert len(workflows) == 2
            names = [w["name"] for w in workflows]
            assert "Workflow 1" in names
            assert "Workflow 2" in names
        finally:
            os.unlink(db_path)

    def test_update_workflow(self):
        """Test updating a workflow."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Original Name",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            success = manager.update_workflow(
                workflow_id,
                name="Updated Name",
                description="New description",
            )

            assert success is True

            workflow = manager.get_workflow(workflow_id)
            assert workflow["name"] == "Updated Name"
            assert workflow["description"] == "New description"
        finally:
            os.unlink(db_path)

    def test_delete_workflow(self):
        """Test deleting a workflow."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="To Delete",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            success = manager.delete_workflow(workflow_id)
            assert success is True

            workflow = manager.get_workflow(workflow_id)
            assert workflow is None
        finally:
            os.unlink(db_path)

    def test_toggle_workflow(self):
        """Test toggling workflow active status."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Toggle Test",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            # Should start active
            workflow = manager.get_workflow(workflow_id)
            assert workflow["is_active"] == 1

            # Toggle off
            manager.toggle_workflow(workflow_id)
            workflow = manager.get_workflow(workflow_id)
            assert workflow["is_active"] == 0

            # Toggle on
            manager.toggle_workflow(workflow_id)
            workflow = manager.get_workflow(workflow_id)
            assert workflow["is_active"] == 1
        finally:
            os.unlink(db_path)


class TestWorkflowRuns:
    """Test WorkflowRun model operations."""

    def test_create_workflow_run(self):
        """Test creating a workflow run."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Test Workflow",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            trigger_data = {"post_id": "123", "platform": "twitter"}
            run_id = manager.create_run(workflow_id, trigger_data)

            assert run_id is not None
            assert run_id > 0
        finally:
            os.unlink(db_path)

    def test_get_workflow_runs(self):
        """Test getting workflow run history."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Test Workflow",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            # Create multiple runs
            manager.create_run(workflow_id, {"post_id": "1"})
            manager.create_run(workflow_id, {"post_id": "2"})
            manager.create_run(workflow_id, {"post_id": "3"})

            runs = manager.get_runs(workflow_id)

            assert len(runs) == 3
        finally:
            os.unlink(db_path)

    def test_update_run_status(self):
        """Test updating workflow run status."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Test Workflow",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            run_id = manager.create_run(workflow_id, {"post_id": "123"})

            # Update to completed
            manager.update_run(
                run_id,
                status="completed",
                actions_completed=[{"action": "cross_post", "success": True}],
            )

            run = manager.get_run(run_id)
            assert run["status"] == "completed"
            assert run["completed_at"] is not None
        finally:
            os.unlink(db_path)

    def test_update_run_with_error(self):
        """Test updating workflow run with error."""
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Test Workflow",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            run_id = manager.create_run(workflow_id, {"post_id": "123"})

            # Update with error
            manager.update_run(
                run_id,
                status="failed",
                error_message="API rate limit exceeded",
            )

            run = manager.get_run(run_id)
            assert run["status"] == "failed"
            assert run["error_message"] == "API rate limit exceeded"
        finally:
            os.unlink(db_path)


class TestTriggers:
    """Test workflow triggers."""

    def test_new_post_trigger_check(self):
        """Test new_post trigger evaluates correctly."""
        from app.features.workflows.triggers.new_post import NewPostTrigger

        trigger = NewPostTrigger(config={"platform": "twitter"})

        # Should match Twitter post event
        context = {"event_type": "new_post", "platform": "twitter", "post_id": "123"}
        assert trigger.check(context) is True

        # Should not match different platform
        context = {"event_type": "new_post", "platform": "bluesky", "post_id": "456"}
        assert trigger.check(context) is False

        # Should not match different event type
        context = {"event_type": "delete_post", "platform": "twitter", "post_id": "123"}
        assert trigger.check(context) is False

    def test_viral_post_trigger_check(self):
        """Test viral_post trigger evaluates correctly."""
        from app.features.workflows.triggers.viral_post import ViralPostTrigger

        trigger = ViralPostTrigger(
            config={"platform": "twitter", "threshold": {"likes": 1000}}
        )

        # Should match when likes exceed threshold
        context = {
            "event_type": "engagement_update",
            "platform": "twitter",
            "post_id": "123",
            "likes": 1500,
            "retweets": 50,
        }
        assert trigger.check(context) is True

        # Should not match when below threshold
        context = {
            "event_type": "engagement_update",
            "platform": "twitter",
            "post_id": "123",
            "likes": 500,
            "retweets": 50,
        }
        assert trigger.check(context) is False

    def test_viral_post_trigger_multiple_thresholds(self):
        """Test viral_post trigger with multiple thresholds."""
        from app.features.workflows.triggers.viral_post import ViralPostTrigger

        trigger = ViralPostTrigger(
            config={
                "platform": "twitter",
                "threshold": {"likes": 500, "retweets": 100},
            }
        )

        # Should match when all thresholds met
        context = {
            "event_type": "engagement_update",
            "platform": "twitter",
            "likes": 600,
            "retweets": 150,
        }
        assert trigger.check(context) is True

        # Should not match when only one threshold met
        context = {
            "event_type": "engagement_update",
            "platform": "twitter",
            "likes": 600,
            "retweets": 50,
        }
        assert trigger.check(context) is False

    def test_scheduled_trigger_check(self):
        """Test scheduled trigger evaluates correctly."""
        from app.features.workflows.triggers.scheduled import ScheduledTrigger

        trigger = ScheduledTrigger(config={"schedule": "0 9 * * *"})  # 9 AM daily

        # Should match scheduled event
        context = {"event_type": "scheduled", "schedule_id": "workflow_123"}
        assert trigger.check(context) is True

        # Should not match other event types
        context = {"event_type": "new_post", "platform": "twitter"}
        assert trigger.check(context) is False

    def test_webhook_trigger_check(self):
        """Test webhook trigger evaluates correctly."""
        from app.features.workflows.triggers.webhook import WebhookTrigger

        trigger = WebhookTrigger(config={"secret": "my_secret"})

        # Should match webhook event
        context = {"event_type": "webhook", "payload": {"data": "test"}}
        assert trigger.check(context) is True

        # Should not match other events
        context = {"event_type": "new_post"}
        assert trigger.check(context) is False

    def test_new_mention_trigger_check(self):
        """Test new_mention trigger evaluates correctly."""
        from app.features.workflows.triggers.new_mention import NewMentionTrigger

        trigger = NewMentionTrigger(config={"platform": "twitter"})

        context = {
            "event_type": "new_mention",
            "platform": "twitter",
            "mentioned_user": "testuser",
        }
        assert trigger.check(context) is True

        context = {"event_type": "new_post", "platform": "twitter"}
        assert trigger.check(context) is False

    def test_trigger_get_data(self):
        """Test trigger returns relevant data."""
        from app.features.workflows.triggers.new_post import NewPostTrigger

        trigger = NewPostTrigger(config={"platform": "twitter"})

        context = {
            "event_type": "new_post",
            "platform": "twitter",
            "post_id": "123",
            "content": "Hello world!",
            "author": "testuser",
        }

        data = trigger.get_data(context)
        assert data["post_id"] == "123"
        assert data["platform"] == "twitter"
        assert data["content"] == "Hello world!"

    def test_rss_trigger_check(self):
        """Test RSS trigger evaluates correctly."""
        from app.features.workflows.triggers.rss import RSSTrigger

        trigger = RSSTrigger(config={"feed_url": "https://example.com/feed.xml"})

        # Should match RSS update event
        context = {
            "event_type": "rss_update",
            "feed_url": "https://example.com/feed.xml",
            "title": "New Article",
            "content": "Article content",
        }
        assert trigger.check(context) is True

        # Should not match different feed
        context = {
            "event_type": "rss_update",
            "feed_url": "https://other.com/feed.xml",
            "title": "New Article",
        }
        assert trigger.check(context) is False

        # Should not match different event type
        context = {"event_type": "new_post", "platform": "twitter"}
        assert trigger.check(context) is False

    def test_rss_trigger_with_keywords(self):
        """Test RSS trigger with keyword filtering."""
        from app.features.workflows.triggers.rss import RSSTrigger

        trigger = RSSTrigger(
            config={
                "feed_url": "https://example.com/feed.xml",
                "keywords": ["python", "programming"],
            }
        )

        # Should match when keyword in title
        context = {
            "event_type": "rss_update",
            "feed_url": "https://example.com/feed.xml",
            "title": "Learning Python Basics",
            "content": "Introduction to Python",
        }
        assert trigger.check(context) is True

        # Should not match when no keywords present
        context = {
            "event_type": "rss_update",
            "feed_url": "https://example.com/feed.xml",
            "title": "Cooking Recipe",
            "content": "How to make pasta",
        }
        assert trigger.check(context) is False


class TestActions:
    """Test workflow actions."""

    def test_cross_post_action_execute(self):
        """Test cross_post action executes correctly."""
        from app.features.workflows.actions.cross_post import CrossPostAction

        action = CrossPostAction(config={"platforms": ["bluesky", "threads"]})

        context = {
            "post_id": "123",
            "content": "Hello world!",
            "platform": "twitter",
            "media": [],
        }

        with patch(
            "app.features.workflows.actions.cross_post.post_to_platform"
        ) as mock_post:
            mock_post.return_value = {"success": True, "post_id": "new_123"}

            result = action.execute(context)

            assert result["success"] is True
            assert len(result["results"]) == 2
            assert mock_post.call_count == 2

    def test_send_notification_action_execute(self):
        """Test send_notification action executes correctly."""
        from app.features.workflows.actions.send_notification import (
            SendNotificationAction,
        )

        action = SendNotificationAction(
            config={"channel": "telegram", "chat_id": "123456"}
        )

        context = {
            "post_id": "123",
            "content": "Hello world!",
            "platform": "twitter",
            "likes": 1500,
        }

        with patch(
            "app.features.workflows.actions.send_notification.send_telegram_message"
        ) as mock_send:
            mock_send.return_value = {"success": True}

            result = action.execute(context)

            assert result["success"] is True
            mock_send.assert_called_once()

    def test_transform_content_action_execute(self):
        """Test transform_content action adapts content."""
        from app.features.workflows.actions.transform_content import (
            TransformContentAction,
        )

        action = TransformContentAction(
            config={"target_platform": "bluesky", "max_length": 300}
        )

        context = {"content": "This is a tweet with #hashtags and @mentions"}

        result = action.execute(context)

        assert result["success"] is True
        assert "transformed_content" in result
        assert len(result["transformed_content"]) <= 300

    def test_add_to_queue_action_execute(self):
        """Test add_to_queue action adds to posting queue."""
        from app.features.workflows.actions.add_to_queue import AddToQueueAction

        action = AddToQueueAction(
            config={"delay_minutes": 30, "platform": "bluesky"}
        )

        context = {"content": "Scheduled post content", "user_id": 1}

        with patch(
            "app.features.workflows.actions.add_to_queue.schedule_post"
        ) as mock_schedule:
            mock_schedule.return_value = {"scheduled_id": 456}

            result = action.execute(context)

            assert result["success"] is True
            assert result["scheduled_id"] == 456


class TestWorkflowEngine:
    """Test WorkflowEngine orchestration."""

    def test_evaluate_triggers_finds_matching_workflows(self):
        """Test engine finds workflows matching an event."""
        from app.features.workflows.engine import WorkflowEngine
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            # Create workflow that should match
            manager.create_workflow(
                user_id=1,
                name="New Post Handler",
                trigger_config={"type": "new_post", "platform": "twitter"},
                actions_config=[{"type": "cross_post", "platforms": ["bluesky"]}],
            )

            # Create workflow that should NOT match
            manager.create_workflow(
                user_id=1,
                name="Viral Handler",
                trigger_config={
                    "type": "viral_post",
                    "platform": "twitter",
                    "threshold": {"likes": 1000},
                },
                actions_config=[{"type": "send_notification"}],
            )

            engine = WorkflowEngine(db_path=db_path)

            event = {"event_type": "new_post", "platform": "twitter", "post_id": "123"}

            matching = engine.evaluate_triggers(event)

            assert len(matching) == 1
            assert matching[0]["name"] == "New Post Handler"
        finally:
            os.unlink(db_path)

    def test_evaluate_triggers_ignores_inactive_workflows(self):
        """Test engine ignores inactive workflows."""
        from app.features.workflows.engine import WorkflowEngine
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Inactive Workflow",
                trigger_config={"type": "new_post", "platform": "twitter"},
                actions_config=[{"type": "cross_post"}],
            )

            # Deactivate it
            manager.toggle_workflow(workflow_id)

            engine = WorkflowEngine(db_path=db_path)

            event = {"event_type": "new_post", "platform": "twitter", "post_id": "123"}

            matching = engine.evaluate_triggers(event)

            assert len(matching) == 0
        finally:
            os.unlink(db_path)

    def test_execute_workflow(self):
        """Test executing a workflow end-to-end."""
        from app.features.workflows.engine import WorkflowEngine
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Cross Post Workflow",
                trigger_config={"type": "new_post", "platform": "twitter"},
                actions_config=[
                    {"type": "cross_post", "platforms": ["bluesky"]},
                    {"type": "send_notification", "channel": "telegram"},
                ],
            )

            workflow = manager.get_workflow(workflow_id)
            engine = WorkflowEngine(db_path=db_path)

            trigger_data = {"post_id": "123", "content": "Hello!", "platform": "twitter"}

            with patch.object(engine, "_execute_action") as mock_execute:
                mock_execute.return_value = {"success": True}

                result = engine.execute_workflow(workflow, trigger_data)

                assert result["success"] is True
                assert result["run_id"] is not None
                assert mock_execute.call_count == 2
        finally:
            os.unlink(db_path)

    def test_execute_workflow_records_run(self):
        """Test workflow execution creates a run record."""
        from app.features.workflows.engine import WorkflowEngine
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Test Workflow",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post", "platforms": ["bluesky"]}],
            )

            workflow = manager.get_workflow(workflow_id)
            engine = WorkflowEngine(db_path=db_path)

            with patch.object(engine, "_execute_action") as mock_execute:
                mock_execute.return_value = {"success": True}

                result = engine.execute_workflow(
                    workflow, {"post_id": "123", "content": "Test"}
                )

            # Check run was recorded
            runs = manager.get_runs(workflow_id)
            assert len(runs) == 1
            assert runs[0]["status"] == "completed"
        finally:
            os.unlink(db_path)

    def test_execute_workflow_handles_action_failure(self):
        """Test workflow handles action failures gracefully."""
        from app.features.workflows.engine import WorkflowEngine
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Failing Workflow",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post", "platforms": ["bluesky"]}],
            )

            workflow = manager.get_workflow(workflow_id)
            engine = WorkflowEngine(db_path=db_path)

            with patch.object(engine, "_execute_action") as mock_execute:
                mock_execute.side_effect = Exception("API Error")

                result = engine.execute_workflow(
                    workflow, {"post_id": "123", "content": "Test"}
                )

            assert result["success"] is False
            assert "error" in result

            # Check run was recorded as failed
            runs = manager.get_runs(workflow_id)
            assert runs[0]["status"] == "failed"
        finally:
            os.unlink(db_path)

    def test_execute_workflow_increments_run_count(self):
        """Test workflow execution increments run_count."""
        from app.features.workflows.engine import WorkflowEngine
        from app.features.workflows.models import WorkflowManager

        db_path = create_test_db()
        try:
            manager = WorkflowManager(db_path=db_path)

            workflow_id = manager.create_workflow(
                user_id=1,
                name="Counter Test",
                trigger_config={"type": "new_post"},
                actions_config=[{"type": "cross_post"}],
            )

            workflow = manager.get_workflow(workflow_id)
            engine = WorkflowEngine(db_path=db_path)

            with patch.object(engine, "_execute_action") as mock_execute:
                mock_execute.return_value = {"success": True}

                engine.execute_workflow(workflow, {"post_id": "1"})
                engine.execute_workflow(workflow, {"post_id": "2"})

            updated_workflow = manager.get_workflow(workflow_id)
            assert updated_workflow["run_count"] == 2
        finally:
            os.unlink(db_path)


class TestWorkflowsAPI:
    """Test Workflows API endpoints.

    Uses fixtures from tests/unit/conftest.py (client, auth_headers, test_user).
    """

    def test_list_workflows_empty(self, client, auth_headers):
        """Test listing workflows when none exist."""
        response = client.get("/api/v1/workflows", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["workflows"] == []

    def test_create_workflow(self, client, auth_headers):
        """Test creating a workflow via API."""
        payload = {
            "name": "My Workflow",
            "description": "Test workflow",
            "trigger": {"type": "new_post", "platform": "twitter"},
            "actions": [{"type": "cross_post", "platforms": ["bluesky"]}],
        }

        response = client.post(
            "/api/v1/workflows",
            headers=auth_headers,
            json=payload,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["name"] == "My Workflow"
        assert "id" in data["data"]

    def test_get_workflow(self, client, auth_headers):
        """Test getting a specific workflow."""
        # First create one
        payload = {
            "name": "Test Workflow",
            "trigger": {"type": "new_post"},
            "actions": [{"type": "cross_post"}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Then get it
        response = client.get(
            f"/api/v1/workflows/{workflow_id}", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["name"] == "Test Workflow"

    def test_update_workflow(self, client, auth_headers):
        """Test updating a workflow."""
        # Create
        payload = {
            "name": "Original",
            "trigger": {"type": "new_post"},
            "actions": [{"type": "cross_post"}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Update
        response = client.put(
            f"/api/v1/workflows/{workflow_id}",
            headers=auth_headers,
            json={"name": "Updated"},
        )

        assert response.status_code == 200
        assert response.get_json()["data"]["name"] == "Updated"

    def test_delete_workflow(self, client, auth_headers):
        """Test deleting a workflow."""
        # Create
        payload = {
            "name": "To Delete",
            "trigger": {"type": "new_post"},
            "actions": [{"type": "cross_post"}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Delete
        response = client.delete(
            f"/api/v1/workflows/{workflow_id}", headers=auth_headers
        )

        assert response.status_code == 200

        # Verify deleted
        get_response = client.get(
            f"/api/v1/workflows/{workflow_id}", headers=auth_headers
        )
        assert get_response.status_code == 404

    def test_toggle_workflow(self, client, auth_headers):
        """Test toggling workflow active status."""
        # Create
        payload = {
            "name": "Toggle Test",
            "trigger": {"type": "new_post"},
            "actions": [{"type": "cross_post"}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Toggle
        response = client.post(
            f"/api/v1/workflows/{workflow_id}/toggle", headers=auth_headers
        )

        assert response.status_code == 200
        assert response.get_json()["data"]["is_active"] is False

    def test_get_workflow_runs(self, client, auth_headers):
        """Test getting workflow run history."""
        # Create workflow
        payload = {
            "name": "Run History Test",
            "trigger": {"type": "new_post"},
            "actions": [{"type": "cross_post"}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Get runs (should be empty)
        response = client.get(
            f"/api/v1/workflows/{workflow_id}/runs", headers=auth_headers
        )

        assert response.status_code == 200
        assert response.get_json()["data"]["runs"] == []

    def test_test_workflow(self, client, auth_headers):
        """Test running a workflow test."""
        # Create workflow
        payload = {
            "name": "Test Run",
            "trigger": {"type": "new_post", "platform": "twitter"},
            "actions": [{"type": "cross_post", "platforms": ["bluesky"]}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Test with sample data
        with patch(
            "app.features.workflows.engine.WorkflowEngine._execute_action"
        ) as mock:
            mock.return_value = {"success": True}

            response = client.post(
                f"/api/v1/workflows/{workflow_id}/test",
                headers=auth_headers,
                json={"sample_data": {"post_id": "test123", "content": "Test post"}},
            )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["success"] is True

    def test_create_workflow_validation_error(self, client, auth_headers):
        """Test validation error when creating workflow."""
        # Missing required fields
        payload = {"name": "Incomplete"}

        response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )

        assert response.status_code == 400
        assert response.get_json()["success"] is False

    def test_get_nonexistent_workflow(self, client, auth_headers):
        """Test getting a workflow that doesn't exist."""
        response = client.get("/api/v1/workflows/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_workflow_authorization(self, client, auth_headers, test_user):
        """Test users can only access their own workflows."""
        from app.auth.jwt_handler import create_token
        from app.auth.user_manager import UserManager
        from flask import current_app

        # Create workflow as test_user
        payload = {
            "name": "User 1 Workflow",
            "trigger": {"type": "new_post"},
            "actions": [{"type": "cross_post"}],
        }
        create_response = client.post(
            "/api/v1/workflows", headers=auth_headers, json=payload
        )
        workflow_id = create_response.get_json()["data"]["id"]

        # Create another user and try to access
        with client.application.app_context():
            db_path = client.application.config.get("DB_PATH")
            manager = UserManager(db_path)
            other_user_id = manager.create_user(
                "otheruser", "other@example.com", "OtherPass123!", is_admin=False
            )
            other_token = create_token(other_user_id, "otheruser", is_admin=False)

        other_headers = {"Authorization": f"Bearer {other_token}"}

        response = client.get(
            f"/api/v1/workflows/{workflow_id}", headers=other_headers
        )

        assert response.status_code == 404

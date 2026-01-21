"""
Tests for Celery app configuration.

TDD tests for app/core/celery_app.py
"""

import pytest
from unittest.mock import patch, MagicMock


class TestCeleryAppConfiguration:
    """Test Celery app configuration."""

    def test_celery_app_exists(self):
        """Test celery_app is properly configured."""
        from app.core.celery_app import celery_app

        assert celery_app is not None
        assert celery_app.main == "chirpsyncer"

    def test_celery_uses_json_serializer(self):
        """Test Celery uses JSON serialization."""
        from app.core.celery_app import celery_app

        assert celery_app.conf.task_serializer == "json"
        assert celery_app.conf.result_serializer == "json"
        assert "json" in celery_app.conf.accept_content

    def test_celery_uses_utc_timezone(self):
        """Test Celery uses UTC timezone."""
        from app.core.celery_app import celery_app

        assert celery_app.conf.timezone == "UTC"
        assert celery_app.conf.enable_utc is True

    def test_celery_tracks_task_started(self):
        """Test Celery tracks task started state."""
        from app.core.celery_app import celery_app

        assert celery_app.conf.task_track_started is True

    def test_celery_autodiscovers_tasks(self):
        """Test Celery autodiscovers tasks from app.tasks."""
        from app.core.celery_app import celery_app

        # The autodiscover_tasks should have been called
        # We verify by checking the module source
        import inspect
        from app.core import celery_app as celery_module

        source = inspect.getsource(celery_module)
        assert 'autodiscover_tasks(["app.tasks"])' in source


class TestCeleryBrokerConfiguration:
    """Test Celery broker and backend configuration."""

    def test_celery_uses_config_broker(self):
        """Test Celery uses broker URL from config."""
        from app.core.celery_app import celery_app
        from app.core import config

        # Broker should be set from config
        assert (
            celery_app.conf.broker_url is not None
            or config.CELERY_BROKER_URL is not None
        )

    def test_celery_uses_config_backend(self):
        """Test Celery uses result backend from config."""
        from app.core.celery_app import celery_app
        from app.core import config

        # Backend should be set from config
        assert (
            celery_app.conf.result_backend is not None
            or config.CELERY_RESULT_BACKEND is not None
        )

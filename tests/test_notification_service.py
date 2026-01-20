"""
Unit tests for NotificationService class.
Tests email notification functionality with mocked SMTP.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import smtplib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

from notification_service import NotificationService


class TestNotificationService(unittest.TestCase):
    def setUp(self):
        self.smtp_config = {
            'host': 'smtp.test.com',
            'port': 587,
            'user': 'test@test.com',
            'password': 'testpass123',
            'from_addr': 'noreply@chirpsyncer.local',
            'enabled': True
        }

    def test_init_with_config(self):
        service = NotificationService(self.smtp_config)
        self.assertEqual(service.smtp_config['host'], 'smtp.test.com')
        self.assertEqual(service.smtp_config['port'], 587)
        self.assertEqual(service.smtp_config['enabled'], True)

    @patch('notification_service.smtplib.SMTP')
    def test_notify_task_completion(self, mock_smtp_class):
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.notify_task_completion(
            task_name='sync_twitter_to_bluesky',
            result={'success': True, 'items_processed': 5, 'duration': 12.5},
            recipients=['admin@test.com']
        )

        self.assertTrue(result)
        mock_smtp.send_message.assert_called_once()

    @patch('notification_service.smtplib.SMTP')
    def test_notify_task_failure(self, mock_smtp_class):
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.notify_task_failure(
            task_name='sync_bluesky_to_twitter',
            error='Connection timeout',
            recipients=['admin@test.com', 'devops@test.com']
        )

        self.assertTrue(result)
        self.assertEqual(mock_smtp.send_message.call_count, 2)

    @patch('notification_service.smtplib.SMTP')
    def test_send_weekly_report(self, mock_smtp_class):
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.send_weekly_report(recipients=['admin@test.com'])

        self.assertTrue(result)
        mock_smtp.send_message.assert_called_once()


if __name__ == '__main__':
    unittest.main()

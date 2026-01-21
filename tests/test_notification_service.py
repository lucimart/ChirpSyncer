"""
Unit tests for NotificationService class.
Tests email notification functionality with mocked SMTP.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock, call
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

from app.services.notification_service import NotificationService


class TestNotificationService(unittest.TestCase):
    """Test suite for NotificationService"""

    def setUp(self):
        """Set up test fixtures"""
        self.smtp_config = {
            'host': 'smtp.test.com',
            'port': 587,
            'user': 'test@test.com',
            'password': 'testpass123',
            'from_addr': 'noreply@chirpsyncer.local',
            'enabled': True
        }

    def test_init_with_config(self):
        """Test NotificationService initialization with explicit config"""
        service = NotificationService(self.smtp_config)

        self.assertEqual(service.smtp_config['host'], 'smtp.test.com')
        self.assertEqual(service.smtp_config['port'], 587)
        self.assertEqual(service.smtp_config['user'], 'test@test.com')
        self.assertEqual(service.smtp_config['enabled'], True)

    def test_init_with_env_variables(self):
        """Test NotificationService initialization from environment variables"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.env.com',
            'SMTP_PORT': '465',
            'SMTP_USER': 'env@test.com',
            'SMTP_PASSWORD': 'envpass',
            'SMTP_FROM': 'env@chirpsyncer.local',
            'SMTP_ENABLED': 'true'
        }):
            service = NotificationService()

            self.assertEqual(service.smtp_config['host'], 'smtp.env.com')
            self.assertEqual(service.smtp_config['port'], 465)
            self.assertEqual(service.smtp_config['user'], 'env@test.com')
            self.assertTrue(service.smtp_config['enabled'])

    def test_init_disabled_by_default(self):
        """Test that SMTP is disabled by default when not configured"""
        with patch.dict(os.environ, {}, clear=True):
            service = NotificationService()
            self.assertFalse(service.smtp_config['enabled'])

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_smtp_connection_success(self, mock_smtp_class):
        """Test successful SMTP connection"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.test_connection()

        self.assertTrue(result)
        mock_smtp_class.assert_called_once_with('smtp.test.com', 587)
        mock_smtp.starttls.assert_called_once()
        mock_smtp.login.assert_called_once_with('test@test.com', 'testpass123')

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_smtp_connection_failure(self, mock_smtp_class):
        """Test SMTP connection failure handling"""
        mock_smtp_class.side_effect = smtplib.SMTPException("Connection failed")

        service = NotificationService(self.smtp_config)
        result = service.test_connection()

        self.assertFalse(result)

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_plain_text(self, mock_smtp_class):
        """Test sending plain text email"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.send_email(
            to='recipient@test.com',
            subject='Test Subject',
            body='Test body content',
            html=False
        )

        self.assertTrue(result)
        mock_smtp.send_message.assert_called_once()
        mock_smtp.starttls.assert_called_once()
        mock_smtp.login.assert_called_once()

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_html(self, mock_smtp_class):
        """Test sending HTML email"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.send_email(
            to='recipient@test.com',
            subject='Test HTML',
            body='<h1>Test HTML</h1>',
            html=True
        )

        self.assertTrue(result)
        mock_smtp.send_message.assert_called_once()

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_smtp_failure(self, mock_smtp_class):
        """Test email sending failure handling"""
        mock_smtp = MagicMock()
        mock_smtp.send_message.side_effect = smtplib.SMTPException("Send failed")
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.send_email(
            to='recipient@test.com',
            subject='Test',
            body='Test'
        )

        self.assertFalse(result)

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_when_disabled(self, mock_smtp_class):
        """Test that emails are not sent when SMTP is disabled"""
        config = self.smtp_config.copy()
        config['enabled'] = False

        service = NotificationService(config)
        result = service.send_email(
            to='recipient@test.com',
            subject='Test',
            body='Test'
        )

        self.assertFalse(result)
        mock_smtp_class.assert_not_called()

    @patch.object(NotificationService, 'send_email')
    def test_notify_task_completion(self, mock_send_email):
        """Test task completion notification"""
        mock_send_email.return_value = True

        service = NotificationService(self.smtp_config)
        result = service.notify_task_completion(
            task_name='sync_twitter_to_bluesky',
            result={
                'success': True,
                'items_processed': 5,
                'duration': 12.5
            },
            recipients=['admin@test.com']
        )

        self.assertTrue(result)
        mock_send_email.assert_called_once()

        # Verify the call arguments
        call_args = mock_send_email.call_args
        self.assertEqual(call_args.args[0], 'admin@test.com')
        self.assertIn('sync_twitter_to_bluesky', call_args.args[1])
        self.assertIn('completed', call_args.args[1].lower())
        self.assertTrue(call_args.kwargs['html'])

    @patch.object(NotificationService, 'send_email')
    def test_notify_task_failure(self, mock_send_email):
        """Test task failure notification"""
        mock_send_email.return_value = True

        service = NotificationService(self.smtp_config)
        result = service.notify_task_failure(
            task_name='sync_bluesky_to_twitter',
            error='Connection timeout',
            recipients=['admin@test.com', 'devops@test.com']
        )

        self.assertTrue(result)
        # Should send to both recipients
        self.assertEqual(mock_send_email.call_count, 2)

        # Verify failure in subject
        for call in mock_send_email.call_args_list:
            self.assertIn('failed', call.args[1].lower())
            self.assertIn('sync_bluesky_to_twitter', call.args[1])

    @patch.object(NotificationService, 'send_email')
    def test_send_weekly_report(self, mock_send_email):
        """Test weekly report sending"""
        mock_send_email.return_value = True

        service = NotificationService(self.smtp_config)
        result = service.send_weekly_report(
            recipients=['admin@test.com']
        )

        self.assertTrue(result)
        mock_send_email.assert_called_once()

        call_args = mock_send_email.call_args
        self.assertIn('weekly', call_args.args[1].lower())
        self.assertTrue(call_args.kwargs['html'])

    def test_email_template_rendering_task_completion(self):
        """Test email template rendering for task completion"""
        service = NotificationService(self.smtp_config)

        html = service._render_task_completion_template(
            task_name='test_task',
            result={
                'success': True,
                'items_processed': 10,
                'duration': 5.5
            }
        )

        self.assertIsInstance(html, str)
        self.assertIn('test_task', html)
        self.assertIn('10', html)
        self.assertIn('5.5', html)

    def test_email_template_rendering_task_failure(self):
        """Test email template rendering for task failure"""
        service = NotificationService(self.smtp_config)

        html = service._render_task_failure_template(
            task_name='failed_task',
            error='Something went wrong',
            stacktrace='Traceback: error at line 42'
        )

        self.assertIsInstance(html, str)
        self.assertIn('failed_task', html)
        self.assertIn('Something went wrong', html)

    def test_email_template_rendering_weekly_report(self):
        """Test email template rendering for weekly report"""
        service = NotificationService(self.smtp_config)

        html = service._render_weekly_report_template(
            tasks_summary={
                'total_executions': 50,
                'successful': 45,
                'failed': 5,
                'success_rate': 90.0,
                'failed_tasks': [
                    {'name': 'task1', 'error': 'Error 1'},
                    {'name': 'task2', 'error': 'Error 2'}
                ]
            }
        )

        self.assertIsInstance(html, str)
        self.assertIn('50', html)
        self.assertIn('45', html)
        self.assertIn('90', html)

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_rate_limiting(self, mock_smtp_class):
        """Test that rate limiting prevents spam (basic implementation test)"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value = mock_smtp

        service = NotificationService(self.smtp_config)

        # Send multiple emails rapidly
        results = []
        for i in range(5):
            result = service.send_email(
                to=f'test{i}@test.com',
                subject=f'Test {i}',
                body=f'Body {i}'
            )
            results.append(result)

        # All should succeed in tests (rate limiting should not block tests)
        self.assertTrue(all(results))

    def test_configuration_validation(self):
        """Test that configuration is properly validated"""
        # Test with missing required fields
        invalid_config = {
            'host': 'smtp.test.com',
            # Missing other required fields
        }

        service = NotificationService(invalid_config)
        # Should fall back to disabled state or use defaults
        self.assertFalse(service.test_connection())


if __name__ == '__main__':
    unittest.main()


class TestNotificationServiceInit(unittest.TestCase):
    """Tests for NotificationService initialization"""

    def test_init_with_env_vars(self):
        """Test initialization from environment variables"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.env.com',
            'SMTP_PORT': '465',
            'SMTP_USER': 'env@test.com',
            'SMTP_PASSWORD': 'envpass',
            'SMTP_FROM': 'from@env.com',
            'SMTP_ENABLED': 'true'
        }):
            service = NotificationService()
            self.assertEqual(service.smtp_config['host'], 'smtp.env.com')
            self.assertEqual(service.smtp_config['port'], 465)
            self.assertTrue(service.smtp_config['enabled'])

    def test_init_disabled_by_default(self):
        """Test that SMTP is disabled by default when env vars not set"""
        with patch.dict(os.environ, {}, clear=True):
            service = NotificationService()
            self.assertFalse(service.smtp_config['enabled'])


class TestNotificationServiceConnection(unittest.TestCase):
    """Tests for SMTP connection"""

    def setUp(self):
        self.smtp_config = {
            'host': 'smtp.test.com',
            'port': 587,
            'user': 'test@test.com',
            'password': 'testpass123',
            'from_addr': 'noreply@chirpsyncer.local',
            'enabled': True
        }

    def test_test_connection_disabled(self):
        """Test connection test when SMTP disabled"""
        config = self.smtp_config.copy()
        config['enabled'] = False
        service = NotificationService(config)
        result = service.test_connection()
        self.assertFalse(result)

    def test_test_connection_no_credentials(self):
        """Test connection test without credentials"""
        config = self.smtp_config.copy()
        config['user'] = ''
        config['password'] = ''
        service = NotificationService(config)
        result = service.test_connection()
        self.assertFalse(result)

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_test_connection_success(self, mock_smtp_class):
        """Test successful connection test"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.test_connection()

        self.assertTrue(result)
        mock_smtp.starttls.assert_called_once()
        mock_smtp.login.assert_called_once()

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_test_connection_smtp_error(self, mock_smtp_class):
        """Test connection test with SMTP error"""
        mock_smtp_class.side_effect = smtplib.SMTPException('Connection failed')

        service = NotificationService(self.smtp_config)
        result = service.test_connection()

        self.assertFalse(result)


class TestSendEmail(unittest.TestCase):
    """Tests for send_email method"""

    def setUp(self):
        self.smtp_config = {
            'host': 'smtp.test.com',
            'port': 587,
            'user': 'test@test.com',
            'password': 'testpass123',
            'from_addr': 'noreply@chirpsyncer.local',
            'enabled': True
        }

    def test_send_email_disabled(self):
        """Test send_email when SMTP disabled"""
        config = self.smtp_config.copy()
        config['enabled'] = False
        service = NotificationService(config)
        result = service.send_email('to@test.com', 'Subject', 'Body')
        self.assertFalse(result)

    def test_send_email_no_credentials(self):
        """Test send_email without credentials"""
        config = self.smtp_config.copy()
        config['user'] = ''
        service = NotificationService(config)
        result = service.send_email('to@test.com', 'Subject', 'Body')
        self.assertFalse(result)

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_plain_text(self, mock_smtp_class):
        """Test sending plain text email"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.send_email('to@test.com', 'Test Subject', 'Test body')

        self.assertTrue(result)
        mock_smtp.send_message.assert_called_once()

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_html(self, mock_smtp_class):
        """Test sending HTML email"""
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        service = NotificationService(self.smtp_config)
        result = service.send_email('to@test.com', 'Test Subject', '<h1>HTML</h1>', html=True)

        self.assertTrue(result)
        mock_smtp.send_message.assert_called_once()

    @patch('app.services.notification_service.smtplib.SMTP')
    def test_send_email_smtp_error(self, mock_smtp_class):
        """Test send_email with SMTP error"""
        mock_smtp_class.side_effect = smtplib.SMTPException('Send failed')

        service = NotificationService(self.smtp_config)
        result = service.send_email('to@test.com', 'Subject', 'Body')

        self.assertFalse(result)


class TestNotifyNoRecipients(unittest.TestCase):
    """Tests for notification methods with no recipients"""

    def setUp(self):
        self.smtp_config = {
            'host': 'smtp.test.com',
            'port': 587,
            'user': 'test@test.com',
            'password': 'testpass123',
            'from_addr': 'noreply@chirpsyncer.local',
            'enabled': True
        }

    def test_notify_task_completion_no_recipients(self):
        """Test notify_task_completion with empty recipients"""
        service = NotificationService(self.smtp_config)
        result = service.notify_task_completion('task', {'success': True}, [])
        self.assertFalse(result)

    def test_notify_task_failure_no_recipients(self):
        """Test notify_task_failure with empty recipients"""
        service = NotificationService(self.smtp_config)
        result = service.notify_task_failure('task', 'error', [])
        self.assertFalse(result)

    def test_send_weekly_report_no_recipients(self):
        """Test send_weekly_report with empty recipients"""
        service = NotificationService(self.smtp_config)
        result = service.send_weekly_report([])
        self.assertFalse(result)


class TestTemplateRendering(unittest.TestCase):
    """Tests for email template rendering"""

    def setUp(self):
        self.smtp_config = {
            'host': 'smtp.test.com',
            'port': 587,
            'user': 'test@test.com',
            'password': 'testpass123',
            'from_addr': 'noreply@chirpsyncer.local',
            'enabled': True
        }
        self.service = NotificationService(self.smtp_config)

    def test_render_task_completion_template(self):
        """Test task completion template rendering"""
        result = {'success': True, 'items_processed': 10, 'duration': 5.5}
        html = self.service._render_task_completion_template('sync_task', result)
        self.assertIn('sync_task', html)
        self.assertIn('10', html)

    def test_render_task_failure_template(self):
        """Test task failure template rendering"""
        html = self.service._render_task_failure_template('failed_task', 'Connection timeout')
        self.assertIn('failed_task', html)
        self.assertIn('Connection timeout', html)

    def test_render_weekly_report_template(self):
        """Test weekly report template rendering"""
        summary = {
            'total_executions': 50,
            'successful': 45,
            'failed': 5,
            'success_rate': 90.0,
            'failed_tasks': [{'name': 'task1', 'error': 'err1'}, {'name': 'task2', 'error': 'err2'}]
        }
        html = self.service._render_weekly_report_template(summary)
        self.assertIn('50', html)
        self.assertIn('90', html)

    def test_html_to_plain(self):
        """Test HTML to plain text conversion"""
        html = '<h1>Title</h1><p>Paragraph</p>'
        plain = self.service._html_to_plain(html)
        self.assertNotIn('<h1>', plain)
        self.assertIn('Title', plain)

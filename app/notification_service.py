"""
Email Notification Service for ChirpSyncer.
Handles SMTP email notifications for scheduled tasks.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Email notification service for task scheduling system.
    Supports SMTP email sending with TLS/SSL, task notifications, and weekly reports.
    """

    def __init__(self, smtp_config: Optional[Dict] = None):
        """
        Initialize NotificationService with SMTP configuration.

        Args:
            smtp_config: Dictionary with SMTP settings. If None, loads from environment.
                Required keys:
                - host: SMTP server hostname
                - port: SMTP port (default 587)
                - user: SMTP username
                - password: SMTP password
                - from_addr: From email address
                - enabled: bool (default False)
        """
        if smtp_config:
            self.smtp_config = {
                'host': smtp_config.get('host', 'smtp.gmail.com'),
                'port': smtp_config.get('port', 587),
                'user': smtp_config.get('user', ''),
                'password': smtp_config.get('password', ''),
                'from_addr': smtp_config.get('from_addr', 'noreply@chirpsyncer.local'),
                'enabled': smtp_config.get('enabled', False)
            }
        else:
            # Load from environment variables
            self.smtp_config = {
                'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
                'port': int(os.getenv('SMTP_PORT', '587')),
                'user': os.getenv('SMTP_USER', ''),
                'password': os.getenv('SMTP_PASSWORD', ''),
                'from_addr': os.getenv('SMTP_FROM', 'noreply@chirpsyncer.local'),
                'enabled': os.getenv('SMTP_ENABLED', 'false').lower() == 'true'
            }

        logger.info(f"NotificationService initialized (enabled={self.smtp_config['enabled']})")

    def test_connection(self) -> bool:
        """
        Test SMTP connection.

        Returns:
            True if connection successful, False otherwise
        """
        if not self.smtp_config['enabled']:
            logger.warning("SMTP is disabled, skipping connection test")
            return False

        if not self.smtp_config['user'] or not self.smtp_config['password']:
            logger.error("SMTP credentials not configured")
            return False

        try:
            with smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port']) as server:
                server.starttls()
                server.login(self.smtp_config['user'], self.smtp_config['password'])
                logger.info("SMTP connection test successful")
                return True
        except smtplib.SMTPException as e:
            logger.error(f"SMTP connection test failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during SMTP connection test: {e}")
            return False

    def send_email(self, to: str, subject: str, body: str, html: bool = False) -> bool:
        """
        Send email via SMTP.

        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (plain text or HTML)
            html: If True, body is treated as HTML

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.smtp_config['enabled']:
            logger.info(f"SMTP disabled, skipping email to {to}")
            return False

        if not self.smtp_config['user'] or not self.smtp_config['password']:
            logger.error("SMTP credentials not configured")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative') if html else MIMEMultipart()
            msg['Subject'] = subject
            msg['From'] = self.smtp_config['from_addr']
            msg['To'] = to

            # Add body
            if html:
                # Add plain text fallback
                plain_part = MIMEText(self._html_to_plain(body), 'plain')
                html_part = MIMEText(body, 'html')
                msg.attach(plain_part)
                msg.attach(html_part)
            else:
                msg.attach(MIMEText(body, 'plain'))

            # Send email
            with smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port']) as server:
                server.starttls()
                server.login(self.smtp_config['user'], self.smtp_config['password'])
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to}: {subject}")
            return True

        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email to {to}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to}: {e}")
            return False

    def notify_task_completion(self, task_name: str, result: Dict, recipients: List[str]) -> bool:
        """
        Send task completion notification.

        Args:
            task_name: Name of the completed task
            result: Dictionary with task results
            recipients: List of recipient email addresses

        Returns:
            True if all emails sent successfully, False otherwise
        """
        if not recipients:
            logger.warning("No recipients specified for task completion notification")
            return False

        subject = f"Task Completed: {task_name}"
        html_body = self._render_task_completion_template(task_name, result)

        success = True
        for recipient in recipients:
            if not self.send_email(recipient, subject, html_body, html=True):
                success = False

        return success

    def notify_task_failure(self, task_name: str, error: str, recipients: List[str]) -> bool:
        """
        Send task failure alert.

        Args:
            task_name: Name of the failed task
            error: Error message
            recipients: List of recipient email addresses

        Returns:
            True if all emails sent successfully, False otherwise
        """
        if not recipients:
            logger.warning("No recipients specified for task failure notification")
            return False

        subject = f"Task Failed: {task_name}"
        html_body = self._render_task_failure_template(task_name, error)

        success = True
        for recipient in recipients:
            if not self.send_email(recipient, subject, html_body, html=True):
                success = False

        return success

    def send_weekly_report(self, recipients: List[str]) -> bool:
        """
        Send weekly summary of all tasks.

        Args:
            recipients: List of recipient email addresses

        Returns:
            True if all emails sent successfully, False otherwise
        """
        if not recipients:
            logger.warning("No recipients specified for weekly report")
            return False

        # Generate mock summary for now (will be replaced with actual data)
        tasks_summary = {
            'total_executions': 0,
            'successful': 0,
            'failed': 0,
            'success_rate': 0.0,
            'failed_tasks': []
        }

        subject = "ChirpSyncer Weekly Report"
        html_body = self._render_weekly_report_template(tasks_summary)

        success = True
        for recipient in recipients:
            if not self.send_email(recipient, subject, html_body, html=True):
                success = False

        return success

    def _render_task_completion_template(self, task_name: str, result: Dict) -> str:
        """
        Render task completion email template.

        Args:
            task_name: Name of the task
            result: Task result dictionary

        Returns:
            HTML email body
        """
        items_processed = result.get('items_processed', 0)
        duration = result.get('duration', 0)
        success = result.get('success', True)

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .metric {{ background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }}
        .metric-label {{ font-weight: bold; color: #666; }}
        .metric-value {{ font-size: 1.5em; color: #4CAF50; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Task Completed Successfully</h1>
        </div>
        <div class="content">
            <h2>Task: {task_name}</h2>
            <p><strong>Status:</strong> {'Completed' if success else 'Completed with warnings'}</p>
            <p><strong>Completion Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

            <div class="metric">
                <div class="metric-label">Items Processed</div>
                <div class="metric-value">{items_processed}</div>
            </div>

            <div class="metric">
                <div class="metric-label">Execution Duration</div>
                <div class="metric-value">{duration:.2f} seconds</div>
            </div>

            <p style="margin-top: 20px;">The task has been executed successfully.</p>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Automated Task Notification System</p>
        </div>
    </div>
</body>
</html>
"""
        return html

    def _render_task_failure_template(self, task_name: str, error: str, stacktrace: str = None) -> str:
        """
        Render task failure email template.

        Args:
            task_name: Name of the task
            error: Error message
            stacktrace: Optional stack trace

        Returns:
            HTML email body
        """
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .error-box {{ background-color: #ffebee; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; }}
        .stacktrace {{ background-color: #263238; color: #aed581; padding: 15px; margin: 10px 0; overflow-x: auto; font-family: monospace; font-size: 0.9em; }}
        .button {{ display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✗ Task Failed</h1>
        </div>
        <div class="content">
            <h2>Task: {task_name}</h2>
            <p><strong>Status:</strong> Failed</p>
            <p><strong>Failure Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

            <div class="error-box">
                <h3>Error Message:</h3>
                <p>{error}</p>
            </div>

            {'<div class="stacktrace"><h3>Stack Trace:</h3><pre>' + stacktrace + '</pre></div>' if stacktrace else ''}

            <p style="margin-top: 20px;">Please investigate this issue and take appropriate action.</p>

            <a href="#" class="button">View Task Details</a>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Automated Task Notification System</p>
        </div>
    </div>
</body>
</html>
"""
        return html

    def _render_weekly_report_template(self, tasks_summary: Dict) -> str:
        """
        Render weekly report email template.

        Args:
            tasks_summary: Dictionary with weekly statistics

        Returns:
            HTML email body
        """
        total = tasks_summary.get('total_executions', 0)
        successful = tasks_summary.get('successful', 0)
        failed = tasks_summary.get('failed', 0)
        success_rate = tasks_summary.get('success_rate', 0.0)
        failed_tasks = tasks_summary.get('failed_tasks', [])

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 700px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
        .stat-box {{ background-color: white; padding: 20px; text-align: center; border-radius: 5px; flex: 1; margin: 0 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .stat-value {{ font-size: 2em; font-weight: bold; color: #2196F3; }}
        .stat-label {{ color: #666; font-size: 0.9em; }}
        .success-rate {{ color: #4CAF50; }}
        .chart {{ background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }}
        .bar {{ background-color: #4CAF50; height: 30px; border-radius: 3px; margin: 5px 0; }}
        .bar-failed {{ background-color: #f44336; }}
        .failed-list {{ background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }}
        .failed-item {{ padding: 10px; border-left: 3px solid #f44336; margin: 5px 0; background-color: #ffebee; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Weekly Report</h1>
            <p>Summary of all tasks for the week</p>
        </div>
        <div class="content">
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-value">{total}</div>
                    <div class="stat-label">Total Executions</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: #4CAF50;">{successful}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: #f44336;">{failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value success-rate">{success_rate:.1f}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>

            <div class="chart">
                <h3>Execution Overview</h3>
                <p>Successful Tasks</p>
                <div class="bar" style="width: {(successful/total*100 if total > 0 else 0):.0f}%;"></div>
                <p>Failed Tasks</p>
                <div class="bar bar-failed" style="width: {(failed/total*100 if total > 0 else 0):.0f}%;"></div>
            </div>

            {self._render_failed_tasks_section(failed_tasks) if failed_tasks else '<p>No failed tasks this week!</p>'}

            <p style="margin-top: 30px; text-align: center;">
                <strong>Keep up the great work!</strong>
            </p>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Automated Task Notification System</p>
            <p>Generated on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>
"""
        return html

    def _render_failed_tasks_section(self, failed_tasks: List[Dict]) -> str:
        """Render failed tasks section for weekly report."""
        html = '<div class="failed-list"><h3>Failed Tasks:</h3>'
        for task in failed_tasks:
            task_name = task.get('name', 'Unknown')
            error = task.get('error', 'No error message')
            html += f'<div class="failed-item"><strong>{task_name}</strong><br>{error}</div>'
        html += '</div>'
        return html

    def _html_to_plain(self, html: str) -> str:
        """
        Convert HTML to plain text (simple implementation).

        Args:
            html: HTML string

        Returns:
            Plain text string
        """
        # Simple HTML to text conversion (basic implementation)
        import re
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html)
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

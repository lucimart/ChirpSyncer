"""
Celery tasks for email notifications.

Fire-and-forget tasks for:
- Sync complete/failed notifications
- Password reset emails
- Weekly reports
"""

import os

from app.core.celery_app import celery_app
from app.core.logger import setup_logger
from app.services.notification_service import NotificationService
from app.services.notification_preferences import NotificationPreferences
from app.services.report_aggregator import ReportAggregator
from app.auth.user_manager import UserManager

logger = setup_logger(__name__)

DB_PATH = os.getenv("DB_PATH", "chirpsyncer.db")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def _get_notification_service() -> NotificationService:
    """Get NotificationService instance."""
    return NotificationService()


def _get_preferences_manager() -> NotificationPreferences:
    """Get NotificationPreferences instance."""
    return NotificationPreferences(db_path=DB_PATH)


def _get_user_manager() -> UserManager:
    """Get UserManager instance."""
    return UserManager(db_path=DB_PATH)


@celery_app.task(bind=True, ignore_result=True)
def send_sync_notification(
    self, user_id: int, job_id: str, status: str, details: dict
):
    """
    Send notification for sync completion or failure.

    Fire-and-forget task that checks user preferences before sending.

    Args:
        user_id: User ID
        job_id: Sync job ID
        status: 'completed' or 'failed'
        details: Dict with posts_synced (success) or error (failure)
    """
    logger.info(f"Processing sync notification for user {user_id}, job {job_id}")

    prefs_manager = _get_preferences_manager()
    notification_type = "sync_complete" if status == "completed" else "sync_failed"

    # Check if user wants email notifications for this type
    if not prefs_manager.should_notify(user_id, notification_type, channel="email"):
        logger.debug(f"User {user_id} has disabled {notification_type} email notifications")
        return

    # Get user email
    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)
    if not user or not user.email:
        logger.warning(f"User {user_id} not found or has no email")
        return

    # Send notification
    notification_service = _get_notification_service()

    if status == "completed":
        result = {
            "items_processed": details.get("posts_synced", 0),
            "duration": details.get("duration", 0),
            "success": True,
        }
        notification_service.notify_task_completion(
            task_name=f"Sync Job {job_id}",
            result=result,
            recipients=[user.email],
        )
        logger.info(f"Sent sync completion email to {user.email}")
    else:
        error_msg = details.get("error", "Unknown error")
        notification_service.notify_task_failure(
            task_name=f"Sync Job {job_id}",
            error=error_msg,
            recipients=[user.email],
        )
        logger.info(f"Sent sync failure email to {user.email}")


@celery_app.task(bind=True, ignore_result=True)
def send_password_reset_email(self, user_id: int, token: str, email: str):
    """
    Send password reset email.

    Args:
        user_id: User ID
        token: Password reset token
        email: User's email address
    """
    logger.info(f"Sending password reset email to {email}")

    notification_service = _get_notification_service()
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

    html_body = _render_password_reset_template(reset_url)

    success = notification_service.send_email(
        to=email,
        subject="Reset Your ChirpSyncer Password",
        body=html_body,
        html=True,
    )

    if success:
        logger.info(f"Password reset email sent to {email}")
    else:
        logger.warning(f"Failed to send password reset email to {email}")


@celery_app.task(bind=True)
def send_weekly_reports(self):
    """
    Send weekly reports to all opted-in users.

    Scheduled task that runs every Monday at 9 AM.
    """
    logger.info("Starting weekly report distribution")

    prefs_manager = _get_preferences_manager()
    report_aggregator = ReportAggregator(db_path=DB_PATH)
    user_manager = _get_user_manager()
    notification_service = _get_notification_service()

    # Get users who want weekly reports
    user_ids = prefs_manager.get_users_with_preference("weekly_report_enabled", True)
    logger.info(f"Found {len(user_ids)} users opted in for weekly reports")

    sent_count = 0
    failed_count = 0

    for user_id in user_ids:
        try:
            # Check if user should receive notification now (quiet hours, etc.)
            if not prefs_manager.should_notify(user_id, "weekly_report", "email"):
                logger.debug(f"Skipping weekly report for user {user_id} (quiet hours)")
                continue

            # Get user
            user = user_manager.get_user_by_id(user_id)
            if not user or not user.email:
                continue

            # Generate report
            summary = report_aggregator.get_weekly_summary(user_id)

            # Skip if no activity
            if summary["total_executions"] == 0:
                logger.debug(f"Skipping weekly report for user {user_id} (no activity)")
                continue

            # Generate unsubscribe token
            unsubscribe_token = prefs_manager.generate_unsubscribe_token(user_id)
            unsubscribe_url = f"{FRONTEND_URL}/unsubscribe?token={unsubscribe_token}&type=weekly_report"

            # Render and send email
            html_body = _render_weekly_report_template(summary, unsubscribe_url)

            success = notification_service.send_email(
                to=user.email,
                subject="Your Weekly ChirpSyncer Report",
                body=html_body,
                html=True,
            )

            if success:
                sent_count += 1
                logger.info(f"Sent weekly report to user {user_id}")
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f"Error sending weekly report to user {user_id}: {e}")
            failed_count += 1

    logger.info(
        f"Weekly report distribution complete: {sent_count} sent, {failed_count} failed"
    )
    return {"sent": sent_count, "failed": failed_count}


@celery_app.task(bind=True, ignore_result=True)
def send_rate_limit_notification(self, user_id: int, platform: str, details: dict):
    """
    Send notification when rate limit is hit.

    Args:
        user_id: User ID
        platform: Platform that hit rate limit
        details: Details about the rate limit
    """
    prefs_manager = _get_preferences_manager()

    if not prefs_manager.should_notify(user_id, "rate_limit", "email"):
        return

    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)
    if not user or not user.email:
        return

    notification_service = _get_notification_service()
    html_body = _render_rate_limit_template(platform, details)

    notification_service.send_email(
        to=user.email,
        subject=f"Rate Limit Warning: {platform.title()}",
        body=html_body,
        html=True,
    )


@celery_app.task(bind=True, ignore_result=True)
def send_credential_expired_notification(self, user_id: int, platform: str):
    """
    Send notification when credentials expire.

    Args:
        user_id: User ID
        platform: Platform with expired credentials
    """
    prefs_manager = _get_preferences_manager()

    if not prefs_manager.should_notify(user_id, "credential_expired", "email"):
        return

    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)
    if not user or not user.email:
        return

    notification_service = _get_notification_service()
    html_body = _render_credential_expired_template(platform)

    notification_service.send_email(
        to=user.email,
        subject=f"Action Required: {platform.title()} Credentials Expired",
        body=html_body,
        html=True,
    )


def _render_password_reset_template(reset_url: str) -> str:
    """Render password reset email template."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .button {{ display: inline-block; background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
        .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi,</p>
            <p>We received a request to reset your ChirpSyncer password. Click the button below to create a new password:</p>

            <p style="text-align: center;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </p>

            <div class="warning">
                <strong>This link expires in 1 hour.</strong>
                <p style="margin: 5px 0 0 0;">If you didn't request this, you can safely ignore this email.</p>
            </div>

            <p>Or copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">{reset_url}</p>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Twitter & Bluesky Sync</p>
        </div>
    </div>
</body>
</html>
"""


def _render_weekly_report_template(summary: dict, unsubscribe_url: str) -> str:
    """Render weekly report email template."""
    total = summary["total_executions"]
    successful = summary["successful"]
    failed = summary["failed"]
    success_rate = summary["success_rate"]
    posts_synced = summary["posts_synced"]
    top_errors = summary.get("top_errors", [])

    errors_html = ""
    if top_errors:
        errors_html = '<div class="errors"><h3>Top Issues:</h3><ul>'
        for err in top_errors[:3]:
            errors_html += f'<li>{err["error"][:100]} ({err["count"]}x)</li>'
        errors_html += "</ul></div>"

    return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .stats {{ display: flex; justify-content: space-around; flex-wrap: wrap; margin: 20px 0; }}
        .stat-box {{ background-color: white; padding: 15px 20px; text-align: center; border-radius: 5px; margin: 5px; min-width: 100px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .stat-value {{ font-size: 1.8em; font-weight: bold; color: #2196F3; }}
        .stat-label {{ color: #666; font-size: 0.85em; }}
        .success {{ color: #4CAF50; }}
        .failure {{ color: #f44336; }}
        .errors {{ background-color: #ffebee; padding: 15px; margin: 15px 0; border-radius: 5px; }}
        .errors h3 {{ margin-top: 0; color: #c62828; }}
        .errors ul {{ margin: 0; padding-left: 20px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.85em; }}
        .unsubscribe {{ margin-top: 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weekly Sync Report</h1>
            <p>Your sync activity for the past 7 days</p>
        </div>
        <div class="content">
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-value">{total}</div>
                    <div class="stat-label">Total Syncs</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value success">{successful}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value failure">{failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{success_rate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>

            <div class="stat-box" style="width: 100%; margin-top: 10px;">
                <div class="stat-value">{posts_synced}</div>
                <div class="stat-label">Posts Synced</div>
            </div>

            {errors_html}

            <p style="text-align: center; margin-top: 20px;">
                Keep your accounts in sync!
            </p>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Twitter & Bluesky Sync</p>
            <p class="unsubscribe">
                <a href="{unsubscribe_url}" style="color: #999;">Unsubscribe from weekly reports</a>
            </p>
        </div>
    </div>
</body>
</html>
"""


def _render_rate_limit_template(platform: str, details: dict) -> str:
    """Render rate limit notification template."""
    reset_time = details.get("reset_time", "soon")

    return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .warning-box {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rate Limit Warning</h1>
        </div>
        <div class="content">
            <div class="warning-box">
                <strong>{platform.title()} API rate limit reached.</strong>
                <p>Syncing will resume automatically when the limit resets ({reset_time}).</p>
            </div>
            <p>This is usually temporary. If this happens frequently, consider:</p>
            <ul>
                <li>Reducing sync frequency in your settings</li>
                <li>Checking if your API credentials have sufficient quota</li>
            </ul>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Twitter & Bluesky Sync</p>
        </div>
    </div>
</body>
</html>
"""


def _render_credential_expired_template(platform: str) -> str:
    """Render credential expired notification template."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .action-box {{ background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; }}
        .button {{ display: inline-block; background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Action Required</h1>
        </div>
        <div class="content">
            <div class="action-box">
                <strong>Your {platform.title()} credentials have expired.</strong>
                <p>Syncing for this platform has been paused until you update your credentials.</p>
            </div>
            <p>Please log in to ChirpSyncer and reconnect your {platform.title()} account to resume syncing.</p>
            <p style="text-align: center;">
                <a href="{FRONTEND_URL}/settings/credentials" class="button">Update Credentials</a>
            </p>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Twitter & Bluesky Sync</p>
        </div>
    </div>
</body>
</html>
"""

"""
Inbox Tasks - Celery tasks for message ingestion.

Handles fetching and ingesting messages from platforms into the unified inbox.
"""

from typing import List

from app.core.celery_app import celery_app
from app.core.logger import setup_logger
from app.core import config

logger = setup_logger(__name__)

# Supported platforms for inbox ingestion
SUPPORTED_PLATFORMS = ["twitter", "bluesky"]


@celery_app.task(bind=True)
def ingest_messages(self, user_id: int, platform: str, db_path: str = "chirpsyncer.db") -> dict:
    """
    Fetch and ingest messages from a platform into unified inbox.

    Fetches new messages (mentions, DMs, replies) from the specified platform
    and stores them in the unified inbox.

    Args:
        user_id: User ID to ingest messages for
        platform: Platform to fetch from (twitter, bluesky)
        db_path: Path to the SQLite database

    Returns:
        Dict with ingested_count and any errors
    """
    from app.features.inbox.service import InboxService

    logger.info(f"Starting message ingestion for user {user_id} from {platform}")

    if platform not in SUPPORTED_PLATFORMS:
        error_msg = f"Unsupported platform: {platform}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "ingested_count": 0}

    try:
        service = InboxService(db_path=db_path)

        # Fetch messages from platform connector
        messages = _fetch_platform_messages(user_id, platform, db_path)

        ingested_count = 0
        errors = []

        for message in messages:
            try:
                # Store in unified inbox
                _store_message(service, user_id, platform, message)
                ingested_count += 1
            except Exception as e:
                errors.append(str(e))
                logger.warning(f"Failed to store message: {e}")

        logger.info(
            f"Ingestion completed for user {user_id} from {platform}: "
            f"{ingested_count} messages ingested"
        )

        return {
            "success": True,
            "ingested_count": ingested_count,
            "errors": errors if errors else None,
        }

    except Exception as exc:
        logger.error(f"Message ingestion failed for user {user_id} from {platform}: {exc}")
        return {"success": False, "error": str(exc), "ingested_count": 0}


@celery_app.task(bind=True)
def ingest_all_platforms(self, user_id: int, db_path: str = "chirpsyncer.db") -> dict:
    """
    Ingest messages from all connected platforms.

    Triggers ingestion tasks for each platform the user has connected.

    Args:
        user_id: User ID to ingest messages for
        db_path: Path to the SQLite database

    Returns:
        Dict with results per platform
    """
    logger.info(f"Starting multi-platform ingestion for user {user_id}")

    results = {}

    for platform in SUPPORTED_PLATFORMS:
        try:
            # Check if user has this platform connected
            if _is_platform_connected(user_id, platform, db_path):
                # Queue individual platform ingestion
                task = ingest_messages.delay(user_id, platform, db_path)
                results[platform] = {
                    "queued": True,
                    "task_id": task.id,
                }
            else:
                results[platform] = {
                    "queued": False,
                    "reason": "not_connected",
                }
        except Exception as e:
            logger.error(f"Failed to queue ingestion for {platform}: {e}")
            results[platform] = {
                "queued": False,
                "error": str(e),
            }

    return {
        "success": True,
        "platforms": results,
    }


def _fetch_platform_messages(user_id: int, platform: str, db_path: str) -> List[dict]:
    """
    Fetch messages from a platform connector.

    Args:
        user_id: User ID
        platform: Platform name
        db_path: Database path

    Returns:
        List of message dicts
    """
    # Import connectors lazily to avoid circular imports
    if platform == "twitter":
        from app.protocols.connectors.twitter_connector import TwitterConnector
        connector = TwitterConnector(db_path=db_path, user_id=user_id)
    elif platform == "bluesky":
        from app.protocols.connectors.bluesky_connector import BlueskyConnector
        connector = BlueskyConnector(db_path=db_path, user_id=user_id)
    else:
        return []

    # Fetch mentions/notifications as messages
    # This is a simplified implementation - real version would fetch
    # actual DMs, mentions, and replies
    try:
        notifications = connector.fetch_notifications()
        return notifications
    except Exception as e:
        logger.warning(f"Failed to fetch notifications from {platform}: {e}")
        return []


def _store_message(service, user_id: int, platform: str, message: dict) -> None:
    """
    Store a message in the unified inbox.

    Args:
        service: InboxService instance
        user_id: User ID
        platform: Platform name
        message: Message data dict
    """
    import sqlite3
    import time
    import uuid

    conn = sqlite3.connect(service.db_path)
    cursor = conn.cursor()

    try:
        message_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT OR IGNORE INTO unified_messages
            (id, user_id, platform, platform_message_id, message_type, sender_id,
             sender_username, sender_display_name, content, created_at, is_read,
             is_starred, is_archived)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
            """,
            (
                message_id,
                user_id,
                platform,
                message.get("id", ""),
                message.get("type", "notification"),
                message.get("sender_id", ""),
                message.get("sender_username", ""),
                message.get("sender_display_name", ""),
                message.get("content", ""),
                message.get("created_at", int(time.time())),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _is_platform_connected(user_id: int, platform: str, db_path: str) -> bool:
    """
    Check if a user has a platform connected.

    Args:
        user_id: User ID
        platform: Platform name
        db_path: Database path

    Returns:
        True if platform is connected
    """
    import sqlite3

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT 1 FROM user_credentials
            WHERE user_id = ? AND platform = ?
            LIMIT 1
            """,
            (user_id, platform),
        )
        return cursor.fetchone() is not None
    except Exception:
        # Table might not exist, assume not connected
        return False
    finally:
        conn.close()

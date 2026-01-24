"""
Report Aggregator for ChirpSyncer.

Aggregates sync statistics for weekly reports and analytics.
"""

import sqlite3
import time
from collections import Counter
from typing import Dict, List, Any, Optional

from app.core.logger import setup_logger

logger = setup_logger(__name__)


class ReportAggregator:
    """
    Aggregates sync statistics for reporting.

    Provides data for weekly reports including:
    - Total executions and success/failure counts
    - Success rate
    - Posts synced
    - Top errors
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize ReportAggregator.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def get_weekly_summary(self, user_id: int, days: int = 7) -> Dict[str, Any]:
        """
        Aggregate sync stats for the last N days.

        Args:
            user_id: User ID to get stats for
            days: Number of days to look back (default 7)

        Returns:
            Dictionary with aggregated statistics:
            - total_executions: int
            - successful: int
            - failed: int
            - success_rate: float (0-100)
            - posts_synced: int
            - top_errors: List[Dict] with error and count
            - by_direction: Dict with stats per sync direction
        """
        cutoff = int(time.time()) - (days * 24 * 60 * 60)

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()

            # Get sync_jobs stats
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(COALESCE(posts_synced, 0)) as posts_synced
                FROM sync_jobs
                WHERE user_id = ? AND created_at >= ?
                """,
                (user_id, cutoff),
            )
            jobs_row = cursor.fetchone()

            total = jobs_row["total"] or 0
            successful = jobs_row["successful"] or 0
            failed = jobs_row["failed"] or 0
            posts_synced = jobs_row["posts_synced"] or 0

            # Calculate success rate
            success_rate = (successful / total * 100) if total > 0 else 0.0

            # Get error messages for failed jobs
            cursor.execute(
                """
                SELECT error_message FROM sync_jobs
                WHERE user_id = ? AND created_at >= ? AND status = 'failed'
                    AND error_message IS NOT NULL
                """,
                (user_id, cutoff),
            )
            errors = [row["error_message"] for row in cursor.fetchall()]
            error_counts = Counter(errors)
            top_errors = [
                {"error": error, "count": count}
                for error, count in error_counts.most_common(5)
            ]

            # Get stats by direction
            cursor.execute(
                """
                SELECT
                    direction,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                    SUM(COALESCE(posts_synced, 0)) as posts_synced
                FROM sync_jobs
                WHERE user_id = ? AND created_at >= ?
                GROUP BY direction
                """,
                (user_id, cutoff),
            )
            by_direction = {}
            for row in cursor.fetchall():
                by_direction[row["direction"]] = {
                    "total": row["total"],
                    "successful": row["successful"],
                    "posts_synced": row["posts_synced"],
                }

            # Get additional stats from sync_stats table if available
            platform_stats = self._get_platform_stats(cursor, user_id, cutoff)

            return {
                "total_executions": total,
                "successful": successful,
                "failed": failed,
                "success_rate": round(success_rate, 1),
                "posts_synced": posts_synced,
                "top_errors": top_errors,
                "by_direction": by_direction,
                "platform_stats": platform_stats,
                "period_days": days,
            }

        finally:
            conn.close()

    def _get_platform_stats(
        self, cursor: sqlite3.Cursor, user_id: int, cutoff: int
    ) -> Dict[str, Any]:
        """
        Get platform-specific stats from sync_stats table.

        Args:
            cursor: Database cursor
            user_id: User ID
            cutoff: Unix timestamp cutoff

        Returns:
            Dictionary with per-platform statistics
        """
        try:
            cursor.execute(
                """
                SELECT
                    source,
                    target,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
                FROM sync_stats
                WHERE user_id = ? AND timestamp >= ?
                GROUP BY source, target
                """,
                (user_id, cutoff),
            )
            stats = {}
            for row in cursor.fetchall():
                key = f"{row['source']}_to_{row['target']}"
                stats[key] = {
                    "successful": row["successful"],
                    "failed": row["failed"],
                }
            return stats
        except sqlite3.OperationalError:
            # Table might not exist
            return {}

    def get_all_users_weekly_summary(self) -> List[Dict[str, Any]]:
        """
        Get weekly summaries for all users.

        Returns:
            List of summaries with user_id included
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT user_id FROM sync_jobs")
            user_ids = [row[0] for row in cursor.fetchall()]
        finally:
            conn.close()

        summaries = []
        for user_id in user_ids:
            summary = self.get_weekly_summary(user_id)
            summary["user_id"] = user_id
            summaries.append(summary)

        return summaries

    def get_user_activity_trend(
        self, user_id: int, days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get daily activity trend for a user.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            List of daily stats, one per day
        """
        cutoff = int(time.time()) - (days * 24 * 60 * 60)

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()

            # Group by day
            cursor.execute(
                """
                SELECT
                    date(created_at, 'unixepoch') as day,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                    SUM(COALESCE(posts_synced, 0)) as posts_synced
                FROM sync_jobs
                WHERE user_id = ? AND created_at >= ?
                GROUP BY day
                ORDER BY day
                """,
                (user_id, cutoff),
            )

            return [
                {
                    "date": row["day"],
                    "total": row["total"],
                    "successful": row["successful"],
                    "posts_synced": row["posts_synced"],
                }
                for row in cursor.fetchall()
            ]

        finally:
            conn.close()

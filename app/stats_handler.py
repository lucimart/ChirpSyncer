import sqlite3
import time
import os
from app.logger import setup_logger

logger = setup_logger(__name__)

# Define the database file path
DB_PATH = os.path.join(os.getcwd(), "data.db")


class StatsTracker:
    """
    Statistics tracker for monitoring synchronization performance and health.

    Tracks sync operations, errors, media counts, thread counts, and calculates
    success rates and aggregated statistics over configurable time periods.
    """

    def __init__(self, db_path=None):
        """
        Initialize the StatsTracker.

        Args:
            db_path: Path to database file (defaults to DB_PATH)
        """
        self.db_path = db_path or DB_PATH

    def record_sync(self, source, target, success, media_count=0, is_thread=False, duration_ms=0):
        """
        Record a synchronization operation.

        Args:
            source: Source platform ('twitter' or 'bluesky')
            target: Target platform ('bluesky' or 'twitter')
            success: Boolean indicating if sync was successful
            media_count: Number of media items synced (default: 0)
            is_thread: Boolean indicating if this was a thread sync (default: False)
            duration_ms: Duration of the sync operation in milliseconds (default: 0)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            timestamp = int(time.time())
            success_int = 1 if success else 0
            is_thread_int = 1 if is_thread else 0

            cursor.execute("""
            INSERT INTO sync_stats (timestamp, source, target, success, media_count, is_thread, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (timestamp, source, target, success_int, media_count, is_thread_int, duration_ms))

            conn.commit()
            conn.close()

            logger.debug(f"Recorded sync: {source}->{target}, success={success}, media={media_count}, thread={is_thread}")

        except Exception as e:
            logger.error(f"Failed to record sync stats: {e}")

    def record_error(self, source, target, error_type, error_message):
        """
        Record a synchronization error.

        Args:
            source: Source platform ('twitter' or 'bluesky')
            target: Target platform ('bluesky' or 'twitter')
            error_type: Type/category of error (e.g., 'APIError', 'NetworkError')
            error_message: Detailed error message
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            timestamp = int(time.time())

            cursor.execute("""
            INSERT INTO sync_stats (timestamp, source, target, success, error_type, error_message)
            VALUES (?, ?, ?, 0, ?, ?)
            """, (timestamp, source, target, error_type, error_message))

            conn.commit()
            conn.close()

            logger.debug(f"Recorded error: {source}->{target}, type={error_type}")

        except Exception as e:
            logger.error(f"Failed to record error: {e}")

    def get_stats(self, period='24h'):
        """
        Get aggregated statistics for a time period.

        Args:
            period: Time period string ('1h', '24h', '7d', '30d') (default: '24h')

        Returns:
            Dictionary containing aggregated statistics:
                - total_syncs: Total number of sync operations
                - successful_syncs: Number of successful syncs
                - failed_syncs: Number of failed syncs
                - twitter_to_bluesky: Number of Twitter->Bluesky syncs
                - bluesky_to_twitter: Number of Bluesky->Twitter syncs
                - total_media: Total media items synced
                - total_threads: Total threads synced
        """
        try:
            # Parse period to seconds
            period_seconds = self._parse_period(period)
            cutoff_timestamp = int(time.time()) - period_seconds

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Get aggregated stats
            cursor.execute("""
            SELECT
                COUNT(*) as total_syncs,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_syncs,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_syncs,
                SUM(CASE WHEN source = 'twitter' AND target = 'bluesky' THEN 1 ELSE 0 END) as twitter_to_bluesky,
                SUM(CASE WHEN source = 'bluesky' AND target = 'twitter' THEN 1 ELSE 0 END) as bluesky_to_twitter,
                SUM(media_count) as total_media,
                SUM(CASE WHEN is_thread = 1 THEN 1 ELSE 0 END) as total_threads
            FROM sync_stats
            WHERE timestamp >= ?
            """, (cutoff_timestamp,))

            row = cursor.fetchone()
            conn.close()

            # Handle NULL values from empty result set
            return {
                'total_syncs': row[0] or 0,
                'successful_syncs': row[1] or 0,
                'failed_syncs': row[2] or 0,
                'twitter_to_bluesky': row[3] or 0,
                'bluesky_to_twitter': row[4] or 0,
                'total_media': row[5] or 0,
                'total_threads': row[6] or 0
            }

        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            # Return empty stats on error
            return {
                'total_syncs': 0,
                'successful_syncs': 0,
                'failed_syncs': 0,
                'twitter_to_bluesky': 0,
                'bluesky_to_twitter': 0,
                'total_media': 0,
                'total_threads': 0
            }

    def get_error_log(self, limit=100):
        """
        Get recent error log entries.

        Args:
            limit: Maximum number of errors to retrieve (default: 100)

        Returns:
            List of dictionaries containing error details:
                - timestamp: Unix timestamp of error
                - source: Source platform
                - target: Target platform
                - error_type: Error type/category
                - error_message: Detailed error message
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
            SELECT timestamp, source, target, error_type, error_message
            FROM sync_stats
            WHERE error_type IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT ?
            """, (limit,))

            rows = cursor.fetchall()
            conn.close()

            # Convert to list of dictionaries
            errors = []
            for row in rows:
                errors.append({
                    'timestamp': row[0],
                    'source': row[1],
                    'target': row[2],
                    'error_type': row[3],
                    'error_message': row[4]
                })

            return errors

        except Exception as e:
            logger.error(f"Failed to get error log: {e}")
            return []

    def get_success_rate(self, period='24h'):
        """
        Calculate success rate for a time period.

        Args:
            period: Time period string ('1h', '24h', '7d', '30d') (default: '24h')

        Returns:
            Float representing success rate as percentage (0.0 to 100.0)
        """
        try:
            stats = self.get_stats(period=period)

            total = stats['total_syncs']
            if total == 0:
                return 0.0

            successful = stats['successful_syncs']
            return round((successful / total) * 100.0, 2)

        except Exception as e:
            logger.error(f"Failed to calculate success rate: {e}")
            return 0.0

    def _parse_period(self, period):
        """
        Parse period string to seconds.

        Args:
            period: Period string ('1h', '24h', '7d', '30d')

        Returns:
            Integer number of seconds
        """
        period_map = {
            '1h': 3600,
            '24h': 24 * 3600,
            '7d': 7 * 24 * 3600,
            '30d': 30 * 24 * 3600
        }

        # Default to 24h if invalid period
        return period_map.get(period, 24 * 3600)

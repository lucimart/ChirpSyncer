import os
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple, Dict

from flask import current_app

from app.core.db_handler import add_stats_tables


@dataclass
class UserStats:
    synced_today: int
    synced_week: int
    total_synced: int
    platforms_connected: int
    last_sync_at: Optional[str]
    next_sync_at: Optional[str]
    storage_used_mb: float
    tweets_archived: int


class StatsService:
    _cache: Dict[Tuple[str, int], Tuple[float, UserStats]] = {}
    _ttl_seconds = 60

    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            self.db_path = db_path
        else:
            self.db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")

    def get_user_stats(self, user_id: int) -> UserStats:
        cache_key = (self.db_path, user_id)
        now = time.time()
        cached = self._cache.get(cache_key)
        if cached and now - cached[0] < self._ttl_seconds:
            return cached[1]

        add_stats_tables(self.db_path)
        synced_today = self._count_syncs_since(user_id, days=1)
        synced_week = self._count_syncs_since(user_id, days=7)
        total_synced = self._count_total_syncs(user_id)
        platforms_connected = self._count_platforms_connected(user_id)
        last_sync_at = self._get_last_sync_at(user_id)
        storage_used_mb = self._get_storage_used_mb()
        tweets_archived = self._count_archived_tweets(user_id)

        stats = UserStats(
            synced_today=synced_today,
            synced_week=synced_week,
            total_synced=total_synced,
            platforms_connected=platforms_connected,
            last_sync_at=last_sync_at,
            next_sync_at=None,
            storage_used_mb=storage_used_mb,
            tweets_archived=tweets_archived,
        )

        self._cache[cache_key] = (now, stats)
        return stats

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _has_column(self, conn, table_name: str, column_name: str) -> bool:
        cursor = conn.execute(f"PRAGMA table_info({table_name})")
        return any(row[1] == column_name for row in cursor.fetchall())

    def _count_syncs_since(self, user_id: int, days: int) -> int:
        cutoff = int(time.time()) - (days * 24 * 3600)
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            if self._has_column(conn, "sync_stats", "user_id"):
                cursor.execute(
                    "SELECT COUNT(*) FROM sync_stats WHERE timestamp >= ? AND user_id = ?",
                    (cutoff, user_id),
                )
            else:
                cursor.execute(
                    "SELECT COUNT(*) FROM sync_stats WHERE timestamp >= ?",
                    (cutoff,),
                )
            return int(cursor.fetchone()[0] or 0)
        finally:
            conn.close()

    def _count_total_syncs(self, user_id: int) -> int:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            if self._has_column(conn, "sync_stats", "user_id"):
                cursor.execute(
                    "SELECT COUNT(*) FROM sync_stats WHERE user_id = ?",
                    (user_id,),
                )
            else:
                cursor.execute("SELECT COUNT(*) FROM sync_stats")
            return int(cursor.fetchone()[0] or 0)
        finally:
            conn.close()

    def _count_platforms_connected(self, user_id: int) -> int:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(DISTINCT platform) FROM user_credentials WHERE user_id = ?",
                (user_id,),
            )
            result = cursor.fetchone()
            return int(result[0] or 0)
        except sqlite3.OperationalError:
            return 0
        finally:
            conn.close()

    def _get_last_sync_at(self, user_id: int) -> Optional[str]:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            if self._has_column(conn, "sync_stats", "user_id"):
                cursor.execute(
                    "SELECT MAX(timestamp) FROM sync_stats WHERE user_id = ?",
                    (user_id,),
                )
            else:
                cursor.execute("SELECT MAX(timestamp) FROM sync_stats")
            row = cursor.fetchone()
            if not row or not row[0]:
                return None
            return datetime.utcfromtimestamp(row[0]).isoformat()
        finally:
            conn.close()

    def _count_archived_tweets(self, user_id: int) -> int:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM synced_posts WHERE source IS NOT NULL"
            )
            result = cursor.fetchone()
            return int(result[0] or 0)
        except sqlite3.OperationalError:
            return 0
        finally:
            conn.close()

    def _get_storage_used_mb(self) -> float:
        try:
            size_bytes = os.path.getsize(self.db_path)
        except OSError:
            return 0.0
        return round(size_bytes / (1024 * 1024), 2)

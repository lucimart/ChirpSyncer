import time
from typing import Any, Dict, Optional, Tuple

from flask import Blueprint, g

from app.auth.api_auth import require_auth
from app.services.stats_service import StatsService
from app.web.api.v1.responses import api_response

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

# Simple in-memory cache for dashboard stats (1 minute TTL)
_stats_cache: Dict[int, Tuple[float, Any]] = {}
_CACHE_TTL_SECONDS = 60


def _get_cached_stats(user_id: int) -> Optional[Any]:
    """Get cached stats if not expired."""
    if user_id in _stats_cache:
        cached_at, data = _stats_cache[user_id]
        if time.time() - cached_at < _CACHE_TTL_SECONDS:
            return data
        del _stats_cache[user_id]
    return None


def _set_cached_stats(user_id: int, data: Any) -> None:
    """Cache stats for user."""
    _stats_cache[user_id] = (time.time(), data)


@dashboard_bp.route("/stats", methods=["GET"])
@require_auth
def stats():
    # Check cache first (1 minute TTL per US-I1-002)
    cached = _get_cached_stats(g.user.id)
    if cached is not None:
        return api_response(cached)

    stats_data = StatsService().get_user_stats(g.user.id)
    result = {
        "synced_today": stats_data.synced_today,
        "synced_week": stats_data.synced_week,
        "total_synced": stats_data.total_synced,
        "platforms_connected": stats_data.platforms_connected,
        "last_sync_at": stats_data.last_sync_at,
        "next_sync_at": stats_data.next_sync_at,
        "storage_used_mb": stats_data.storage_used_mb,
        "tweets_archived": stats_data.tweets_archived,
    }

    _set_cached_stats(g.user.id, result)
    return api_response(result)

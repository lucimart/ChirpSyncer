from flask import Blueprint, g

from app.auth.api_auth import require_auth
from app.services.stats_service import StatsService
from app.web.api.v1.responses import api_response

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.route("/stats", methods=["GET"])
@require_auth
def stats():
    stats_data = StatsService().get_user_stats(g.user.id)
    return api_response(
        {
            "synced_today": stats_data.synced_today,
            "synced_week": stats_data.synced_week,
            "total_synced": stats_data.total_synced,
            "platforms_connected": stats_data.platforms_connected,
            "last_sync_at": stats_data.last_sync_at,
            "next_sync_at": stats_data.next_sync_at,
            "storage_used_mb": stats_data.storage_used_mb,
            "tweets_archived": stats_data.tweets_archived,
        }
    )

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.analytics_tracker import AnalyticsTracker
from app.web.api.v1.responses import api_response

analytics_bp = Blueprint("analytics", __name__, url_prefix="/analytics")


def _map_period(period: str) -> str:
    if period == "24h":
        return "daily"
    if period == "7d":
        return "weekly"
    if period == "30d":
        return "monthly"
    if period == "90d":
        return "monthly"
    return "daily"


@analytics_bp.route("/overview", methods=["GET"])
@require_auth
def overview():
    period = request.args.get("period", "30d")
    tracker = AnalyticsTracker(current_app.config["DB_PATH"])
    tracker.init_db()
    analytics = tracker.get_user_analytics(g.user.id, _map_period(period))
    return api_response(analytics)


@analytics_bp.route("/top-tweets", methods=["GET"])
@require_auth
def top_tweets():
    tracker = AnalyticsTracker(current_app.config["DB_PATH"])
    tracker.init_db()
    metric = request.args.get("metric", "engagement_rate")
    limit = int(request.args.get("limit", 10))
    tweets = tracker.get_top_tweets(g.user.id, metric=metric, limit=limit)
    return api_response({"items": tweets, "metric": metric})

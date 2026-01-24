from flask import Blueprint, jsonify

from app.core.redis_client import ping_redis

health_bp = Blueprint("health", __name__, url_prefix="/health")


@health_bp.get("/")
@health_bp.get("")
def health_check():
    """Base health check endpoint."""
    return jsonify({"status": "healthy"}), 200


@health_bp.get("/redis")
def redis_health():
    healthy = ping_redis()
    status = "ok" if healthy else "unavailable"
    return jsonify({"status": status, "service": "redis"}), 200 if healthy else 503

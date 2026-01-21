import sqlite3

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.saved_content import SavedContentManager
from app.web.api.v1.responses import api_error, api_response

bookmarks_bp = Blueprint("bookmarks", __name__, url_prefix="")


def _get_manager():
    manager = SavedContentManager(current_app.config["DB_PATH"])
    manager.init_db()
    return manager


@bookmarks_bp.route("/bookmarks", methods=["GET"])
@require_auth
def list_bookmarks():
    manager = _get_manager()
    collection_id = request.args.get("collection_id")
    collection_id = int(collection_id) if collection_id else None
    items = manager.get_saved_tweets(g.user.id, collection_id)
    return api_response(items)


@bookmarks_bp.route("/bookmarks", methods=["POST"])
@require_auth
def create_bookmark():
    data = request.get_json(silent=True) or {}
    tweet_id = data.get("tweet_id")
    collection_id = data.get("collection_id")
    notes = data.get("notes")
    if not tweet_id:
        return api_error("INVALID_REQUEST", "tweet_id is required", status=400)
    manager = _get_manager()
    saved = manager.save_tweet(g.user.id, tweet_id, collection_id, notes)
    if not saved:
        return api_error("ALREADY_SAVED", "Bookmark already exists", status=409)
    items = manager.get_saved_tweets(g.user.id, collection_id)
    return api_response(items[0] if items else {"tweet_id": tweet_id}, status=201)


@bookmarks_bp.route("/bookmarks/<int:bookmark_id>", methods=["DELETE"])
@require_auth
def delete_bookmark(bookmark_id: int):
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM saved_tweets WHERE id = ? AND user_id = ?",
            (bookmark_id, g.user.id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return api_error("NOT_FOUND", "Bookmark not found", status=404)
    finally:
        conn.close()
    return api_response({"deleted": True})


@bookmarks_bp.route("/collections", methods=["GET"])
@require_auth
def list_collections():
    manager = _get_manager()
    return api_response(manager.get_collections(g.user.id))


@bookmarks_bp.route("/collections", methods=["POST"])
@require_auth
def create_collection():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    description = data.get("description")
    if not name:
        return api_error("INVALID_REQUEST", "name is required", status=400)
    manager = _get_manager()
    collection_id = manager.create_collection(g.user.id, name, description)
    if not collection_id:
        return api_error("DUPLICATE", "Collection already exists", status=409)
    collections = manager.get_collections(g.user.id)
    created = next((c for c in collections if c["id"] == collection_id), None)
    return api_response(created, status=201)


@bookmarks_bp.route("/bookmarks/<int:bookmark_id>/collection", methods=["PUT"])
@require_auth
def move_bookmark(bookmark_id: int):
    data = request.get_json(silent=True) or {}
    collection_id = data.get("collection_id")
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE saved_tweets
            SET collection_id = ?
            WHERE id = ? AND user_id = ?
        """,
            (collection_id, bookmark_id, g.user.id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return api_error("NOT_FOUND", "Bookmark not found", status=404)
    finally:
        conn.close()
    return api_response({"moved": True})

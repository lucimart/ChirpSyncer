"""Export API endpoints for data export functionality."""

import csv
import io
import json
import sqlite3
from datetime import datetime, timedelta

from flask import Blueprint, current_app, request, g, Response

from app.auth.api_auth import require_auth
from app.web.api.v1.responses import api_response, api_error

export_bp = Blueprint("export", __name__, url_prefix="/export")


def _get_connection():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _has_column(conn, table_name: str, column_name: str) -> bool:
    cursor = conn.execute(f"PRAGMA table_info({table_name})")  # nosec: table_name is hardcoded
    return any(row[1] == column_name for row in cursor.fetchall())


def _get_date_filter(date_range: str):
    """Convert date_range param to timestamp cutoff."""
    now = datetime.utcnow()
    ranges = {
        "week": timedelta(days=7),
        "month": timedelta(days=30),
        "3months": timedelta(days=90),
        "6months": timedelta(days=180),
        "year": timedelta(days=365),
    }
    if date_range in ranges:
        cutoff = now - ranges[date_range]
        return cutoff.timestamp()
    return None


def _fetch_posts(
    user_id: int, platform: str, date_cutoff: float | None, include_deleted: bool
):
    """Fetch posts from database with filters."""
    conn = _get_connection()
    try:
        cursor = conn.cursor()

        # Build query for synced_posts
        conditions = []
        params = []

        if platform and platform != "all":
            conditions.append("source = ?")
            params.append(platform)

        if date_cutoff:
            conditions.append("synced_at >= datetime(?, 'unixepoch')")
            params.append(date_cutoff)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        query = f"""
            SELECT id, twitter_id, bluesky_uri, source, content_hash,
                   synced_to, synced_at, original_text
            FROM synced_posts
            {where_clause}
            ORDER BY synced_at DESC
        """  # nosec B608

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()


def _format_json(posts: list, include_media: bool, include_metrics: bool) -> str:
    """Format posts as JSON."""
    formatted = []
    for post in posts:
        item = {
            "id": post["id"],
            "content": post["original_text"],
            "source": post["source"],
            "synced_to": post["synced_to"],
            "synced_at": post["synced_at"],
        }
        if post["twitter_id"]:
            item["twitter_id"] = post["twitter_id"]
        if post["bluesky_uri"]:
            item["bluesky_uri"] = post["bluesky_uri"]
        if include_media:
            item["media"] = []
        if include_metrics:
            item["metrics"] = {"likes": 0, "reposts": 0, "replies": 0}
        formatted.append(item)
    return json.dumps(
        {
            "posts": formatted,
            "exported_at": datetime.utcnow().isoformat(),
            "total": len(formatted),
        },
        indent=2,
    )


def _format_csv(posts: list, include_media: bool, include_metrics: bool) -> str:
    """Format posts as CSV."""
    output = io.StringIO()
    fieldnames = [
        "id",
        "content",
        "source",
        "synced_to",
        "synced_at",
        "twitter_id",
        "bluesky_uri",
    ]
    if include_metrics:
        fieldnames.extend(["likes", "reposts", "replies"])

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for post in posts:
        row = {
            "id": post["id"],
            "content": post["original_text"],
            "source": post["source"],
            "synced_to": post["synced_to"],
            "synced_at": post["synced_at"],
            "twitter_id": post.get("twitter_id", ""),
            "bluesky_uri": post.get("bluesky_uri", ""),
        }
        if include_metrics:
            row.update({"likes": 0, "reposts": 0, "replies": 0})
        writer.writerow(row)

    return output.getvalue()


def _format_txt(posts: list) -> str:
    """Format posts as plain text."""
    lines = []
    lines.append(f"ChirpSyncer Export - {datetime.utcnow().isoformat()}")
    lines.append(f"Total posts: {len(posts)}")
    lines.append("=" * 50)
    lines.append("")

    for post in posts:
        lines.append(f"[{post['source']}] {post['synced_at']}")
        lines.append(post["original_text"])
        if post.get("twitter_id"):
            lines.append(f"Twitter: {post['twitter_id']}")
        if post.get("bluesky_uri"):
            lines.append(f"Bluesky: {post['bluesky_uri']}")
        lines.append("-" * 30)
        lines.append("")

    return "\n".join(lines)


@export_bp.route("", methods=["POST"])
@require_auth
def export_data():
    """
    Export user's posts in specified format.

    Request body:
        format: json | csv | txt
        date_range: all | week | month | 3months | 6months | year
        platform: all | twitter | bluesky
        include_media: boolean
        include_metrics: boolean
        include_deleted: boolean

    Returns:
        File download in requested format
    """
    data = request.get_json(silent=True) or {}

    export_format = data.get("format", "json")
    if export_format not in ("json", "csv", "txt"):
        return api_error(
            "INVALID_FORMAT", "Format must be json, csv, or txt", status=400
        )

    date_range = data.get("date_range", "all")
    platform = data.get("platform", "all")
    include_media = data.get("include_media", True)
    include_metrics = data.get("include_metrics", True)
    include_deleted = data.get("include_deleted", False)

    date_cutoff = _get_date_filter(date_range)
    posts = _fetch_posts(g.user.id, platform, date_cutoff, include_deleted)

    timestamp = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"chirpsyncer-export-{timestamp}.{export_format}"

    if export_format == "json":
        content = _format_json(posts, include_media, include_metrics)
        mimetype = "application/json"
    elif export_format == "csv":
        content = _format_csv(posts, include_media, include_metrics)
        mimetype = "text/csv"
    else:
        content = _format_txt(posts)
        mimetype = "text/plain"

    return Response(
        content,
        mimetype=mimetype,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@export_bp.route("/preview", methods=["POST"])
@require_auth
def export_preview():
    """
    Preview export data (returns count and sample).

    Same parameters as /export but returns metadata only.
    """
    data = request.get_json(silent=True) or {}

    date_range = data.get("date_range", "all")
    platform = data.get("platform", "all")
    include_deleted = data.get("include_deleted", False)

    date_cutoff = _get_date_filter(date_range)
    posts = _fetch_posts(g.user.id, platform, date_cutoff, include_deleted)

    estimated_sizes = {
        "json": len(posts) * 500,
        "csv": len(posts) * 200,
        "txt": len(posts) * 150,
    }

    return api_response(
        {
            "total_posts": len(posts),
            "estimated_sizes": {
                fmt: f"~{size // 1024} KB" if size > 1024 else f"~{size} bytes"
                for fmt, size in estimated_sizes.items()
            },
            "sample": posts[:3] if posts else [],
        }
    )

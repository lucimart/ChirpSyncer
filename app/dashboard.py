"""
Web dashboard for monitoring ChirpSyncer sync status (MONITORING-001).

Provides real-time monitoring of sync statistics, recent activity, and errors.
"""

import os
import time
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request

from app.stats_handler import StatsTracker
from app.db_handler import get_recent_syncs, get_system_stats, DB_PATH
from app.logger import setup_logger

logger = setup_logger(__name__)

# Track application start time for uptime calculation
START_TIME = time.time()


def create_app(db_path=None):
    """
    Create and configure Flask application.

    Args:
        db_path: Path to database file (defaults to DB_PATH)

    Returns:
        Flask application instance
    """
    app = Flask(__name__, template_folder='templates')

    # Store db_path in app config
    app.config['DB_PATH'] = db_path or DB_PATH

    # Initialize routes
    @app.route('/')
    def index():
        """Main dashboard page."""
        logger.info("Dashboard accessed")
        return render_template('dashboard.html')

    @app.route('/api/stats')
    def api_stats():
        """
        Get aggregated statistics.

        Returns:
            JSON with stats:
                - total_syncs: Total syncs (all time)
                - syncs_today: Syncs in last 24 hours
                - success_rate_24h: Success rate percentage
                - active_errors: Count of errors in last 24h
                - stats_24h: Detailed 24h stats from StatsTracker
                - hourly_data: Hourly sync counts for last 24 hours
        """
        try:
            db_path = app.config['DB_PATH']
            tracker = StatsTracker(db_path=db_path)

            # Get 24h stats
            stats_24h = tracker.get_stats(period='24h')
            success_rate = tracker.get_success_rate(period='24h')

            # Get total syncs (all time)
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check if table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_stats'")
            if cursor.fetchone():
                cursor.execute("SELECT COUNT(*) FROM sync_stats")
                total_syncs = cursor.fetchone()[0]
            else:
                total_syncs = 0

            # Get hourly data for last 24 hours
            hourly_data = []
            now = int(time.time())
            for i in range(24):
                hour_start = now - ((23 - i) * 3600)
                hour_end = hour_start + 3600

                cursor.execute("""
                SELECT COUNT(*) FROM sync_stats
                WHERE timestamp >= ? AND timestamp < ?
                """, (hour_start, hour_end))

                count = cursor.fetchone()[0]
                hourly_data.append({
                    'hour': datetime.fromtimestamp(hour_start).strftime('%H:%M'),
                    'count': count
                })

            conn.close()

            return jsonify({
                'total_syncs': total_syncs,
                'syncs_today': stats_24h['total_syncs'],
                'success_rate_24h': success_rate,
                'active_errors': stats_24h['failed_syncs'],
                'stats_24h': stats_24h,
                'hourly_data': hourly_data
            })

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return jsonify({
                'total_syncs': 0,
                'syncs_today': 0,
                'success_rate_24h': 0.0,
                'active_errors': 0,
                'stats_24h': {},
                'hourly_data': []
            })

    @app.route('/api/recent')
    def api_recent():
        """
        Get recent synced posts.

        Query parameters:
            - limit: Maximum number of posts to return (default: 20)

        Returns:
            JSON array of recent syncs with metadata
        """
        try:
            limit = int(request.args.get('limit', 20))
            db_path = app.config['DB_PATH']

            syncs = get_recent_syncs(limit=limit, db_path=db_path)

            # Truncate content for display
            for sync in syncs:
                if sync['content'] and len(sync['content']) > 100:
                    sync['content'] = sync['content'][:100] + '...'

            return jsonify(syncs)

        except Exception as e:
            logger.error(f"Error getting recent syncs: {e}")
            return jsonify([])

    @app.route('/api/errors')
    def api_errors():
        """
        Get recent errors.

        Query parameters:
            - limit: Maximum number of errors to return (default: 10)

        Returns:
            JSON array of recent errors
        """
        try:
            limit = int(request.args.get('limit', 10))
            db_path = app.config['DB_PATH']

            tracker = StatsTracker(db_path=db_path)
            errors = tracker.get_error_log(limit=limit)

            return jsonify(errors)

        except Exception as e:
            logger.error(f"Error getting error log: {e}")
            return jsonify([])

    @app.route('/api/status')
    def api_status():
        """
        Get system status information.

        Returns:
            JSON with:
                - uptime: Application uptime (formatted string)
                - db_size: Database file size (formatted string)
                - total_posts: Total synced posts count
        """
        try:
            db_path = app.config['DB_PATH']

            # Calculate uptime
            uptime_seconds = int(time.time() - START_TIME)
            uptime_str = format_uptime(uptime_seconds)

            # Get system stats
            system_stats = get_system_stats(db_path=db_path)

            return jsonify({
                'uptime': uptime_str,
                'db_size': system_stats['db_size'],
                'total_posts': system_stats['total_posts']
            })

        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return jsonify({
                'uptime': '0s',
                'db_size': '0 B',
                'total_posts': 0
            })

    return app


def format_uptime(seconds):
    """
    Format uptime seconds into human-readable string.

    Args:
        seconds: Number of seconds

    Returns:
        Formatted string (e.g., "2d 5h 30m")
    """
    if seconds < 60:
        return f"{seconds}s"

    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m"

    hours = minutes // 60
    remaining_minutes = minutes % 60
    if hours < 24:
        return f"{hours}h {remaining_minutes}m"

    days = hours // 24
    remaining_hours = hours % 24
    return f"{days}d {remaining_hours}h"


def main():
    """Run the dashboard application."""
    app = create_app()

    # Get port from environment or default to 5000
    port = int(os.environ.get('FLASK_PORT', 5000))
    host = os.environ.get('FLASK_HOST', '0.0.0.0')

    logger.info(f"Starting ChirpSyncer Dashboard on {host}:{port}")

    app.run(host=host, port=port, debug=False)


if __name__ == '__main__':
    main()

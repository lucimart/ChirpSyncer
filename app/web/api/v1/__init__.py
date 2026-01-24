import os
import uuid

from flask import Blueprint, g, request
from werkzeug.exceptions import HTTPException

from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_error

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")


@api_v1.before_request
def set_correlation_id():
    g.correlation_id = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))


@api_v1.after_request
def add_correlation_header(response):
    if hasattr(g, "correlation_id") and g.correlation_id:
        response.headers["X-Correlation-Id"] = g.correlation_id
    return response


@api_v1.errorhandler(ApiError)
def handle_api_error(error):
    # Details are sanitized within api_error, but we explicitly construct
    # safe details to satisfy static analysis (CodeQL)
    safe_details = None
    if error.details and isinstance(error.details, dict):
        safe_keys = {"field", "fields", "validation_errors", "constraint"}
        safe_details = {k: v for k, v in error.details.items() if k in safe_keys}
        if not safe_details:
            safe_details = None
    return api_error(error.code, error.message, status=error.status_code, details=safe_details)


@api_v1.errorhandler(HTTPException)
def handle_http_error(error):
    code = error.name.replace(" ", "_").upper()
    return api_error(code, error.description, status=error.code)


@api_v1.errorhandler(Exception)
def handle_unexpected_error(error):
    # Always use generic message to prevent information disclosure
    # Exception details should only be exposed via structured logging
    return api_error("INTERNAL_ERROR", "An unexpected error occurred", status=500)


from app.web.api.v1.auth import auth_bp  # noqa: E402
from app.web.api.v1.dashboard import dashboard_bp  # noqa: E402
from app.web.api.v1.credentials import credentials_bp  # noqa: E402
from app.web.api.v1.sync import sync_bp  # noqa: E402
from app.web.api.v1.cleanup import cleanup_bp  # noqa: E402
from app.web.api.v1.bookmarks import bookmarks_bp  # noqa: E402
from app.web.api.v1.analytics import analytics_bp  # noqa: E402
from app.web.api.v1.feed import feed_bp  # noqa: E402
from app.web.api.v1.workspaces import workspaces_bp  # noqa: E402
from app.web.api.v1.algorithm import algorithm_bp  # noqa: E402
from app.web.api.v1.scheduling import scheduling_bp  # noqa: E402
from app.web.api.v1.admin import admin_bp  # noqa: E402
from app.web.api.v1.search import search_bp  # noqa: E402
from app.web.api.v1.export import export_bp  # noqa: E402
from app.web.api.v1.health import health_bp  # noqa: E402
from app.web.api.v1.webhooks import webhooks_bp  # noqa: E402
from app.web.api.v1.notifications import notifications_bp  # noqa: E402
from app.web.api.v1.bluesky import bluesky_bp  # noqa: E402
from app.web.api.v1.mastodon import mastodon_bp  # noqa: E402
from app.web.api.v1.instagram import instagram_bp  # noqa: E402
from app.web.api.v1.twitter import twitter_bp  # noqa: E402
from app.web.api.v1.threads import threads_bp  # noqa: E402
from app.web.api.v1.linkedin import linkedin_bp  # noqa: E402
from app.web.api.v1.facebook import facebook_bp  # noqa: E402
from app.web.api.v1.notification_settings import notification_settings_bp, unsubscribe_bp  # noqa: E402
from app.web.api.v1.nostr import nostr_bp  # noqa: E402
from app.web.api.v1.matrix import matrix_bp  # noqa: E402
from app.web.api.v1.dsnp import dsnp_bp  # noqa: E402
from app.web.api.v1.ssb import ssb_bp  # noqa: E402
from app.web.api.v1.discord import discord_bp  # noqa: E402
from app.web.api.v1.reddit import reddit_bp  # noqa: E402
from app.web.api.v1.tumblr import tumblr_bp  # noqa: E402
from app.web.api.v1.pinterest import pinterest_bp  # noqa: E402
from app.web.api.v1.youtube import youtube_bp  # noqa: E402
from app.web.api.v1.tiktok import tiktok_bp  # noqa: E402
from app.web.api.v1.telegram import telegram_bp  # noqa: E402
from app.web.api.v1.medium import medium_bp  # noqa: E402
from app.web.api.v1.substack import substack_bp  # noqa: E402
from app.web.api.v1.devto import devto_bp  # noqa: E402
from app.web.api.v1.hashnode import hashnode_bp  # noqa: E402
from app.web.api.v1.cohost import cohost_bp  # noqa: E402
from app.web.api.v1.pixelfed import pixelfed_bp  # noqa: E402
from app.web.api.v1.lemmy import lemmy_bp  # noqa: E402
from app.web.api.v1.rss import rss_bp  # noqa: E402
from app.web.api.v1.outgoing_webhooks import outgoing_webhooks_bp  # noqa: E402
from app.web.api.v1.wordpress import wordpress_bp  # noqa: E402
from app.web.api.v1.ghost import ghost_bp  # noqa: E402
from app.web.api.v1.writeas import writeas_bp  # noqa: E402
from app.web.api.v1.microblog import microblog_bp  # noqa: E402
from app.web.api.v1.buttondown import buttondown_bp  # noqa: E402
from app.web.api.v1.convertkit import convertkit_bp  # noqa: E402
from app.web.api.v1.beehiiv import beehiiv_bp  # noqa: E402
from app.web.api.v1.misskey import misskey_bp  # noqa: E402
from app.web.api.v1.peertube import peertube_bp  # noqa: E402
from app.web.api.v1.bookwyrm import bookwyrm_bp  # noqa: E402
from app.web.api.v1.lens import lens_bp  # noqa: E402
from app.web.api.v1.inbox import inbox_bp  # noqa: E402
from app.web.api.v1.workflows import workflows_bp  # noqa: E402
from app.web.api.v1.atomization import atomization_bp  # noqa: E402
from app.web.api.v1.recycling import recycling_bp  # noqa: E402

api_v1.register_blueprint(auth_bp)
api_v1.register_blueprint(dashboard_bp)
api_v1.register_blueprint(credentials_bp)
api_v1.register_blueprint(sync_bp)
api_v1.register_blueprint(cleanup_bp)
api_v1.register_blueprint(bookmarks_bp)
api_v1.register_blueprint(analytics_bp)
api_v1.register_blueprint(feed_bp)
api_v1.register_blueprint(workspaces_bp)
api_v1.register_blueprint(algorithm_bp)
api_v1.register_blueprint(scheduling_bp)
api_v1.register_blueprint(admin_bp)
api_v1.register_blueprint(search_bp)
api_v1.register_blueprint(export_bp)
api_v1.register_blueprint(health_bp)
api_v1.register_blueprint(webhooks_bp)
api_v1.register_blueprint(notifications_bp)
api_v1.register_blueprint(bluesky_bp)
api_v1.register_blueprint(mastodon_bp)
api_v1.register_blueprint(instagram_bp)
api_v1.register_blueprint(twitter_bp)
api_v1.register_blueprint(threads_bp)
api_v1.register_blueprint(linkedin_bp)
api_v1.register_blueprint(facebook_bp)
api_v1.register_blueprint(notification_settings_bp)
api_v1.register_blueprint(unsubscribe_bp)
api_v1.register_blueprint(nostr_bp)
api_v1.register_blueprint(matrix_bp)
api_v1.register_blueprint(dsnp_bp)
api_v1.register_blueprint(ssb_bp)
api_v1.register_blueprint(discord_bp)
api_v1.register_blueprint(reddit_bp)
api_v1.register_blueprint(tumblr_bp)
api_v1.register_blueprint(pinterest_bp)
api_v1.register_blueprint(youtube_bp)
api_v1.register_blueprint(tiktok_bp)
api_v1.register_blueprint(telegram_bp)
api_v1.register_blueprint(medium_bp)
api_v1.register_blueprint(substack_bp)
api_v1.register_blueprint(devto_bp)
api_v1.register_blueprint(hashnode_bp)
api_v1.register_blueprint(cohost_bp)
api_v1.register_blueprint(pixelfed_bp)
api_v1.register_blueprint(lemmy_bp)
api_v1.register_blueprint(rss_bp)
api_v1.register_blueprint(outgoing_webhooks_bp)
api_v1.register_blueprint(wordpress_bp)
api_v1.register_blueprint(ghost_bp)
api_v1.register_blueprint(writeas_bp)
api_v1.register_blueprint(microblog_bp)
api_v1.register_blueprint(buttondown_bp)
api_v1.register_blueprint(convertkit_bp)
api_v1.register_blueprint(beehiiv_bp)
api_v1.register_blueprint(misskey_bp)
api_v1.register_blueprint(peertube_bp)
api_v1.register_blueprint(bookwyrm_bp)
api_v1.register_blueprint(lens_bp)
api_v1.register_blueprint(inbox_bp)
api_v1.register_blueprint(workflows_bp)
api_v1.register_blueprint(atomization_bp)
api_v1.register_blueprint(recycling_bp)

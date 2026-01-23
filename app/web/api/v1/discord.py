"""
Discord API Integration

Supports both Webhook-based notifications and Bot API for richer interactions.
"""

import re
import requests as http_requests
from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error

logger = get_logger(__name__)

discord_bp = Blueprint("discord", __name__, url_prefix="/discord")


def get_discord_credentials(user_id: int) -> dict | None:
    """Get Discord credentials for user."""
    cm = CredentialManager()
    return cm.get_credentials(user_id, "discord", "api")


def get_bot_headers(bot_token: str) -> dict:
    """Get headers for Discord Bot API."""
    return {
        "Authorization": f"Bot {bot_token}",
        "Content-Type": "application/json",
        "User-Agent": "ChirpSyncer/1.0",
    }


# =============================================================================
# Webhook Endpoints (Simple notifications)
# =============================================================================


@discord_bp.route("/webhook/send", methods=["POST"])
@require_auth
def send_webhook(user_id: int):
    """
    Send a message via Discord webhook.

    Body:
        webhook_url: Discord webhook URL
        content: Message content (max 2000 chars)
        username: Optional custom username
        avatar_url: Optional custom avatar
        embeds: Optional list of embed objects
    """
    data = request.get_json() or {}
    webhook_url = data.get("webhook_url")
    content = data.get("content")

    if not webhook_url:
        # Try to get from stored credentials
        creds = get_discord_credentials(user_id)
        if creds:
            webhook_url = creds.get("webhook_url")

    if not webhook_url:
        return api_error("MISSING_WEBHOOK", "Webhook URL required", status=400)

    # Validate webhook URL format
    if not re.match(r"https://discord\.com/api/webhooks/\d+/[\w-]+", webhook_url):
        return api_error("INVALID_WEBHOOK", "Invalid Discord webhook URL", status=400)

    if not content and not data.get("embeds"):
        return api_error("MISSING_CONTENT", "Content or embeds required", status=400)

    if content and len(content) > 2000:
        return api_error("CONTENT_TOO_LONG", "Content exceeds 2000 characters", status=400)


    payload = {}
    if content:
        payload["content"] = content
    if data.get("username"):
        payload["username"] = data["username"]
    if data.get("avatar_url"):
        payload["avatar_url"] = data["avatar_url"]
    if data.get("embeds"):
        payload["embeds"] = data["embeds"][:10]  # Max 10 embeds

    try:
        response = http_requests.post(webhook_url, json=payload, timeout=10)

        if response.status_code == 204:
            return api_response({"sent": True})
        elif response.status_code == 429:
            retry_after = response.json().get("retry_after", 1)
            return api_error("RATE_LIMITED", f"Rate limited, retry after {retry_after}s", status=429)
        else:
            return api_error("WEBHOOK_ERROR", f"Webhook returned {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord webhook error: {e}")
        return api_error("WEBHOOK_FAILED", "Failed to send webhook", status=502)


@discord_bp.route("/webhook/test", methods=["POST"])
@require_auth
def test_webhook(user_id: int):
    """Test a Discord webhook with a sample message."""
    data = request.get_json() or {}
    webhook_url = data.get("webhook_url")

    if not webhook_url:
        creds = get_discord_credentials(user_id)
        if creds:
            webhook_url = creds.get("webhook_url")

    if not webhook_url:
        return api_error("MISSING_WEBHOOK", "Webhook URL required", status=400)


    payload = {
        "content": "🔔 **ChirpSyncer Test** - Webhook connection successful!",
        "username": "ChirpSyncer",
    }

    try:
        response = http_requests.post(webhook_url, json=payload, timeout=10)

        return api_response({
            "success": response.status_code == 204,
            "status_code": response.status_code,
        })

    except http_requests.RequestException as e:
        logger.error(f"Discord webhook test error: {e}")
        return api_error("WEBHOOK_FAILED", "Failed to test webhook", status=502)


# =============================================================================
# Bot API Endpoints (Richer functionality)
# =============================================================================


@discord_bp.route("/me", methods=["GET"])
@require_auth
def get_bot_user(user_id: int):
    """Get the authenticated bot user."""
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)


    try:
        response = http_requests.get(
            "https://discord.com/api/v10/users/@me",
            headers=get_bot_headers(creds["bot_token"]),
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            return api_response({
                "id": data["id"],
                "username": data["username"],
                "discriminator": data.get("discriminator", "0"),
                "avatar": data.get("avatar"),
                "bot": data.get("bot", False),
            })
        elif response.status_code == 401:
            return api_error("INVALID_TOKEN", "Invalid bot token", status=401)
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to connect to Discord", status=502)


@discord_bp.route("/guilds", methods=["GET"])
@require_auth
def get_guilds(user_id: int):
    """Get guilds (servers) the bot is in."""
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)


    try:
        response = http_requests.get(
            "https://discord.com/api/v10/users/@me/guilds",
            headers=get_bot_headers(creds["bot_token"]),
            timeout=10,
        )

        if response.status_code == 200:
            guilds = response.json()
            return api_response({
                "guilds": [
                    {
                        "id": g["id"],
                        "name": g["name"],
                        "icon": g.get("icon"),
                        "owner": g.get("owner", False),
                        "permissions": g.get("permissions"),
                    }
                    for g in guilds
                ],
                "count": len(guilds),
            })
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to fetch guilds", status=502)


@discord_bp.route("/guild/<guild_id>/channels", methods=["GET"])
@require_auth
def get_guild_channels(user_id: int, guild_id: str):
    """Get channels in a guild."""
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)


    try:
        response = http_requests.get(
            f"https://discord.com/api/v10/guilds/{guild_id}/channels",
            headers=get_bot_headers(creds["bot_token"]),
            timeout=10,
        )

        if response.status_code == 200:
            channels = response.json()
            # Filter to text channels only (type 0)
            text_channels = [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "type": c["type"],
                    "position": c.get("position", 0),
                    "parent_id": c.get("parent_id"),
                }
                for c in channels
                if c["type"] in [0, 5]  # Text and announcement channels
            ]
            return api_response({
                "channels": sorted(text_channels, key=lambda x: x["position"]),
            })
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Bot lacks access to this guild", status=403)
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to fetch channels", status=502)


@discord_bp.route("/channel/<channel_id>/messages", methods=["GET"])
@require_auth
def get_channel_messages(user_id: int, channel_id: str):
    """Get recent messages from a channel."""
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)

    limit = request.args.get("limit", 50, type=int)
    limit = min(limit, 100)


    try:
        response = http_requests.get(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers=get_bot_headers(creds["bot_token"]),
            params={"limit": limit},
            timeout=10,
        )

        if response.status_code == 200:
            messages = response.json()
            return api_response({
                "messages": [
                    {
                        "id": m["id"],
                        "content": m["content"],
                        "author": {
                            "id": m["author"]["id"],
                            "username": m["author"]["username"],
                            "avatar": m["author"].get("avatar"),
                            "bot": m["author"].get("bot", False),
                        },
                        "timestamp": m["timestamp"],
                        "embeds": m.get("embeds", []),
                        "attachments": m.get("attachments", []),
                    }
                    for m in messages
                ],
            })
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Bot lacks access to this channel", status=403)
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to fetch messages", status=502)


@discord_bp.route("/channel/<channel_id>/send", methods=["POST"])
@require_auth
def send_channel_message(user_id: int, channel_id: str):
    """
    Send a message to a channel.

    Body:
        content: Message content
        embeds: Optional list of embeds
        reply_to: Optional message ID to reply to
    """
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)

    data = request.get_json() or {}
    content = data.get("content")

    if not content and not data.get("embeds"):
        return api_error("MISSING_CONTENT", "Content or embeds required", status=400)

    if content and len(content) > 2000:
        return api_error("CONTENT_TOO_LONG", "Content exceeds 2000 characters", status=400)


    payload = {}
    if content:
        payload["content"] = content
    if data.get("embeds"):
        payload["embeds"] = data["embeds"][:10]
    if data.get("reply_to"):
        payload["message_reference"] = {"message_id": data["reply_to"]}

    try:
        response = http_requests.post(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers=get_bot_headers(creds["bot_token"]),
            json=payload,
            timeout=10,
        )

        if response.status_code == 200:
            msg = response.json()
            return api_response({
                "id": msg["id"],
                "content": msg["content"],
                "timestamp": msg["timestamp"],
            })
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Bot lacks permission to send messages", status=403)
        elif response.status_code == 429:
            retry_after = response.json().get("retry_after", 1)
            return api_error("RATE_LIMITED", f"Rate limited, retry after {retry_after}s", status=429)
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to send message", status=502)


@discord_bp.route("/message/<channel_id>/<message_id>", methods=["DELETE"])
@require_auth
def delete_message(user_id: int, channel_id: str, message_id: str):
    """Delete a message."""
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)


    try:
        response = http_requests.delete(
            f"https://discord.com/api/v10/channels/{channel_id}/messages/{message_id}",
            headers=get_bot_headers(creds["bot_token"]),
            timeout=10,
        )

        if response.status_code == 204:
            return api_response({"deleted": True})
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Bot lacks permission to delete", status=403)
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Message not found", status=404)
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to delete message", status=502)


@discord_bp.route("/message/<channel_id>/<message_id>/react", methods=["POST"])
@require_auth
def add_reaction(user_id: int, channel_id: str, message_id: str):
    """
    Add a reaction to a message.

    Body:
        emoji: Emoji to react with (unicode or custom format)
    """
    creds = get_discord_credentials(user_id)
    if not creds or not creds.get("bot_token"):
        return api_error("NOT_CONFIGURED", "Discord bot not configured", status=401)

    data = request.get_json() or {}
    emoji = data.get("emoji")

    if not emoji:
        return api_error("MISSING_EMOJI", "Emoji required", status=400)

    from urllib.parse import quote

    # URL encode the emoji
    encoded_emoji = quote(emoji, safe="")

    try:
        response = http_requests.put(
            f"https://discord.com/api/v10/channels/{channel_id}/messages/{message_id}/reactions/{encoded_emoji}/@me",
            headers=get_bot_headers(creds["bot_token"]),
            timeout=10,
        )

        if response.status_code == 204:
            return api_response({"reacted": True})
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Bot lacks permission to react", status=403)
        else:
            return api_error("API_ERROR", f"Discord API error: {response.status_code}", status=502)

    except http_requests.RequestException as e:
        logger.error(f"Discord API error: {e}")
        return api_error("API_FAILED", "Failed to add reaction", status=502)


# =============================================================================
# Embed Builder Helper
# =============================================================================


@discord_bp.route("/embed/preview", methods=["POST"])
@require_auth
def preview_embed(user_id: int):
    """
    Preview an embed structure (validation only).

    Body: Discord embed object
    """
    data = request.get_json() or {}

    errors = []

    # Validate embed structure
    if data.get("title") and len(data["title"]) > 256:
        errors.append("Title exceeds 256 characters")

    if data.get("description") and len(data["description"]) > 4096:
        errors.append("Description exceeds 4096 characters")

    if data.get("fields"):
        if len(data["fields"]) > 25:
            errors.append("Maximum 25 fields allowed")
        for i, field in enumerate(data["fields"]):
            if not field.get("name"):
                errors.append(f"Field {i} missing name")
            elif len(field["name"]) > 256:
                errors.append(f"Field {i} name exceeds 256 characters")
            if not field.get("value"):
                errors.append(f"Field {i} missing value")
            elif len(field["value"]) > 1024:
                errors.append(f"Field {i} value exceeds 1024 characters")

    if data.get("footer", {}).get("text") and len(data["footer"]["text"]) > 2048:
        errors.append("Footer text exceeds 2048 characters")

    if data.get("author", {}).get("name") and len(data["author"]["name"]) > 256:
        errors.append("Author name exceeds 256 characters")

    if errors:
        return api_error("INVALID_EMBED", "Embed validation failed", status=400, details={"errors": errors})

    return api_response({"valid": True, "embed": data})


# =============================================================================
# Broadcast (Multi-channel posting)
# =============================================================================


@discord_bp.route("/broadcast", methods=["POST"])
@require_auth
def broadcast_message(user_id: int):
    """
    Send a message to multiple channels/webhooks.

    Body:
        targets: List of {type: "webhook"|"channel", id: string}
        content: Message content
        embeds: Optional embeds
    """
    creds = get_discord_credentials(user_id)
    data = request.get_json() or {}

    targets = data.get("targets", [])
    content = data.get("content")
    embeds = data.get("embeds")

    if not targets:
        return api_error("MISSING_TARGETS", "At least one target required", status=400)

    if not content and not embeds:
        return api_error("MISSING_CONTENT", "Content or embeds required", status=400)


    results = []

    for target in targets:
        target_type = target.get("type")
        target_id = target.get("id")

        if target_type == "webhook":
            # Send via webhook
            try:
                payload = {}
                if content:
                    payload["content"] = content
                if embeds:
                    payload["embeds"] = embeds[:10]

                response = http_requests.post(target_id, json=payload, timeout=10)
                results.append({
                    "target": target_id[:50] + "...",
                    "type": "webhook",
                    "success": response.status_code == 204,
                    "status": response.status_code,
                })
            except http_requests.RequestException:
                results.append({
                    "target": target_id[:50] + "...",
                    "type": "webhook",
                    "success": False,
                    "error": "Request failed",
                })

        elif target_type == "channel" and creds and creds.get("bot_token"):
            # Send via bot
            try:
                payload = {}
                if content:
                    payload["content"] = content
                if embeds:
                    payload["embeds"] = embeds[:10]

                response = http_requests.post(
                    f"https://discord.com/api/v10/channels/{target_id}/messages",
                    headers=get_bot_headers(creds["bot_token"]),
                    json=payload,
                    timeout=10,
                )
                results.append({
                    "target": target_id,
                    "type": "channel",
                    "success": response.status_code == 200,
                    "status": response.status_code,
                    "message_id": response.json().get("id") if response.status_code == 200 else None,
                })
            except http_requests.RequestException:
                results.append({
                    "target": target_id,
                    "type": "channel",
                    "success": False,
                    "error": "Request failed",
                })

    successful = sum(1 for r in results if r["success"])

    return api_response({
        "results": results,
        "total": len(results),
        "successful": successful,
        "failed": len(results) - successful,
    })

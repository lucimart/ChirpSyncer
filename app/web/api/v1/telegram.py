"""
Telegram Bot API Integration

Uses Bot API for sending messages, managing channels, and interacting with groups.
Requires a bot token from @BotFather.
"""

import requests as http_requests
from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error

logger = get_logger(__name__)

telegram_bp = Blueprint("telegram", __name__, url_prefix="/telegram")

TELEGRAM_API_BASE = "https://api.telegram.org"


def get_telegram_credentials(user_id: int) -> dict | None:
    """Get Telegram credentials for user."""
    cm = CredentialManager()
    return cm.get_credentials(user_id, "telegram", "api")


def get_telegram_url(bot_token: str, method: str) -> str:
    """Build Telegram API URL."""
    return f"{TELEGRAM_API_BASE}/bot{bot_token}/{method}"


# =============================================================================
# Bot Info Endpoints
# =============================================================================


@telegram_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    """Get bot information."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    if not bot_token:
        return api_error("Telegram bot token not configured", 400)

    try:
        response = http_requests.get(
            get_telegram_url(bot_token, "getMe"),
            timeout=10,
        )

        data = response.json()
        if not data.get("ok"):
            return api_error(data.get("description", "Telegram API error"), 400)

        return api_response(data.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to connect to Telegram", 500)


# =============================================================================
# Message Endpoints
# =============================================================================


@telegram_bp.route("/messages", methods=["POST"])
@require_auth
def send_message():
    """Send a text message."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    if not bot_token:
        return api_error("Telegram bot token not configured", 400)

    data = request.get_json() or {}
    chat_id = data.get("chat_id")
    text = data.get("text")

    if not chat_id:
        return api_error("chat_id is required", 400)
    if not text:
        return api_error("text is required", 400)

    payload = {
        "chat_id": chat_id,
        "text": text,
    }

    # Optional parameters
    if data.get("parse_mode"):
        payload["parse_mode"] = data["parse_mode"]  # HTML, Markdown, MarkdownV2
    if data.get("disable_web_page_preview"):
        payload["disable_web_page_preview"] = data["disable_web_page_preview"]
    if data.get("disable_notification"):
        payload["disable_notification"] = data["disable_notification"]
    if data.get("reply_to_message_id"):
        payload["reply_to_message_id"] = data["reply_to_message_id"]
    if data.get("reply_markup"):
        payload["reply_markup"] = data["reply_markup"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "sendMessage"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to send message"), 400)

        return api_response(result.get("result"), status_code=201)

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to send message", 500)


@telegram_bp.route("/messages/<message_id>", methods=["PUT"])
@require_auth
def edit_message(message_id: str):
    """Edit a message."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}
    chat_id = data.get("chat_id")
    text = data.get("text")

    if not chat_id:
        return api_error("chat_id is required", 400)
    if not text:
        return api_error("text is required", 400)

    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
    }

    if data.get("parse_mode"):
        payload["parse_mode"] = data["parse_mode"]
    if data.get("reply_markup"):
        payload["reply_markup"] = data["reply_markup"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "editMessageText"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to edit message"), 400)

        return api_response(result.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to edit message", 500)


@telegram_bp.route("/messages/<message_id>", methods=["DELETE"])
@require_auth
def delete_message(message_id: str):
    """Delete a message."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    chat_id = request.args.get("chat_id")

    if not chat_id:
        return api_error("chat_id query parameter is required", 400)

    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
    }

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "deleteMessage"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to delete message"), 400)

        return api_response({"deleted": True, "message_id": message_id})

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to delete message", 500)


@telegram_bp.route("/messages/forward", methods=["POST"])
@require_auth
def forward_message():
    """Forward a message."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}

    payload = {
        "chat_id": data.get("chat_id"),
        "from_chat_id": data.get("from_chat_id"),
        "message_id": data.get("message_id"),
    }

    if not all(payload.values()):
        return api_error("chat_id, from_chat_id, and message_id are required", 400)

    if data.get("disable_notification"):
        payload["disable_notification"] = data["disable_notification"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "forwardMessage"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to forward message"), 400)

        return api_response(result.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to forward message", 500)


# =============================================================================
# Media Endpoints
# =============================================================================


@telegram_bp.route("/photos", methods=["POST"])
@require_auth
def send_photo():
    """Send a photo."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}

    chat_id = data.get("chat_id")
    photo = data.get("photo")  # file_id, URL, or base64

    if not chat_id or not photo:
        return api_error("chat_id and photo are required", 400)

    payload = {
        "chat_id": chat_id,
        "photo": photo,
    }

    if data.get("caption"):
        payload["caption"] = data["caption"]
    if data.get("parse_mode"):
        payload["parse_mode"] = data["parse_mode"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "sendPhoto"),
            json=payload,
            timeout=30,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to send photo"), 400)

        return api_response(result.get("result"), status_code=201)

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to send photo", 500)


@telegram_bp.route("/documents", methods=["POST"])
@require_auth
def send_document():
    """Send a document."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}

    chat_id = data.get("chat_id")
    document = data.get("document")

    if not chat_id or not document:
        return api_error("chat_id and document are required", 400)

    payload = {
        "chat_id": chat_id,
        "document": document,
    }

    if data.get("caption"):
        payload["caption"] = data["caption"]
    if data.get("parse_mode"):
        payload["parse_mode"] = data["parse_mode"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "sendDocument"),
            json=payload,
            timeout=60,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to send document"), 400)

        return api_response(result.get("result"), status_code=201)

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to send document", 500)


@telegram_bp.route("/videos", methods=["POST"])
@require_auth
def send_video():
    """Send a video."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}

    chat_id = data.get("chat_id")
    video = data.get("video")

    if not chat_id or not video:
        return api_error("chat_id and video are required", 400)

    payload = {
        "chat_id": chat_id,
        "video": video,
    }

    if data.get("caption"):
        payload["caption"] = data["caption"]
    if data.get("duration"):
        payload["duration"] = data["duration"]
    if data.get("width"):
        payload["width"] = data["width"]
    if data.get("height"):
        payload["height"] = data["height"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "sendVideo"),
            json=payload,
            timeout=60,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to send video"), 400)

        return api_response(result.get("result"), status_code=201)

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to send video", 500)


# =============================================================================
# Chat Endpoints
# =============================================================================


@telegram_bp.route("/chats/<chat_id>", methods=["GET"])
@require_auth
def get_chat(chat_id: str):
    """Get chat information."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")

    try:
        response = http_requests.get(
            get_telegram_url(bot_token, "getChat"),
            params={"chat_id": chat_id},
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to get chat"), 400)

        return api_response(result.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to get chat", 500)


@telegram_bp.route("/chats/<chat_id>/members/count", methods=["GET"])
@require_auth
def get_chat_member_count(chat_id: str):
    """Get chat member count."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")

    try:
        response = http_requests.get(
            get_telegram_url(bot_token, "getChatMemberCount"),
            params={"chat_id": chat_id},
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to get member count"), 400)

        return api_response({"count": result.get("result")})

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to get member count", 500)


@telegram_bp.route("/chats/<chat_id>/members/<user_id_param>", methods=["GET"])
@require_auth
def get_chat_member(chat_id: str, user_id_param: str):
    """Get chat member information."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")

    try:
        response = http_requests.get(
            get_telegram_url(bot_token, "getChatMember"),
            params={"chat_id": chat_id, "user_id": user_id_param},
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to get member"), 400)

        return api_response(result.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to get member", 500)


@telegram_bp.route("/chats/<chat_id>/administrators", methods=["GET"])
@require_auth
def get_chat_administrators(chat_id: str):
    """Get chat administrators."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")

    try:
        response = http_requests.get(
            get_telegram_url(bot_token, "getChatAdministrators"),
            params={"chat_id": chat_id},
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to get administrators"), 400)

        return api_response(result.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to get administrators", 500)


# =============================================================================
# Channel Endpoints
# =============================================================================


@telegram_bp.route("/channels/<channel_id>/posts", methods=["POST"])
@require_auth
def post_to_channel(channel_id: str):
    """Post a message to a channel."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}
    text = data.get("text")

    if not text:
        return api_error("text is required", 400)

    # Channel ID should be prefixed with @ or be numeric
    chat_id = channel_id if channel_id.startswith("@") or channel_id.lstrip("-").isdigit() else f"@{channel_id}"

    payload = {
        "chat_id": chat_id,
        "text": text,
    }

    if data.get("parse_mode"):
        payload["parse_mode"] = data["parse_mode"]
    if data.get("disable_web_page_preview"):
        payload["disable_web_page_preview"] = data["disable_web_page_preview"]
    if data.get("disable_notification"):
        payload["disable_notification"] = data["disable_notification"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "sendMessage"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to post to channel"), 400)

        return api_response(result.get("result"), status_code=201)

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to post to channel", 500)


# =============================================================================
# Polls
# =============================================================================


@telegram_bp.route("/polls", methods=["POST"])
@require_auth
def send_poll():
    """Send a poll."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}

    chat_id = data.get("chat_id")
    question = data.get("question")
    options = data.get("options")

    if not chat_id or not question or not options:
        return api_error("chat_id, question, and options are required", 400)

    if len(options) < 2:
        return api_error("At least 2 options are required", 400)

    payload = {
        "chat_id": chat_id,
        "question": question,
        "options": options,
    }

    if data.get("is_anonymous") is not None:
        payload["is_anonymous"] = data["is_anonymous"]
    if data.get("type"):
        payload["type"] = data["type"]  # quiz or regular
    if data.get("allows_multiple_answers"):
        payload["allows_multiple_answers"] = data["allows_multiple_answers"]
    if data.get("correct_option_id") is not None:
        payload["correct_option_id"] = data["correct_option_id"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "sendPoll"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to send poll"), 400)

        return api_response(result.get("result"), status_code=201)

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to send poll", 500)


# =============================================================================
# Updates (Webhook)
# =============================================================================


@telegram_bp.route("/webhook", methods=["POST"])
@require_auth
def set_webhook():
    """Set webhook URL for receiving updates."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}
    url = data.get("url")

    if not url:
        return api_error("url is required", 400)

    payload = {"url": url}

    if data.get("max_connections"):
        payload["max_connections"] = data["max_connections"]
    if data.get("allowed_updates"):
        payload["allowed_updates"] = data["allowed_updates"]

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "setWebhook"),
            json=payload,
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to set webhook"), 400)

        return api_response({"success": True, "url": url})

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to set webhook", 500)


@telegram_bp.route("/webhook", methods=["DELETE"])
@require_auth
def delete_webhook():
    """Delete webhook."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")

    try:
        response = http_requests.post(
            get_telegram_url(bot_token, "deleteWebhook"),
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to delete webhook"), 400)

        return api_response({"deleted": True})

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to delete webhook", 500)


@telegram_bp.route("/webhook/info", methods=["GET"])
@require_auth
def get_webhook_info():
    """Get webhook information."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")

    try:
        response = http_requests.get(
            get_telegram_url(bot_token, "getWebhookInfo"),
            timeout=10,
        )

        result = response.json()
        if not result.get("ok"):
            return api_error(result.get("description", "Failed to get webhook info"), 400)

        return api_response(result.get("result"))

    except http_requests.RequestException as e:
        logger.error(f"Telegram API error: {e}")
        return api_error("Failed to get webhook info", 500)


# =============================================================================
# Broadcast
# =============================================================================


@telegram_bp.route("/broadcast", methods=["POST"])
@require_auth
def broadcast_message():
    """Broadcast message to multiple chats."""
    user_id = request.user_id
    creds = get_telegram_credentials(user_id)

    if not creds:
        return api_error("Telegram credentials not found", 404)

    bot_token = creds.get("bot_token")
    data = request.get_json() or {}

    chat_ids = data.get("chat_ids", [])
    text = data.get("text")

    if not chat_ids:
        return api_error("chat_ids is required", 400)
    if not text:
        return api_error("text is required", 400)

    results = []
    for chat_id in chat_ids:
        payload = {
            "chat_id": chat_id,
            "text": text,
        }
        if data.get("parse_mode"):
            payload["parse_mode"] = data["parse_mode"]

        try:
            response = http_requests.post(
                get_telegram_url(bot_token, "sendMessage"),
                json=payload,
                timeout=10,
            )
            result = response.json()
            results.append({
                "chat_id": chat_id,
                "success": result.get("ok", False),
                "message_id": result.get("result", {}).get("message_id") if result.get("ok") else None,
                "error": result.get("description") if not result.get("ok") else None,
            })
        except http_requests.RequestException as e:
            results.append({
                "chat_id": chat_id,
                "success": False,
                "error": str(e),
            })

    return api_response({
        "total": len(chat_ids),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results,
    })

"""Secure Scuttlebutt (SSB) Protocol API endpoints.

Provides REST API endpoints for SSB decentralized P2P social protocol.
SSB is an offline-first, P2P protocol with append-only logs and gossip replication.

Key concepts:
- Feed: Append-only log of signed messages for each identity
- Message: Immutable, signed content (posts, follows, etc.)
- Blob: Binary content (images, files) stored separately
- Pub: Server that helps with peer discovery and replication
- Identity: ed25519 keypair, public key is the user ID (@xxx.ed25519)

Message types:
- post: Text posts with optional content-warning, root, branch (for threads)
- vote: Likes/reactions with value (+1/-1)
- contact: Follow/block relationships
- about: Profile information (name, image, description)
- pub: Pub server announcements
"""

import hashlib
import json
import time
from typing import Any

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

logger = get_logger(__name__)

ssb_bp = Blueprint("ssb", __name__, url_prefix="/ssb")

# Default SSB configuration
DEFAULT_SSB_PORT = 8008
DEFAULT_SSB_HOST = "localhost"


def _get_ssb_credentials(user_id: int) -> dict:
    """Get SSB credentials for the user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "ssb", "api")

    if not creds:
        raise ApiError("SSB_NOT_CONFIGURED", "SSB credentials not found", 404)

    # SSB requires either local ssb-server connection or remote pub
    if not creds.get("host") and not creds.get("secret"):
        raise ApiError("SSB_INVALID_CONFIG", "SSB host or secret required", 400)

    return creds


def _ssb_rpc(
    method: str,
    args: list | None = None,
    host: str = DEFAULT_SSB_HOST,
    port: int = DEFAULT_SSB_PORT,
) -> Any:
    """Make an RPC call to ssb-server via HTTP/MuxRPC bridge.

    Note: This requires ssb-server running with http plugin or
    a bridge like ssb-http-server.

    Args:
        method: RPC method name (e.g., "whoami", "publish", "createFeedStream")
        args: Method arguments
        host: SSB server host
        port: SSB server port

    Returns:
        RPC response
    """
    import requests

    # Note: SSB local server typically runs on localhost without TLS
    # For local development, HTTP is acceptable; production should use secure setup
    url = f"http://{host}:{port}/api/{method}"  # nosec B310 - local SSB server

    try:
        if args:
            response = requests.post(url, json=args, timeout=30)
        else:
            response = requests.get(url, timeout=30)

        if response.status_code == 401:
            raise ApiError("SSB_AUTH_ERROR", "SSB authentication failed", 401)

        if not response.ok:
            error_msg = "SSB RPC error"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_msg = error_data["error"]
            except Exception:
                pass
            raise ApiError("SSB_RPC_ERROR", error_msg, response.status_code)

        if response.status_code == 204 or not response.content:
            return None

        return response.json()

    except requests.RequestException as e:
        logger.error(f"SSB RPC request failed: {e}")
        raise ApiError("SSB_CONNECTION_FAILED", "Failed to connect to SSB server", 503)


def _create_message(msg_type: str, content: dict) -> dict:
    """Create an SSB message structure.

    Args:
        msg_type: Message type (post, vote, contact, about)
        content: Message content

    Returns:
        Message structure ready for signing and publishing
    """
    return {
        "type": msg_type,
        **content,
    }


def _format_ssb_id(key: str) -> str:
    """Format an SSB identity key.

    Args:
        key: Public key (may or may not have prefix/suffix)

    Returns:
        Properly formatted SSB ID (@xxx.ed25519)
    """
    if key.startswith("@") and key.endswith(".ed25519"):
        return key
    if key.startswith("@"):
        return f"{key}.ed25519"
    if key.endswith(".ed25519"):
        return f"@{key}"
    return f"@{key}.ed25519"


# =============================================================================
# Identity Endpoints
# =============================================================================


@ssb_bp.route("/whoami", methods=["GET"])
@require_auth
def get_whoami(user_id: int):
    """Get the current SSB identity.

    Returns:
        SSB ID (public key) and status
    """
    creds = _get_ssb_credentials(user_id)

    result = _ssb_rpc(
        "whoami",
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "id": result.get("id"),
        "public_key": result.get("id", "").replace("@", "").replace(".ed25519", ""),
    })


@ssb_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile(user_id: int):
    """Get the user's SSB profile (about messages).

    Query params:
        id: SSB ID to get profile for (optional, defaults to self)

    Returns:
        Profile data (name, image, description)
    """
    creds = _get_ssb_credentials(user_id)
    ssb_id = request.args.get("id")

    if not ssb_id:
        # Get own ID first
        whoami = _ssb_rpc(
            "whoami",
            host=creds.get("host", DEFAULT_SSB_HOST),
            port=creds.get("port", DEFAULT_SSB_PORT),
        )
        ssb_id = whoami.get("id")

    ssb_id = _format_ssb_id(ssb_id)

    # Get about messages for this ID
    result = _ssb_rpc(
        "about/read",
        [{"dest": ssb_id}],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    # SSB about messages are cumulative, so we get the latest values
    profile = {
        "id": ssb_id,
        "name": None,
        "description": None,
        "image": None,
    }

    if isinstance(result, dict):
        # about/read returns aggregated profile
        profile.update({
            "name": result.get("name"),
            "description": result.get("description"),
            "image": result.get("image"),
        })

    return api_response(profile)


@ssb_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile(user_id: int):
    """Update the user's SSB profile.

    Request body:
        name: Display name
        description: Bio/about text
        image: Image blob reference (&xxx.sha256)

    Returns:
        Published message key
    """
    creds = _get_ssb_credentials(user_id)
    data = request.get_json() or {}

    # Get own ID
    whoami = _ssb_rpc(
        "whoami",
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )
    ssb_id = whoami.get("id")

    # Create about message
    about_content = {
        "about": ssb_id,  # Self-describing
    }

    if data.get("name"):
        about_content["name"] = data["name"]
    if data.get("description"):
        about_content["description"] = data["description"]
    if data.get("image"):
        about_content["image"] = data["image"]

    message = _create_message("about", about_content)

    result = _ssb_rpc(
        "publish",
        [message],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "key": result.get("key"),
        "sequence": result.get("value", {}).get("sequence"),
    })


# =============================================================================
# Posts Endpoints
# =============================================================================


@ssb_bp.route("/posts", methods=["GET"])
@require_auth
def get_posts(user_id: int):
    """Get posts from the SSB network.

    Query params:
        id: Filter by author SSB ID (optional)
        limit: Number of posts (default 50)
        reverse: Newest first (default true)

    Returns:
        List of posts
    """
    creds = _get_ssb_credentials(user_id)
    ssb_id = request.args.get("id")
    limit = min(int(request.args.get("limit", 50)), 100)
    reverse = request.args.get("reverse", "true").lower() == "true"

    if ssb_id:
        ssb_id = _format_ssb_id(ssb_id)
        # Get feed for specific user
        result = _ssb_rpc(
            "createUserStream",
            [{"id": ssb_id, "limit": limit, "reverse": reverse}],
            host=creds.get("host", DEFAULT_SSB_HOST),
            port=creds.get("port", DEFAULT_SSB_PORT),
        )
    else:
        # Get all posts (public timeline)
        result = _ssb_rpc(
            "messagesByType",
            [{"type": "post", "limit": limit, "reverse": reverse}],
            host=creds.get("host", DEFAULT_SSB_HOST),
            port=creds.get("port", DEFAULT_SSB_PORT),
        )

    posts = []
    items = result if isinstance(result, list) else result.get("messages", [])

    for msg in items:
        value = msg.get("value", {})
        content = value.get("content", {})

        if content.get("type") == "post":
            posts.append({
                "key": msg.get("key"),
                "author": value.get("author"),
                "sequence": value.get("sequence"),
                "timestamp": value.get("timestamp"),
                "text": content.get("text"),
                "root": content.get("root"),  # Thread root
                "branch": content.get("branch"),  # Reply to
                "channel": content.get("channel"),  # Hashtag/channel
                "mentions": content.get("mentions", []),
            })

    return api_response({"posts": posts})


@ssb_bp.route("/post", methods=["POST"])
@require_auth
def create_post(user_id: int):
    """Create a new SSB post.

    Request body:
        text: Post content
        root: Thread root message key (for replies)
        branch: Direct reply-to message key
        channel: Channel/hashtag (optional)
        mentions: List of mentions (optional)

    Returns:
        Published message key
    """
    creds = _get_ssb_credentials(user_id)
    data = request.get_json() or {}

    text = data.get("text", "").strip()
    if not text:
        raise ApiError("VALIDATION_ERROR", "Post text is required", 400)

    post_content = {"text": text}

    # Thread handling
    if data.get("root"):
        post_content["root"] = data["root"]
    if data.get("branch"):
        post_content["branch"] = data["branch"]
        # If branch but no root, root is the branch
        if not post_content.get("root"):
            post_content["root"] = data["branch"]

    if data.get("channel"):
        post_content["channel"] = data["channel"]

    if data.get("mentions"):
        post_content["mentions"] = data["mentions"]

    message = _create_message("post", post_content)

    result = _ssb_rpc(
        "publish",
        [message],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "key": result.get("key"),
        "sequence": result.get("value", {}).get("sequence"),
    }, status=201)


@ssb_bp.route("/post/<message_key>", methods=["GET"])
@require_auth
def get_post(user_id: int, message_key: str):
    """Get a specific post by message key.

    Args:
        message_key: The SSB message key (%xxx.sha256)

    Returns:
        Post details
    """
    creds = _get_ssb_credentials(user_id)

    # Ensure proper key format
    if not message_key.startswith("%"):
        message_key = f"%{message_key}"
    if not message_key.endswith(".sha256"):
        message_key = f"{message_key}.sha256"

    result = _ssb_rpc(
        "get",
        [message_key],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    content = result.get("content", {})

    return api_response({
        "key": message_key,
        "author": result.get("author"),
        "sequence": result.get("sequence"),
        "timestamp": result.get("timestamp"),
        "type": content.get("type"),
        "text": content.get("text"),
        "root": content.get("root"),
        "branch": content.get("branch"),
    })


# =============================================================================
# Votes (Likes/Reactions) Endpoints
# =============================================================================


@ssb_bp.route("/post/<message_key>/votes", methods=["GET"])
@require_auth
def get_votes(user_id: int, message_key: str):
    """Get votes (likes) on a post.

    Args:
        message_key: The SSB message key

    Returns:
        List of votes
    """
    creds = _get_ssb_credentials(user_id)

    if not message_key.startswith("%"):
        message_key = f"%{message_key}"
    if not message_key.endswith(".sha256"):
        message_key = f"{message_key}.sha256"

    result = _ssb_rpc(
        "links",
        [{"dest": message_key, "rel": "vote", "values": True}],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    votes = []
    for link in (result if isinstance(result, list) else []):
        value = link.get("value", {})
        content = value.get("content", {})
        vote = content.get("vote", {})

        votes.append({
            "key": link.get("key"),
            "author": value.get("author"),
            "value": vote.get("value", 0),  # +1 or -1
            "expression": vote.get("expression"),  # Optional emoji/text
            "timestamp": value.get("timestamp"),
        })

    # Count likes vs dislikes
    like_count = sum(1 for v in votes if v["value"] > 0)
    dislike_count = sum(1 for v in votes if v["value"] < 0)

    return api_response({
        "votes": votes,
        "likes": like_count,
        "dislikes": dislike_count,
        "total": len(votes),
    })


@ssb_bp.route("/post/<message_key>/vote", methods=["POST"])
@require_auth
def vote_on_post(user_id: int, message_key: str):
    """Vote (like/unlike) on a post.

    Args:
        message_key: The SSB message key

    Request body:
        value: Vote value (+1 for like, -1 for dislike, 0 to remove)
        expression: Optional expression (emoji or text)

    Returns:
        Published vote message key
    """
    creds = _get_ssb_credentials(user_id)
    data = request.get_json() or {}

    if not message_key.startswith("%"):
        message_key = f"%{message_key}"
    if not message_key.endswith(".sha256"):
        message_key = f"{message_key}.sha256"

    value = data.get("value", 1)
    if value not in [-1, 0, 1]:
        raise ApiError("VALIDATION_ERROR", "Vote value must be -1, 0, or 1", 400)

    vote_content = {
        "vote": {
            "link": message_key,
            "value": value,
        }
    }

    if data.get("expression"):
        vote_content["vote"]["expression"] = data["expression"]

    message = _create_message("vote", vote_content)

    result = _ssb_rpc(
        "publish",
        [message],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "key": result.get("key"),
        "voted": value,
    }, status=201)


# =============================================================================
# Following/Contacts Endpoints
# =============================================================================


@ssb_bp.route("/following", methods=["GET"])
@require_auth
def get_following(user_id: int):
    """Get users the current user follows.

    Returns:
        List of followed SSB IDs
    """
    creds = _get_ssb_credentials(user_id)

    # Get own ID
    whoami = _ssb_rpc(
        "whoami",
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )
    ssb_id = whoami.get("id")

    result = _ssb_rpc(
        "friends/hops",
        [{"start": ssb_id, "max": 1}],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    following = []
    if isinstance(result, dict):
        for key, hops in result.items():
            if hops == 1:  # Direct follow
                following.append(key)

    return api_response({
        "following": following,
        "count": len(following),
    })


@ssb_bp.route("/followers", methods=["GET"])
@require_auth
def get_followers(user_id: int):
    """Get users who follow the current user.

    Returns:
        List of follower SSB IDs
    """
    creds = _get_ssb_credentials(user_id)

    # Get own ID
    whoami = _ssb_rpc(
        "whoami",
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )
    ssb_id = whoami.get("id")

    result = _ssb_rpc(
        "friends/hops",
        [{"start": ssb_id, "max": 1, "reverse": True}],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    followers = []
    if isinstance(result, dict):
        for key, hops in result.items():
            if hops == 1:
                followers.append(key)

    return api_response({
        "followers": followers,
        "count": len(followers),
    })


@ssb_bp.route("/follow", methods=["POST"])
@require_auth
def follow_user(user_id: int):
    """Follow an SSB user.

    Request body:
        id: SSB ID to follow

    Returns:
        Published contact message key
    """
    creds = _get_ssb_credentials(user_id)
    data = request.get_json() or {}

    target_id = data.get("id")
    if not target_id:
        raise ApiError("VALIDATION_ERROR", "id is required", 400)

    target_id = _format_ssb_id(target_id)

    contact_content = {
        "contact": target_id,
        "following": True,
    }

    message = _create_message("contact", contact_content)

    result = _ssb_rpc(
        "publish",
        [message],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "key": result.get("key"),
        "followed": target_id,
    })


@ssb_bp.route("/unfollow", methods=["POST"])
@require_auth
def unfollow_user(user_id: int):
    """Unfollow an SSB user.

    Request body:
        id: SSB ID to unfollow

    Returns:
        Published contact message key
    """
    creds = _get_ssb_credentials(user_id)
    data = request.get_json() or {}

    target_id = data.get("id")
    if not target_id:
        raise ApiError("VALIDATION_ERROR", "id is required", 400)

    target_id = _format_ssb_id(target_id)

    contact_content = {
        "contact": target_id,
        "following": False,
    }

    message = _create_message("contact", contact_content)

    result = _ssb_rpc(
        "publish",
        [message],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "key": result.get("key"),
        "unfollowed": target_id,
    })


# =============================================================================
# Pub/Network Endpoints
# =============================================================================


@ssb_bp.route("/pubs", methods=["GET"])
@require_auth
def get_pubs(user_id: int):
    """Get known pub servers.

    Returns:
        List of pub server addresses
    """
    creds = _get_ssb_credentials(user_id)

    result = _ssb_rpc(
        "gossip/peers",
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    pubs = []
    for peer in (result if isinstance(result, list) else []):
        if peer.get("state") == "connected" or peer.get("announcers"):
            pubs.append({
                "host": peer.get("host"),
                "port": peer.get("port"),
                "key": peer.get("key"),
                "state": peer.get("state"),
            })

    return api_response({"pubs": pubs})


@ssb_bp.route("/invite/accept", methods=["POST"])
@require_auth
def accept_invite(user_id: int):
    """Accept a pub invite code.

    Request body:
        invite: Pub invite code

    Returns:
        Connection result
    """
    creds = _get_ssb_credentials(user_id)
    data = request.get_json() or {}

    invite = data.get("invite")
    if not invite:
        raise ApiError("VALIDATION_ERROR", "invite is required", 400)

    result = _ssb_rpc(
        "invite/accept",
        [invite],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "success": True,
        "followed": result.get("id") if result else None,
    })


@ssb_bp.route("/blob", methods=["POST"])
@require_auth
def upload_blob(user_id: int):
    """Upload a blob (binary content) to SSB.

    Request body (multipart/form-data):
        file: Binary file to upload

    Returns:
        blob_id: SSB blob reference (&xxx.sha256)
    """
    creds = _get_ssb_credentials(user_id)

    if "file" not in request.files:
        raise ApiError("VALIDATION_ERROR", "file is required", 400)

    file = request.files["file"]
    content = file.read()

    # Create blob hash (SSB uses sha256)
    blob_hash = hashlib.sha256(content).digest()
    import base64
    blob_id = f"&{base64.b64encode(blob_hash).decode()}.sha256"

    # Store blob via SSB RPC
    result = _ssb_rpc(
        "blobs/add",
        [{"content": base64.b64encode(content).decode()}],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    return api_response({
        "blob_id": blob_id,
        "size": len(content),
        "type": file.content_type,
    })


@ssb_bp.route("/blob/<path:blob_id>", methods=["GET"])
@require_auth
def get_blob(user_id: int, blob_id: str):
    """Get a blob by ID.

    Args:
        blob_id: SSB blob reference (URL-encoded &xxx.sha256)

    Returns:
        Blob content as binary
    """
    from flask import Response

    creds = _get_ssb_credentials(user_id)

    # Decode blob_id if URL-encoded
    import urllib.parse
    blob_id = urllib.parse.unquote(blob_id)

    if not blob_id.startswith("&") or not blob_id.endswith(".sha256"):
        raise ApiError("VALIDATION_ERROR", "Invalid blob ID format", 400)

    result = _ssb_rpc(
        "blobs/get",
        [blob_id],
        host=creds.get("host", DEFAULT_SSB_HOST),
        port=creds.get("port", DEFAULT_SSB_PORT),
    )

    if not result:
        raise ApiError("BLOB_NOT_FOUND", "Blob not found", 404)

    import base64
    content = base64.b64decode(result.get("content", ""))

    return Response(
        content,
        mimetype=result.get("type", "application/octet-stream"),
    )


# SSB Constants
SSB_INFO = {
    "message_types": ["post", "vote", "contact", "about", "pub", "channel"],
    "id_format": "@{base64_public_key}.ed25519",
    "message_format": "%{base64_hash}.sha256",
    "blob_format": "&{base64_hash}.sha256",
    "default_port": 8008,
    "docs_url": "https://ssbc.github.io/scuttlebutt-protocol-guide/",
}

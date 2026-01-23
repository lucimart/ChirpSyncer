"""DSNP (Decentralized Social Networking Protocol) API endpoints.

Provides REST API endpoints for DSNP integration via the Frequency blockchain.
DSNP is a Web3 social protocol that provides decentralized identity and social graphs.

Key concepts:
- MSA (Message Source Account): On-chain identity with a unique DSNP ID
- Delegation: Users can delegate posting rights to apps
- Announcements: Social actions (posts, reactions, follows) published as announcements
- Schemas: Standardized message formats (Broadcast, Reply, Reaction, etc.)
- Frequency: Polkadot parachain that hosts DSNP

Supported DSNP Announcement Types:
- Broadcast: Public posts
- Reply: Replies to other content
- Reaction: Emoji reactions
- Profile: User profile updates
- GraphChange: Follow/unfollow
"""

import hashlib
import time
from typing import Any

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

logger = get_logger(__name__)

dsnp_bp = Blueprint("dsnp", __name__, url_prefix="/dsnp")

# DSNP Schema IDs (Frequency mainnet)
DSNP_SCHEMAS = {
    "broadcast": 2,  # Public posts
    "reply": 3,  # Replies
    "reaction": 4,  # Reactions
    "profile": 6,  # Profile updates
    "public_key": 7,  # Public keys for encryption
    "public_follows": 8,  # Public graph
    "private_follows": 9,  # Private graph
    "private_connections": 10,  # Bidirectional connections
}

# Default Frequency RPC endpoints
DEFAULT_FREQUENCY_RPC = "wss://1.rpc.frequency.xyz"
DEFAULT_FREQUENCY_REST = "https://api.frequency.xyz"


def _get_dsnp_credentials(user_id: int) -> dict:
    """Get DSNP/Frequency credentials for the user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "dsnp", "api")

    if not creds:
        raise ApiError("DSNP_NOT_CONFIGURED", "DSNP credentials not found", 404)

    # Requires either seed phrase or provider API key
    if not creds.get("seed_phrase") and not creds.get("provider_api_key"):
        raise ApiError("DSNP_INVALID_CONFIG", "DSNP seed phrase or provider API key required", 400)

    return creds


def _frequency_request(
    endpoint: str,
    method: str = "GET",
    data: dict | None = None,
    api_key: str | None = None,
    base_url: str = DEFAULT_FREQUENCY_REST,
) -> dict:
    """Make a request to Frequency REST API or provider API.

    Args:
        endpoint: API endpoint
        method: HTTP method
        data: Request body
        api_key: Provider API key (if using hosted provider)
        base_url: Base URL for the API

    Returns:
        API response data
    """
    import requests

    url = f"{base_url}{endpoint}"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data else None,
            timeout=30,
        )

        if response.status_code == 401:
            raise ApiError("DSNP_AUTH_ERROR", "DSNP authentication failed", 401)

        if response.status_code == 429:
            raise ApiError("DSNP_RATE_LIMIT", "Rate limit exceeded", 429)

        if not response.ok:
            error_msg = "DSNP API error"
            try:
                error_data = response.json()
                if "message" in error_data:
                    error_msg = error_data["message"]
                elif "error" in error_data:
                    error_msg = error_data["error"]
            except Exception:  # nosec B110 - intentionally ignore JSON parse errors for error message
                pass
            raise ApiError("DSNP_API_ERROR", error_msg, response.status_code)

        if response.status_code == 204 or not response.content:
            return {}

        return response.json()

    except requests.RequestException as e:
        logger.error(f"DSNP API request failed: {e}")
        raise ApiError("DSNP_REQUEST_FAILED", "Failed to connect to Frequency network", 503)


def _create_announcement(
    announcement_type: str,
    content: dict,
    from_id: str,
) -> dict:
    """Create a DSNP announcement structure.

    Args:
        announcement_type: Type of announcement (broadcast, reply, reaction, etc.)
        content: Announcement content
        from_id: DSNP ID of the sender

    Returns:
        Announcement structure ready for publishing
    """
    schema_id = DSNP_SCHEMAS.get(announcement_type)
    if not schema_id:
        raise ApiError("DSNP_INVALID_TYPE", f"Invalid announcement type: {announcement_type}", 400)

    # Create content hash for deduplication
    content_hash = hashlib.blake2b(
        str(content).encode(),
        digest_size=32
    ).hexdigest()

    return {
        "announcementType": announcement_type,
        "schemaId": schema_id,
        "fromId": from_id,
        "contentHash": content_hash,
        "content": content,
        "createdAt": int(time.time() * 1000),
    }


# =============================================================================
# Identity/Account Endpoints
# =============================================================================


@dsnp_bp.route("/identity", methods=["GET"])
@require_auth
def get_identity(user_id: int):
    """Get the user's DSNP identity (MSA).

    Returns:
        DSNP ID, handle, and account status
    """
    creds = _get_dsnp_credentials(user_id)

    if creds.get("provider_api_key"):
        # Use provider API
        result = _frequency_request(
            "/v1/accounts/me",
            api_key=creds["provider_api_key"],
            base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
        )
    else:
        # Direct chain query would require substrate-interface
        raise ApiError("DSNP_DIRECT_NOT_SUPPORTED", "Direct chain access not yet implemented", 501)

    return api_response({
        "dsnp_id": result.get("msaId"),
        "handle": result.get("handle"),
        "public_key": result.get("publicKey"),
        "delegations": result.get("delegations", []),
    })


@dsnp_bp.route("/identity/handle", methods=["GET"])
@require_auth
def get_handle(user_id: int):
    """Get handle for a DSNP ID.

    Query params:
        dsnp_id: The DSNP ID to look up

    Returns:
        Handle information
    """
    creds = _get_dsnp_credentials(user_id)
    dsnp_id = request.args.get("dsnp_id")

    if not dsnp_id:
        raise ApiError("VALIDATION_ERROR", "dsnp_id is required", 400)

    result = _frequency_request(
        f"/v1/handles/{dsnp_id}",
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "dsnp_id": dsnp_id,
        "handle": result.get("handle"),
        "display_handle": result.get("displayHandle"),
    })


# =============================================================================
# Profile Endpoints
# =============================================================================


@dsnp_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile(user_id: int):
    """Get the user's DSNP profile.

    Returns:
        Profile data (name, icon, summary, etc.)
    """
    creds = _get_dsnp_credentials(user_id)

    result = _frequency_request(
        "/v1/profiles/me",
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "dsnp_id": result.get("fromId"),
        "name": result.get("name"),
        "icon": result.get("icon"),
        "summary": result.get("summary"),
        "published": result.get("published"),
        "location": result.get("location"),
        "tag": result.get("tag", []),
    })


@dsnp_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile(user_id: int):
    """Update the user's DSNP profile.

    Request body:
        name: Display name
        summary: Bio/description
        icon: Avatar URL (IPFS preferred)
        published: Publication date

    Returns:
        Transaction result
    """
    creds = _get_dsnp_credentials(user_id)
    data = request.get_json() or {}

    profile_content = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "Profile",
        "name": data.get("name"),
        "summary": data.get("summary"),
        "icon": data.get("icon"),
        "published": data.get("published"),
    }
    # Remove None values
    profile_content = {k: v for k, v in profile_content.items() if v is not None}

    result = _frequency_request(
        "/v1/profiles",
        method="POST",
        data=profile_content,
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "success": True,
        "reference_id": result.get("referenceId"),
    })


# =============================================================================
# Content Endpoints (Broadcasts)
# =============================================================================


@dsnp_bp.route("/broadcasts", methods=["GET"])
@require_auth
def get_broadcasts(user_id: int):
    """Get broadcasts (public posts) from the network.

    Query params:
        dsnp_id: Filter by author DSNP ID (optional)
        limit: Number of results (default 50)
        newer_than: Block number to start from

    Returns:
        List of broadcasts
    """
    creds = _get_dsnp_credentials(user_id)
    dsnp_id = request.args.get("dsnp_id")
    limit = min(int(request.args.get("limit", 50)), 100)
    newer_than = request.args.get("newer_than")

    params = {"limit": limit}
    if dsnp_id:
        params["dsnpId"] = dsnp_id
    if newer_than:
        params["newerThan"] = newer_than

    result = _frequency_request(
        "/v1/content/broadcasts",
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    broadcasts = []
    for item in result.get("items", []):
        broadcasts.append({
            "announcement_id": item.get("announcementId"),
            "dsnp_id": item.get("fromId"),
            "content_hash": item.get("contentHash"),
            "content": item.get("content"),
            "block_number": item.get("blockNumber"),
            "timestamp": item.get("timestamp"),
        })

    return api_response({
        "broadcasts": broadcasts,
        "pagination": result.get("pagination", {}),
    })


@dsnp_bp.route("/broadcast", methods=["POST"])
@require_auth
def create_broadcast(user_id: int):
    """Create a new broadcast (public post).

    Request body:
        content: Post text content
        published: ISO timestamp (optional, defaults to now)
        location: Location object (optional)
        tag: List of hashtags (optional)
        attachment: Media attachments (optional)

    Returns:
        Created broadcast reference
    """
    creds = _get_dsnp_credentials(user_id)
    data = request.get_json() or {}

    content = data.get("content", "").strip()
    if not content:
        raise ApiError("VALIDATION_ERROR", "Content is required", 400)

    # ActivityStreams Note format
    note = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "Note",
        "content": content,
        "published": data.get("published") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    if data.get("location"):
        note["location"] = data["location"]
    if data.get("tag"):
        note["tag"] = [{"type": "Hashtag", "name": t} for t in data["tag"]]
    if data.get("attachment"):
        note["attachment"] = data["attachment"]

    result = _frequency_request(
        "/v1/content/broadcasts",
        method="POST",
        data=note,
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "reference_id": result.get("referenceId"),
        "content_hash": result.get("contentHash"),
    }, status=201)


@dsnp_bp.route("/broadcast/<content_hash>", methods=["GET"])
@require_auth
def get_broadcast(user_id: int, content_hash: str):
    """Get a specific broadcast by content hash.

    Args:
        content_hash: The DSNP content hash

    Returns:
        Broadcast details
    """
    creds = _get_dsnp_credentials(user_id)

    result = _frequency_request(
        f"/v1/content/broadcasts/{content_hash}",
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response(result)


# =============================================================================
# Reply Endpoints
# =============================================================================


@dsnp_bp.route("/reply", methods=["POST"])
@require_auth
def create_reply(user_id: int):
    """Create a reply to a broadcast.

    Request body:
        content: Reply text
        in_reply_to: DSNP URL of the parent content

    Returns:
        Created reply reference
    """
    creds = _get_dsnp_credentials(user_id)
    data = request.get_json() or {}

    content = data.get("content", "").strip()
    in_reply_to = data.get("in_reply_to")

    if not content:
        raise ApiError("VALIDATION_ERROR", "Content is required", 400)
    if not in_reply_to:
        raise ApiError("VALIDATION_ERROR", "in_reply_to is required", 400)

    reply = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "Note",
        "content": content,
        "inReplyTo": in_reply_to,
        "published": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    result = _frequency_request(
        "/v1/content/replies",
        method="POST",
        data=reply,
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "reference_id": result.get("referenceId"),
        "content_hash": result.get("contentHash"),
    }, status=201)


# =============================================================================
# Reaction Endpoints
# =============================================================================


@dsnp_bp.route("/reaction", methods=["POST"])
@require_auth
def create_reaction(user_id: int):
    """Create a reaction to content.

    Request body:
        emoji: Reaction emoji (e.g., "👍", "❤️")
        in_reply_to: DSNP URL of the content to react to

    Returns:
        Created reaction reference
    """
    creds = _get_dsnp_credentials(user_id)
    data = request.get_json() or {}

    emoji = data.get("emoji", "👍")
    in_reply_to = data.get("in_reply_to")

    if not in_reply_to:
        raise ApiError("VALIDATION_ERROR", "in_reply_to is required", 400)

    reaction = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "Like",
        "content": emoji,
        "inReplyTo": in_reply_to,
        "published": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    result = _frequency_request(
        "/v1/content/reactions",
        method="POST",
        data=reaction,
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "reference_id": result.get("referenceId"),
    }, status=201)


# =============================================================================
# Graph Endpoints (Following)
# =============================================================================


@dsnp_bp.route("/graph/following", methods=["GET"])
@require_auth
def get_following(user_id: int):
    """Get the user's public following list.

    Returns:
        List of followed DSNP IDs
    """
    creds = _get_dsnp_credentials(user_id)

    result = _frequency_request(
        "/v1/graphs/following",
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "following": result.get("dsnpIds", []),
        "count": len(result.get("dsnpIds", [])),
    })


@dsnp_bp.route("/graph/follow", methods=["POST"])
@require_auth
def follow_user(user_id: int):
    """Follow a DSNP user.

    Request body:
        dsnp_id: DSNP ID to follow

    Returns:
        Graph change reference
    """
    creds = _get_dsnp_credentials(user_id)
    data = request.get_json() or {}

    dsnp_id = data.get("dsnp_id")
    if not dsnp_id:
        raise ApiError("VALIDATION_ERROR", "dsnp_id is required", 400)

    result = _frequency_request(
        "/v1/graphs/follow",
        method="POST",
        data={"dsnpId": dsnp_id},
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "reference_id": result.get("referenceId"),
        "followed": dsnp_id,
    })


@dsnp_bp.route("/graph/unfollow", methods=["POST"])
@require_auth
def unfollow_user(user_id: int):
    """Unfollow a DSNP user.

    Request body:
        dsnp_id: DSNP ID to unfollow

    Returns:
        Graph change reference
    """
    creds = _get_dsnp_credentials(user_id)
    data = request.get_json() or {}

    dsnp_id = data.get("dsnp_id")
    if not dsnp_id:
        raise ApiError("VALIDATION_ERROR", "dsnp_id is required", 400)

    result = _frequency_request(
        "/v1/graphs/unfollow",
        method="POST",
        data={"dsnpId": dsnp_id},
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "reference_id": result.get("referenceId"),
        "unfollowed": dsnp_id,
    })


# =============================================================================
# Delegation Endpoints
# =============================================================================


@dsnp_bp.route("/delegations", methods=["GET"])
@require_auth
def get_delegations(user_id: int):
    """Get the user's delegations (app permissions).

    Returns:
        List of delegated providers
    """
    creds = _get_dsnp_credentials(user_id)

    result = _frequency_request(
        "/v1/delegations",
        api_key=creds.get("provider_api_key"),
        base_url=creds.get("provider_url", DEFAULT_FREQUENCY_REST),
    )

    return api_response({
        "delegations": result.get("delegations", []),
    })


# DSNP Constants
DSNP_INFO = {
    "announcement_types": list(DSNP_SCHEMAS.keys()),
    "mainnet_rpc": "wss://1.rpc.frequency.xyz",
    "testnet_rpc": "wss://rpc.testnet.frequency.xyz",
    "docs_url": "https://spec.dsnp.org/",
}

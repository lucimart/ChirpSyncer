"""Nostr Protocol API endpoints.

Provides REST API endpoints for Nostr decentralized social protocol.
Nostr uses cryptographic keys for identity and relays for message distribution.

Key concepts:
- Events: All content is an "event" signed by the author's private key
- Relays: Servers that store and forward events
- NIPs: Nostr Implementation Possibilities (protocol specs)

Supported NIPs:
- NIP-01: Basic protocol (events, subscriptions)
- NIP-02: Contact list / Follow list
- NIP-04: Encrypted Direct Messages
- NIP-05: DNS-based verification (user@domain.com)
- NIP-10: Reply conventions
- NIP-25: Reactions
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

nostr_bp = Blueprint("nostr", __name__, url_prefix="/nostr")

# Default relays for Nostr network
DEFAULT_RELAYS = [
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol",
    "wss://relay.snort.social",
    "wss://nostr.wine",
]


def _get_nostr_credentials(user_id: int) -> dict:
    """Get Nostr credentials for the user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "nostr", "api")

    if not creds:
        raise ApiError("NOSTR_NOT_CONFIGURED", "Nostr credentials not found", 404)

    # Nostr requires either private key (nsec) or public key (npub)
    if not creds.get("private_key") and not creds.get("public_key"):
        raise ApiError("NOSTR_INVALID_KEYS", "Nostr keys not configured", 400)

    return creds


def _hex_to_bech32(hrp: str, hex_data: str) -> str:
    """Convert hex to bech32 (npub/nsec format).

    This is a simplified implementation. In production, use a proper bech32 library.
    """
    # For now, return the hex with a prefix indicator
    # A full implementation would use proper bech32 encoding
    return f"{hrp}1{hex_data[:8]}..."


def _bech32_to_hex(bech32_str: str) -> str:
    """Convert bech32 (npub/nsec) to hex.

    This is a simplified implementation.
    """
    # Handle both hex and bech32 formats
    if bech32_str.startswith("npub1") or bech32_str.startswith("nsec1"):
        # In production, decode properly using bech32
        # For now, assume we stored the hex alongside
        raise ApiError("BECH32_NOT_IMPLEMENTED", "Please provide hex format keys", 400)
    return bech32_str


def _create_event(
    private_key_hex: str,
    kind: int,
    content: str,
    tags: list[list[str]] | None = None,
    created_at: int | None = None,
) -> dict:
    """Create a signed Nostr event.

    Event kinds:
    - 0: Metadata (profile)
    - 1: Text note
    - 3: Contact list
    - 4: Encrypted DM
    - 5: Event deletion
    - 6: Repost
    - 7: Reaction

    Args:
        private_key_hex: Author's private key in hex
        kind: Event kind
        content: Event content
        tags: Event tags (e.g., [["e", "event_id"], ["p", "pubkey"]])
        created_at: Unix timestamp (defaults to now)

    Returns:
        Signed event dictionary
    """
    try:
        from secp256k1 import PrivateKey
    except ImportError:
        raise ApiError(
            "NOSTR_DEPS_MISSING",
            "secp256k1 library required for Nostr signing",
            500
        )

    if tags is None:
        tags = []

    if created_at is None:
        created_at = int(time.time())

    # Derive public key from private key
    privkey = PrivateKey(bytes.fromhex(private_key_hex))
    pubkey_hex = privkey.pubkey.serialize()[1:].hex()  # Remove prefix byte

    # Create event for signing (NIP-01)
    event_data = [
        0,  # Reserved
        pubkey_hex,
        created_at,
        kind,
        tags,
        content,
    ]

    # Serialize and hash for event ID
    serialized = json.dumps(event_data, separators=(",", ":"), ensure_ascii=False)
    event_id = hashlib.sha256(serialized.encode()).hexdigest()

    # Sign the event ID
    sig = privkey.schnorr_sign(
        bytes.fromhex(event_id),
        None,
        raw=True
    ).hex()

    return {
        "id": event_id,
        "pubkey": pubkey_hex,
        "created_at": created_at,
        "kind": kind,
        "tags": tags,
        "content": content,
        "sig": sig,
    }


async def _publish_to_relays(event: dict, relays: list[str]) -> dict:
    """Publish an event to multiple relays.

    Args:
        event: Signed Nostr event
        relays: List of relay WebSocket URLs

    Returns:
        Publication results per relay
    """
    import asyncio
    import websockets

    results = {}

    async def publish_to_relay(relay_url: str):
        try:
            async with websockets.connect(relay_url, close_timeout=5) as ws:
                # Send EVENT message
                message = json.dumps(["EVENT", event])
                await ws.send(message)

                # Wait for OK response
                response = await asyncio.wait_for(ws.recv(), timeout=5)
                response_data = json.loads(response)

                if response_data[0] == "OK":
                    return {"status": "published", "accepted": response_data[2]}
                else:
                    return {"status": "rejected", "message": str(response_data)}

        except asyncio.TimeoutError:
            return {"status": "timeout"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # Publish to all relays concurrently
    tasks = [publish_to_relay(relay) for relay in relays]
    relay_results = await asyncio.gather(*tasks)

    for relay, result in zip(relays, relay_results):
        results[relay] = result

    return results


async def _query_relays(
    filters: list[dict],
    relays: list[str],
    limit: int = 100,
) -> list[dict]:
    """Query events from relays.

    Args:
        filters: Nostr filter objects
        relays: List of relay WebSocket URLs
        limit: Maximum events to return

    Returns:
        List of events
    """
    import asyncio
    import websockets

    events = {}  # Deduplicate by event ID

    async def query_relay(relay_url: str):
        try:
            async with websockets.connect(relay_url, close_timeout=10) as ws:
                # Send REQ message
                sub_id = hashlib.sha256(str(time.time()).encode()).hexdigest()[:8]
                message = json.dumps(["REQ", sub_id] + filters)
                await ws.send(message)

                # Collect events until EOSE
                while True:
                    try:
                        response = await asyncio.wait_for(ws.recv(), timeout=10)
                        response_data = json.loads(response)

                        if response_data[0] == "EVENT":
                            event = response_data[2]
                            events[event["id"]] = event
                        elif response_data[0] == "EOSE":
                            break
                        elif response_data[0] == "NOTICE":
                            logger.warning(f"Relay notice: {response_data[1]}")
                            break

                    except asyncio.TimeoutError:
                        break

                # Close subscription
                await ws.send(json.dumps(["CLOSE", sub_id]))

        except Exception as e:
            logger.error(f"Error querying relay {relay_url}: {e}")

    # Query all relays concurrently
    tasks = [query_relay(relay) for relay in relays]
    await asyncio.gather(*tasks)

    # Sort by created_at descending and limit
    sorted_events = sorted(events.values(), key=lambda e: e.get("created_at", 0), reverse=True)
    return sorted_events[:limit]


def _run_async(coro):
    """Run async coroutine in sync context."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# =============================================================================
# Profile Endpoints
# =============================================================================


@nostr_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile(user_id: int):
    """Get the user's Nostr profile (kind 0 metadata).

    Returns:
        Profile data including npub, name, about, picture
    """
    creds = _get_nostr_credentials(user_id)
    pubkey = creds.get("public_key")

    if not pubkey:
        # Derive from private key
        try:
            from secp256k1 import PrivateKey
            privkey = PrivateKey(bytes.fromhex(creds["private_key"]))
            pubkey = privkey.pubkey.serialize()[1:].hex()
        except Exception:
            raise ApiError("NOSTR_KEY_ERROR", "Could not derive public key", 500)

    relays = creds.get("relays", DEFAULT_RELAYS)

    # Query for kind 0 (metadata) events
    filters = [{"kinds": [0], "authors": [pubkey], "limit": 1}]
    events = _run_async(_query_relays(filters, relays, limit=1))

    profile = {"pubkey": pubkey, "npub": _hex_to_bech32("npub", pubkey)}

    if events:
        try:
            metadata = json.loads(events[0]["content"])
            profile.update({
                "name": metadata.get("name"),
                "display_name": metadata.get("display_name"),
                "about": metadata.get("about"),
                "picture": metadata.get("picture"),
                "banner": metadata.get("banner"),
                "nip05": metadata.get("nip05"),
                "lud16": metadata.get("lud16"),  # Lightning address
                "website": metadata.get("website"),
            })
        except json.JSONDecodeError:
            pass

    return api_response(profile)


@nostr_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile(user_id: int):
    """Update the user's Nostr profile.

    Request body:
        name: Display name
        about: Bio/description
        picture: Avatar URL
        banner: Banner image URL
        nip05: NIP-05 identifier (user@domain.com)
        lud16: Lightning address
        website: Website URL

    Returns:
        Published event result
    """
    creds = _get_nostr_credentials(user_id)
    data = request.get_json() or {}

    if not creds.get("private_key"):
        raise ApiError("NOSTR_READ_ONLY", "Private key required to update profile", 403)

    metadata = {
        "name": data.get("name"),
        "display_name": data.get("display_name"),
        "about": data.get("about"),
        "picture": data.get("picture"),
        "banner": data.get("banner"),
        "nip05": data.get("nip05"),
        "lud16": data.get("lud16"),
        "website": data.get("website"),
    }
    # Remove None values
    metadata = {k: v for k, v in metadata.items() if v is not None}

    event = _create_event(
        creds["private_key"],
        kind=0,  # Metadata
        content=json.dumps(metadata),
    )

    relays = creds.get("relays", DEFAULT_RELAYS)
    results = _run_async(_publish_to_relays(event, relays))

    return api_response({
        "event_id": event["id"],
        "relay_results": results,
    })


# =============================================================================
# Notes (Posts) Endpoints
# =============================================================================


@nostr_bp.route("/notes", methods=["GET"])
@require_auth
def get_notes(user_id: int):
    """Get notes (kind 1 events) from followed users or global.

    Query params:
        limit: Number of notes (default 50)
        since: Unix timestamp to start from
        until: Unix timestamp to end at
        authors: Comma-separated pubkeys to filter

    Returns:
        List of notes with author info
    """
    creds = _get_nostr_credentials(user_id)
    limit = min(int(request.args.get("limit", 50)), 200)
    since = request.args.get("since")
    until = request.args.get("until")
    authors = request.args.get("authors")

    relays = creds.get("relays", DEFAULT_RELAYS)

    # Build filter
    note_filter: dict[str, Any] = {"kinds": [1], "limit": limit}
    if since:
        note_filter["since"] = int(since)
    if until:
        note_filter["until"] = int(until)
    if authors:
        note_filter["authors"] = authors.split(",")

    events = _run_async(_query_relays([note_filter], relays, limit=limit))

    # Format response
    notes = []
    for event in events:
        note = {
            "id": event["id"],
            "pubkey": event["pubkey"],
            "content": event["content"],
            "created_at": event["created_at"],
            "tags": event["tags"],
            "reply_to": None,
            "mentions": [],
        }

        # Parse tags for replies and mentions (NIP-10)
        for tag in event.get("tags", []):
            if tag[0] == "e" and len(tag) > 1:
                # Event reference (reply)
                if len(tag) > 3 and tag[3] == "reply":
                    note["reply_to"] = tag[1]
                elif not note["reply_to"]:
                    note["reply_to"] = tag[1]
            elif tag[0] == "p" and len(tag) > 1:
                # Pubkey mention
                note["mentions"].append(tag[1])

        notes.append(note)

    return api_response({"notes": notes})


@nostr_bp.route("/note", methods=["POST"])
@require_auth
def create_note(user_id: int):
    """Create a new note (kind 1 event).

    Request body:
        content: Note text content
        reply_to: Event ID to reply to (optional)
        mentions: List of pubkeys to mention (optional)

    Returns:
        Published event result
    """
    creds = _get_nostr_credentials(user_id)
    data = request.get_json() or {}

    if not creds.get("private_key"):
        raise ApiError("NOSTR_READ_ONLY", "Private key required to post", 403)

    content = data.get("content", "").strip()
    if not content:
        raise ApiError("VALIDATION_ERROR", "Note content is required", 400)

    tags = []

    # Add reply tags (NIP-10)
    if data.get("reply_to"):
        tags.append(["e", data["reply_to"], "", "reply"])

    # Add mention tags
    for pubkey in data.get("mentions", []):
        tags.append(["p", pubkey])

    event = _create_event(
        creds["private_key"],
        kind=1,  # Text note
        content=content,
        tags=tags,
    )

    relays = creds.get("relays", DEFAULT_RELAYS)
    results = _run_async(_publish_to_relays(event, relays))

    return api_response({
        "event_id": event["id"],
        "relay_results": results,
    }, status=201)


@nostr_bp.route("/note/<event_id>", methods=["GET"])
@require_auth
def get_note(user_id: int, event_id: str):
    """Get a specific note by event ID.

    Args:
        event_id: The Nostr event ID (hex)

    Returns:
        Note details
    """
    creds = _get_nostr_credentials(user_id)
    relays = creds.get("relays", DEFAULT_RELAYS)

    filters = [{"ids": [event_id]}]
    events = _run_async(_query_relays(filters, relays, limit=1))

    if not events:
        raise ApiError("NOTE_NOT_FOUND", "Note not found on relays", 404)

    event = events[0]
    return api_response({
        "id": event["id"],
        "pubkey": event["pubkey"],
        "content": event["content"],
        "created_at": event["created_at"],
        "kind": event["kind"],
        "tags": event["tags"],
        "sig": event["sig"],
    })


@nostr_bp.route("/note/<event_id>", methods=["DELETE"])
@require_auth
def delete_note(user_id: int, event_id: str):
    """Delete a note by publishing a kind 5 deletion event.

    Args:
        event_id: The Nostr event ID to delete

    Returns:
        Deletion event result
    """
    creds = _get_nostr_credentials(user_id)

    if not creds.get("private_key"):
        raise ApiError("NOSTR_READ_ONLY", "Private key required to delete", 403)

    # Kind 5 is deletion event (NIP-09)
    event = _create_event(
        creds["private_key"],
        kind=5,
        content="deleted",
        tags=[["e", event_id]],
    )

    relays = creds.get("relays", DEFAULT_RELAYS)
    results = _run_async(_publish_to_relays(event, relays))

    return api_response({
        "deleted_event_id": event_id,
        "deletion_event_id": event["id"],
        "relay_results": results,
    })


# =============================================================================
# Reactions Endpoints
# =============================================================================


@nostr_bp.route("/note/<event_id>/reactions", methods=["GET"])
@require_auth
def get_reactions(user_id: int, event_id: str):
    """Get reactions (kind 7) on a note.

    Args:
        event_id: The Nostr event ID

    Returns:
        List of reactions
    """
    creds = _get_nostr_credentials(user_id)
    relays = creds.get("relays", DEFAULT_RELAYS)

    # Query for kind 7 (reaction) events referencing this event
    filters = [{"kinds": [7], "#e": [event_id], "limit": 100}]
    events = _run_async(_query_relays(filters, relays, limit=100))

    reactions = []
    for event in events:
        reactions.append({
            "id": event["id"],
            "pubkey": event["pubkey"],
            "content": event["content"],  # Usually "+" or emoji
            "created_at": event["created_at"],
        })

    # Count by reaction type
    reaction_counts: dict[str, int] = {}
    for r in reactions:
        content = r["content"] or "+"
        reaction_counts[content] = reaction_counts.get(content, 0) + 1

    return api_response({
        "reactions": reactions,
        "counts": reaction_counts,
        "total": len(reactions),
    })


@nostr_bp.route("/note/<event_id>/react", methods=["POST"])
@require_auth
def react_to_note(user_id: int, event_id: str):
    """React to a note (kind 7 event).

    Args:
        event_id: The Nostr event ID to react to

    Request body:
        content: Reaction content ("+" for like, or emoji)
        author_pubkey: Pubkey of the note author (for proper tagging)

    Returns:
        Reaction event result
    """
    creds = _get_nostr_credentials(user_id)
    data = request.get_json() or {}

    if not creds.get("private_key"):
        raise ApiError("NOSTR_READ_ONLY", "Private key required to react", 403)

    content = data.get("content", "+")  # Default to like
    author_pubkey = data.get("author_pubkey")

    tags = [["e", event_id]]
    if author_pubkey:
        tags.append(["p", author_pubkey])

    event = _create_event(
        creds["private_key"],
        kind=7,  # Reaction
        content=content,
        tags=tags,
    )

    relays = creds.get("relays", DEFAULT_RELAYS)
    results = _run_async(_publish_to_relays(event, relays))

    return api_response({
        "event_id": event["id"],
        "relay_results": results,
    }, status=201)


# =============================================================================
# Reposts Endpoints
# =============================================================================


@nostr_bp.route("/note/<event_id>/repost", methods=["POST"])
@require_auth
def repost_note(user_id: int, event_id: str):
    """Repost a note (kind 6 event).

    Args:
        event_id: The Nostr event ID to repost

    Request body:
        relay_url: Relay URL where the original event can be found (optional)
        author_pubkey: Pubkey of the original author (optional)

    Returns:
        Repost event result
    """
    creds = _get_nostr_credentials(user_id)
    data = request.get_json() or {}

    if not creds.get("private_key"):
        raise ApiError("NOSTR_READ_ONLY", "Private key required to repost", 403)

    relay_url = data.get("relay_url", "")
    author_pubkey = data.get("author_pubkey")

    tags = [["e", event_id, relay_url]]
    if author_pubkey:
        tags.append(["p", author_pubkey])

    event = _create_event(
        creds["private_key"],
        kind=6,  # Repost
        content="",  # Empty for simple repost
        tags=tags,
    )

    relays = creds.get("relays", DEFAULT_RELAYS)
    results = _run_async(_publish_to_relays(event, relays))

    return api_response({
        "event_id": event["id"],
        "relay_results": results,
    }, status=201)


# =============================================================================
# Following/Contacts Endpoints
# =============================================================================


@nostr_bp.route("/following", methods=["GET"])
@require_auth
def get_following(user_id: int):
    """Get the user's contact list (kind 3 event).

    Returns:
        List of followed pubkeys
    """
    creds = _get_nostr_credentials(user_id)
    pubkey = creds.get("public_key")

    if not pubkey and creds.get("private_key"):
        try:
            from secp256k1 import PrivateKey
            privkey = PrivateKey(bytes.fromhex(creds["private_key"]))
            pubkey = privkey.pubkey.serialize()[1:].hex()
        except Exception:
            raise ApiError("NOSTR_KEY_ERROR", "Could not derive public key", 500)

    relays = creds.get("relays", DEFAULT_RELAYS)

    # Query for kind 3 (contact list)
    filters = [{"kinds": [3], "authors": [pubkey], "limit": 1}]
    events = _run_async(_query_relays(filters, relays, limit=1))

    following = []
    if events:
        for tag in events[0].get("tags", []):
            if tag[0] == "p" and len(tag) > 1:
                contact = {"pubkey": tag[1]}
                if len(tag) > 2:
                    contact["relay"] = tag[2]
                if len(tag) > 3:
                    contact["petname"] = tag[3]
                following.append(contact)

    return api_response({"following": following, "count": len(following)})


@nostr_bp.route("/follow", methods=["POST"])
@require_auth
def follow_user(user_id: int):
    """Follow a user by adding to contact list.

    Request body:
        pubkey: Pubkey to follow
        relay: Preferred relay for this contact (optional)
        petname: Local nickname (optional)

    Returns:
        Updated contact list event
    """
    creds = _get_nostr_credentials(user_id)
    data = request.get_json() or {}

    if not creds.get("private_key"):
        raise ApiError("NOSTR_READ_ONLY", "Private key required to follow", 403)

    pubkey_to_follow = data.get("pubkey")
    if not pubkey_to_follow:
        raise ApiError("VALIDATION_ERROR", "Pubkey is required", 400)

    # Get current contact list
    my_pubkey = None
    try:
        from secp256k1 import PrivateKey
        privkey = PrivateKey(bytes.fromhex(creds["private_key"]))
        my_pubkey = privkey.pubkey.serialize()[1:].hex()
    except Exception:
        raise ApiError("NOSTR_KEY_ERROR", "Could not derive public key", 500)

    relays = creds.get("relays", DEFAULT_RELAYS)
    filters = [{"kinds": [3], "authors": [my_pubkey], "limit": 1}]
    events = _run_async(_query_relays(filters, relays, limit=1))

    # Build updated tag list
    tags = []
    if events:
        for tag in events[0].get("tags", []):
            if tag[0] == "p" and tag[1] != pubkey_to_follow:
                tags.append(tag)

    # Add new follow
    new_tag = ["p", pubkey_to_follow]
    if data.get("relay"):
        new_tag.append(data["relay"])
    if data.get("petname"):
        if len(new_tag) == 2:
            new_tag.append("")  # Empty relay
        new_tag.append(data["petname"])
    tags.append(new_tag)

    # Publish updated contact list
    event = _create_event(
        creds["private_key"],
        kind=3,
        content="",
        tags=tags,
    )

    results = _run_async(_publish_to_relays(event, relays))

    return api_response({
        "event_id": event["id"],
        "following_count": len(tags),
        "relay_results": results,
    })


# =============================================================================
# Relay Management
# =============================================================================


@nostr_bp.route("/relays", methods=["GET"])
@require_auth
def get_relays(user_id: int):
    """Get configured relays for the user.

    Returns:
        List of relay URLs
    """
    creds = _get_nostr_credentials(user_id)
    relays = creds.get("relays", DEFAULT_RELAYS)

    return api_response({
        "relays": relays,
        "default_relays": DEFAULT_RELAYS,
    })


@nostr_bp.route("/relays/info", methods=["GET"])
@require_auth
def get_relay_info(user_id: int):
    """Get information about relays (NIP-11).

    Query params:
        relay: Specific relay URL to query (optional)

    Returns:
        Relay information
    """
    import requests

    relay_url = request.args.get("relay")
    if not relay_url:
        creds = _get_nostr_credentials(user_id)
        relays = creds.get("relays", DEFAULT_RELAYS)
        relay_url = relays[0] if relays else DEFAULT_RELAYS[0]

    # Convert wss:// to https:// for NIP-11 info request
    # Only support secure connections (wss -> https)
    if relay_url.startswith("ws://"):
        # Upgrade insecure ws:// to wss:// for security
        relay_url = relay_url.replace("ws://", "wss://")
    http_url = relay_url.replace("wss://", "https://")

    try:
        response = requests.get(
            http_url,
            headers={"Accept": "application/nostr+json"},
            timeout=10,
        )
        if response.ok:
            return api_response(response.json())
        else:
            return api_response({"error": "Could not fetch relay info"})
    except Exception as e:
        return api_response({"error": str(e)})


# Nostr protocol constants
NOSTR_EVENT_KINDS = {
    0: "metadata",
    1: "text_note",
    2: "recommend_relay",
    3: "contacts",
    4: "encrypted_dm",
    5: "event_deletion",
    6: "repost",
    7: "reaction",
    40: "channel_creation",
    41: "channel_metadata",
    42: "channel_message",
    43: "channel_hide_message",
    44: "channel_mute_user",
}

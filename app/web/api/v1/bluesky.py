"""
Bluesky API endpoints for direct platform interactions.

Provides endpoints for:
- Profile fetching
- Timeline/feed retrieval
- Post creation, deletion
- Likes and reposts
- DID resolution
"""

from flask import Blueprint, request
from atproto import Client
from atproto.exceptions import AtProtocolError

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.web.api.v1.responses import api_response, api_error
from app.core.logger import setup_logger

logger = setup_logger(__name__)

bluesky_bp = Blueprint("bluesky", __name__, url_prefix="/bluesky")


def _get_bluesky_client(user_id: int) -> Client:
    """Get authenticated Bluesky client for user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "bluesky", "api")

    if not creds:
        raise ValueError("No Bluesky credentials found")

    client = Client()
    client.login(creds["identifier"], creds["password"])
    return client


def _format_profile(profile) -> dict:
    """Format AT Protocol profile to API response."""
    return {
        "did": profile.did,
        "handle": profile.handle,
        "displayName": getattr(profile, "display_name", None) or profile.handle,
        "description": getattr(profile, "description", None),
        "avatar": getattr(profile, "avatar", None),
        "banner": getattr(profile, "banner", None),
        "followersCount": getattr(profile, "followers_count", 0),
        "followsCount": getattr(profile, "follows_count", 0),
        "postsCount": getattr(profile, "posts_count", 0),
        "indexedAt": getattr(profile, "indexed_at", None),
        "labels": [{"val": l.val, "src": l.src} for l in (getattr(profile, "labels", None) or [])],
    }


def _format_post(post) -> dict:
    """Format AT Protocol post to API response."""
    record = post.record if hasattr(post, "record") else {}
    author = post.author if hasattr(post, "author") else None
    embed = getattr(post, "embed", None)

    formatted = {
        "uri": post.uri,
        "cid": post.cid,
        "author": _format_profile(author) if author else None,
        "record": {
            "$type": "app.bsky.feed.post",
            "text": getattr(record, "text", "") if hasattr(record, "text") else record.get("text", ""),
            "createdAt": getattr(record, "created_at", None) if hasattr(record, "created_at") else record.get("createdAt"),
            "langs": getattr(record, "langs", None) if hasattr(record, "langs") else record.get("langs"),
        },
        "replyCount": getattr(post, "reply_count", 0),
        "repostCount": getattr(post, "repost_count", 0),
        "likeCount": getattr(post, "like_count", 0),
        "quoteCount": getattr(post, "quote_count", 0),
        "indexedAt": getattr(post, "indexed_at", None),
        "labels": [{"val": l.val, "src": l.src} for l in (getattr(post, "labels", None) or [])],
    }

    # Handle embeds
    if embed:
        formatted["embed"] = _format_embed(embed)

    return formatted


def _format_embed(embed) -> dict:
    """Format post embed (images, external links, etc.)."""
    result = {"$type": getattr(embed, "py_type", "unknown")}

    # Images
    if hasattr(embed, "images") and embed.images:
        result["images"] = [
            {
                "thumb": img.thumb,
                "fullsize": img.fullsize,
                "alt": getattr(img, "alt", ""),
                "aspectRatio": {
                    "width": img.aspect_ratio.width,
                    "height": img.aspect_ratio.height,
                } if hasattr(img, "aspect_ratio") and img.aspect_ratio else None,
            }
            for img in embed.images
        ]

    # External links
    if hasattr(embed, "external") and embed.external:
        ext = embed.external
        result["external"] = {
            "uri": ext.uri,
            "title": getattr(ext, "title", ""),
            "description": getattr(ext, "description", ""),
            "thumb": getattr(ext, "thumb", None),
        }

    return result


@bluesky_bp.route("/profile/<handle>", methods=["GET"])
@require_auth
def get_profile(handle: str):
    """Get Bluesky profile by handle or DID."""
    try:
        client = _get_bluesky_client(request.user_id)
        profile = client.get_profile(handle)
        return api_response(_format_profile(profile))
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error fetching profile: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Bluesky profile: {e}")
        return api_error("Failed to fetch profile", 500)


@bluesky_bp.route("/timeline", methods=["GET"])
@require_auth
def get_timeline():
    """Get authenticated user's home timeline."""
    cursor = request.args.get("cursor")
    limit = min(int(request.args.get("limit", 50)), 100)

    try:
        client = _get_bluesky_client(request.user_id)
        response = client.get_timeline(cursor=cursor, limit=limit)

        feed = []
        for item in response.feed:
            feed_item = {
                "post": _format_post(item.post),
            }
            if hasattr(item, "reply") and item.reply:
                feed_item["reply"] = {
                    "root": _format_post(item.reply.root) if item.reply.root else None,
                    "parent": _format_post(item.reply.parent) if item.reply.parent else None,
                }
            if hasattr(item, "reason") and item.reason:
                feed_item["reason"] = {
                    "$type": getattr(item.reason, "py_type", "unknown"),
                    "by": _format_profile(item.reason.by) if hasattr(item.reason, "by") else None,
                    "indexedAt": getattr(item.reason, "indexed_at", None),
                }
            feed.append(feed_item)

        return api_response({
            "cursor": response.cursor,
            "feed": feed,
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error fetching timeline: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Bluesky timeline: {e}")
        return api_error("Failed to fetch timeline", 500)


@bluesky_bp.route("/feed/<path:feed_uri>", methods=["GET"])
@require_auth
def get_feed(feed_uri: str):
    """Get posts from a custom feed."""
    cursor = request.args.get("cursor")
    limit = min(int(request.args.get("limit", 50)), 100)

    try:
        client = _get_bluesky_client(request.user_id)
        response = client.app.bsky.feed.get_feed(
            {"feed": feed_uri, "cursor": cursor, "limit": limit}
        )

        feed = [{"post": _format_post(item.post)} for item in response.feed]

        return api_response({
            "cursor": response.cursor,
            "feed": feed,
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error fetching feed: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Bluesky feed: {e}")
        return api_error("Failed to fetch feed", 500)


@bluesky_bp.route("/post/<path:uri>", methods=["GET"])
@require_auth
def get_post(uri: str):
    """Get a single post by URI."""
    try:
        client = _get_bluesky_client(request.user_id)
        # Parse URI to get repo and rkey
        parts = uri.replace("at://", "").split("/")
        if len(parts) < 3:
            return api_error("Invalid post URI", 400)

        repo, collection, rkey = parts[0], parts[1], parts[2]
        response = client.get_post(rkey, repo)

        return api_response(_format_post(response))
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error fetching post: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Bluesky post: {e}")
        return api_error("Failed to fetch post", 500)


@bluesky_bp.route("/post", methods=["POST"])
@require_auth
def create_post():
    """Create a new post on Bluesky."""
    data = request.get_json() or {}
    text = data.get("text", "").strip()

    if not text:
        return api_error("Post text is required", 400)

    if len(text) > 300:
        return api_error("Post text exceeds 300 character limit", 400)

    reply_to = data.get("reply_to")  # Optional: {uri, cid}

    try:
        client = _get_bluesky_client(request.user_id)

        # Build reply reference if provided
        reply_ref = None
        if reply_to and reply_to.get("uri") and reply_to.get("cid"):
            from atproto import models
            parent = models.create_strong_ref(
                models.ComAtprotoRepoStrongRef.Main(
                    uri=reply_to["uri"],
                    cid=reply_to["cid"],
                )
            )
            # For reply, root is the same as parent unless specified
            root_data = reply_to.get("root", reply_to)
            root = models.create_strong_ref(
                models.ComAtprotoRepoStrongRef.Main(
                    uri=root_data["uri"],
                    cid=root_data["cid"],
                )
            )
            reply_ref = models.AppBskyFeedPost.ReplyRef(parent=parent, root=root)

        response = client.send_post(text=text, reply_to=reply_ref)

        return api_response({
            "uri": response.uri,
            "cid": response.cid,
        }, 201)
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error creating post: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error creating Bluesky post: {e}")
        return api_error("Failed to create post", 500)


@bluesky_bp.route("/post/<path:uri>", methods=["DELETE"])
@require_auth
def delete_post(uri: str):
    """Delete a post by URI."""
    try:
        client = _get_bluesky_client(request.user_id)
        client.delete_post(uri)
        return api_response({"deleted": True})
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error deleting post: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error deleting Bluesky post: {e}")
        return api_error("Failed to delete post", 500)


@bluesky_bp.route("/like", methods=["POST"])
@require_auth
def like_post():
    """Like a post."""
    data = request.get_json() or {}
    uri = data.get("uri")
    cid = data.get("cid")

    if not uri or not cid:
        return api_error("uri and cid are required", 400)

    try:
        client = _get_bluesky_client(request.user_id)
        response = client.like(uri, cid)
        return api_response({"uri": response.uri})
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error liking post: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error liking Bluesky post: {e}")
        return api_error("Failed to like post", 500)


@bluesky_bp.route("/unlike", methods=["POST"])
@require_auth
def unlike_post():
    """Remove like from a post."""
    data = request.get_json() or {}
    like_uri = data.get("like_uri")

    if not like_uri:
        return api_error("like_uri is required", 400)

    try:
        client = _get_bluesky_client(request.user_id)
        client.delete_like(like_uri)
        return api_response({"deleted": True})
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error unliking post: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error unliking Bluesky post: {e}")
        return api_error("Failed to unlike post", 500)


@bluesky_bp.route("/repost", methods=["POST"])
@require_auth
def repost():
    """Repost a post."""
    data = request.get_json() or {}
    uri = data.get("uri")
    cid = data.get("cid")

    if not uri or not cid:
        return api_error("uri and cid are required", 400)

    try:
        client = _get_bluesky_client(request.user_id)
        response = client.repost(uri, cid)
        return api_response({"uri": response.uri})
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error reposting: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error reposting on Bluesky: {e}")
        return api_error("Failed to repost", 500)


@bluesky_bp.route("/unrepost", methods=["POST"])
@require_auth
def unrepost():
    """Remove repost."""
    data = request.get_json() or {}
    repost_uri = data.get("repost_uri")

    if not repost_uri:
        return api_error("repost_uri is required", 400)

    try:
        client = _get_bluesky_client(request.user_id)
        client.delete_repost(repost_uri)
        return api_response({"deleted": True})
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error removing repost: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error removing repost on Bluesky: {e}")
        return api_error("Failed to remove repost", 500)


@bluesky_bp.route("/resolve/<identifier>", methods=["GET"])
@require_auth
def resolve_handle(identifier: str):
    """Resolve a handle to DID or vice versa."""
    try:
        client = _get_bluesky_client(request.user_id)

        if identifier.startswith("did:"):
            # Resolve DID to handle
            profile = client.get_profile(identifier)
            return api_response({
                "did": profile.did,
                "handle": profile.handle,
                "resolved_at": None,  # API doesn't provide this
            })
        else:
            # Resolve handle to DID
            response = client.resolve_handle(identifier)
            return api_response({
                "did": response.did,
                "handle": identifier,
                "resolved_at": None,
            })
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error resolving identifier: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error resolving Bluesky identifier: {e}")
        return api_error("Failed to resolve identifier", 500)


@bluesky_bp.route("/feeds/popular", methods=["GET"])
@require_auth
def get_popular_feeds():
    """Get popular/suggested feeds."""
    limit = min(int(request.args.get("limit", 25)), 100)
    cursor = request.args.get("cursor")

    try:
        client = _get_bluesky_client(request.user_id)
        response = client.app.bsky.feed.get_suggested_feeds(
            {"limit": limit, "cursor": cursor}
        )

        feeds = []
        for feed in response.feeds:
            feeds.append({
                "uri": feed.uri,
                "cid": feed.cid,
                "did": feed.did,
                "creator": _format_profile(feed.creator) if feed.creator else None,
                "displayName": feed.display_name,
                "description": getattr(feed, "description", None),
                "avatar": getattr(feed, "avatar", None),
                "likeCount": getattr(feed, "like_count", 0),
                "indexedAt": getattr(feed, "indexed_at", None),
            })

        return api_response({
            "cursor": response.cursor,
            "feeds": feeds,
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error fetching feeds: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Bluesky feeds: {e}")
        return api_error("Failed to fetch feeds", 500)


@bluesky_bp.route("/author/<handle>/feed", methods=["GET"])
@require_auth
def get_author_feed(handle: str):
    """Get posts from a specific author."""
    cursor = request.args.get("cursor")
    limit = min(int(request.args.get("limit", 50)), 100)

    try:
        client = _get_bluesky_client(request.user_id)
        response = client.get_author_feed(handle, cursor=cursor, limit=limit)

        feed = [{"post": _format_post(item.post)} for item in response.feed]

        return api_response({
            "cursor": response.cursor,
            "feed": feed,
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except AtProtocolError as e:
        logger.error(f"Bluesky API error fetching author feed: {e}")
        return api_error(f"Bluesky error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Bluesky author feed: {e}")
        return api_error("Failed to fetch author feed", 500)

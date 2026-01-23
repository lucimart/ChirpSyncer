"""
Twitter API endpoints with dual-mode support.

Supports two authentication modes:
1. Official Twitter API v2 (OAuth 2.0) - Full read/write access
2. Scraper mode (twscrape) - Read-only fallback

The mode is determined by credential type:
- api_key + api_secret + access_token + access_secret = API mode
- username + password = Scraper mode
"""

from flask import Blueprint, request
import requests
from typing import Optional
import base64
import hashlib
import hmac
import time
import urllib.parse

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.web.api.v1.responses import api_response, api_error
from app.core.logger import setup_logger

logger = setup_logger(__name__)

twitter_bp = Blueprint("twitter", __name__, url_prefix="/twitter")

# Twitter API v2 base URL
TWITTER_API_BASE = "https://api.twitter.com/2"


def _get_twitter_credentials(user_id: int) -> dict:
    """
    Get Twitter credentials for authenticated user.

    Returns dict with mode ('api' or 'scraper') and relevant credentials.
    """
    cm = CredentialManager()

    # Try API credentials first
    api_creds = cm.get_credentials(user_id, "twitter", "api")
    if api_creds and api_creds.get("api_key"):
        return {
            "mode": "api",
            "api_key": api_creds.get("api_key"),
            "api_secret": api_creds.get("api_secret"),
            "access_token": api_creds.get("access_token"),
            "access_secret": api_creds.get("access_secret"),
            "bearer_token": api_creds.get("bearer_token"),
        }

    # Fall back to scraper credentials
    scraper_creds = cm.get_credentials(user_id, "twitter", "scraping")
    if scraper_creds:
        return {
            "mode": "scraper",
            "username": scraper_creds.get("username"),
            "password": scraper_creds.get("password"),
        }

    raise ValueError("No Twitter credentials found")


def _generate_oauth_signature(
    method: str,
    url: str,
    params: dict,
    api_key: str,
    api_secret: str,
    token: str,
    token_secret: str,
) -> str:
    """Generate OAuth 1.0a signature for Twitter API."""
    # Create parameter string
    sorted_params = sorted(params.items())
    param_string = "&".join([f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params])

    # Create signature base string
    base_string = f"{method.upper()}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(param_string, safe='')}"

    # Create signing key
    signing_key = f"{urllib.parse.quote(api_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"

    # Generate signature
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    ).decode()

    return signature


def _twitter_api_request(
    creds: dict,
    endpoint: str,
    method: str = "GET",
    params: Optional[dict] = None,
    json_data: Optional[dict] = None,
) -> dict:
    """
    Make authenticated request to Twitter API v2.

    Uses OAuth 1.0a User Context for write operations,
    Bearer token for read-only operations.
    """
    url = f"{TWITTER_API_BASE}{endpoint}"

    # For read operations, prefer bearer token
    if method == "GET" and creds.get("bearer_token"):
        headers = {"Authorization": f"Bearer {creds['bearer_token']}"}
        response = requests.get(url, headers=headers, params=params, timeout=30)
    else:
        # OAuth 1.0a for write operations
        oauth_params = {
            "oauth_consumer_key": creds["api_key"],
            "oauth_nonce": base64.b64encode(str(time.time()).encode()).decode()[:32],
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": creds["access_token"],
            "oauth_version": "1.0",
        }

        # Combine with request params for signature
        all_params = {**oauth_params, **(params or {})}

        signature = _generate_oauth_signature(
            method,
            url,
            all_params,
            creds["api_key"],
            creds["api_secret"],
            creds["access_token"],
            creds["access_secret"],
        )
        oauth_params["oauth_signature"] = signature

        # Build Authorization header
        auth_header = "OAuth " + ", ".join([
            f'{k}="{urllib.parse.quote(str(v), safe="")}"'
            for k, v in sorted(oauth_params.items())
        ])

        headers = {"Authorization": auth_header}

        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            headers["Content-Type"] = "application/json"
            response = requests.post(url, headers=headers, json=json_data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")

    response.raise_for_status()
    return response.json() if response.text else {}


def _scraper_request(creds: dict, operation: str, **kwargs) -> dict:
    """
    Perform read operation using twscrape scraper.

    Note: Scraper mode is read-only.
    """
    try:
        from twscrape import API
        import asyncio

        api = API()

        # Run async operation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            if operation == "user_by_login":
                result = loop.run_until_complete(api.user_by_login(kwargs["username"]))
                if result:
                    return {
                        "data": {
                            "id": str(result.id),
                            "username": result.username,
                            "name": result.displayname,
                            "description": result.rawDescription,
                            "profile_image_url": result.profileImageUrl,
                            "public_metrics": {
                                "followers_count": result.followersCount,
                                "following_count": result.friendsCount,
                                "tweet_count": result.statusesCount,
                            },
                            "verified": result.verified,
                            "created_at": result.created.isoformat() if result.created else None,
                        }
                    }

            elif operation == "user_tweets":
                tweets = loop.run_until_complete(api.user_tweets(kwargs["user_id"], limit=kwargs.get("limit", 20)))
                data = []
                for tweet in tweets:
                    data.append({
                        "id": str(tweet.id),
                        "text": tweet.rawContent,
                        "created_at": tweet.date.isoformat() if tweet.date else None,
                        "public_metrics": {
                            "like_count": tweet.likeCount,
                            "retweet_count": tweet.retweetCount,
                            "reply_count": tweet.replyCount,
                            "quote_count": tweet.quoteCount,
                        },
                        "author_id": str(tweet.user.id) if tweet.user else None,
                    })
                return {"data": data}

            elif operation == "tweet_details":
                tweet = loop.run_until_complete(api.tweet_details(kwargs["tweet_id"]))
                if tweet:
                    return {
                        "data": {
                            "id": str(tweet.id),
                            "text": tweet.rawContent,
                            "created_at": tweet.date.isoformat() if tweet.date else None,
                            "public_metrics": {
                                "like_count": tweet.likeCount,
                                "retweet_count": tweet.retweetCount,
                                "reply_count": tweet.replyCount,
                                "quote_count": tweet.quoteCount,
                            },
                            "author_id": str(tweet.user.id) if tweet.user else None,
                        }
                    }

            elif operation == "search":
                tweets = loop.run_until_complete(api.search(kwargs["query"], limit=kwargs.get("limit", 20)))
                data = []
                for tweet in tweets:
                    data.append({
                        "id": str(tweet.id),
                        "text": tweet.rawContent,
                        "created_at": tweet.date.isoformat() if tweet.date else None,
                        "public_metrics": {
                            "like_count": tweet.likeCount,
                            "retweet_count": tweet.retweetCount,
                            "reply_count": tweet.replyCount,
                        },
                        "author_id": str(tweet.user.id) if tweet.user else None,
                    })
                return {"data": data}

        finally:
            loop.close()

        return {"data": None}

    except ImportError:
        raise ValueError("twscrape not installed. Install with: pip install twscrape")
    except Exception as e:
        logger.error(f"Scraper error: {e}")
        raise


def _format_user(user: dict) -> dict:
    """Format Twitter user data to API response."""
    data = user.get("data", user)
    return {
        "id": data.get("id"),
        "username": data.get("username"),
        "name": data.get("name"),
        "description": data.get("description"),
        "profile_image_url": data.get("profile_image_url"),
        "verified": data.get("verified", False),
        "created_at": data.get("created_at"),
        "public_metrics": data.get("public_metrics", {}),
    }


def _format_tweet(tweet: dict) -> dict:
    """Format tweet data to API response."""
    return {
        "id": tweet.get("id"),
        "text": tweet.get("text"),
        "created_at": tweet.get("created_at"),
        "author_id": tweet.get("author_id"),
        "public_metrics": tweet.get("public_metrics", {}),
        "attachments": tweet.get("attachments"),
        "entities": tweet.get("entities"),
        "conversation_id": tweet.get("conversation_id"),
        "in_reply_to_user_id": tweet.get("in_reply_to_user_id"),
    }


@twitter_bp.route("/mode", methods=["GET"])
@require_auth
def get_connection_mode():
    """
    Get the current Twitter connection mode.

    Returns whether using API or scraper mode and available capabilities.
    """
    try:
        creds = _get_twitter_credentials(request.user_id)

        capabilities = {
            "read_profile": True,
            "read_tweets": True,
            "read_timeline": creds["mode"] == "api",
            "search": True,
            "post_tweet": creds["mode"] == "api",
            "delete_tweet": creds["mode"] == "api",
            "like": creds["mode"] == "api",
            "retweet": creds["mode"] == "api",
            "reply": creds["mode"] == "api",
        }

        return api_response({
            "mode": creds["mode"],
            "capabilities": capabilities,
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except Exception as e:
        logger.error(f"Error getting Twitter mode: {e}")
        return api_error("Failed to get connection mode", status=500)


@twitter_bp.route("/profile/<username>", methods=["GET"])
@require_auth
def get_profile(username: str):
    """Get Twitter user profile by username."""
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] == "api":
            params = {
                "user.fields": "id,username,name,description,profile_image_url,verified,created_at,public_metrics"
            }
            result = _twitter_api_request(creds, f"/users/by/username/{username}", params=params)
        else:
            result = _scraper_request(creds, "user_by_login", username=username)

        if not result.get("data"):
            return api_error("User not found", status=404)

        return api_response(_format_user(result))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error fetching profile {username}: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("User not found", status=404)
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Twitter profile {username}: {e}")
        return api_error("Failed to fetch profile", status=500)


@twitter_bp.route("/profile/<username>/tweets", methods=["GET"])
@require_auth
def get_user_tweets(username: str):
    """
    Get tweets from a user.

    Query params:
        limit: Number of tweets to return (default 20, max 100)
        pagination_token: Token for pagination (API mode only)
    """
    try:
        creds = _get_twitter_credentials(request.user_id)
        limit = min(int(request.args.get("limit", 20)), 100)

        if creds["mode"] == "api":
            # First get user ID
            user_result = _twitter_api_request(creds, f"/users/by/username/{username}")
            user_id = user_result.get("data", {}).get("id")

            if not user_id:
                return api_error("User not found", status=404)

            params = {
                "max_results": limit,
                "tweet.fields": "id,text,created_at,public_metrics,attachments,entities,conversation_id",
            }

            pagination_token = request.args.get("pagination_token")
            if pagination_token:
                params["pagination_token"] = pagination_token

            result = _twitter_api_request(creds, f"/users/{user_id}/tweets", params=params)

        else:
            # Scraper mode - need user ID first
            user_result = _scraper_request(creds, "user_by_login", username=username)
            user_id = user_result.get("data", {}).get("id")

            if not user_id:
                return api_error("User not found", status=404)

            result = _scraper_request(creds, "user_tweets", user_id=int(user_id), limit=limit)

        tweets = [_format_tweet(t) for t in result.get("data", [])]

        response_data = {"data": tweets}
        if result.get("meta", {}).get("next_token"):
            response_data["next_token"] = result["meta"]["next_token"]

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error fetching tweets for {username}: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching tweets for {username}: {e}")
        return api_error("Failed to fetch tweets", status=500)


@twitter_bp.route("/tweet/<tweet_id>", methods=["GET"])
@require_auth
def get_tweet(tweet_id: str):
    """Get a single tweet by ID."""
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] == "api":
            params = {
                "tweet.fields": "id,text,created_at,public_metrics,attachments,entities,conversation_id,author_id",
                "expansions": "author_id",
                "user.fields": "id,username,name,profile_image_url",
            }
            result = _twitter_api_request(creds, f"/tweets/{tweet_id}", params=params)
        else:
            result = _scraper_request(creds, "tweet_details", tweet_id=int(tweet_id))

        if not result.get("data"):
            return api_error("Tweet not found", status=404)

        return api_response(_format_tweet(result.get("data", result)))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error fetching tweet {tweet_id}: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Tweet not found", status=404)
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching tweet {tweet_id}: {e}")
        return api_error("Failed to fetch tweet", status=500)


@twitter_bp.route("/search", methods=["GET"])
@require_auth
def search_tweets():
    """
    Search for tweets.

    Query params:
        q: Search query (required)
        limit: Number of results (default 20, max 100)
        next_token: Pagination token (API mode only)
    """
    try:
        creds = _get_twitter_credentials(request.user_id)

        query = request.args.get("q")
        if not query:
            return api_error("Query parameter 'q' is required", status=400)

        limit = min(int(request.args.get("limit", 20)), 100)

        if creds["mode"] == "api":
            params = {
                "query": query,
                "max_results": max(limit, 10),  # API minimum is 10
                "tweet.fields": "id,text,created_at,public_metrics,author_id",
            }

            next_token = request.args.get("next_token")
            if next_token:
                params["next_token"] = next_token

            result = _twitter_api_request(creds, "/tweets/search/recent", params=params)
        else:
            result = _scraper_request(creds, "search", query=query, limit=limit)

        tweets = [_format_tweet(t) for t in result.get("data", [])]

        response_data = {"data": tweets}
        if result.get("meta", {}).get("next_token"):
            response_data["next_token"] = result["meta"]["next_token"]

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error searching: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error searching Twitter: {e}")
        return api_error("Failed to search", status=500)


# ============================================================================
# Write Operations (API mode only)
# ============================================================================


@twitter_bp.route("/tweet", methods=["POST"])
@require_auth
def create_tweet():
    """
    Post a new tweet.

    Requires API mode (official Twitter API credentials).

    Body:
        text: Tweet content (required)
        reply_to: Tweet ID to reply to (optional)
        quote_tweet_id: Tweet ID to quote (optional)
        media_ids: List of media IDs to attach (optional)
    """
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error(
                "Posting requires Twitter API credentials. Scraper mode is read-only.",
                status=403
            )

        body = request.get_json() or {}
        text = body.get("text")

        if not text:
            return api_error("text is required", status=400)

        if len(text) > 280:
            return api_error("Tweet exceeds 280 character limit", status=400)

        tweet_data = {"text": text}

        if body.get("reply_to"):
            tweet_data["reply"] = {"in_reply_to_tweet_id": body["reply_to"]}

        if body.get("quote_tweet_id"):
            tweet_data["quote_tweet_id"] = body["quote_tweet_id"]

        if body.get("media_ids"):
            tweet_data["media"] = {"media_ids": body["media_ids"]}

        result = _twitter_api_request(creds, "/tweets", method="POST", json_data=tweet_data)

        return api_response({
            "id": result.get("data", {}).get("id"),
            "text": result.get("data", {}).get("text"),
            "status": "CREATED",
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error creating tweet: {e}")
        if e.response is not None:
            try:
                error_data = e.response.json()
                error_msg = error_data.get("detail") or error_data.get("title", "Failed to post")
                return api_error(error_msg, status=e.response.status_code)
            except Exception as parse_err:
                logger.debug(f"Could not parse Twitter error response: {parse_err}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error creating tweet: {e}")
        return api_error("Failed to create tweet", status=500)


@twitter_bp.route("/tweet/<tweet_id>", methods=["DELETE"])
@require_auth
def delete_tweet(tweet_id: str):
    """
    Delete a tweet.

    Requires API mode and ownership of the tweet.
    """
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error(
                "Deleting requires Twitter API credentials. Scraper mode is read-only.",
                status=403
            )

        result = _twitter_api_request(creds, f"/tweets/{tweet_id}", method="DELETE")

        return api_response({
            "id": tweet_id,
            "deleted": result.get("data", {}).get("deleted", True),
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error deleting tweet {tweet_id}: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Tweet not found", status=404)
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error deleting tweet {tweet_id}: {e}")
        return api_error("Failed to delete tweet", status=500)


@twitter_bp.route("/tweet/<tweet_id>/like", methods=["POST"])
@require_auth
def like_tweet(tweet_id: str):
    """Like a tweet. Requires API mode."""
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error("Liking requires Twitter API credentials.", status=403)

        # Get authenticated user ID
        me_result = _twitter_api_request(creds, "/users/me")
        user_id = me_result.get("data", {}).get("id")

        result = _twitter_api_request(
            creds,
            f"/users/{user_id}/likes",
            method="POST",
            json_data={"tweet_id": tweet_id}
        )

        return api_response({
            "tweet_id": tweet_id,
            "liked": result.get("data", {}).get("liked", True),
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error liking tweet {tweet_id}: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error liking tweet {tweet_id}: {e}")
        return api_error("Failed to like tweet", status=500)


@twitter_bp.route("/tweet/<tweet_id>/unlike", methods=["POST"])
@require_auth
def unlike_tweet(tweet_id: str):
    """Unlike a tweet. Requires API mode."""
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error("Unliking requires Twitter API credentials.", status=403)

        me_result = _twitter_api_request(creds, "/users/me")
        user_id = me_result.get("data", {}).get("id")

        result = _twitter_api_request(creds, f"/users/{user_id}/likes/{tweet_id}", method="DELETE")

        return api_response({
            "tweet_id": tweet_id,
            "liked": False,
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error unliking tweet {tweet_id}: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error unliking tweet {tweet_id}: {e}")
        return api_error("Failed to unlike tweet", status=500)


@twitter_bp.route("/tweet/<tweet_id>/retweet", methods=["POST"])
@require_auth
def retweet(tweet_id: str):
    """Retweet a tweet. Requires API mode."""
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error("Retweeting requires Twitter API credentials.", status=403)

        me_result = _twitter_api_request(creds, "/users/me")
        user_id = me_result.get("data", {}).get("id")

        result = _twitter_api_request(
            creds,
            f"/users/{user_id}/retweets",
            method="POST",
            json_data={"tweet_id": tweet_id}
        )

        return api_response({
            "tweet_id": tweet_id,
            "retweeted": result.get("data", {}).get("retweeted", True),
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error retweeting {tweet_id}: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error retweeting {tweet_id}: {e}")
        return api_error("Failed to retweet", status=500)


@twitter_bp.route("/tweet/<tweet_id>/unretweet", methods=["POST"])
@require_auth
def unretweet(tweet_id: str):
    """Remove a retweet. Requires API mode."""
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error("Removing retweet requires Twitter API credentials.", status=403)

        me_result = _twitter_api_request(creds, "/users/me")
        user_id = me_result.get("data", {}).get("id")

        result = _twitter_api_request(creds, f"/users/{user_id}/retweets/{tweet_id}", method="DELETE")

        return api_response({
            "tweet_id": tweet_id,
            "retweeted": False,
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error removing retweet {tweet_id}: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error removing retweet {tweet_id}: {e}")
        return api_error("Failed to remove retweet", status=500)


@twitter_bp.route("/timeline/home", methods=["GET"])
@require_auth
def get_home_timeline():
    """
    Get the authenticated user's home timeline.

    Requires API mode (home timeline not available via scraping).

    Query params:
        limit: Number of tweets (default 20, max 100)
        pagination_token: Token for pagination
    """
    try:
        creds = _get_twitter_credentials(request.user_id)

        if creds["mode"] != "api":
            return api_error(
                "Home timeline requires Twitter API credentials. Use search or user tweets with scraper mode.",
                status=403
            )

        me_result = _twitter_api_request(creds, "/users/me")
        user_id = me_result.get("data", {}).get("id")

        limit = min(int(request.args.get("limit", 20)), 100)

        params = {
            "max_results": limit,
            "tweet.fields": "id,text,created_at,public_metrics,author_id,attachments,entities",
            "expansions": "author_id",
            "user.fields": "id,username,name,profile_image_url",
        }

        pagination_token = request.args.get("pagination_token")
        if pagination_token:
            params["pagination_token"] = pagination_token

        result = _twitter_api_request(creds, f"/users/{user_id}/reverse_chronological_timeline", params=params)

        tweets = [_format_tweet(t) for t in result.get("data", [])]

        response_data = {"data": tweets}
        if result.get("meta", {}).get("next_token"):
            response_data["next_token"] = result["meta"]["next_token"]

        # Include user data for author lookup
        if result.get("includes", {}).get("users"):
            response_data["includes"] = {"users": result["includes"]["users"]}

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Twitter API error fetching timeline: {e}")
        return api_error("Twitter API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching timeline: {e}")
        return api_error("Failed to fetch timeline", status=500)

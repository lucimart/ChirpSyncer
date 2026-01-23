"""Lens Protocol API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

lens_bp = Blueprint("lens", __name__)


LENS_API_URL = "https://api-v2.lens.dev"


def get_lens_credentials():
    """Get Lens credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("lens")


def lens_graphql(query: str, variables: dict = None, creds: dict = None):
    """Make GraphQL request to Lens API."""
    headers = {"Content-Type": "application/json"}

    if creds and creds.get("access_token"):
        headers["Authorization"] = f"Bearer {creds['access_token']}"

    response = http_requests.post(
        LENS_API_URL,
        headers=headers,
        json={"query": query, "variables": variables or {}}
    )

    return response


@lens_bp.route("/auth/challenge", methods=["POST"])
def get_challenge():
    """Get authentication challenge for wallet signature."""
    data = request.get_json() or {}
    address = data.get("address")

    if not address:
        return api_error("address required", 400)

    query = """
    query Challenge($request: ChallengeRequest!) {
        challenge(request: $request) {
            id
            text
        }
    }
    """

    response = lens_graphql(query, {"request": {"signedBy": address}})

    if not response.ok:
        return api_error("Failed to get challenge", response.status_code)

    result = response.json()
    if "errors" in result:
        return api_error(result["errors"][0]["message"], 400)

    return api_response(result.get("data", {}).get("challenge", {}))


@lens_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Lens using signed challenge."""
    data = request.get_json() or {}

    challenge_id = data.get("id")
    signature = data.get("signature")

    if not all([challenge_id, signature]):
        return api_error("id and signature required", 400)

    query = """
    mutation Authenticate($request: SignedAuthChallenge!) {
        authenticate(request: $request) {
            accessToken
            refreshToken
        }
    }
    """

    response = lens_graphql(query, {
        "request": {
            "id": challenge_id,
            "signature": signature
        }
    })

    if not response.ok:
        return api_error("Authentication failed", response.status_code)

    result = response.json()
    if "errors" in result:
        return api_error(result["errors"][0]["message"], 400)

    auth_data = result.get("data", {}).get("authenticate", {})
    access_token = auth_data.get("accessToken")
    refresh_token = auth_data.get("refreshToken")

    # Store credentials
    cm = CredentialManager()
    cm.store_credentials("lens", {
        "access_token": access_token,
        "refresh_token": refresh_token,
    })

    return api_response({
        "authenticated": True,
        "access_token": access_token,
    })


@lens_bp.route("/profiles/search", methods=["GET"])
def search_profiles():
    """Search for Lens profiles."""
    query_text = request.args.get("q")
    if not query_text:
        return api_error("q (query) required", 400)

    query = """
    query SearchProfiles($request: ProfileSearchRequest!) {
        searchProfiles(request: $request) {
            items {
                id
                handle {
                    fullHandle
                    localName
                }
                metadata {
                    displayName
                    bio
                    picture {
                        ... on ImageSet {
                            optimized {
                                uri
                            }
                        }
                    }
                }
                stats {
                    followers
                    following
                    posts
                }
            }
            pageInfo {
                next
            }
        }
    }
    """

    response = lens_graphql(query, {
        "request": {
            "query": query_text,
            "limit": "Ten"
        }
    })

    if not response.ok:
        return api_error("Search failed", response.status_code)

    result = response.json()
    return api_response(result.get("data", {}).get("searchProfiles", {}))


@lens_bp.route("/profiles/<profile_id>", methods=["GET"])
def get_profile(profile_id: str):
    """Get a Lens profile."""
    creds = get_lens_credentials()

    query = """
    query Profile($request: ProfileRequest!) {
        profile(request: $request) {
            id
            handle {
                fullHandle
                localName
            }
            metadata {
                displayName
                bio
                picture {
                    ... on ImageSet {
                        optimized {
                            uri
                        }
                    }
                }
                coverPicture {
                    ... on ImageSet {
                        optimized {
                            uri
                        }
                    }
                }
            }
            stats {
                followers
                following
                posts
                comments
                mirrors
                quotes
            }
            ownedBy {
                address
            }
        }
    }
    """

    response = lens_graphql(query, {"request": {"forProfileId": profile_id}}, creds)

    if not response.ok:
        return api_error("Profile not found", response.status_code)

    result = response.json()
    return api_response(result.get("data", {}).get("profile", {}))


@lens_bp.route("/feed", methods=["GET"])
@require_auth
def get_feed():
    """Get authenticated user's feed."""
    creds = get_lens_credentials()
    if not creds:
        return api_error("Lens not configured", 400)

    query = """
    query Feed($request: FeedRequest!) {
        feed(request: $request) {
            items {
                id
                root {
                    ... on Post {
                        id
                        metadata {
                            ... on TextOnlyMetadataV3 {
                                content
                            }
                            ... on ImageMetadataV3 {
                                content
                                asset {
                                    image {
                                        optimized {
                                            uri
                                        }
                                    }
                                }
                            }
                        }
                        by {
                            handle {
                                fullHandle
                            }
                        }
                        stats {
                            upvotes
                            comments
                            mirrors
                        }
                        createdAt
                    }
                }
            }
            pageInfo {
                next
            }
        }
    }
    """

    cursor = request.args.get("cursor")
    variables = {"request": {"limit": "Ten"}}
    if cursor:
        variables["request"]["cursor"] = cursor

    response = lens_graphql(query, variables, creds)

    if not response.ok:
        return api_error("Failed to fetch feed", response.status_code)

    result = response.json()
    return api_response(result.get("data", {}).get("feed", {}))


@lens_bp.route("/publications", methods=["GET"])
def get_publications():
    """Get publications for a profile."""
    profile_id = request.args.get("profile_id")
    if not profile_id:
        return api_error("profile_id required", 400)

    creds = get_lens_credentials()

    query = """
    query Publications($request: PublicationsRequest!) {
        publications(request: $request) {
            items {
                ... on Post {
                    id
                    metadata {
                        ... on TextOnlyMetadataV3 {
                            content
                        }
                        ... on ImageMetadataV3 {
                            content
                            asset {
                                image {
                                    optimized {
                                        uri
                                    }
                                }
                            }
                        }
                    }
                    stats {
                        upvotes
                        comments
                        mirrors
                    }
                    createdAt
                }
            }
            pageInfo {
                next
            }
        }
    }
    """

    cursor = request.args.get("cursor")
    variables = {
        "request": {
            "where": {"from": [profile_id]},
            "limit": "Ten"
        }
    }
    if cursor:
        variables["request"]["cursor"] = cursor

    response = lens_graphql(query, variables, creds)

    if not response.ok:
        return api_error("Failed to fetch publications", response.status_code)

    result = response.json()
    return api_response(result.get("data", {}).get("publications", {}))


@lens_bp.route("/publications/<pub_id>", methods=["GET"])
def get_publication(pub_id: str):
    """Get a specific publication."""
    creds = get_lens_credentials()

    query = """
    query Publication($request: PublicationRequest!) {
        publication(request: $request) {
            ... on Post {
                id
                metadata {
                    ... on TextOnlyMetadataV3 {
                        content
                    }
                    ... on ImageMetadataV3 {
                        content
                        asset {
                            image {
                                optimized {
                                    uri
                                }
                            }
                        }
                    }
                }
                by {
                    handle {
                        fullHandle
                    }
                }
                stats {
                    upvotes
                    comments
                    mirrors
                }
                createdAt
            }
        }
    }
    """

    response = lens_graphql(query, {"request": {"forId": pub_id}}, creds)

    if not response.ok:
        return api_error("Publication not found", response.status_code)

    result = response.json()
    return api_response(result.get("data", {}).get("publication", {}))


@lens_bp.route("/publications", methods=["POST"])
@require_auth
def create_post():
    """Create a new post on Lens."""
    creds = get_lens_credentials()
    if not creds:
        return api_error("Lens not configured", 400)

    data = request.get_json() or {}
    content = data.get("content")

    if not content:
        return api_error("content required", 400)

    # Note: Creating posts on Lens requires uploading metadata to IPFS first
    # and then calling the createOnchainPostTypedData mutation
    # This is a simplified version that would need IPFS integration

    return api_error(
        "Post creation requires IPFS integration. Use Lens client SDK.",
        501
    )


@lens_bp.route("/publications/<pub_id>/react", methods=["POST"])
@require_auth
def react_to_publication(pub_id: str):
    """Add reaction to a publication."""
    creds = get_lens_credentials()
    if not creds:
        return api_error("Lens not configured", 400)

    data = request.get_json() or {}
    reaction = data.get("reaction", "UPVOTE")

    query = """
    mutation AddReaction($request: ReactionRequest!) {
        addReaction(request: $request)
    }
    """

    response = lens_graphql(query, {
        "request": {
            "for": pub_id,
            "reaction": reaction
        }
    }, creds)

    if not response.ok:
        return api_error("Failed to add reaction", response.status_code)

    result = response.json()
    if "errors" in result:
        return api_error(result["errors"][0]["message"], 400)

    return api_response({"reacted": True})


@lens_bp.route("/follow/<profile_id>", methods=["POST"])
@require_auth
def follow_profile(profile_id: str):
    """Follow a profile."""
    creds = get_lens_credentials()
    if not creds:
        return api_error("Lens not configured", 400)

    query = """
    mutation Follow($request: FollowLensManagerRequest!) {
        follow(request: $request) {
            ... on LensProfileManagerRelayError {
                reason
            }
        }
    }
    """

    response = lens_graphql(query, {
        "request": {"follow": [{"profileId": profile_id}]}
    }, creds)

    if not response.ok:
        return api_error("Failed to follow", response.status_code)

    result = response.json()
    if "errors" in result:
        return api_error(result["errors"][0]["message"], 400)

    return api_response({"following": True})


@lens_bp.route("/unfollow/<profile_id>", methods=["POST"])
@require_auth
def unfollow_profile(profile_id: str):
    """Unfollow a profile."""
    creds = get_lens_credentials()
    if not creds:
        return api_error("Lens not configured", 400)

    query = """
    mutation Unfollow($request: UnfollowRequest!) {
        unfollow(request: $request) {
            ... on LensProfileManagerRelayError {
                reason
            }
        }
    }
    """

    response = lens_graphql(query, {
        "request": {"unfollow": [profile_id]}
    }, creds)

    if not response.ok:
        return api_error("Failed to unfollow", response.status_code)

    result = response.json()
    if "errors" in result:
        return api_error(result["errors"][0]["message"], 400)

    return api_response({"following": False})


@lens_bp.route("/explore", methods=["GET"])
def explore_publications():
    """Explore trending publications."""
    creds = get_lens_credentials()

    query = """
    query ExplorePublications($request: ExplorePublicationRequest!) {
        explorePublications(request: $request) {
            items {
                ... on Post {
                    id
                    metadata {
                        ... on TextOnlyMetadataV3 {
                            content
                        }
                    }
                    by {
                        handle {
                            fullHandle
                        }
                    }
                    stats {
                        upvotes
                        comments
                    }
                    createdAt
                }
            }
            pageInfo {
                next
            }
        }
    }
    """

    order_by = request.args.get("order_by", "LATEST")
    cursor = request.args.get("cursor")

    variables = {
        "request": {
            "orderBy": order_by,
            "limit": "Ten"
        }
    }
    if cursor:
        variables["request"]["cursor"] = cursor

    response = lens_graphql(query, variables, creds)

    if not response.ok:
        return api_error("Failed to explore", response.status_code)

    result = response.json()
    return api_response(result.get("data", {}).get("explorePublications", {}))

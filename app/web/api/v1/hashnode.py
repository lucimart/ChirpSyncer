"""
Hashnode API Integration

Endpoints for Hashnode developer blogging platform:
- User profile
- Publications
- Posts (CRUD)
- Series
- Drafts

Note: Hashnode uses GraphQL API.
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

hashnode_bp = Blueprint("hashnode", __name__, url_prefix="/hashnode")

HASHNODE_API_BASE = "https://gql.hashnode.com"


def get_hashnode_headers(access_token: str) -> dict:
    """Get headers for Hashnode API requests."""
    return {
        "Authorization": access_token,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def execute_graphql(headers: dict, query: str, variables: dict = None) -> dict:
    """Execute a GraphQL query against Hashnode API."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    resp = http_requests.post(
        HASHNODE_API_BASE,
        headers=headers,
        json=payload,
        timeout=30,
    )

    return resp


@hashnode_bp.route("/me", methods=["GET"])
def get_current_user():
    """Get authenticated user's profile."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    query = """
    query Me {
        me {
            id
            username
            name
            bio {
                markdown
            }
            profilePicture
            socialMediaLinks {
                twitter
                github
                linkedin
                website
            }
            badges {
                id
                name
            }
            followersCount
            followingsCount
            posts(page: 1, pageSize: 1) {
                totalDocuments
            }
        }
    }
    """

    resp = execute_graphql(headers, query)

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    return api_response(data.get("data", {}).get("me"))


@hashnode_bp.route("/publications", methods=["GET"])
def get_my_publications():
    """Get user's publications."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    query = """
    query Me {
        me {
            publications(first: 10) {
                edges {
                    node {
                        id
                        title
                        displayTitle
                        url
                        canonicalURL
                        favicon
                        isTeam
                        followersCount
                        about {
                            markdown
                        }
                    }
                }
            }
        }
    }
    """

    resp = execute_graphql(headers, query)

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    publications = data.get("data", {}).get("me", {}).get("publications", {})
    edges = publications.get("edges", [])
    return api_response({"publications": [e["node"] for e in edges]})


@hashnode_bp.route("/publications/<publication_id>/posts", methods=["GET"])
def get_publication_posts(publication_id: str):
    """Get posts from a publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    first = request.args.get("first", 10, type=int)
    after = request.args.get("after")

    query = """
    query Publication($id: ObjectId!, $first: Int!, $after: String) {
        publication(id: $id) {
            posts(first: $first, after: $after) {
                edges {
                    node {
                        id
                        title
                        slug
                        brief
                        url
                        canonicalUrl
                        publishedAt
                        updatedAt
                        readTimeInMinutes
                        views
                        reactionCount
                        responseCount
                        coverImage {
                            url
                        }
                        tags {
                            id
                            name
                            slug
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
    """

    variables = {"id": publication_id, "first": min(first, 50)}
    if after:
        variables["after"] = after

    resp = execute_graphql(headers, query, variables)

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    posts_data = data.get("data", {}).get("publication", {}).get("posts", {})
    return api_response({
        "posts": [e["node"] for e in posts_data.get("edges", [])],
        "pageInfo": posts_data.get("pageInfo", {}),
    })


@hashnode_bp.route("/posts/<post_id>", methods=["GET"])
def get_post(post_id: str):
    """Get a specific post by ID."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    query = """
    query Post($id: ID!) {
        post(id: $id) {
            id
            title
            slug
            brief
            url
            canonicalUrl
            publishedAt
            updatedAt
            readTimeInMinutes
            views
            reactionCount
            responseCount
            content {
                markdown
                html
            }
            coverImage {
                url
            }
            tags {
                id
                name
                slug
            }
            author {
                id
                username
                name
            }
            seo {
                title
                description
            }
        }
    }
    """

    resp = execute_graphql(headers, query, {"id": post_id})

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    return api_response(data.get("data", {}).get("post"))


@hashnode_bp.route("/publications/<publication_id>/posts", methods=["POST"])
def create_post(publication_id: str):
    """Create a new post in a publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    body = request.get_json() or {}
    title = body.get("title")
    content_markdown = body.get("contentMarkdown")
    tags = body.get("tags", [])
    cover_image_url = body.get("coverImageURL")
    slug = body.get("slug")
    subtitle = body.get("subtitle")
    disable_comments = body.get("disableComments", False)
    meta_title = body.get("metaTitle")
    meta_description = body.get("metaDescription")
    publish_as = body.get("publishAs")  # draft or live

    if not title or not content_markdown:
        return api_error("Title and contentMarkdown are required", 400)

    query = """
    mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) {
            post {
                id
                title
                slug
                url
                publishedAt
            }
        }
    }
    """

    post_input = {
        "title": title,
        "contentMarkdown": content_markdown,
        "publicationId": publication_id,
        "tags": [{"id": t["id"], "name": t.get("name", ""), "slug": t.get("slug", "")} for t in tags] if tags else [],
        "disableComments": disable_comments,
    }

    if cover_image_url:
        post_input["coverImageOptions"] = {"coverImageURL": cover_image_url}
    if slug:
        post_input["slug"] = slug
    if subtitle:
        post_input["subtitle"] = subtitle
    if meta_title or meta_description:
        post_input["metaTags"] = {}
        if meta_title:
            post_input["metaTags"]["title"] = meta_title
        if meta_description:
            post_input["metaTags"]["description"] = meta_description

    resp = execute_graphql(headers, query, {"input": post_input})

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    return api_response(data.get("data", {}).get("publishPost", {}).get("post"), 201)


@hashnode_bp.route("/posts/<post_id>", methods=["PUT"])
def update_post(post_id: str):
    """Update an existing post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    body = request.get_json() or {}

    query = """
    mutation UpdatePost($input: UpdatePostInput!) {
        updatePost(input: $input) {
            post {
                id
                title
                slug
                url
                updatedAt
            }
        }
    }
    """

    update_input = {"id": post_id}

    if "title" in body:
        update_input["title"] = body["title"]
    if "contentMarkdown" in body:
        update_input["contentMarkdown"] = body["contentMarkdown"]
    if "subtitle" in body:
        update_input["subtitle"] = body["subtitle"]
    if "slug" in body:
        update_input["slug"] = body["slug"]
    if "coverImageURL" in body:
        update_input["coverImageOptions"] = {"coverImageURL": body["coverImageURL"]}
    if "tags" in body:
        update_input["tags"] = body["tags"]

    resp = execute_graphql(headers, query, {"input": update_input})

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    return api_response(data.get("data", {}).get("updatePost", {}).get("post"))


@hashnode_bp.route("/posts/<post_id>", methods=["DELETE"])
def delete_post(post_id: str):
    """Delete a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    query = """
    mutation RemovePost($input: RemovePostInput!) {
        removePost(input: $input) {
            post {
                id
            }
        }
    }
    """

    resp = execute_graphql(headers, query, {"input": {"id": post_id}})

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    return api_response({"deleted": True})


@hashnode_bp.route("/publications/<publication_id>/drafts", methods=["GET"])
def get_drafts(publication_id: str):
    """Get drafts from a publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    first = request.args.get("first", 10, type=int)
    after = request.args.get("after")

    query = """
    query Publication($id: ObjectId!, $first: Int!, $after: String) {
        publication(id: $id) {
            drafts(first: $first, after: $after) {
                edges {
                    node {
                        id
                        title
                        slug
                        updatedAt
                        author {
                            username
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
    """

    variables = {"id": publication_id, "first": min(first, 50)}
    if after:
        variables["after"] = after

    resp = execute_graphql(headers, query, variables)

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    drafts_data = data.get("data", {}).get("publication", {}).get("drafts", {})
    return api_response({
        "drafts": [e["node"] for e in drafts_data.get("edges", [])],
        "pageInfo": drafts_data.get("pageInfo", {}),
    })


@hashnode_bp.route("/publications/<publication_id>/series", methods=["GET"])
def get_series(publication_id: str):
    """Get series from a publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    first = request.args.get("first", 10, type=int)
    after = request.args.get("after")

    query = """
    query Publication($id: ObjectId!, $first: Int!, $after: String) {
        publication(id: $id) {
            seriesList(first: $first, after: $after) {
                edges {
                    node {
                        id
                        name
                        slug
                        description {
                            markdown
                        }
                        coverImage
                        posts(first: 3) {
                            totalDocuments
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
    """

    variables = {"id": publication_id, "first": min(first, 50)}
    if after:
        variables["after"] = after

    resp = execute_graphql(headers, query, variables)

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    series_data = data.get("data", {}).get("publication", {}).get("seriesList", {})
    return api_response({
        "series": [e["node"] for e in series_data.get("edges", [])],
        "pageInfo": series_data.get("pageInfo", {}),
    })


@hashnode_bp.route("/tags", methods=["GET"])
def search_tags():
    """Search for tags."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("hashnode")
    if not creds:
        return api_error("Hashnode credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_hashnode_headers(access_token)

    search = request.args.get("q", "")
    first = request.args.get("first", 10, type=int)

    query = """
    query SearchTags($keyword: String!, $first: Int!) {
        searchTags(keyword: $keyword, first: $first) {
            edges {
                node {
                    id
                    name
                    slug
                    logo
                    postsCount
                    followersCount
                }
            }
        }
    }
    """

    resp = execute_graphql(headers, query, {"keyword": search, "first": min(first, 50)})

    if not resp.ok:
        return api_error(f"Hashnode API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    if "errors" in data:
        return api_error(data["errors"][0]["message"], 400)

    tags_data = data.get("data", {}).get("searchTags", {})
    return api_response({"tags": [e["node"] for e in tags_data.get("edges", [])]})

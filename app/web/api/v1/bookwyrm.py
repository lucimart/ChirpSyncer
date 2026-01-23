"""BookWyrm API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

bookwyrm_bp = Blueprint("bookwyrm", __name__)



def get_bookwyrm_credentials():
    """Get BookWyrm credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("bookwyrm")


def bookwyrm_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to BookWyrm API."""
    instance_url = creds.get("instance_url", "").rstrip("/")
    url = f"{instance_url}/api/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {creds.get('access_token')}"
    headers["Content-Type"] = "application/json"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@bookwyrm_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with BookWyrm using OAuth2 or token."""
    data = request.get_json() or {}

    instance_url = data.get("instance_url")
    access_token = data.get("access_token")

    if not all([instance_url, access_token]):
        return api_error("instance_url and access_token required", 400)

    try:
        # Verify token by fetching user info
        response = http_requests.get(
            f"{instance_url.rstrip('/')}/api/user",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if not response.ok:
            return api_error("Invalid credentials", 401)

        user_data = response.json()

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("bookwyrm", {
            "instance_url": instance_url,
            "access_token": access_token,
            "user_id": user_data.get("id"),
            "username": user_data.get("preferredUsername"),
        })

        return api_response({
            "authenticated": True,
            "user": user_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@bookwyrm_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    response = bookwyrm_request("GET", "user", creds)

    if not response.ok:
        return api_error("Failed to fetch user", response.status_code)

    return api_response(response.json())


@bookwyrm_bp.route("/books/search", methods=["GET"])
@require_auth
def search_books():
    """Search for books."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    query = request.args.get("q")
    if not query:
        return api_error("q (query) required", 400)

    params = {
        "q": query,
        "type": request.args.get("type", "book"),
    }

    response = bookwyrm_request("GET", "search", creds, params=params)

    if not response.ok:
        return api_error("Failed to search", response.status_code)

    return api_response(response.json())


@bookwyrm_bp.route("/books/<book_id>", methods=["GET"])
@require_auth
def get_book(book_id: str):
    """Get book details."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    response = http_requests.get(
        f"{instance_url}/book/{book_id}.json",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"}
    )

    if not response.ok:
        return api_error("Book not found", response.status_code)

    return api_response(response.json())


@bookwyrm_bp.route("/shelves", methods=["GET"])
@require_auth
def list_shelves():
    """List user's shelves."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    username = creds.get("username")
    instance_url = creds.get("instance_url", "").rstrip("/")

    response = http_requests.get(
        f"{instance_url}/user/{username}/shelves.json",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"}
    )

    if not response.ok:
        return api_error("Failed to fetch shelves", response.status_code)

    return api_response(response.json())


@bookwyrm_bp.route("/shelves/<shelf_id>/books", methods=["GET"])
@require_auth
def get_shelf_books(shelf_id: str):
    """Get books on a shelf."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    username = creds.get("username")
    instance_url = creds.get("instance_url", "").rstrip("/")

    response = http_requests.get(
        f"{instance_url}/user/{username}/shelf/{shelf_id}.json",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"}
    )

    if not response.ok:
        return api_error("Failed to fetch shelf", response.status_code)

    return api_response(response.json())


@bookwyrm_bp.route("/shelves/<shelf_id>/books", methods=["POST"])
@require_auth
def add_to_shelf(shelf_id: str):
    """Add a book to a shelf."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    data = request.get_json() or {}
    book_id = data.get("book_id")

    if not book_id:
        return api_error("book_id required", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    response = http_requests.post(
        f"{instance_url}/shelve/",
        headers={
            "Authorization": f"Bearer {creds.get('access_token')}",
            "Content-Type": "application/json",
        },
        json={"book": book_id, "shelf": shelf_id}
    )

    if not response.ok:
        return api_error("Failed to add to shelf", response.status_code)

    return api_response({"added": True}, status_code=201)


@bookwyrm_bp.route("/reading-status", methods=["POST"])
@require_auth
def update_reading_status():
    """Update reading status for a book."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    data = request.get_json() or {}
    book_id = data.get("book_id")
    status = data.get("status")  # to-read, reading, read

    if not book_id or not status:
        return api_error("book_id and status required", 400)

    if status not in ["to-read", "reading", "read"]:
        return api_error("status must be to-read, reading, or read", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    response = http_requests.post(
        f"{instance_url}/reading-status/{status}/{book_id}",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"}
    )

    if not response.ok:
        return api_error("Failed to update status", response.status_code)

    return api_response({"status": status})


@bookwyrm_bp.route("/reviews", methods=["POST"])
@require_auth
def create_review():
    """Create a book review."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    data = request.get_json() or {}
    book_id = data.get("book_id")
    content = data.get("content")
    rating = data.get("rating")

    if not book_id:
        return api_error("book_id required", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    review_data = {
        "book": book_id,
        "content": content,
        "rating": rating,
        "privacy": data.get("privacy", "public"),
    }

    review_data = {k: v for k, v in review_data.items() if v is not None}

    response = http_requests.post(
        f"{instance_url}/review/",
        headers={
            "Authorization": f"Bearer {creds.get('access_token')}",
            "Content-Type": "application/json",
        },
        json=review_data
    )

    if not response.ok:
        return api_error("Failed to create review", response.status_code)

    return api_response({"created": True}, status_code=201)


@bookwyrm_bp.route("/quotes", methods=["POST"])
@require_auth
def create_quote():
    """Create a quote from a book."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    data = request.get_json() or {}
    book_id = data.get("book_id")
    quote = data.get("quote")

    if not book_id or not quote:
        return api_error("book_id and quote required", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    quote_data = {
        "book": book_id,
        "quote": quote,
        "position": data.get("position"),
        "position_mode": data.get("position_mode", "page"),
        "comment": data.get("comment"),
        "privacy": data.get("privacy", "public"),
    }

    quote_data = {k: v for k, v in quote_data.items() if v is not None}

    response = http_requests.post(
        f"{instance_url}/quotation/",
        headers={
            "Authorization": f"Bearer {creds.get('access_token')}",
            "Content-Type": "application/json",
        },
        json=quote_data
    )

    if not response.ok:
        return api_error("Failed to create quote", response.status_code)

    return api_response({"created": True}, status_code=201)


@bookwyrm_bp.route("/feed", methods=["GET"])
@require_auth
def get_feed():
    """Get user's activity feed."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    params = {
        "page": request.args.get("page", 1),
    }

    response = http_requests.get(
        f"{instance_url}/api/feed",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"},
        params=params
    )

    if not response.ok:
        return api_error("Failed to fetch feed", response.status_code)

    return api_response(response.json())


@bookwyrm_bp.route("/goals", methods=["GET"])
@require_auth
def get_reading_goal():
    """Get reading goal for current year."""
    creds = get_bookwyrm_credentials()
    if not creds:
        return api_error("BookWyrm not configured", 400)

    username = creds.get("username")
    instance_url = creds.get("instance_url", "").rstrip("/")

    from datetime import datetime
    year = request.args.get("year", datetime.now().year)

    response = http_requests.get(
        f"{instance_url}/user/{username}/goal/{year}.json",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"}
    )

    if not response.ok:
        return api_error("Failed to fetch goal", response.status_code)

    return api_response(response.json())

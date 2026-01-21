import uuid

from flask import Blueprint, g, request
from werkzeug.exceptions import HTTPException

from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_error

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")


@api_v1.before_request
def set_correlation_id():
    g.correlation_id = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))


@api_v1.after_request
def add_correlation_header(response):
    if hasattr(g, "correlation_id") and g.correlation_id:
        response.headers["X-Correlation-Id"] = g.correlation_id
    return response


@api_v1.errorhandler(ApiError)
def handle_api_error(error):
    return api_error(error.code, error.message, status=error.status_code, details=error.details)


@api_v1.errorhandler(HTTPException)
def handle_http_error(error):
    code = error.name.replace(" ", "_").upper()
    return api_error(code, error.description, status=error.code)


@api_v1.errorhandler(Exception)
def handle_unexpected_error(error):
    return api_error("INTERNAL_ERROR", str(error), status=500)


from app.web.api.v1.auth import auth_bp  # noqa: E402
from app.web.api.v1.dashboard import dashboard_bp  # noqa: E402

api_v1.register_blueprint(auth_bp)
api_v1.register_blueprint(dashboard_bp)

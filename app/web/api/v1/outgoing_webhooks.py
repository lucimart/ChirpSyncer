"""
Outgoing Webhooks Integration

Generic webhook support for sending data to external services:
- POST/PUT/PATCH requests
- Custom headers and authentication
- Payload templating
- Retry logic
- Webhook testing
"""

import hashlib
import hmac
import json
import time
from datetime import datetime
from typing import Optional

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

outgoing_webhooks_bp = Blueprint("outgoing_webhooks", __name__, url_prefix="/outgoing-webhooks")


def generate_signature(payload: str, secret: str, algorithm: str = "sha256") -> str:
    """Generate HMAC signature for webhook payload."""
    if algorithm == "sha256":
        signature = hmac.new(
            secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return f"sha256={signature}"
    elif algorithm == "sha1":
        signature = hmac.new(
            secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha1,
        ).hexdigest()
        return f"sha1={signature}"
    else:
        raise ValueError(f"Unsupported algorithm: {algorithm}")


def apply_template(template: str, variables: dict) -> str:
    """Apply simple variable substitution to template."""
    result = template
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"  # {{key}}
        result = result.replace(placeholder, str(value) if value is not None else "")
    return result


@outgoing_webhooks_bp.route("/send", methods=["POST"])
def send_webhook():
    """Send a webhook to an external URL."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    body = request.get_json() or {}
    webhook_url = body.get("url")
    method = body.get("method", "POST").upper()
    payload = body.get("payload", {})
    headers = body.get("headers", {})
    content_type = body.get("content_type", "application/json")
    timeout_seconds = body.get("timeout", 30)
    secret = body.get("secret")
    signature_header = body.get("signature_header", "X-Webhook-Signature")
    signature_algorithm = body.get("signature_algorithm", "sha256")

    if not webhook_url:
        return api_error("Webhook URL is required", 400)

    if method not in ["POST", "PUT", "PATCH", "DELETE"]:
        return api_error("Method must be POST, PUT, PATCH, or DELETE", 400)

    # Prepare headers
    request_headers = {
        "Content-Type": content_type,
        "User-Agent": "ChirpSyncer/1.0 Webhook",
        "X-Webhook-Timestamp": str(int(time.time())),
        "X-Webhook-ID": hashlib.md5(
            f"{webhook_url}{time.time()}".encode()
        ).hexdigest()[:16],
    }
    request_headers.update(headers)

    # Prepare payload
    if content_type == "application/json":
        payload_str = json.dumps(payload)
    elif content_type == "application/x-www-form-urlencoded":
        payload_str = "&".join(f"{k}={v}" for k, v in payload.items())
    else:
        payload_str = str(payload)

    # Add signature if secret provided
    if secret:
        signature = generate_signature(payload_str, secret, signature_algorithm)
        request_headers[signature_header] = signature

    try:
        start_time = time.time()

        if method == "POST":
            resp = http_requests.post(
                webhook_url,
                headers=request_headers,
                data=payload_str,
                timeout=timeout_seconds,
            )
        elif method == "PUT":
            resp = http_requests.put(
                webhook_url,
                headers=request_headers,
                data=payload_str,
                timeout=timeout_seconds,
            )
        elif method == "PATCH":
            resp = http_requests.patch(
                webhook_url,
                headers=request_headers,
                data=payload_str,
                timeout=timeout_seconds,
            )
        elif method == "DELETE":
            resp = http_requests.delete(
                webhook_url,
                headers=request_headers,
                data=payload_str,
                timeout=timeout_seconds,
            )

        elapsed_ms = int((time.time() - start_time) * 1000)

        result = {
            "success": resp.ok,
            "status_code": resp.status_code,
            "response_time_ms": elapsed_ms,
            "response_headers": dict(resp.headers),
            "response_body": None,
            "webhook_id": request_headers["X-Webhook-ID"],
            "timestamp": request_headers["X-Webhook-Timestamp"],
        }

        # Try to parse response body
        try:
            result["response_body"] = resp.json()
        except (json.JSONDecodeError, ValueError):
            result["response_body"] = resp.text[:1000] if resp.text else None

        return api_response(result)

    except http_requests.Timeout:
        return api_error("Webhook request timed out", 504)
    except http_requests.RequestException as e:
        return api_error(f"Webhook request failed: {str(e)}", 500)


@outgoing_webhooks_bp.route("/test", methods=["POST"])
def test_webhook():
    """Test a webhook configuration without saving."""
    body = request.get_json() or {}
    webhook_url = body.get("url")

    if not webhook_url:
        return api_error("Webhook URL is required", 400)

    # Send a test payload
    test_payload = {
        "event": "test",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "This is a test webhook from ChirpSyncer",
        "data": {
            "test_id": hashlib.md5(str(time.time()).encode()).hexdigest()[:8],
        },
    }

    try:
        start_time = time.time()
        resp = http_requests.post(
            webhook_url,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "ChirpSyncer/1.0 Webhook Test",
            },
            json=test_payload,
            timeout=15,
        )
        elapsed_ms = int((time.time() - start_time) * 1000)

        return api_response({
            "success": resp.ok,
            "status_code": resp.status_code,
            "response_time_ms": elapsed_ms,
            "test_payload": test_payload,
            "response_preview": resp.text[:500] if resp.text else None,
        })

    except http_requests.Timeout:
        return api_response({
            "success": False,
            "error": "Request timed out after 15 seconds",
            "test_payload": test_payload,
        })
    except http_requests.RequestException as e:
        return api_response({
            "success": False,
            "error": str(e),
            "test_payload": test_payload,
        })


@outgoing_webhooks_bp.route("/batch", methods=["POST"])
def send_batch_webhooks():
    """Send webhooks to multiple URLs."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    body = request.get_json() or {}
    webhooks = body.get("webhooks", [])
    payload = body.get("payload", {})
    fail_fast = body.get("fail_fast", False)

    if not webhooks:
        return api_error("No webhooks provided", 400)

    results = []
    for webhook in webhooks:
        url = webhook.get("url")
        if not url:
            results.append({
                "url": None,
                "success": False,
                "error": "No URL provided",
            })
            continue

        try:
            # Merge webhook-specific payload with base payload
            webhook_payload = {**payload, **webhook.get("payload", {})}

            # Apply any custom headers
            webhook_headers = {
                "Content-Type": "application/json",
                "User-Agent": "ChirpSyncer/1.0 Webhook",
            }
            webhook_headers.update(webhook.get("headers", {}))

            start_time = time.time()
            resp = http_requests.post(
                url,
                headers=webhook_headers,
                json=webhook_payload,
                timeout=webhook.get("timeout", 15),
            )
            elapsed_ms = int((time.time() - start_time) * 1000)

            results.append({
                "url": url,
                "success": resp.ok,
                "status_code": resp.status_code,
                "response_time_ms": elapsed_ms,
            })

            if fail_fast and not resp.ok:
                break

        except http_requests.RequestException as e:
            results.append({
                "url": url,
                "success": False,
                "error": str(e),
            })

            if fail_fast:
                break

    return api_response({
        "total": len(webhooks),
        "sent": len(results),
        "successful": sum(1 for r in results if r.get("success")),
        "failed": sum(1 for r in results if not r.get("success")),
        "results": results,
    })


@outgoing_webhooks_bp.route("/templates", methods=["POST"])
def apply_payload_template():
    """Apply variables to a payload template."""
    body = request.get_json() or {}
    template = body.get("template", {})
    variables = body.get("variables", {})

    if not template:
        return api_error("Template is required", 400)

    def process_value(value):
        """Recursively process template values."""
        if isinstance(value, str):
            return apply_template(value, variables)
        elif isinstance(value, dict):
            return {k: process_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [process_value(item) for item in value]
        else:
            return value

    result = process_value(template)

    return api_response({
        "original": template,
        "variables": variables,
        "result": result,
    })


@outgoing_webhooks_bp.route("/configs", methods=["GET"])
def list_webhook_configs():
    """List saved webhook configurations."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("outgoing_webhooks")

    if not creds:
        return api_response({"configs": []})

    configs = creds.get("configs", [])
    return api_response({"configs": configs})


@outgoing_webhooks_bp.route("/configs", methods=["POST"])
def save_webhook_config():
    """Save a webhook configuration."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    body = request.get_json() or {}
    name = body.get("name")
    url = body.get("url")
    method = body.get("method", "POST")
    headers = body.get("headers", {})
    payload_template = body.get("payload_template", {})
    secret = body.get("secret")
    enabled = body.get("enabled", True)

    if not name or not url:
        return api_error("name and url are required", 400)

    config = {
        "id": hashlib.md5(f"{name}{url}{time.time()}".encode()).hexdigest()[:16],
        "name": name,
        "url": url,
        "method": method,
        "headers": headers,
        "payload_template": payload_template,
        "secret": secret,
        "enabled": enabled,
        "created_at": datetime.utcnow().isoformat(),
    }

    cm = CredentialManager(master_key)
    existing = cm.get_credentials("outgoing_webhooks") or {}
    configs = existing.get("configs", [])
    configs.append(config)

    cm.store_credentials("outgoing_webhooks", {"configs": configs})

    return api_response(config, 201)


@outgoing_webhooks_bp.route("/configs/<config_id>", methods=["DELETE"])
def delete_webhook_config(config_id: str):
    """Delete a webhook configuration."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    existing = cm.get_credentials("outgoing_webhooks") or {}
    configs = existing.get("configs", [])

    new_configs = [c for c in configs if c.get("id") != config_id]

    if len(new_configs) == len(configs):
        return api_error("Config not found", 404)

    cm.store_credentials("outgoing_webhooks", {"configs": new_configs})

    return api_response({"deleted": True})


@outgoing_webhooks_bp.route("/verify-signature", methods=["POST"])
def verify_signature():
    """Verify an incoming webhook signature (utility endpoint)."""
    body = request.get_json() or {}
    payload = body.get("payload", "")
    secret = body.get("secret")
    signature = body.get("signature")
    algorithm = body.get("algorithm", "sha256")

    if not all([payload, secret, signature]):
        return api_error("payload, secret, and signature are required", 400)

    # Convert payload to string if it's a dict
    if isinstance(payload, dict):
        payload = json.dumps(payload, separators=(",", ":"))

    expected_signature = generate_signature(payload, secret, algorithm)

    # Constant-time comparison
    is_valid = hmac.compare_digest(expected_signature, signature)

    return api_response({
        "valid": is_valid,
        "expected": expected_signature,
        "received": signature,
        "algorithm": algorithm,
    })

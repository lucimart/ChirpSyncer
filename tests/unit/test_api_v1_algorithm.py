import json
import sqlite3
import time

from app.models.feed_rule import init_feed_rules_db
from app.services.user_settings import UserSettings


def _insert_feed_rule(db_path, user_id, name, rule_type, weight, enabled=True):
    init_feed_rules_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO feed_rules (user_id, name, type, conditions, weight, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                name,
                rule_type,
                json.dumps([{"field": "content", "operator": "contains", "value": "test"}]),
                weight,
                1 if enabled else 0,
                int(time.time()),
                int(time.time()),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def test_algorithm_stats_returns_defaults(client, auth_headers, app, test_user):
    response = client.get("/api/v1/algorithm/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json["data"]
    assert data["totalRules"] == 0
    assert data["activeRules"] == 0
    assert data["feedComposition"]["unaffected"] == 100
    assert data["topRules"] == []


def test_algorithm_stats_with_rules(client, auth_headers, app, test_user):
    db_path = app.config["DB_PATH"]
    _insert_feed_rule(db_path, test_user["id"], "Boost AI", "boost", 10, enabled=True)
    _insert_feed_rule(db_path, test_user["id"], "Demote spam", "demote", -5, enabled=True)

    response = client.get("/api/v1/algorithm/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json["data"]
    assert data["totalRules"] == 2
    assert data["activeRules"] == 2
    assert data["feedComposition"]["boosted"] > 0
    assert data["feedComposition"]["demoted"] > 0
    assert len(data["topRules"]) == 2


def test_algorithm_settings_roundtrip(client, auth_headers, app, test_user):
    settings = UserSettings(app.config["DB_PATH"])
    settings.init_db()

    response = client.get("/api/v1/algorithm/settings", headers=auth_headers)
    assert response.status_code == 200
    assert response.json["data"]["algorithm_enabled"] is True

    response = client.post(
        "/api/v1/algorithm/settings",
        headers=auth_headers,
        json={"algorithm_enabled": False},
    )
    assert response.status_code == 200
    assert response.json["data"]["algorithm_enabled"] is False

    response = client.get("/api/v1/algorithm/settings", headers=auth_headers)
    assert response.status_code == 200
    assert response.json["data"]["algorithm_enabled"] is False


def test_algorithm_settings_missing_payload(client, auth_headers, app, test_user):
    settings = UserSettings(app.config["DB_PATH"])
    settings.init_db()

    response = client.post("/api/v1/algorithm/settings", headers=auth_headers, json={})
    assert response.status_code == 200
    assert response.json["data"]["algorithm_enabled"] is True

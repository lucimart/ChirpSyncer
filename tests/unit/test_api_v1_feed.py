import json
import sqlite3

from app.models.feed_rule import init_feed_rules_db


def _insert_rule(db_path, user_id, name="Boost Verified", rule_type="boost", weight=10, enabled=True):
    init_feed_rules_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO feed_rules (user_id, name, type, conditions, weight, enabled)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                name,
                rule_type,
                json.dumps([{"field": "author.verified", "operator": "equals", "value": True}]),
                weight,
                1 if enabled else 0,
            ),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


class TestFeedRulesAPI:
    def test_list_rules(self, client, auth_headers, test_db_path, test_user):
        _insert_rule(test_db_path, test_user["id"])
        response = client.get("/api/v1/feed-rules", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert isinstance(data, list)
        assert data[0]["name"] == "Boost Verified"

    def test_create_rule(self, client, auth_headers):
        payload = {
            "name": "Boost AI",
            "type": "boost",
            "conditions": [{"field": "content", "operator": "contains", "value": "AI"}],
            "weight": 25,
            "enabled": True,
        }
        response = client.post("/api/v1/feed-rules", headers=auth_headers, json=payload)
        assert response.status_code == 201
        data = response.get_json()["data"]
        assert data["name"] == "Boost AI"
        assert data["type"] == "boost"
        assert data["weight"] == 25

    def test_create_rule_validation(self, client, auth_headers):
        response = client.post(
            "/api/v1/feed-rules",
            headers=auth_headers,
            json={"name": "Bad Rule", "type": "invalid"},
        )
        assert response.status_code == 400

    def test_update_rule(self, client, auth_headers, test_db_path, test_user):
        rule_id = _insert_rule(test_db_path, test_user["id"])
        response = client.put(
            f"/api/v1/feed-rules/{rule_id}",
            headers=auth_headers,
            json={"name": "Updated Rule", "weight": 5},
        )
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["name"] == "Updated Rule"
        assert data["weight"] == 5

    def test_delete_rule(self, client, auth_headers, test_db_path, test_user):
        rule_id = _insert_rule(test_db_path, test_user["id"])
        response = client.delete(f"/api/v1/feed-rules/{rule_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json()["data"]["deleted"] is True

    def test_toggle_rule(self, client, auth_headers, test_db_path, test_user):
        rule_id = _insert_rule(test_db_path, test_user["id"], enabled=True)
        response = client.patch(
            f"/api/v1/feed-rules/{rule_id}/toggle", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["id"] == rule_id
        assert data["enabled"] is False

    def test_preview_feed(self, client, auth_headers):
        payload = {
            "rules": [
                {
                    "name": "Boost AI",
                    "type": "boost",
                    "conditions": [{"field": "content", "operator": "contains", "value": "AI"}],
                    "weight": 20,
                    "enabled": True,
                }
            ]
        }
        response = client.post("/api/v1/feed/preview", headers=auth_headers, json=payload)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "posts" in data
        assert isinstance(data["posts"], list)

    def test_explain_post(self, client, auth_headers, test_db_path, test_user):
        _insert_rule(test_db_path, test_user["id"])
        response = client.get("/api/v1/feed/explain/post-1", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "base_score" in data
        assert "rules_applied" in data
        assert "final_score" in data

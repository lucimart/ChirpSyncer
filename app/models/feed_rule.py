import sqlite3
from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class FeedRule:
    id: int
    user_id: int
    name: str
    rule_type: str
    conditions: List[Dict[str, Any]]
    weight: int
    enabled: bool
    created_at: int
    updated_at: int


def init_feed_rules_db(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS feed_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('boost', 'demote', 'filter')),
                conditions TEXT NOT NULL,
                weight INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_feed_rules_user_id ON feed_rules(user_id)"
        )
        conn.commit()
    finally:
        conn.close()

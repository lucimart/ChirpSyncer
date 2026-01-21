import sqlite3
import time


def init_workspace_db(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('personal', 'team')),
                owner_user_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
                joined_at INTEGER NOT NULL,
                last_active INTEGER,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(workspace_id, user_id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                metadata TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_shared_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                credential_id INTEGER NOT NULL,
                shared_by INTEGER NOT NULL,
                access_level TEXT NOT NULL CHECK(access_level IN ('full', 'read_only')),
                shared_at INTEGER NOT NULL,
                last_used INTEGER,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (credential_id) REFERENCES user_credentials(id) ON DELETE CASCADE,
                FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(workspace_id, credential_id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_workspace_state (
                user_id INTEGER PRIMARY KEY,
                current_workspace_id INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (current_workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace ON workspace_activity(workspace_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_workspace_shared_workspace ON workspace_shared_credentials(workspace_id)"
        )
        conn.commit()
    finally:
        conn.close()


def ensure_personal_workspace(db_path: str, user_id: int, username: str | None) -> int:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM workspaces WHERE owner_user_id = ? AND type = 'personal'",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["id"]

        now = int(time.time())
        name = "Personal"
        cursor.execute(
            """
            INSERT INTO workspaces (name, type, owner_user_id, created_at, updated_at)
            VALUES (?, 'personal', ?, ?, ?)
            """,
            (name, user_id, now, now),
        )
        workspace_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, last_active)
            VALUES (?, ?, 'admin', ?, ?)
            """,
            (workspace_id, user_id, now, now),
        )
        conn.commit()
        return workspace_id
    finally:
        conn.close()

"""
Workflow Models - Database-backed workflow management.

Provides Workflow and WorkflowRun models with full CRUD operations.
"""

import json
import sqlite3
import time
from typing import Any, Dict, List, Optional


class WorkflowManager:
    """
    Manager for workflow CRUD operations.

    Handles workflow and workflow run persistence in SQLite.
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize WorkflowManager.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize database tables for workflows."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create workflows table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                trigger_config TEXT NOT NULL,
                actions_config TEXT NOT NULL,
                run_count INTEGER DEFAULT 0,
                last_run_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Create workflow_runs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflow_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workflow_id INTEGER NOT NULL,
                trigger_data TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                actions_completed TEXT,
                error_message TEXT,
                started_at INTEGER NOT NULL,
                completed_at INTEGER,
                FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
            )
        """)

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflows_user
            ON workflows(user_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflows_active
            ON workflows(is_active)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow
            ON workflow_runs(workflow_id)
        """)

        conn.commit()
        conn.close()

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def create_workflow(
        self,
        user_id: int,
        name: str,
        trigger_config: Dict[str, Any],
        actions_config: List[Dict[str, Any]],
        description: Optional[str] = None,
    ) -> int:
        """
        Create a new workflow.

        Args:
            user_id: Owner user ID
            name: Workflow name
            trigger_config: Trigger configuration dict
            actions_config: List of action configurations
            description: Optional description

        Returns:
            ID of created workflow
        """
        now = int(time.time())

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                INSERT INTO workflows
                (user_id, name, description, trigger_config, actions_config, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    user_id,
                    name,
                    description,
                    json.dumps(trigger_config),
                    json.dumps(actions_config),
                    now,
                    now,
                ),
            )

            workflow_id = cursor.lastrowid
            conn.commit()
            return workflow_id
        finally:
            conn.close()

    def get_workflow(self, workflow_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a workflow by ID.

        Args:
            workflow_id: Workflow ID

        Returns:
            Workflow dict or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,))
            row = cursor.fetchone()

            if not row:
                return None

            return self._row_to_workflow(row)
        finally:
            conn.close()

    def list_workflows(
        self,
        user_id: int,
        active_only: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        List workflows for a user.

        Args:
            user_id: User ID
            active_only: Only return active workflows

        Returns:
            List of workflow dicts
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            if active_only:
                cursor.execute(
                    """
                    SELECT * FROM workflows
                    WHERE user_id = ? AND is_active = 1
                    ORDER BY created_at DESC
                """,
                    (user_id,),
                )
            else:
                cursor.execute(
                    """
                    SELECT * FROM workflows
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                """,
                    (user_id,),
                )

            rows = cursor.fetchall()
            return [self._row_to_workflow(row) for row in rows]
        finally:
            conn.close()

    def update_workflow(
        self,
        workflow_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        trigger_config: Optional[Dict[str, Any]] = None,
        actions_config: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """
        Update a workflow.

        Args:
            workflow_id: Workflow ID
            name: New name (optional)
            description: New description (optional)
            trigger_config: New trigger config (optional)
            actions_config: New actions config (optional)

        Returns:
            True if updated successfully
        """
        updates = []
        values = []

        if name is not None:
            updates.append("name = ?")
            values.append(name)

        if description is not None:
            updates.append("description = ?")
            values.append(description)

        if trigger_config is not None:
            updates.append("trigger_config = ?")
            values.append(json.dumps(trigger_config))

        if actions_config is not None:
            updates.append("actions_config = ?")
            values.append(json.dumps(actions_config))

        if not updates:
            return True

        updates.append("updated_at = ?")
        values.append(int(time.time()))
        values.append(workflow_id)

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            query = f"UPDATE workflows SET {', '.join(updates)} WHERE id = ?"  # nosec B608
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def delete_workflow(self, workflow_id: int) -> bool:
        """
        Delete a workflow.

        Args:
            workflow_id: Workflow ID

        Returns:
            True if deleted successfully
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def toggle_workflow(self, workflow_id: int) -> bool:
        """
        Toggle workflow active status.

        Args:
            workflow_id: Workflow ID

        Returns:
            True if toggled successfully
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                UPDATE workflows
                SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                    updated_at = ?
                WHERE id = ?
            """,
                (int(time.time()), workflow_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def increment_run_count(self, workflow_id: int):
        """Increment workflow run count and update last_run_at."""
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            now = int(time.time())
            cursor.execute(
                """
                UPDATE workflows
                SET run_count = run_count + 1,
                    last_run_at = ?,
                    updated_at = ?
                WHERE id = ?
            """,
                (now, now, workflow_id),
            )
            conn.commit()
        finally:
            conn.close()

    # Workflow Run methods

    def create_run(
        self,
        workflow_id: int,
        trigger_data: Dict[str, Any],
    ) -> int:
        """
        Create a new workflow run.

        Args:
            workflow_id: Workflow ID
            trigger_data: Data from the trigger

        Returns:
            ID of created run
        """
        now = int(time.time())

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                INSERT INTO workflow_runs
                (workflow_id, trigger_data, status, started_at)
                VALUES (?, ?, 'running', ?)
            """,
                (workflow_id, json.dumps(trigger_data), now),
            )

            run_id = cursor.lastrowid
            conn.commit()
            return run_id
        finally:
            conn.close()

    def get_run(self, run_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a workflow run by ID.

        Args:
            run_id: Run ID

        Returns:
            Run dict or None
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT * FROM workflow_runs WHERE id = ?", (run_id,))
            row = cursor.fetchone()

            if not row:
                return None

            return self._row_to_run(row)
        finally:
            conn.close()

    def get_runs(
        self,
        workflow_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get workflow run history.

        Args:
            workflow_id: Workflow ID
            limit: Max runs to return
            offset: Pagination offset

        Returns:
            List of run dicts
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                SELECT * FROM workflow_runs
                WHERE workflow_id = ?
                ORDER BY started_at DESC
                LIMIT ? OFFSET ?
            """,
                (workflow_id, limit, offset),
            )

            rows = cursor.fetchall()
            return [self._row_to_run(row) for row in rows]
        finally:
            conn.close()

    def update_run(
        self,
        run_id: int,
        status: Optional[str] = None,
        actions_completed: Optional[List[Dict[str, Any]]] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """
        Update a workflow run.

        Args:
            run_id: Run ID
            status: New status
            actions_completed: List of completed actions
            error_message: Error message if failed

        Returns:
            True if updated
        """
        updates = []
        values = []

        if status is not None:
            updates.append("status = ?")
            values.append(status)

            if status in ("completed", "failed"):
                updates.append("completed_at = ?")
                values.append(int(time.time()))

        if actions_completed is not None:
            updates.append("actions_completed = ?")
            values.append(json.dumps(actions_completed))

        if error_message is not None:
            updates.append("error_message = ?")
            values.append(error_message)

        if not updates:
            return True

        values.append(run_id)

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            query = f"UPDATE workflow_runs SET {', '.join(updates)} WHERE id = ?"  # nosec B608
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def _row_to_workflow(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to workflow dict."""
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "name": row["name"],
            "description": row["description"],
            "is_active": row["is_active"],
            "trigger_config": json.loads(row["trigger_config"]),
            "actions_config": json.loads(row["actions_config"]),
            "run_count": row["run_count"],
            "last_run_at": row["last_run_at"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _row_to_run(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to run dict."""
        return {
            "id": row["id"],
            "workflow_id": row["workflow_id"],
            "trigger_data": json.loads(row["trigger_data"]) if row["trigger_data"] else None,
            "status": row["status"],
            "actions_completed": json.loads(row["actions_completed"])
            if row["actions_completed"]
            else None,
            "error_message": row["error_message"],
            "started_at": row["started_at"],
            "completed_at": row["completed_at"],
        }

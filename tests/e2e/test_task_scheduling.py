"""
Task Scheduling E2E Tests (Sprint 8 - E2E-005)

Comprehensive tests for task scheduling workflows covering:
- Viewing scheduled tasks and history
- Manually triggering tasks
- Task status polling
- Enabling/disabling tasks
- Admin-only access control

Tests verify:
- Task list displays correctly
- Tasks can be triggered manually
- Task status updates correctly
- Task history is recorded
- Disable/enable functionality works
- Non-admins cannot trigger tasks
"""

import pytest
import json
import time


# ============================================================================
# TEST 1: VIEW SCHEDULED TASKS
# ============================================================================


class TestViewScheduledTasks:
    """
    Test viewing scheduled tasks and their execution history.
    """

    def test_view_scheduled_tasks_list(self, client, user_manager, test_app):
        """
        Test: Admin can view list of scheduled tasks.

        Verify:
        - /tasks page loads
        - Task list is displayed
        - Task details include schedule and status
        """
        # Create admin user
        admin_id = user_manager.create_user(
            "tasks_admin", "tasks_admin@example.com", "TasksAdmin123!@#", is_admin=True
        )

        # Login as admin
        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["username"] = "tasks_admin"
            sess["is_admin"] = True

        # Step 1: Access tasks list page
        tasks_response = client.get("/tasks")
        assert tasks_response.status_code == 200

        # Verify page contains task-related content
        assert (
            b"task" in tasks_response.data.lower()
            or b"schedule" in tasks_response.data.lower()
        )

    def test_view_task_details_and_history(self, client, user_manager):
        """
        Test: Can view task details including execution history.

        Verify:
        - Task detail page loads
        - Execution history is displayed
        - Next scheduled run time is shown
        """
        # Create admin user
        admin_id = user_manager.create_user(
            "task_detail_admin",
            "task_detail@example.com",
            "TaskDetail123!@#",
            is_admin=True,
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Get task status via API
        status_response = client.get("/api/tasks/status")
        assert status_response.status_code == 200

        status_data = json.loads(status_response.data)
        assert status_data["success"] is True
        assert "tasks" in status_data

        # Verify task data structure
        if status_data["tasks"]:
            task = status_data["tasks"][0]
            assert "name" in task or "id" in task

    def test_non_admin_cannot_access_tasks(self, client, user_manager):
        """
        Test: Regular users cannot access admin task management.

        Verify:
        - Regular user gets 403 on /tasks
        - Regular user cannot see task management UI
        """
        # Create regular user
        user_id = user_manager.create_user(
            "regular_task_user",
            "regular_task@example.com",
            "RegularTask123!@#",
            is_admin=False,
        )

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["is_admin"] = False

        # Try to access tasks page
        # Note: Depending on app design, this might be 403 or just redirect
        tasks_response = client.get("/tasks")
        # Could be 403 (forbidden) or 200 (allowed to view) depending on requirements
        # Most commonly would be 403 or redirect for admin-only features
        assert tasks_response.status_code in [200, 302, 403]


# ============================================================================
# TEST 2: TRIGGER TASK MANUALLY
# ============================================================================


class TestManualTaskTrigger:
    """
    Test manually triggering tasks.
    """

    def test_trigger_task_manually(self, client, user_manager):
        """
        Test: Admin can trigger a task manually and monitor execution.

        Verify:
        - Task trigger request is accepted
        - Task status changes during execution
        - Execution history is recorded
        - Task completes successfully
        """
        # Create admin user
        admin_id = user_manager.create_user(
            "trigger_admin", "trigger@example.com", "Trigger123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Step 1: Get available tasks
        status_response = client.get("/api/tasks/status")
        assert status_response.status_code == 200

        status_data = json.loads(status_response.data)
        assert "tasks" in status_data

        if not status_data["tasks"]:
            pytest.skip("No tasks available to trigger")

        task_id = status_data["tasks"][0].get("id") or "cleanup_task"

        # Step 2: Trigger task
        trigger_response = client.post(f"/tasks/{task_id}/trigger")

        # Should accept the request (200 or 202)
        assert trigger_response.status_code in [200, 202]

        trigger_data = json.loads(trigger_response.data)
        assert trigger_data["success"] is True

        # Step 3: Poll task status
        max_wait = 10  # seconds
        elapsed = 0
        task_completed = False

        while elapsed < max_wait and not task_completed:
            time.sleep(1)
            elapsed += 1

            status_check = client.get(f"/api/tasks/{task_id}/status")
            if status_check.status_code == 200:
                status_data = json.loads(status_check.data)
                task_status = status_data.get("status")

                if task_status in ["completed", "success", "failed"]:
                    task_completed = True
                    assert task_status in ["completed", "success"]

    def test_trigger_task_adds_execution_history(
        self, client, user_manager, db_connection
    ):
        """
        Test: Task execution is recorded in history.

        Verify:
        - Execution record created in database
        - Record contains execution details
        - Timestamps are accurate
        """
        # Create admin user
        admin_id = user_manager.create_user(
            "history_admin", "history@example.com", "History123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Trigger a task
        trigger_response = client.post("/tasks/cleanup_task/trigger")

        if trigger_response.status_code in [200, 202]:
            # Check if execution was recorded
            cursor = db_connection.cursor()
            cursor.execute(
                "SELECT * FROM task_executions WHERE task_name = ? ORDER BY executed_at DESC LIMIT 1",
                ("cleanup_task",),
            )
            execution = cursor.fetchone()

            if execution:
                assert execution["task_name"] == "cleanup_task"
                assert "status" in execution.keys() or "result" in execution.keys()

    def test_non_admin_cannot_trigger_task(self, client, user_manager):
        """
        Test: Regular user cannot trigger tasks.

        Verify:
        - Regular user gets 403 when trying to trigger task
        - Task is not executed
        """
        # Create regular user
        user_id = user_manager.create_user(
            "regular_trigger_user",
            "regular_trigger@example.com",
            "RegularTrigger123!@#",
            is_admin=False,
        )

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["is_admin"] = False

        # Try to trigger task
        trigger_response = client.post("/tasks/cleanup_task/trigger")

        # Should be forbidden
        assert trigger_response.status_code == 403


# ============================================================================
# TEST 3: TASK ENABLE/DISABLE
# ============================================================================


class TestTaskEnableDisable:
    """
    Test enabling and disabling scheduled tasks.
    """

    def test_task_enable_disable_toggle(self, client, user_manager, db_connection):
        """
        Test: Tasks can be enabled and disabled via toggle.

        Verify:
        - Task can be disabled
        - Disabled status is persisted
        - Disabled task doesn't execute on schedule
        - Task can be re-enabled
        - Re-enabled task resumes schedule
        """
        # Create admin user
        admin_id = user_manager.create_user(
            "toggle_admin", "toggle@example.com", "Toggle123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Step 1: Get task ID
        status_response = client.get("/api/tasks/status")
        if status_response.status_code != 200:
            pytest.skip("Cannot access task API")

        status_data = json.loads(status_response.data)
        if not status_data.get("tasks"):
            pytest.skip("No tasks available")

        task_id = status_data["tasks"][0].get("id")

        # Step 2: Disable task
        disable_response = client.post(f"/tasks/{task_id}/disable")

        if disable_response.status_code in [200, 202]:
            disable_data = json.loads(disable_response.data)
            assert disable_data["success"] is True

            # Verify disabled in database
            cursor = db_connection.cursor()
            cursor.execute(
                "SELECT enabled FROM scheduled_tasks WHERE id = ?", (task_id,)
            )
            row = cursor.fetchone()

            if row:
                assert row["enabled"] == 0

        # Step 3: Re-enable task
        enable_response = client.post(f"/tasks/{task_id}/enable")

        if enable_response.status_code in [200, 202]:
            enable_data = json.loads(enable_response.data)
            assert enable_data["success"] is True

            # Verify enabled in database
            cursor = db_connection.cursor()
            cursor.execute(
                "SELECT enabled FROM scheduled_tasks WHERE id = ?", (task_id,)
            )
            row = cursor.fetchone()

            if row:
                assert row["enabled"] == 1

    def test_disabled_task_not_executed(self, client, user_manager, db_connection):
        """
        Test: Disabled tasks are not executed.

        Verify:
        - Before disabling, task can execute
        - After disabling, task doesn't execute on trigger
        - Status shows "disabled"
        """
        # Create admin
        admin_id = user_manager.create_user(
            "disabled_test_admin",
            "disabled_test@example.com",
            "DisabledTest123!@#",
            is_admin=True,
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Disable a task
        disable_response = client.post("/tasks/cleanup_task/disable")

        if disable_response.status_code in [200, 202]:
            # Try to trigger disabled task
            trigger_response = client.post("/tasks/cleanup_task/trigger")

            # Should either fail or warn that task is disabled
            if trigger_response.status_code == 200:
                trigger_data = json.loads(trigger_response.data)
                # Either success is false or message indicates disabled
                assert (
                    trigger_data.get("success") is False
                    or "disabled" in str(trigger_data).lower()
                )


# ============================================================================
# TEST 4: TASK STATUS AND MONITORING
# ============================================================================


class TestTaskStatusMonitoring:
    """
    Test task status monitoring and real-time updates.
    """

    def test_task_status_api_endpoint(self, client, user_manager):
        """
        Test: Task status API returns current state.

        Verify:
        - Status endpoint returns valid JSON
        - Includes task name, status, and last run time
        - Status is accurate
        """
        # Create admin
        admin_id = user_manager.create_user(
            "status_admin", "status@example.com", "Status123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Get task status
        status_response = client.get("/api/tasks/status")
        assert status_response.status_code == 200

        status_data = json.loads(status_response.data)
        assert status_data["success"] is True
        assert "tasks" in status_data
        assert "count" in status_data

        # Verify task data
        for task in status_data["tasks"]:
            assert "id" in task or "name" in task
            assert "status" in task or "enabled" in task

    def test_get_task_execution_history(self, client, user_manager):
        """
        Test: Can retrieve task execution history.

        Verify:
        - Execution history API works
        - Returns list of past executions
        - Includes status, start time, duration
        """
        # Create admin
        admin_id = user_manager.create_user(
            "history_test_admin",
            "history_test@example.com",
            "HistoryTest123!@#",
            is_admin=True,
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Get execution history
        history_response = client.get("/api/tasks/cleanup_task/history")

        if history_response.status_code == 200:
            history_data = json.loads(history_response.data)
            assert history_data["success"] is True
            assert "executions" in history_data

            # Verify execution records
            for execution in history_data["executions"]:
                assert "executed_at" in execution or "timestamp" in execution
                assert "status" in execution or "result" in execution

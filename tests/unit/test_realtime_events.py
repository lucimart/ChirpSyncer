from app.core.events import (
    cleanup_progress_message,
    sync_progress_message,
    job_completed_message,
)


def test_sync_progress_message_shape():
    message = sync_progress_message("job-1", "running", current=2, total=10)
    assert message["type"] == "sync.progress"
    payload = message["payload"]
    assert payload["operation_id"] == "job-1"
    assert payload["current"] == 2
    assert payload["total"] == 10
    assert payload["message"] == "running"


def test_sync_progress_message_with_correlation_id():
    message = sync_progress_message(
        "job-2", "running", current=5, total=20, correlation_id="corr-123"
    )
    assert message["type"] == "sync.progress"
    payload = message["payload"]
    assert payload.get("correlation_id") == "corr-123"


def test_sync_progress_message_custom_message():
    message = sync_progress_message(
        "job-3", "running", current=1, total=5, message="Processing item 1 of 5"
    )
    payload = message["payload"]
    assert payload["message"] == "Processing item 1 of 5"


def test_cleanup_progress_message_shape():
    message = cleanup_progress_message(42, deleted=3, total=5)
    assert message["type"] == "cleanup.progress"
    payload = message["payload"]
    assert payload["rule_id"] == 42
    assert payload["deleted"] == 3
    assert payload["total"] == 5


def test_cleanup_progress_message_with_current_tweet():
    message = cleanup_progress_message(
        10, deleted=1, total=10, current_tweet="tweet-abc123"
    )
    payload = message["payload"]
    assert payload.get("current_tweet") == "tweet-abc123"


def test_cleanup_progress_message_with_correlation_id():
    message = cleanup_progress_message(
        5, deleted=2, total=8, correlation_id="cleanup-corr-456"
    )
    payload = message["payload"]
    assert payload.get("correlation_id") == "cleanup-corr-456"


def test_job_completed_message_success():
    message = job_completed_message(
        job_id="job-100",
        job_type="sync",
        status="completed",
        result={"synced": 15},
    )
    assert message["type"] == "job.completed"
    payload = message["payload"]
    assert payload["job_id"] == "job-100"
    assert payload["job_type"] == "sync"
    assert payload["status"] == "completed"
    assert payload.get("result") == {"synced": 15}


def test_job_completed_message_failure():
    message = job_completed_message(
        job_id="job-101",
        job_type="cleanup",
        status="failed",
        error="Rate limit exceeded",
    )
    assert message["type"] == "job.completed"
    payload = message["payload"]
    assert payload["job_id"] == "job-101"
    assert payload["job_type"] == "cleanup"
    assert payload["status"] == "failed"
    assert payload.get("error") == "Rate limit exceeded"


def test_job_completed_message_minimal():
    message = job_completed_message(
        job_id="job-102",
        job_type="sync",
        status="completed",
    )
    payload = message["payload"]
    assert payload.get("result") is None
    assert payload.get("error") is None

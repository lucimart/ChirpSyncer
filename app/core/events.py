from typing import Any, Optional, TypedDict


class _SyncProgressPayloadRequired(TypedDict):
    operation_id: str
    current: int
    total: int
    message: str


class SyncProgressPayload(_SyncProgressPayloadRequired, total=False):
    correlation_id: str


class SyncProgressMessage(TypedDict):
    type: str
    payload: SyncProgressPayload


class _CleanupProgressPayloadRequired(TypedDict):
    rule_id: int
    deleted: int
    total: int


class CleanupProgressPayload(_CleanupProgressPayloadRequired, total=False):
    current_tweet: str
    correlation_id: str


class CleanupProgressMessage(TypedDict):
    type: str
    payload: CleanupProgressPayload


class _JobCompletedPayloadRequired(TypedDict):
    job_id: str
    job_type: str
    status: str


class JobCompletedPayload(_JobCompletedPayloadRequired, total=False):
    result: dict[str, Any]
    error: str


class JobCompletedMessage(TypedDict):
    type: str
    payload: JobCompletedPayload


def sync_progress_message(
    job_id: str,
    status: str,
    current: int,
    total: int = 0,
    message: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> SyncProgressMessage:
    payload: SyncProgressPayload = {
        "operation_id": job_id,
        "current": current,
        "total": total,
        "message": message or status,
    }
    if correlation_id:
        payload["correlation_id"] = correlation_id
    return {"type": "sync.progress", "payload": payload}


def cleanup_progress_message(
    rule_id: int,
    deleted: int,
    total: int = 0,
    current_tweet: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> CleanupProgressMessage:
    payload: CleanupProgressPayload = {
        "rule_id": rule_id,
        "deleted": deleted,
        "total": total,
    }
    if current_tweet:
        payload["current_tweet"] = current_tweet
    if correlation_id:
        payload["correlation_id"] = correlation_id
    return {"type": "cleanup.progress", "payload": payload}


def job_completed_message(
    job_id: str,
    job_type: str,
    status: str,
    result: Optional[dict[str, Any]] = None,
    error: Optional[str] = None,
) -> JobCompletedMessage:
    payload: JobCompletedPayload = {
        "job_id": job_id,
        "job_type": job_type,
        "status": status,
    }
    if result:
        payload["result"] = result
    if error:
        payload["error"] = error
    return {"type": "job.completed", "payload": payload}

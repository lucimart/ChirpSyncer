"""
Atomization Tasks - Celery tasks for content atomization.

Handles processing atomization jobs and transforming content for multiple platforms.
"""

from app.core.celery_app import celery_app
from app.core.logger import setup_logger

logger = setup_logger(__name__)


@celery_app.task(bind=True)
def process_atomization_job(self, job_id: str, db_path: str = "chirpsyncer.db") -> dict:
    """
    Process an atomization job - transform content to all platforms.

    Takes source content (video, blog, thread) and generates optimized
    versions for each target platform (Twitter, LinkedIn, Medium, Instagram).

    Args:
        job_id: ID of the atomization job to process
        db_path: Path to the SQLite database

    Returns:
        Dict with success status, outputs generated, and any errors
    """
    from app.features.atomization.service import AtomizationService

    logger.info(f"Processing atomization job: {job_id}")

    try:
        service = AtomizationService(db_path=db_path)

        # Get job to validate it exists
        job = service.get_job(job_id)
        if not job:
            error_msg = f"Atomization job not found: {job_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        if job.status == "completed":
            logger.warning(f"Job {job_id} already completed")
            return {
                "success": True,
                "job_id": job_id,
                "status": "already_completed",
                "outputs": [],
            }

        if job.status == "failed":
            logger.warning(f"Job {job_id} previously failed, reprocessing")

        # Process the job
        outputs = service.process_job(job_id)

        output_summary = [
            {
                "id": output.id,
                "platform": output.platform,
                "format": output.format,
            }
            for output in outputs
        ]

        logger.info(
            f"Atomization job {job_id} completed: "
            f"{len(outputs)} outputs generated"
        )

        # Send notification about completed job
        _notify_atomization_complete(job.user_id, job_id, len(outputs), db_path)

        return {
            "success": True,
            "job_id": job_id,
            "status": "completed",
            "outputs_count": len(outputs),
            "outputs": output_summary,
        }

    except ValueError as ve:
        # Known error (e.g., unsupported source type)
        logger.warning(f"Atomization job {job_id} failed with known error: {ve}")
        return {
            "success": False,
            "job_id": job_id,
            "error": str(ve),
        }

    except Exception as exc:
        logger.error(f"Atomization job {job_id} failed: {exc}")
        return {
            "success": False,
            "job_id": job_id,
            "error": str(exc),
        }


@celery_app.task(bind=True)
def publish_scheduled_content(self, db_path: str = "chirpsyncer.db") -> dict:
    """
    Publish atomized content that is scheduled for now.

    Called periodically by Celery beat to check for content
    scheduled to be published.

    Args:
        db_path: Path to the SQLite database

    Returns:
        Dict with published count and any errors
    """
    import sqlite3
    import time

    logger.info("Checking for scheduled content to publish")

    try:
        current_time = int(time.time())

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get content scheduled for now or earlier that hasn't been published
        cursor.execute(
            """
            SELECT id, job_id, platform, format
            FROM atomized_content
            WHERE scheduled_for IS NOT NULL
              AND scheduled_for <= ?
              AND is_published = 0
            ORDER BY scheduled_for ASC
            LIMIT 50
            """,
            (current_time,),
        )
        rows = cursor.fetchall()
        conn.close()

        published_count = 0
        errors = []

        from app.features.atomization.service import AtomizationService
        service = AtomizationService(db_path=db_path)

        for row in rows:
            output_id = row["id"]
            platform = row["platform"]

            try:
                success = service.publish_output(output_id)
                if success:
                    published_count += 1
                    logger.info(f"Published content {output_id} to {platform}")
                else:
                    errors.append(f"Failed to publish {output_id}")
            except Exception as e:
                errors.append(f"Error publishing {output_id}: {str(e)}")
                logger.error(f"Error publishing content {output_id}: {e}")

        logger.info(
            f"Scheduled content check complete: "
            f"{published_count} published, {len(errors)} errors"
        )

        return {
            "success": True,
            "published_count": published_count,
            "errors": errors if errors else None,
        }

    except Exception as exc:
        logger.error(f"Scheduled content publishing failed: {exc}")
        return {"success": False, "error": str(exc)}


@celery_app.task(bind=True)
def batch_process_jobs(
    self, job_ids: list, db_path: str = "chirpsyncer.db"
) -> dict:
    """
    Process multiple atomization jobs in batch.

    Useful for bulk processing when multiple jobs are queued.

    Args:
        job_ids: List of job IDs to process
        db_path: Path to the SQLite database

    Returns:
        Dict with results per job
    """
    logger.info(f"Batch processing {len(job_ids)} atomization jobs")

    results = {}

    for job_id in job_ids:
        try:
            # Process each job synchronously within this task
            result = process_atomization_job(job_id, db_path)
            results[job_id] = result
        except Exception as e:
            logger.error(f"Batch processing failed for job {job_id}: {e}")
            results[job_id] = {"success": False, "error": str(e)}

    successful = sum(1 for r in results.values() if r.get("success"))
    failed = len(results) - successful

    logger.info(
        f"Batch processing complete: {successful} succeeded, {failed} failed"
    )

    return {
        "success": failed == 0,
        "total": len(job_ids),
        "successful": successful,
        "failed": failed,
        "results": results,
    }


def _notify_atomization_complete(
    user_id: int, job_id: str, outputs_count: int, db_path: str
) -> None:
    """
    Send notification that atomization job is complete.

    Args:
        user_id: User ID to notify
        job_id: Completed job ID
        outputs_count: Number of outputs generated
        db_path: Database path
    """
    try:
        from app.tasks.notification_tasks import send_notification

        send_notification.delay(
            user_id=user_id,
            notification_type="atomization_complete",
            data={
                "job_id": job_id,
                "outputs_count": outputs_count,
                "message": f"Content atomization complete! {outputs_count} versions ready.",
            },
        )
    except Exception as e:
        # Don't fail the main task if notification fails
        logger.warning(f"Failed to send atomization notification: {e}")

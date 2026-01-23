"""
Atomization Service.

Orchestrates content atomization workflow.
"""

import json
import sqlite3
import time
import uuid
from typing import Dict, List, Optional, Any

from app.features.atomization.models import AtomizationJob, AtomizedContent
from app.features.atomization.pipelines import VideoPipeline, BlogPipeline, ThreadPipeline
from app.features.atomization.transformers import (
    TwitterTransformer,
    LinkedInTransformer,
    MediumTransformer,
    InstagramTransformer,
)


class AtomizationService:
    """
    Service for content atomization workflow.

    Manages jobs, processes content through pipelines,
    and coordinates publishing/scheduling.
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize AtomizationService.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self._init_db()

        # Initialize pipelines
        self.pipelines = {
            "youtube": VideoPipeline(),
            "video": VideoPipeline(),
            "blog": BlogPipeline(),
            "thread": ThreadPipeline(),
        }

        # Initialize transformers
        self.transformers = {
            "twitter": TwitterTransformer(),
            "linkedin": LinkedInTransformer(),
            "medium": MediumTransformer(),
            "instagram": InstagramTransformer(),
        }

    def _init_db(self):
        """Initialize database tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create atomization_jobs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS atomization_jobs (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                source_type TEXT NOT NULL,
                source_url TEXT,
                source_content TEXT,
                status TEXT DEFAULT 'pending',
                created_at INTEGER NOT NULL,
                completed_at INTEGER,
                error TEXT
            )
        """)

        # Create atomized_content table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS atomized_content (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                format TEXT NOT NULL,
                content TEXT NOT NULL,
                media_urls TEXT,
                is_published INTEGER DEFAULT 0,
                scheduled_for INTEGER,
                published_at INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (job_id) REFERENCES atomization_jobs(id) ON DELETE CASCADE
            )
        """)

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_atomization_jobs_user
            ON atomization_jobs(user_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_atomized_content_job
            ON atomized_content(job_id)
        """)

        conn.commit()
        conn.close()

    def create_job(self, user_id: int, source: Dict[str, Any]) -> AtomizationJob:
        """
        Create a new atomization job.

        Args:
            user_id: Owner user ID
            source: Source configuration with:
                - type: Source type (youtube, blog, thread)
                - url: Optional URL for remote content
                - content: Optional raw content text

        Returns:
            Created AtomizationJob
        """
        job_id = str(uuid.uuid4())
        source_type = source.get("type", "")
        source_url = source.get("url")
        source_content = source.get("content")

        job = AtomizationJob(
            id=job_id,
            user_id=user_id,
            source_type=source_type,
            source_url=source_url,
            source_content=source_content,
            status="pending",
            created_at=int(time.time()),
        )

        # Save to database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                INSERT INTO atomization_jobs
                (id, user_id, source_type, source_url, source_content, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.id,
                    job.user_id,
                    job.source_type,
                    job.source_url,
                    job.source_content,
                    job.status,
                    job.created_at,
                ),
            )
            conn.commit()
        finally:
            conn.close()

        return job

    def get_job(self, job_id: str) -> Optional[AtomizationJob]:
        """
        Get a job by ID.

        Args:
            job_id: Job ID

        Returns:
            AtomizationJob or None
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute(
                "SELECT * FROM atomization_jobs WHERE id = ?",
                (job_id,),
            )
            row = cursor.fetchone()

            if row:
                return AtomizationJob.from_dict(dict(row))
            return None
        finally:
            conn.close()

    def process_job(self, job_id: str) -> List[AtomizedContent]:
        """
        Process an atomization job.

        Args:
            job_id: Job ID to process

        Returns:
            List of generated AtomizedContent

        Raises:
            ValueError: If job not found or invalid source type
        """
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        # Update status to processing
        self._update_job_status(job_id, "processing")

        try:
            # Get appropriate pipeline
            pipeline = self.pipelines.get(job.source_type)
            if not pipeline:
                raise ValueError(f"Unsupported source type: {job.source_type}")

            # Analyze source content
            source = job.source_url or job.source_content or ""
            analyzed = pipeline.analyze(source)

            # Transform for each target platform
            outputs = []
            target_platforms = ["twitter", "linkedin", "medium", "instagram"]

            for platform in target_platforms:
                try:
                    transformer = self.transformers.get(platform)
                    if not transformer:
                        continue

                    result = transformer.transform(analyzed)

                    # Create AtomizedContent
                    content = self._create_atomized_content(
                        job_id=job_id,
                        platform=platform,
                        result=result,
                    )
                    outputs.append(content)
                except Exception as e:
                    # Log error but continue with other platforms
                    print(f"Error transforming for {platform}: {e}")

            # Update job status to completed
            self._update_job_status(job_id, "completed")

            return outputs

        except Exception as e:
            # Update job status to failed
            self._update_job_status(job_id, "failed", error=str(e))
            raise

    def _create_atomized_content(
        self, job_id: str, platform: str, result: Dict[str, Any]
    ) -> AtomizedContent:
        """Create and save atomized content."""
        content_id = str(uuid.uuid4())

        # Extract content based on platform format
        if platform == "twitter":
            content_text = "\n---\n".join(result.get("tweets", []))
            format_type = result.get("format", "thread")
        elif platform == "instagram":
            content_text = result.get("caption", "")
            format_type = result.get("format", "post")
        else:
            content_text = result.get("content", "")
            format_type = result.get("format", "post")

        content = AtomizedContent(
            id=content_id,
            job_id=job_id,
            platform=platform,
            format=format_type,
            content=content_text,
            media_urls=result.get("media_urls", []),
            created_at=int(time.time()),
        )

        # Save to database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                INSERT INTO atomized_content
                (id, job_id, platform, format, content, media_urls, is_published, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    content.id,
                    content.job_id,
                    content.platform,
                    content.format,
                    content.content,
                    json.dumps(content.media_urls) if content.media_urls else None,
                    0,
                    content.created_at,
                ),
            )
            conn.commit()
        finally:
            conn.close()

        return content

    def get_job_outputs(self, job_id: str) -> List[AtomizedContent]:
        """
        Get all outputs for a job.

        Args:
            job_id: Job ID

        Returns:
            List of AtomizedContent
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute(
                "SELECT * FROM atomized_content WHERE job_id = ?",
                (job_id,),
            )
            rows = cursor.fetchall()

            return [AtomizedContent.from_dict(dict(row)) for row in rows]
        finally:
            conn.close()

    def get_output_by_id(self, output_id: str) -> Optional[AtomizedContent]:
        """
        Get an output by ID.

        Args:
            output_id: Output ID

        Returns:
            AtomizedContent or None
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute(
                "SELECT * FROM atomized_content WHERE id = ?",
                (output_id,),
            )
            row = cursor.fetchone()

            if row:
                return AtomizedContent.from_dict(dict(row))
            return None
        finally:
            conn.close()

    def publish_output(self, output_id: str) -> bool:
        """
        Publish an output to its platform.

        Args:
            output_id: Output ID

        Returns:
            True if published successfully
        """
        output = self.get_output_by_id(output_id)
        if not output:
            return False

        # Actually publish to platform
        success = self._publish_to_platform(output)

        if success:
            # Update database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    UPDATE atomized_content
                    SET is_published = 1, published_at = ?
                    WHERE id = ?
                    """,
                    (int(time.time()), output_id),
                )
                conn.commit()
            finally:
                conn.close()

        return success

    def _publish_to_platform(self, output: AtomizedContent) -> bool:
        """
        Publish content to platform.

        This is a placeholder - real implementation would use
        platform APIs.

        Args:
            output: Content to publish

        Returns:
            True if successful
        """
        # In production, this would call appropriate platform API
        # For now, just return True
        return True

    def schedule_output(self, output_id: str, scheduled_for: int) -> bool:
        """
        Schedule an output for future publishing.

        Args:
            output_id: Output ID
            scheduled_for: Unix timestamp for scheduled time

        Returns:
            True if scheduled successfully
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                UPDATE atomized_content
                SET scheduled_for = ?
                WHERE id = ?
                """,
                (scheduled_for, output_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def _update_job_status(
        self, job_id: str, status: str, error: Optional[str] = None
    ):
        """Update job status in database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            completed_at = int(time.time()) if status in ("completed", "failed") else None

            cursor.execute(
                """
                UPDATE atomization_jobs
                SET status = ?, completed_at = ?, error = ?
                WHERE id = ?
                """,
                (status, completed_at, error, job_id),
            )
            conn.commit()
        finally:
            conn.close()

    def get_user_jobs(
        self, user_id: int, status: Optional[str] = None, limit: int = 50
    ) -> List[AtomizationJob]:
        """
        Get jobs for a user.

        Args:
            user_id: User ID
            status: Optional status filter
            limit: Maximum number of jobs to return

        Returns:
            List of AtomizationJob
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            if status:
                cursor.execute(
                    """
                    SELECT * FROM atomization_jobs
                    WHERE user_id = ? AND status = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (user_id, status, limit),
                )
            else:
                cursor.execute(
                    """
                    SELECT * FROM atomization_jobs
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (user_id, limit),
                )

            rows = cursor.fetchall()
            return [AtomizationJob.from_dict(dict(row)) for row in rows]
        finally:
            conn.close()

"""
Atomization Models.

Database models for content atomization jobs and outputs.
"""

import json
import time
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class AtomizationJob:
    """
    Represents a content atomization job.

    Attributes:
        id: Unique job identifier
        user_id: Owner user ID
        source_type: Type of source content (youtube, blog, thread)
        source_url: Optional URL for remote content
        source_content: Optional raw content text
        status: Job status (pending, processing, completed, failed)
        created_at: Unix timestamp of creation
        completed_at: Optional Unix timestamp of completion
        error: Optional error message if failed
    """

    id: str
    user_id: int
    source_type: str
    source_url: Optional[str] = None
    source_content: Optional[str] = None
    status: str = "pending"
    created_at: int = field(default_factory=lambda: int(time.time()))
    completed_at: Optional[int] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "source_type": self.source_type,
            "source_url": self.source_url,
            "source_content": self.source_content,
            "status": self.status,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "error": self.error,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AtomizationJob":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            user_id=data["user_id"],
            source_type=data["source_type"],
            source_url=data.get("source_url"),
            source_content=data.get("source_content"),
            status=data.get("status", "pending"),
            created_at=data.get("created_at", int(time.time())),
            completed_at=data.get("completed_at"),
            error=data.get("error"),
        )


@dataclass
class AtomizedContent:
    """
    Represents generated content for a specific platform.

    Attributes:
        id: Unique content identifier
        job_id: Parent job ID
        platform: Target platform (twitter, linkedin, medium, instagram)
        format: Content format (thread, single, article, carousel)
        content: Generated content text
        media_urls: List of media URLs
        is_published: Whether content has been published
        scheduled_for: Optional Unix timestamp for scheduled publishing
        published_at: Optional Unix timestamp when published
        created_at: Unix timestamp of creation
    """

    id: str
    job_id: str
    platform: str
    format: str
    content: str
    media_urls: Optional[List[str]] = None
    is_published: bool = False
    scheduled_for: Optional[int] = None
    published_at: Optional[int] = None
    created_at: int = field(default_factory=lambda: int(time.time()))

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "job_id": self.job_id,
            "platform": self.platform,
            "format": self.format,
            "content": self.content,
            "media_urls": self.media_urls or [],
            "is_published": self.is_published,
            "scheduled_for": self.scheduled_for,
            "published_at": self.published_at,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AtomizedContent":
        """Create from dictionary."""
        media_urls = data.get("media_urls")
        if isinstance(media_urls, str):
            media_urls = json.loads(media_urls) if media_urls else []

        return cls(
            id=data["id"],
            job_id=data["job_id"],
            platform=data["platform"],
            format=data["format"],
            content=data["content"],
            media_urls=media_urls,
            is_published=bool(data.get("is_published", False)),
            scheduled_for=data.get("scheduled_for"),
            published_at=data.get("published_at"),
            created_at=data.get("created_at", int(time.time())),
        )

"""
Unified Inbox Models

Database models for the unified inbox feature.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UnifiedMessage:
    """
    Represents a message from any connected platform.

    Attributes:
        id: Unique identifier for the message
        platform: Source platform (twitter, bluesky, mastodon, etc.)
        message_type: Type of message (mention, reply, dm, quote, etc.)
        author_handle: Author's handle/username on the platform
        author_name: Author's display name
        author_avatar: URL to author's avatar image
        content: Message content/text
        original_url: URL to the original message on the platform
        parent_post_id: ID of the parent post (if this is a reply)
        sentiment_score: Sentiment analysis score (-1.0 to 1.0)
        priority_score: Priority score for sorting (0.0 to 1.0)
        is_read: Whether the message has been read
        is_archived: Whether the message has been archived
        is_starred: Whether the message has been starred
        created_at: When the message was created on the platform
        fetched_at: When the message was fetched by ChirpSyncer
        user_id: The ChirpSyncer user who owns this inbox item
    """
    id: str
    platform: str
    message_type: str
    author_handle: str
    author_name: str
    content: str
    created_at: int  # Unix timestamp
    fetched_at: int  # Unix timestamp
    user_id: int
    author_avatar: Optional[str] = None
    original_url: Optional[str] = None
    parent_post_id: Optional[str] = None
    sentiment_score: Optional[float] = None
    priority_score: Optional[float] = None
    is_read: bool = False
    is_archived: bool = False
    is_starred: bool = False

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "platform": self.platform,
            "message_type": self.message_type,
            "author_handle": self.author_handle,
            "author_name": self.author_name,
            "author_avatar": self.author_avatar,
            "content": self.content,
            "original_url": self.original_url,
            "parent_post_id": self.parent_post_id,
            "sentiment_score": self.sentiment_score,
            "priority_score": self.priority_score,
            "is_read": self.is_read,
            "is_archived": self.is_archived,
            "is_starred": self.is_starred,
            "created_at": self.created_at,
            "fetched_at": self.fetched_at,
        }

    @classmethod
    def from_row(cls, row: dict) -> "UnifiedMessage":
        """Create UnifiedMessage from database row."""
        return cls(
            id=row["id"],
            platform=row["platform"],
            message_type=row["message_type"],
            author_handle=row["author_handle"],
            author_name=row["author_name"],
            author_avatar=row.get("author_avatar"),
            content=row["content"],
            original_url=row.get("original_url"),
            parent_post_id=row.get("parent_post_id"),
            sentiment_score=row.get("sentiment_score"),
            priority_score=row.get("priority_score"),
            is_read=bool(row.get("is_read", 0)),
            is_archived=bool(row.get("is_archived", 0)),
            is_starred=bool(row.get("is_starred", 0)),
            created_at=row["created_at"],
            fetched_at=row["fetched_at"],
            user_id=row["user_id"],
        )


# SQL for creating the unified_messages table
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS unified_messages (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    message_type TEXT NOT NULL,
    author_handle TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    content TEXT NOT NULL,
    original_url TEXT,
    parent_post_id TEXT,
    sentiment_score REAL,
    priority_score REAL,
    is_read INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    is_starred INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
"""

CREATE_INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_unified_messages_user ON unified_messages(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_unified_messages_platform ON unified_messages(platform)",
    "CREATE INDEX IF NOT EXISTS idx_unified_messages_is_read ON unified_messages(is_read)",
    "CREATE INDEX IF NOT EXISTS idx_unified_messages_is_archived ON unified_messages(is_archived)",
    "CREATE INDEX IF NOT EXISTS idx_unified_messages_created_at ON unified_messages(created_at)",
]

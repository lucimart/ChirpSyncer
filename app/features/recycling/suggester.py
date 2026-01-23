"""
Recycle Suggester for Content Recycling Engine.

Generates suggestions for recycling evergreen content.
"""

import json
import sqlite3
import time
from typing import Any, Dict, List, Optional

from app.features.recycling.scorer import ContentScorer


class RecycleSuggester:
    """
    Generates recycle suggestions based on content scores.

    Analyzes content library and suggests best candidates for recycling.
    """

    # Minimum recycle score to be considered for suggestions
    MIN_RECYCLE_SCORE = 0.3

    # Available platforms for cross-posting
    SUPPORTED_PLATFORMS = ["twitter", "bluesky", "mastodon"]

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize RecycleSuggester.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.scorer = ContentScorer()

    def generate_suggestions(
        self,
        user_id: int,
        limit: int = 5,
        min_score: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate recycle suggestions for a user.

        Finds content with high recycle potential and returns
        sorted by score.

        Args:
            user_id: User ID
            limit: Maximum number of suggestions
            min_score: Minimum recycle score (default: MIN_RECYCLE_SCORE)

        Returns:
            List of content dictionaries sorted by recycle_score descending
        """
        if min_score is None:
            min_score = self.MIN_RECYCLE_SCORE

        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get all user content that meets basic criteria
            cursor.execute("""
                SELECT * FROM content_library
                WHERE user_id = ?
                ORDER BY created_at ASC
            """, (user_id,))

            rows = cursor.fetchall()
            conn.close()

            # Calculate fresh recycle scores and filter
            suggestions = []
            for row in rows:
                content_item = self._row_to_dict(row)

                # Recalculate recycle score with current time
                recycle_score = self.scorer.calculate_recycle_score(content_item)
                content_item["recycle_score"] = recycle_score

                if recycle_score >= min_score:
                    suggestions.append(content_item)

            # Sort by recycle score descending
            suggestions.sort(key=lambda x: x["recycle_score"], reverse=True)

            # Return top suggestions
            return suggestions[:limit]

        except Exception:
            return []

    def get_best_platforms_for_content(
        self,
        content_id: int,
    ) -> List[str]:
        """
        Determine best platforms for recycling specific content.

        Considers original platform and suggests cross-posting options.

        Args:
            content_id: Content library ID

        Returns:
            List of platform names suitable for recycling
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("""
                SELECT platform, content FROM content_library WHERE id = ?
            """, (content_id,))

            row = cursor.fetchone()
            conn.close()

            if not row:
                return []

            original_platform = row["platform"]
            content = row["content"]

            # Suggest all platforms except the original
            suggestions = [p for p in self.SUPPORTED_PLATFORMS if p != original_platform]

            # Also suggest the original platform (for re-engagement)
            suggestions.append(original_platform)

            return suggestions

        except Exception:
            return []

    def get_suggestions_with_platforms(
        self,
        user_id: int,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Generate suggestions with recommended platforms.

        Combines content suggestions with platform recommendations.

        Args:
            user_id: User ID
            limit: Maximum suggestions

        Returns:
            List of suggestions with suggested_platforms field
        """
        suggestions = self.generate_suggestions(user_id, limit)

        for suggestion in suggestions:
            suggestion["suggested_platforms"] = self.get_best_platforms_for_content(
                suggestion["id"]
            )

        return suggestions

    def refresh_scores(self, user_id: int) -> int:
        """
        Refresh recycle scores for all user content.

        Updates scores in database based on current time.

        Args:
            user_id: User ID

        Returns:
            Number of items updated
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get all user content
            cursor.execute("""
                SELECT * FROM content_library WHERE user_id = ?
            """, (user_id,))

            rows = cursor.fetchall()
            updated = 0

            for row in rows:
                content_item = self._row_to_dict(row)
                new_score = self.scorer.calculate_recycle_score(content_item)

                # Update if score changed significantly
                if abs(new_score - content_item["recycle_score"]) > 0.01:
                    cursor.execute("""
                        UPDATE content_library SET recycle_score = ? WHERE id = ?
                    """, (new_score, content_item["id"]))
                    updated += 1

            conn.commit()
            conn.close()

            return updated

        except Exception:
            return 0

    def create_suggestions_batch(
        self,
        user_id: int,
        limit: int = 5,
    ) -> List[int]:
        """
        Create suggestion records for top candidates.

        Stores suggestions in recycle_suggestions table.

        Args:
            user_id: User ID
            limit: Maximum suggestions to create

        Returns:
            List of created suggestion IDs
        """
        from app.features.recycling.models import RecycleSuggestion

        suggestions = self.get_suggestions_with_platforms(user_id, limit)
        suggestion_model = RecycleSuggestion(db_path=self.db_path)
        suggestion_model.init_db()

        created_ids = []
        for suggestion in suggestions:
            suggestion_id = suggestion_model.create_suggestion(
                content_id=suggestion["id"],
                suggested_platforms=suggestion["suggested_platforms"],
            )
            if suggestion_id:
                created_ids.append(suggestion_id)

        return created_ids

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to dictionary."""
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "platform": row["platform"],
            "original_post_id": row["original_post_id"],
            "content": row["content"],
            "media_urls": json.loads(row["media_urls"] or "[]"),
            "engagement_score": row["engagement_score"],
            "evergreen_score": row["evergreen_score"],
            "recycle_score": row["recycle_score"],
            "tags": json.loads(row["tags"] or "[]"),
            "last_recycled_at": row["last_recycled_at"],
            "recycle_count": row["recycle_count"],
            "created_at": row["created_at"],
        }

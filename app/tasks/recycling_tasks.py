"""Celery tasks for content recycling feature."""

from app.core.celery_app import celery_app
from app.core.logger import setup_logger

logger = setup_logger(__name__)


@celery_app.task(bind=True)
def calculate_library_scores(self, user_id: int, db_path: str) -> dict:
    """
    Calculate evergreen and engagement scores for all content in user's library.

    Args:
        user_id: User ID whose content to score.
        db_path: Path to the SQLite database.

    Returns:
        Dictionary with scored_count and average_score.
    """
    from app.features.recycling.scorer import ContentScorer
    from app.features.recycling.models import ContentLibrary

    logger.info(f"Starting score calculation for user {user_id}")

    try:
        library = ContentLibrary(db_path)
        scorer = ContentScorer()

        # Get all content for user
        items = library.get_user_content(user_id)
        scored_count = 0
        total_score = 0.0

        for item in items:
            scores = scorer.calculate_scores(item)
            library.update_scores(
                item['id'],
                evergreen_score=scores['evergreen'],
                engagement_score=scores['engagement']
            )
            scored_count += 1
            total_score += scores['evergreen']

        avg_score = total_score / scored_count if scored_count > 0 else 0.0

        logger.info(
            f"Score calculation completed for user {user_id}: "
            f"{scored_count} items scored, avg score: {avg_score:.2f}"
        )

        return {
            'scored_count': scored_count,
            'average_score': avg_score,
        }

    except Exception as exc:
        logger.error(f"Score calculation failed for user {user_id}: {exc}")
        raise


@celery_app.task(bind=True)
def generate_recycle_suggestions(self, user_id: int, db_path: str, limit: int = 10) -> dict:
    """
    Generate recycle suggestions for high-scoring evergreen content.

    Args:
        user_id: User ID to generate suggestions for.
        db_path: Path to the SQLite database.
        limit: Maximum number of suggestions to generate.

    Returns:
        Dictionary with suggestions_count and suggestions list.
    """
    from app.features.recycling.suggester import RecycleSuggester
    from app.features.recycling.models import ContentLibrary, RecycleSuggestion

    logger.info(f"Generating recycle suggestions for user {user_id}")

    try:
        library = ContentLibrary(db_path)
        suggester = RecycleSuggester()
        suggestion_model = RecycleSuggestion(db_path)

        # Get top evergreen content
        top_content = library.get_top_evergreen(user_id, limit=limit * 2)
        suggestions = []

        for item in top_content:
            if len(suggestions) >= limit:
                break

            suggestion = suggester.suggest_recycle(item)
            if suggestion and suggestion['confidence'] >= 0.6:
                # Store suggestion
                suggestion_id = suggestion_model.create(
                    content_id=item['id'],
                    user_id=user_id,
                    suggested_platforms=suggestion['platforms'],
                    suggested_time=suggestion.get('optimal_time'),
                    reason=suggestion['reason'],
                    confidence=suggestion['confidence']
                )
                suggestion['id'] = suggestion_id
                suggestions.append(suggestion)

        logger.info(
            f"Generated {len(suggestions)} recycle suggestions for user {user_id}"
        )

        return {
            'suggestions_count': len(suggestions),
            'suggestions': suggestions,
        }

    except Exception as exc:
        logger.error(f"Suggestion generation failed for user {user_id}: {exc}")
        raise


@celery_app.task(bind=True)
def sync_content_to_library(self, user_id: int, db_path: str, days_back: int = 90) -> dict:
    """
    Sync recent posts from all platforms to the content library.

    Args:
        user_id: User ID whose content to sync.
        db_path: Path to the SQLite database.
        days_back: Number of days of content to sync.

    Returns:
        Dictionary with synced_count and platforms.
    """
    from app.features.recycling.models import ContentLibrary
    from app.features.analytics_tracker import AnalyticsTracker

    logger.info(f"Syncing content to library for user {user_id} (last {days_back} days)")

    try:
        library = ContentLibrary(db_path)
        tracker = AnalyticsTracker(db_path)

        # Get recent posts from analytics
        posts = tracker.get_recent_posts(user_id, days=days_back)
        synced_count = 0
        platforms = set()

        for post in posts:
            # Check if already in library
            existing = library.get_by_original_id(post['id'])
            if existing:
                continue

            library.add_content(
                user_id=user_id,
                original_post_id=post['id'],
                platform=post['platform'],
                content=post['content'],
                posted_at=post['created_at'],
                engagement_data={
                    'likes': post.get('likes', 0),
                    'retweets': post.get('retweets', 0),
                    'replies': post.get('replies', 0),
                }
            )
            synced_count += 1
            platforms.add(post['platform'])

        logger.info(
            f"Synced {synced_count} posts to library for user {user_id} "
            f"from platforms: {', '.join(platforms) if platforms else 'none'}"
        )

        # Trigger score calculation
        calculate_library_scores.delay(user_id, db_path)

        return {
            'synced_count': synced_count,
            'platforms': list(platforms),
        }

    except Exception as exc:
        logger.error(f"Content sync failed for user {user_id}: {exc}")
        raise


@celery_app.task(bind=True)
def auto_recycle_content(self, user_id: int, db_path: str) -> dict:
    """
    Automatically recycle approved high-scoring content.

    Args:
        user_id: User ID whose content to recycle.
        db_path: Path to the SQLite database.

    Returns:
        Dictionary with recycled_count and post_ids.
    """
    from app.features.recycling.models import ContentLibrary, RecycleSuggestion

    logger.info(f"Auto-recycling content for user {user_id}")

    try:
        library = ContentLibrary(db_path)
        suggestion_model = RecycleSuggestion(db_path)

        # Get approved suggestions that are due
        approved = suggestion_model.get_approved_due(user_id)
        recycled_count = 0
        post_ids = []

        for suggestion in approved:
            content = library.get_by_id(suggestion['content_id'])
            if not content:
                continue

            # Post to suggested platforms
            for platform in suggestion['suggested_platforms']:
                # This would integrate with the posting service
                # For now, mark as recycled
                pass

            # Update recycle count
            library.increment_recycle_count(content['id'])
            suggestion_model.mark_executed(suggestion['id'])
            recycled_count += 1

        logger.info(f"Auto-recycled {recycled_count} posts for user {user_id}")

        return {
            'recycled_count': recycled_count,
            'post_ids': post_ids,
        }

    except Exception as exc:
        logger.error(f"Auto-recycle failed for user {user_id}: {exc}")
        raise

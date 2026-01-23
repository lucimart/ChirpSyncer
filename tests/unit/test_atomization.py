"""
Tests for Content Atomization Feature.

TDD tests for app/features/atomization/
Tests transforming content into platform-specific formats.
"""

import json
import os
import sqlite3
import tempfile
import time
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest


def create_test_db():
    """Create test database with required tables."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT,
            created_at INTEGER NOT NULL
        )
    """)

    # Insert test user
    cursor.execute(
        "INSERT INTO users (username, email, created_at) VALUES (?, ?, ?)",
        ("testuser", "test@example.com", int(time.time())),
    )

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
            error TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    conn.commit()
    conn.close()
    return path


class TestAtomizationModels:
    """Test atomization database models."""

    def test_atomization_job_model_exists(self):
        """Test AtomizationJob model can be imported."""
        from app.features.atomization.models import AtomizationJob

        assert AtomizationJob is not None

    def test_atomized_content_model_exists(self):
        """Test AtomizedContent model can be imported."""
        from app.features.atomization.models import AtomizedContent

        assert AtomizedContent is not None

    def test_atomization_job_create(self):
        """Test creating an AtomizationJob."""
        from app.features.atomization.models import AtomizationJob

        job = AtomizationJob(
            id="job-123",
            user_id=1,
            source_type="youtube",
            source_url="https://youtube.com/watch?v=abc123",
            source_content=None,
            status="pending",
        )

        assert job.id == "job-123"
        assert job.user_id == 1
        assert job.source_type == "youtube"
        assert job.status == "pending"

    def test_atomized_content_create(self):
        """Test creating an AtomizedContent."""
        from app.features.atomization.models import AtomizedContent

        content = AtomizedContent(
            id="content-456",
            job_id="job-123",
            platform="twitter",
            format="thread",
            content="Tweet 1\n---\nTweet 2",
            media_urls=["https://example.com/img.jpg"],
        )

        assert content.id == "content-456"
        assert content.job_id == "job-123"
        assert content.platform == "twitter"
        assert content.format == "thread"


class TestBasePipeline:
    """Test base pipeline interface."""

    def test_base_pipeline_exists(self):
        """Test BasePipeline can be imported."""
        from app.features.atomization.pipelines.base import BasePipeline

        assert BasePipeline is not None

    def test_base_pipeline_has_analyze_method(self):
        """Test BasePipeline has analyze method."""
        from app.features.atomization.pipelines.base import BasePipeline

        assert hasattr(BasePipeline, "analyze")

    def test_base_pipeline_has_transform_method(self):
        """Test BasePipeline has transform method."""
        from app.features.atomization.pipelines.base import BasePipeline

        assert hasattr(BasePipeline, "transform")


class TestVideoPipeline:
    """Test video content pipeline (YouTube)."""

    def test_video_pipeline_exists(self):
        """Test VideoPipeline can be imported."""
        from app.features.atomization.pipelines.video import VideoPipeline

        assert VideoPipeline is not None

    def test_analyze_youtube_url(self):
        """Test analyzing YouTube video URL."""
        from app.features.atomization.pipelines.video import VideoPipeline

        pipeline = VideoPipeline()
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

        with patch.object(pipeline, "_fetch_video_metadata") as mock_fetch:
            mock_fetch.return_value = {
                "title": "Test Video Title",
                "description": "This is a test video description with key points.",
                "duration": 300,
                "channel": "Test Channel",
                "transcript": "Hello everyone, today we'll discuss important topic...",
            }

            result = pipeline.analyze(url)

            assert result is not None
            assert "title" in result
            assert "key_points" in result
            assert "duration" in result
            assert result["source_type"] == "youtube"

    def test_analyze_youtube_extracts_key_points(self):
        """Test that video analysis extracts key points from transcript."""
        from app.features.atomization.pipelines.video import VideoPipeline

        pipeline = VideoPipeline()

        with patch.object(pipeline, "_fetch_video_metadata") as mock_fetch:
            mock_fetch.return_value = {
                "title": "5 Tips for Better Code",
                "description": "Learn coding tips.",
                "duration": 600,
                "channel": "CodeChannel",
                "transcript": """
                First tip: Write clean code.
                Second tip: Use meaningful variable names.
                Third tip: Keep functions small.
                Fourth tip: Write tests.
                Fifth tip: Review your code.
                """,
            }

            result = pipeline.analyze("https://youtube.com/watch?v=test")

            assert "key_points" in result
            assert len(result["key_points"]) > 0


class TestBlogPipeline:
    """Test blog post pipeline."""

    def test_blog_pipeline_exists(self):
        """Test BlogPipeline can be imported."""
        from app.features.atomization.pipelines.blog import BlogPipeline

        assert BlogPipeline is not None

    def test_analyze_blog_post(self):
        """Test analyzing blog post content."""
        from app.features.atomization.pipelines.blog import BlogPipeline

        pipeline = BlogPipeline()
        blog_content = """
        # How to Build Better APIs

        Building great APIs requires careful planning and execution.

        ## Key Principles

        1. **Consistency** - Use consistent naming conventions
        2. **Documentation** - Document everything
        3. **Versioning** - Always version your APIs

        ## Conclusion

        Following these principles will help you build better APIs.
        """

        result = pipeline.analyze(blog_content)

        assert result is not None
        assert "title" in result
        assert "sections" in result
        assert "word_count" in result
        assert result["source_type"] == "blog"

    def test_analyze_blog_extracts_sections(self):
        """Test that blog analysis extracts sections."""
        from app.features.atomization.pipelines.blog import BlogPipeline

        pipeline = BlogPipeline()
        blog_content = """
        # Main Title

        Introduction paragraph.

        ## Section One
        Content for section one.

        ## Section Two
        Content for section two.
        """

        result = pipeline.analyze(blog_content)

        assert "sections" in result
        assert len(result["sections"]) >= 2


class TestThreadPipeline:
    """Test thread pipeline."""

    def test_thread_pipeline_exists(self):
        """Test ThreadPipeline can be imported."""
        from app.features.atomization.pipelines.thread import ThreadPipeline

        assert ThreadPipeline is not None

    def test_analyze_thread(self):
        """Test analyzing thread content."""
        from app.features.atomization.pipelines.thread import ThreadPipeline

        pipeline = ThreadPipeline()
        thread_content = """
        1/ Here's a thread about Python tips

        2/ Tip 1: Use list comprehensions for cleaner code

        3/ Tip 2: F-strings are your friend

        4/ Tip 3: Context managers for resource handling

        5/ That's it! Follow for more tips.
        """

        result = pipeline.analyze(thread_content)

        assert result is not None
        assert "tweets" in result
        assert len(result["tweets"]) == 5
        assert result["source_type"] == "thread"


class TestTwitterTransformer:
    """Test Twitter transformer."""

    def test_twitter_transformer_exists(self):
        """Test TwitterTransformer can be imported."""
        from app.features.atomization.transformers.twitter import TwitterTransformer

        assert TwitterTransformer is not None

    def test_transform_to_twitter_thread(self):
        """Test transforming content to Twitter thread."""
        from app.features.atomization.transformers.twitter import TwitterTransformer

        transformer = TwitterTransformer()
        source_content = {
            "title": "5 Python Tips",
            "key_points": [
                "Use list comprehensions for cleaner code",
                "F-strings make formatting easy",
                "Context managers handle resources safely",
                "Type hints improve code quality",
                "Virtual environments isolate dependencies",
            ],
        }

        result = transformer.transform(source_content)

        assert result is not None
        assert "tweets" in result
        assert len(result["tweets"]) > 0
        # Each tweet should be <= 280 chars
        for tweet in result["tweets"]:
            assert len(tweet) <= 280

    def test_transform_to_single_tweet(self):
        """Test transforming short content to single tweet."""
        from app.features.atomization.transformers.twitter import TwitterTransformer

        transformer = TwitterTransformer()
        source_content = {
            "title": "Quick Tip",
            "summary": "Always test your code before deploying.",
        }

        result = transformer.transform(source_content, format="single")

        assert "tweets" in result
        assert len(result["tweets"]) == 1
        assert len(result["tweets"][0]) <= 280

    def test_transform_extracts_hashtags(self):
        """Test that Twitter transform extracts/generates hashtags."""
        from app.features.atomization.transformers.twitter import TwitterTransformer

        transformer = TwitterTransformer()
        source_content = {
            "title": "Python Programming Tips",
            "key_points": ["Use type hints", "Write tests"],
            "topics": ["python", "programming", "coding"],
        }

        result = transformer.transform(source_content)

        assert "hashtags" in result
        assert len(result["hashtags"]) > 0


class TestLinkedInTransformer:
    """Test LinkedIn transformer."""

    def test_linkedin_transformer_exists(self):
        """Test LinkedInTransformer can be imported."""
        from app.features.atomization.transformers.linkedin import LinkedInTransformer

        assert LinkedInTransformer is not None

    def test_transform_to_linkedin(self):
        """Test transforming content to LinkedIn format."""
        from app.features.atomization.transformers.linkedin import LinkedInTransformer

        transformer = LinkedInTransformer()
        source_content = {
            "title": "Why Testing Matters",
            "key_points": [
                "Catch bugs early",
                "Improve code quality",
                "Enable refactoring",
            ],
            "summary": "Testing is essential for software quality.",
        }

        result = transformer.transform(source_content)

        assert result is not None
        assert "content" in result
        assert len(result["content"]) <= 3000  # LinkedIn limit
        # Should have professional tone indicators
        assert "tone" in result
        assert result["tone"] == "professional"

    def test_linkedin_adds_cta(self):
        """Test LinkedIn transform adds call-to-action."""
        from app.features.atomization.transformers.linkedin import LinkedInTransformer

        transformer = LinkedInTransformer()
        source_content = {
            "title": "Career Tips",
            "key_points": ["Network regularly", "Keep learning"],
        }

        result = transformer.transform(source_content)

        # Should include a CTA
        content_lower = result["content"].lower()
        cta_indicators = ["comment", "share", "thoughts", "agree", "follow", "connect"]
        has_cta = any(indicator in content_lower for indicator in cta_indicators)
        assert has_cta, "LinkedIn post should include a call-to-action"


class TestMediumTransformer:
    """Test Medium transformer."""

    def test_medium_transformer_exists(self):
        """Test MediumTransformer can be imported."""
        from app.features.atomization.transformers.medium import MediumTransformer

        assert MediumTransformer is not None

    def test_transform_to_medium(self):
        """Test transforming content to Medium article format."""
        from app.features.atomization.transformers.medium import MediumTransformer

        transformer = MediumTransformer()
        source_content = {
            "title": "Building Scalable APIs",
            "key_points": [
                "Use proper authentication",
                "Implement rate limiting",
                "Cache responses",
            ],
            "detailed_content": "Full content here with multiple paragraphs...",
        }

        result = transformer.transform(source_content)

        assert result is not None
        assert "content" in result
        assert "format" in result
        assert result["format"] == "markdown"
        # Should have proper article structure
        assert "#" in result["content"]  # Has headers

    def test_medium_suggests_header_image(self):
        """Test Medium transform suggests header image."""
        from app.features.atomization.transformers.medium import MediumTransformer

        transformer = MediumTransformer()
        source_content = {
            "title": "Test Article",
            "key_points": ["Point 1", "Point 2"],
        }

        result = transformer.transform(source_content)

        assert "header_image_suggestion" in result


class TestInstagramTransformer:
    """Test Instagram transformer."""

    def test_instagram_transformer_exists(self):
        """Test InstagramTransformer can be imported."""
        from app.features.atomization.transformers.instagram import InstagramTransformer

        assert InstagramTransformer is not None

    def test_transform_to_instagram(self):
        """Test transforming content to Instagram format."""
        from app.features.atomization.transformers.instagram import InstagramTransformer

        transformer = InstagramTransformer()
        source_content = {
            "title": "Morning Routine Tips",
            "key_points": [
                "Wake up early",
                "Exercise",
                "Healthy breakfast",
                "Plan your day",
            ],
        }

        result = transformer.transform(source_content)

        assert result is not None
        assert "caption" in result
        assert len(result["caption"]) <= 2200  # Instagram limit
        assert "hashtags" in result
        assert len(result["hashtags"]) >= 20
        assert len(result["hashtags"]) <= 30

    def test_instagram_generates_carousel_slides(self):
        """Test Instagram transform generates carousel slides."""
        from app.features.atomization.transformers.instagram import InstagramTransformer

        transformer = InstagramTransformer()
        source_content = {
            "title": "5 Productivity Tips",
            "key_points": [
                "Time blocking",
                "Pomodoro technique",
                "Prioritize tasks",
                "Eliminate distractions",
                "Take breaks",
            ],
        }

        result = transformer.transform(source_content, format="carousel")

        assert "carousel_slides" in result
        assert len(result["carousel_slides"]) > 0


class TestAtomizationService:
    """Test atomization service."""

    def test_service_exists(self):
        """Test AtomizationService can be imported."""
        from app.features.atomization.service import AtomizationService

        assert AtomizationService is not None

    def test_create_job(self):
        """Test creating an atomization job."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            job = service.create_job(
                user_id=1,
                source={
                    "type": "youtube",
                    "url": "https://youtube.com/watch?v=test123",
                },
            )

            assert job is not None
            assert job.id is not None
            assert job.user_id == 1
            assert job.source_type == "youtube"
            assert job.status == "pending"
        finally:
            os.unlink(db_path)

    def test_process_job(self):
        """Test processing an atomization job."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            # Create job
            job = service.create_job(
                user_id=1,
                source={
                    "type": "blog",
                    "content": """
                    # Test Blog Post

                    This is test content.

                    ## Key Points
                    - Point one
                    - Point two
                    """,
                },
            )

            # Process job
            outputs = service.process_job(job.id)

            assert len(outputs) > 0
            # Should generate content for multiple platforms
            platforms = [o.platform for o in outputs]
            assert len(platforms) > 1  # At least 2 platforms
        finally:
            os.unlink(db_path)

    def test_get_job_outputs(self):
        """Test getting outputs for a job."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            # Create and process job
            job = service.create_job(
                user_id=1,
                source={
                    "type": "blog",
                    "content": "# Test\n\nContent here.",
                },
            )
            service.process_job(job.id)

            # Get outputs
            outputs = service.get_job_outputs(job.id)

            assert len(outputs) > 0
            for output in outputs:
                assert output.job_id == job.id
                assert output.content is not None
        finally:
            os.unlink(db_path)

    def test_publish_output(self):
        """Test publishing an output."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            # Create and process job
            job = service.create_job(
                user_id=1,
                source={"type": "blog", "content": "# Test\n\nContent."},
            )
            outputs = service.process_job(job.id)

            # Mock the actual publishing
            with patch.object(service, "_publish_to_platform") as mock_publish:
                mock_publish.return_value = True
                result = service.publish_output(outputs[0].id)

            assert result is True
        finally:
            os.unlink(db_path)

    def test_schedule_output(self):
        """Test scheduling an output."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            # Create and process job
            job = service.create_job(
                user_id=1,
                source={"type": "blog", "content": "# Test\n\nContent."},
            )
            outputs = service.process_job(job.id)

            # Schedule for future
            scheduled_time = int(time.time()) + 3600  # 1 hour from now
            result = service.schedule_output(outputs[0].id, scheduled_time)

            assert result is True

            # Verify scheduling
            updated_output = service.get_output_by_id(outputs[0].id)
            assert updated_output.scheduled_for == scheduled_time
        finally:
            os.unlink(db_path)


class TestJobWorkflow:
    """Test complete job workflow."""

    def test_job_workflow_youtube_to_all_platforms(self):
        """Test full workflow: YouTube video to all platform formats."""
        from app.features.atomization.service import AtomizationService
        from app.features.atomization.pipelines.video import VideoPipeline

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            # Mock video metadata fetch
            with patch.object(
                VideoPipeline, "_fetch_video_metadata"
            ) as mock_fetch:
                mock_fetch.return_value = {
                    "title": "10 Python Tips for Beginners",
                    "description": "Learn Python basics.",
                    "duration": 600,
                    "channel": "CodeChannel",
                    "transcript": """
                    Welcome to this tutorial.
                    Tip 1: Use meaningful variable names.
                    Tip 2: Keep functions small.
                    Tip 3: Write documentation.
                    Thanks for watching!
                    """,
                }

                job = service.create_job(
                    user_id=1,
                    source={
                        "type": "youtube",
                        "url": "https://youtube.com/watch?v=test",
                    },
                )
                outputs = service.process_job(job.id)

            # Should have outputs for multiple platforms
            platforms = {o.platform for o in outputs}
            assert "twitter" in platforms
            assert "linkedin" in platforms
        finally:
            os.unlink(db_path)

    def test_job_status_progression(self):
        """Test job status changes through workflow."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            job = service.create_job(
                user_id=1,
                source={"type": "blog", "content": "# Test\n\nContent."},
            )
            assert job.status == "pending"

            # Get job before processing
            job_before = service.get_job(job.id)
            assert job_before.status == "pending"

            # Process
            service.process_job(job.id)

            # Get job after processing
            job_after = service.get_job(job.id)
            assert job_after.status == "completed"
            assert job_after.completed_at is not None
        finally:
            os.unlink(db_path)

    def test_job_handles_errors(self):
        """Test job handles processing errors gracefully."""
        from app.features.atomization.service import AtomizationService

        db_path = create_test_db()
        try:
            service = AtomizationService(db_path=db_path)

            # Create job with invalid source type
            job = service.create_job(
                user_id=1,
                source={"type": "invalid_type", "content": "test"},
            )

            # Process should handle error
            try:
                outputs = service.process_job(job.id)
            except ValueError:
                pass  # Expected

            # Job should be marked as failed
            job_after = service.get_job(job.id)
            assert job_after.status == "failed"
            assert job_after.error is not None
        finally:
            os.unlink(db_path)

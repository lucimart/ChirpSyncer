import time
import logging
from atproto import Client, models
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log, after_log
from config import BSKY_USERNAME, BSKY_PASSWORD
from logger import setup_logger

logger = setup_logger(__name__)

# Initialize Bluesky client
bsky_client = Client()

# Function to login (explicitly called when needed)
@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def login_to_bluesky():
    bsky_client.login(BSKY_USERNAME, BSKY_PASSWORD)


def validate_and_truncate_text(text: str, max_length: int = 300) -> str:
    """
    Validate text length for Bluesky.
    If text exceeds max_length, truncate to (max_length - 3) and add '...'

    Args:
        text: Original text
        max_length: Maximum allowed length (default 300 for Bluesky)

    Returns:
        Original text if <= max_length, truncated text otherwise
    """
    if len(text) <= max_length:
        return text

    # Log warning when truncating
    logger.warning(f"Text truncated from {len(text)} to {max_length} chars")
    return text[:max_length - 3] + "..."


# Post to Bluesky
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def post_to_bluesky(content):
    # Validate length before posting
    validated_content = validate_and_truncate_text(content)

    try:
        bsky_client.post(validated_content)
        logger.info(f"Posted to Bluesky: {validated_content[:50]}...")
    except Exception as e:
        logger.error(f"Error posting to Bluesky: {e}")
        raise  # Re-raise to allow retry mechanism to work


class Post:
    """Simple Post class for Bluesky posts with text and URI."""
    def __init__(self, uri: str, text: str):
        self.uri = uri
        self.text = text

    def __repr__(self):
        return f"Post(uri={self.uri[:30]}..., text={self.text[:50]}...)"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.ERROR)
)
def fetch_posts_from_bluesky(username: str, count: int = 10) -> list:
    """
    Fetch recent posts from Bluesky user's feed.

    Args:
        username: Bluesky username (e.g., 'user.bsky.social')
        count: Maximum number of posts to fetch (default 10)

    Returns:
        List of Post objects with .text and .uri attributes
        Filters out reposts and quote posts, only returns original posts

    Raises:
        Exception on network errors (handled by retry decorator)
    """
    try:
        logger.info(f"Fetching posts from Bluesky user: {username} (limit: {count})")

        # Call Bluesky API to get author feed
        response = bsky_client.app.bsky.feed.get_author_feed(
            actor=username,
            limit=count
        )

        # Extract posts from response
        if not hasattr(response, 'feed') or not response.feed:
            logger.info(f"No posts found for user: {username}")
            return []

        # Filter and process posts
        posts = []
        for item in response.feed:
            # Stop if we've reached the requested count
            if len(posts) >= count:
                break

            # Skip reposts (reason != None indicates repost)
            if item.get('reason') is not None:
                continue

            # Extract post data
            post_data = item.get('post', {})
            record = post_data.get('record', {})
            uri = post_data.get('uri', '')
            text = record.get('text', '')

            # Create Post object
            if uri and text:
                posts.append(Post(uri=uri, text=text))

        logger.info(f"Fetched {len(posts)} original posts from {username}")
        return posts

    except Exception as e:
        logger.error(f"Error fetching posts from Bluesky: {e}")
        raise  # Re-raise to allow retry mechanism to work


def post_thread_to_bluesky(tweets: list) -> list:
    """Post a thread to Bluesky maintaining reply chain.

    This function posts a list of tweets as a thread on Bluesky, maintaining
    the reply chain structure. Each tweet after the first will be posted as
    a reply to the previous one.

    Args:
        tweets: List of TweetAdapter objects representing the thread

    Returns:
        list: List of URIs for the posted tweets

    Note:
        - Includes rate limiting (1 second sleep between posts)
        - Validates and truncates text for each tweet
        - Handles partial failures gracefully
        - Uses retry logic for each individual post

    Example:
        >>> thread = [tweet1, tweet2, tweet3]
        >>> uris = post_thread_to_bluesky(thread)
        >>> print(f"Posted {len(uris)} tweets")
    """
    if not tweets:
        logger.warning("Empty thread provided to post_thread_to_bluesky")
        return []

    posted_uris = []
    parent_ref = None

    for i, tweet in enumerate(tweets):
        try:
            # Validate and truncate text
            validated_content = validate_and_truncate_text(tweet.text)

            # Prepare post parameters
            if i == 0:
                # First tweet: no reply parent
                response = bsky_client.send_post(text=validated_content)
            else:
                # Subsequent tweets: reply to previous tweet
                if parent_ref:
                    # Create reply reference
                    reply_ref = models.AppBskyFeedPost.ReplyRef(
                        parent=parent_ref,
                        root=posted_uris[0] if posted_uris else parent_ref
                    )
                    response = bsky_client.send_post(
                        text=validated_content,
                        reply_to=reply_ref
                    )
                else:
                    # Fallback if parent_ref is missing
                    response = bsky_client.send_post(text=validated_content)

            # Store the URI and CID for the next reply
            if hasattr(response, 'uri') and hasattr(response, 'cid'):
                posted_uris.append(response.uri)
                # Create reference for next tweet in thread
                parent_ref = models.create_strong_ref(response)
                logger.info(f"Posted tweet {i+1}/{len(tweets)} to Bluesky: {validated_content[:50]}...")
            else:
                logger.warning(f"Response missing uri/cid for tweet {i+1}")

            # Rate limiting: sleep between posts (except after last one)
            if i < len(tweets) - 1:
                time.sleep(1)

        except Exception as e:
            logger.error(f"Error posting tweet {i+1} in thread: {e}")
            # Continue with next tweet even if one fails
            continue

    logger.info(f"Posted thread: {len(posted_uris)}/{len(tweets)} tweets successful")
    return posted_uris


def is_bluesky_thread(post) -> bool:
    """
    Detecta si un post de Bluesky es parte de un thread.

    Un post es parte de thread si:
    - Tiene campo 'reply' en el record
    - El post padre (parent) es del mismo autor

    Args:
        post: Post object from Bluesky API (dict with 'record' and 'author')

    Returns:
        bool: True si es parte de un thread del mismo autor
    """
    try:
        # Check if post has reply field in record
        record = post.get('record', {})
        reply = record.get('reply')

        if not reply:
            # No reply field = not a thread
            return False

        # Get parent URI
        parent_ref = reply.get('parent', {})
        parent_uri = parent_ref.get('uri')

        if not parent_uri:
            logger.warning("Reply field exists but no parent URI found")
            return False

        # Fetch parent post to check author
        try:
            parent_response = bsky_client.app.bsky.feed.get_posts(uris=[parent_uri])

            if not hasattr(parent_response, 'posts') or not parent_response.posts:
                logger.warning(f"Parent post not found: {parent_uri}")
                return False

            parent_post = parent_response.posts[0]

            # Compare author DIDs
            current_author_did = post.get('author', {}).get('did')
            parent_author_did = parent_post.get('author', {}).get('did')

            # It's a thread if the parent is from the same author
            return current_author_did == parent_author_did

        except Exception as e:
            logger.error(f"Error fetching parent post: {e}")
            return False

    except Exception as e:
        logger.error(f"Error in is_bluesky_thread: {e}")
        return False


async def fetch_bluesky_thread(post_uri: str, username: str) -> list:
    """
    Recupera todos los posts de un thread de Bluesky.

    Args:
        post_uri: URI del post inicial
        username: Handle del usuario (@handle.bsky.social)

    Returns:
        list: Posts del thread en orden cronológico

    Algoritmo:
    1. Obtener post actual
    2. Buscar post raíz (root) del thread
    3. Recuperar todos los replies del mismo autor
    4. Ordenar cronológicamente
    """
    try:
        logger.info(f"Fetching thread starting from: {post_uri}")

        # Step 1: Get the initial post
        initial_response = bsky_client.app.bsky.feed.get_posts(uris=[post_uri])

        if not hasattr(initial_response, 'posts') or not initial_response.posts:
            logger.warning(f"Post not found: {post_uri}")
            return []

        initial_post = initial_response.posts[0]

        # Step 2: Find the root of the thread
        root_uri = post_uri
        record = initial_post.get('record', {})
        reply = record.get('reply')

        if reply:
            root_ref = reply.get('root', {})
            root_uri = root_ref.get('uri', post_uri)

        logger.info(f"Thread root: {root_uri}")

        # Step 3: Fetch all posts from the user
        author_feed_response = bsky_client.app.bsky.feed.get_author_feed(
            actor=username,
            limit=50  # Fetch more posts to capture full thread
        )

        if not hasattr(author_feed_response, 'feed') or not author_feed_response.feed:
            logger.warning(f"No posts found for user: {username}")
            return []

        # Step 4: Filter posts that belong to this thread
        thread_posts = []
        author_did = initial_post.get('author', {}).get('did')

        for item in author_feed_response.feed:
            # Skip reposts
            if item.get('reason') is not None:
                continue

            post = item.get('post', {})
            post_record = post.get('record', {})
            post_reply = post_record.get('reply')

            # Check if this post is part of the thread
            # A post is part of the thread if:
            # 1. It's the root post (no reply field and URI matches)
            # 2. It has a reply field with the same root URI

            is_root = (post.get('uri') == root_uri)
            has_matching_root = False

            if post_reply:
                post_root_ref = post_reply.get('root', {})
                post_root_uri = post_root_ref.get('uri')
                has_matching_root = (post_root_uri == root_uri)

            # Add to thread if it's the root or has matching root
            if is_root or has_matching_root:
                # Verify it's from the same author
                if post.get('author', {}).get('did') == author_did:
                    thread_posts.append(post)

        # Step 5: Sort by timestamp (chronological order)
        thread_posts.sort(key=lambda p: p.get('record', {}).get('createdAt', ''))

        logger.info(f"Fetched {len(thread_posts)} posts in thread")
        return thread_posts

    except Exception as e:
        logger.error(f"Error fetching Bluesky thread: {e}")
        return []

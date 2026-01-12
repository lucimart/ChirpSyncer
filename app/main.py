import time
import asyncio
import os
import hashlib
from twitter_scraper import fetch_tweets, is_thread, fetch_thread
from bluesky_handler import post_to_bluesky, post_thread_to_bluesky, login_to_bluesky, fetch_posts_from_bluesky
from twitter_handler import post_to_twitter
from config import POLL_INTERVAL, TWITTER_USERNAME, BSKY_USERNAME, TWITTER_API_KEY
from config import TWITTER_PASSWORD, TWITTER_EMAIL, TWITTER_EMAIL_PASSWORD, BSKY_PASSWORD
from db_handler import migrate_database, should_sync_post, save_synced_post
from validation import validate_credentials
from app.core.logger import setup_logger

# Sprint 6: Multi-user support imports
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.services.user_settings import UserSettings
from app.auth.security_utils import log_audit

logger = setup_logger(__name__)

# Database path for multi-user system
DB_PATH = 'chirpsyncer.db'

# Feature flag for multi-user mode (backward compatible)
MULTI_USER_ENABLED = os.getenv('MULTI_USER_ENABLED', 'false').lower() == 'true'


def sync_twitter_to_bluesky():
    """
    Sync Twitter → Bluesky using new DB schema.

    Fetches recent tweets and syncs them to Bluesky if not already synced.
    Uses should_sync_post() to check for duplicates and save_synced_post() to track.
    Supports thread detection and posting.
    """
    logger.info("Starting Twitter → Bluesky sync...")
    tweets = fetch_tweets()

    synced_count = 0
    skipped_count = 0

    for tweet in tweets:
        # Check if should sync using new DB function
        if should_sync_post(tweet.text, 'twitter', tweet.id):
            # Handle threads
            try:
                is_thread_result = asyncio.run(is_thread(tweet._tweet))

                if is_thread_result:
                    logger.info(f"Thread detected for tweet {tweet.id}, fetching full thread...")
                    # Fetch the complete thread
                    thread = asyncio.run(fetch_thread(str(tweet.id), TWITTER_USERNAME))

                    if thread and len(thread) > 0:
                        logger.info(f"Posting thread with {len(thread)} tweets to Bluesky...")
                        # Post entire thread to Bluesky
                        from twitter_scraper import TweetAdapter
                        adapted_thread = [TweetAdapter(t) for t in thread]
                        bluesky_uris = post_thread_to_bluesky(adapted_thread)

                        # Save each tweet in thread
                        for t, uri in zip(thread, bluesky_uris):
                            # Get text from thread tweet
                            tweet_text = t.text if hasattr(t, 'text') else str(t)
                            tweet_id = t.id if hasattr(t, 'id') else str(t)

                            save_synced_post(
                                twitter_id=str(tweet_id),
                                bluesky_uri=uri,
                                source='twitter',
                                synced_to='bluesky',
                                content=tweet_text
                            )
                        synced_count += len(thread)
                        logger.info(f"Synced thread ({len(thread)} tweets) to Bluesky")
                    else:
                        logger.warning(f"Could not fetch thread for tweet {tweet.id}, posting as single tweet")
                        # Fallback to single tweet
                        bluesky_uri = post_to_bluesky(tweet.text)
                        save_synced_post(
                            twitter_id=tweet.id,
                            bluesky_uri=bluesky_uri,
                            source='twitter',
                            synced_to='bluesky',
                            content=tweet.text
                        )
                        synced_count += 1
                        logger.info(f"Synced tweet {tweet.id} to Bluesky")
                else:
                    # Single tweet: post normally
                    bluesky_uri = post_to_bluesky(tweet.text)
                    save_synced_post(
                        twitter_id=tweet.id,
                        bluesky_uri=bluesky_uri,
                        source='twitter',
                        synced_to='bluesky',
                        content=tweet.text
                    )
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky")

            except Exception as e:
                logger.error(f"Error processing tweet {tweet.id}: {e}")
                # Fallback: post as single tweet
                try:
                    bluesky_uri = post_to_bluesky(tweet.text)
                    save_synced_post(
                        twitter_id=tweet.id,
                        bluesky_uri=bluesky_uri,
                        source='twitter',
                        synced_to='bluesky',
                        content=tweet.text
                    )
                    synced_count += 1
                    logger.info(f"Synced tweet {tweet.id} to Bluesky (fallback)")
                except Exception as post_error:
                    logger.error(f"Failed to post tweet {tweet.id}: {post_error}")
        else:
            skipped_count += 1
            logger.debug(f"Skipped tweet {tweet.id} (already synced or duplicate content)")

    logger.info(f"Twitter → Bluesky sync complete: {synced_count} synced, {skipped_count} skipped")


def sync_bluesky_to_twitter():
    """
    Sync Bluesky → Twitter (NEW function for bidirectional sync).

    Fetches recent Bluesky posts and syncs them to Twitter if:
    1. Twitter API credentials are available
    2. Post not already synced (checked via should_sync_post)

    Gracefully skips if Twitter API credentials are missing.
    """
    # Check if Twitter API credentials are available
    if not TWITTER_API_KEY:
        logger.debug("Twitter API credentials not configured. Skipping Bluesky→Twitter sync.")
        return

    logger.info("Starting Bluesky → Twitter sync...")
    posts = fetch_posts_from_bluesky(BSKY_USERNAME, count=10)

    synced_count = 0
    skipped_count = 0

    for post in posts:
        # Check if should sync
        if should_sync_post(post.text, 'bluesky', post.uri):
            try:
                # Post to Twitter
                tweet_id = post_to_twitter(post.text)

                # Save to DB
                save_synced_post(
                    twitter_id=tweet_id,
                    bluesky_uri=post.uri,
                    source='bluesky',
                    synced_to='twitter',
                    content=post.text
                )

                synced_count += 1
                logger.info(f"Synced Bluesky post {post.uri} to Twitter (tweet ID: {tweet_id})")

            except Exception as e:
                logger.error(f"Failed to sync Bluesky post {post.uri} to Twitter: {e}")
        else:
            skipped_count += 1
            logger.debug(f"Skipped Bluesky post {post.uri} (already synced or duplicate content)")

    logger.info(f"Bluesky → Twitter sync complete: {synced_count} synced, {skipped_count} skipped")


# ============================================================================
# SPRINT 6: MULTI-USER SUPPORT FUNCTIONS
# ============================================================================

def get_master_key() -> bytes:
    """
    Derive master encryption key from SECRET_KEY environment variable.

    Returns:
        32-byte master key for AES-256 encryption

    Raises:
        ValueError: If SECRET_KEY is not configured
    """
    secret_key = os.getenv('SECRET_KEY')

    if not secret_key:
        raise ValueError(
            'SECRET_KEY environment variable not set. '
            'Please set SECRET_KEY in .env for credential encryption.'
        )

    # Derive 32-byte key using SHA-256
    return hashlib.sha256(secret_key.encode('utf-8')).digest()


def init_multi_user_system():
    """
    Initialize multi-user system tables and infrastructure.

    Creates all necessary database tables for:
    - Users and sessions (UserManager)
    - Encrypted credentials (CredentialManager)
    - User settings (UserSettings)
    """
    logger.info("Initializing multi-user system...")

    try:
        # Initialize UserManager tables
        user_manager = UserManager(db_path=DB_PATH)
        user_manager.init_db()
        logger.info("✓ User management tables initialized")

        # Initialize CredentialManager tables
        master_key = get_master_key()
        cred_manager = CredentialManager(master_key, db_path=DB_PATH)
        cred_manager.init_db()
        logger.info("✓ Credential storage tables initialized")

        # Initialize UserSettings tables
        settings_manager = UserSettings(db_path=DB_PATH)
        settings_manager.init_db()
        logger.info("✓ User settings tables initialized")

        logger.info("Multi-user system initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize multi-user system: {e}")
        raise


def ensure_admin_user():
    """
    Ensure admin user exists on first run.

    If no users exist in the database:
    1. Create admin user with credentials from .env
    2. Store .env credentials in CredentialManager for admin
    3. Initialize default settings

    This provides a smooth migration path from single-user to multi-user mode.
    """
    user_manager = UserManager(db_path=DB_PATH)

    # Check if any users exist
    users = user_manager.list_users()

    if len(users) > 0:
        logger.info(f"Users already exist ({len(users)} total). Skipping admin creation.")
        return

    logger.info("No users found. Creating admin user from .env credentials...")

    try:
        # Get admin password from .env or generate random one
        admin_password = os.getenv('ADMIN_PASSWORD')

        if not admin_password:
            # Generate strong random password
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits + string.punctuation
            admin_password = ''.join(secrets.choice(alphabet) for _ in range(16))
            logger.warning("=" * 60)
            logger.warning("ADMIN PASSWORD GENERATED:")
            logger.warning(f"  Username: admin")
            logger.warning(f"  Password: {admin_password}")
            logger.warning("=" * 60)
            logger.warning("PLEASE SAVE THIS PASSWORD! It won't be shown again.")
            logger.warning("Set ADMIN_PASSWORD in .env to use a custom password.")
            logger.warning("=" * 60)

        # Create admin user
        admin_id = user_manager.create_user(
            username='admin',
            email=os.getenv('ADMIN_EMAIL', 'admin@chirpsyncer.local'),
            password=admin_password,
            is_admin=True
        )

        logger.info(f"✓ Admin user created (ID: {admin_id})")

        # Store credentials from .env in CredentialManager
        master_key = get_master_key()
        cred_manager = CredentialManager(master_key, db_path=DB_PATH)

        # Store Twitter scraping credentials if available
        if TWITTER_USERNAME and TWITTER_PASSWORD:
            cred_manager.save_credentials(
                user_id=admin_id,
                platform='twitter',
                credential_type='scraping',
                data={
                    'username': TWITTER_USERNAME,
                    'password': TWITTER_PASSWORD,
                    'email': TWITTER_EMAIL or '',
                    'email_password': TWITTER_EMAIL_PASSWORD or ''
                }
            )
            logger.info("✓ Twitter scraping credentials stored for admin")

        # Store Twitter API credentials if available
        if TWITTER_API_KEY:
            from config import TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
            cred_manager.save_credentials(
                user_id=admin_id,
                platform='twitter',
                credential_type='api',
                data={
                    'api_key': TWITTER_API_KEY,
                    'api_secret': TWITTER_API_SECRET or '',
                    'access_token': TWITTER_ACCESS_TOKEN or '',
                    'access_secret': TWITTER_ACCESS_SECRET or ''
                }
            )
            logger.info("✓ Twitter API credentials stored for admin")

        # Store Bluesky credentials if available
        if BSKY_USERNAME and BSKY_PASSWORD:
            cred_manager.save_credentials(
                user_id=admin_id,
                platform='bluesky',
                credential_type='api',
                data={
                    'username': BSKY_USERNAME,
                    'password': BSKY_PASSWORD
                }
            )
            logger.info("✓ Bluesky credentials stored for admin")

        logger.info("Admin user setup complete")

    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
        raise


def sync_user_twitter_to_bluesky(user, twitter_creds: dict, bluesky_creds: dict):
    """
    Sync Twitter → Bluesky for a specific user.

    Args:
        user: User object with user.id and user.username
        twitter_creds: Twitter credentials dict (username, password, email, email_password)
        bluesky_creds: Bluesky credentials dict (username, password)
    """
    logger.info(f"[User {user.username}] Starting Twitter → Bluesky sync...")

    # Temporarily override global config with user's credentials
    # (This is a workaround until we refactor the entire codebase to be credential-aware)
    import app.core.config as config_module
    original_twitter_username = config_module.TWITTER_USERNAME
    original_bsky_username = config_module.BSKY_USERNAME
    original_bsky_password = config_module.BSKY_PASSWORD

    try:
        # Set user's credentials
        config_module.TWITTER_USERNAME = twitter_creds.get('username')
        config_module.BSKY_USERNAME = bluesky_creds.get('username')
        config_module.BSKY_PASSWORD = bluesky_creds.get('password')

        # Login to Bluesky with user's credentials
        login_to_bluesky()

        # Fetch tweets with user's credentials
        tweets = fetch_tweets()

        synced_count = 0
        skipped_count = 0

        for tweet in tweets:
            # Check if should sync (now with user_id context)
            if should_sync_post(tweet.text, 'twitter', tweet.id, db_path=DB_PATH):
                try:
                    is_thread_result = asyncio.run(is_thread(tweet._tweet))

                    if is_thread_result:
                        logger.info(f"[User {user.username}] Thread detected for tweet {tweet.id}")
                        thread = asyncio.run(fetch_thread(str(tweet.id), twitter_creds.get('username')))

                        if thread and len(thread) > 0:
                            logger.info(f"[User {user.username}] Posting thread ({len(thread)} tweets)")
                            from twitter_scraper import TweetAdapter
                            adapted_thread = [TweetAdapter(t) for t in thread]
                            bluesky_uris = post_thread_to_bluesky(adapted_thread)

                            for t, uri in zip(thread, bluesky_uris):
                                tweet_text = t.text if hasattr(t, 'text') else str(t)
                                tweet_id = t.id if hasattr(t, 'id') else str(t)

                                save_synced_post(
                                    twitter_id=str(tweet_id),
                                    bluesky_uri=uri,
                                    source='twitter',
                                    synced_to='bluesky',
                                    content=tweet_text,
                                    db_path=DB_PATH
                                )

                            synced_count += len(thread)
                        else:
                            # Fallback to single tweet
                            bluesky_uri = post_to_bluesky(tweet.text)
                            save_synced_post(
                                twitter_id=tweet.id,
                                bluesky_uri=bluesky_uri,
                                source='twitter',
                                synced_to='bluesky',
                                content=tweet.text,
                                db_path=DB_PATH
                            )
                            synced_count += 1
                    else:
                        # Single tweet
                        bluesky_uri = post_to_bluesky(tweet.text)
                        save_synced_post(
                            twitter_id=tweet.id,
                            bluesky_uri=bluesky_uri,
                            source='twitter',
                            synced_to='bluesky',
                            content=tweet.text,
                            db_path=DB_PATH
                        )
                        synced_count += 1

                except Exception as e:
                    logger.error(f"[User {user.username}] Error processing tweet {tweet.id}: {e}")
                    # Try fallback
                    try:
                        bluesky_uri = post_to_bluesky(tweet.text)
                        save_synced_post(
                            twitter_id=tweet.id,
                            bluesky_uri=bluesky_uri,
                            source='twitter',
                            synced_to='bluesky',
                            content=tweet.text,
                            db_path=DB_PATH
                        )
                        synced_count += 1
                    except Exception as post_error:
                        logger.error(f"[User {user.username}] Failed to post tweet {tweet.id}: {post_error}")
            else:
                skipped_count += 1

        logger.info(f"[User {user.username}] Twitter → Bluesky: {synced_count} synced, {skipped_count} skipped")

    except Exception as e:
        logger.error(f"[User {user.username}] Error in Twitter → Bluesky sync: {e}")
        raise

    finally:
        # Restore original credentials
        config_module.TWITTER_USERNAME = original_twitter_username
        config_module.BSKY_USERNAME = original_bsky_username
        config_module.BSKY_PASSWORD = original_bsky_password


def sync_user_bluesky_to_twitter(user, twitter_api_creds: dict, bluesky_creds: dict):
    """
    Sync Bluesky → Twitter for a specific user.

    Args:
        user: User object with user.id and user.username
        twitter_api_creds: Twitter API credentials dict (api_key, api_secret, access_token, access_secret)
        bluesky_creds: Bluesky credentials dict (username, password)
    """
    logger.info(f"[User {user.username}] Starting Bluesky → Twitter sync...")

    # Check if Twitter API credentials are available
    if not twitter_api_creds or not twitter_api_creds.get('api_key'):
        logger.debug(f"[User {user.username}] Twitter API credentials not configured. Skipping.")
        return

    # Temporarily override global config with user's credentials
    import app.core.config as config_module
    original_bsky_username = config_module.BSKY_USERNAME
    original_twitter_api_key = config_module.TWITTER_API_KEY

    try:
        # Set user's credentials
        config_module.BSKY_USERNAME = bluesky_creds.get('username')
        config_module.TWITTER_API_KEY = twitter_api_creds.get('api_key')

        # Fetch Bluesky posts
        posts = fetch_posts_from_bluesky(bluesky_creds.get('username'), count=10)

        synced_count = 0
        skipped_count = 0

        for post in posts:
            if should_sync_post(post.text, 'bluesky', post.uri, db_path=DB_PATH):
                try:
                    tweet_id = post_to_twitter(post.text)

                    save_synced_post(
                        twitter_id=tweet_id,
                        bluesky_uri=post.uri,
                        source='bluesky',
                        synced_to='twitter',
                        content=post.text,
                        db_path=DB_PATH
                    )

                    synced_count += 1
                    logger.info(f"[User {user.username}] Synced Bluesky post {post.uri} to Twitter")

                except Exception as e:
                    logger.error(f"[User {user.username}] Failed to sync post {post.uri}: {e}")
            else:
                skipped_count += 1

        logger.info(f"[User {user.username}] Bluesky → Twitter: {synced_count} synced, {skipped_count} skipped")

    except Exception as e:
        logger.error(f"[User {user.username}] Error in Bluesky → Twitter sync: {e}")
        raise

    finally:
        # Restore original credentials
        config_module.BSKY_USERNAME = original_bsky_username
        config_module.TWITTER_API_KEY = original_twitter_api_key


def sync_all_users():
    """
    Sync all active users in multi-user mode.

    Iterates through all active users and performs sync for each:
    1. Load user credentials from CredentialManager
    2. Run Twitter → Bluesky sync (if credentials available)
    3. Run Bluesky → Twitter sync (if Twitter API credentials available)
    4. Handle errors gracefully (one user's failure doesn't stop others)
    """
    logger.info("=" * 60)
    logger.info("MULTI-USER SYNC: Starting sync for all active users...")
    logger.info("=" * 60)

    user_manager = UserManager(db_path=DB_PATH)
    master_key = get_master_key()
    cred_manager = CredentialManager(master_key, db_path=DB_PATH)
    settings_manager = UserSettings(db_path=DB_PATH)

    # Get all active users
    active_users = user_manager.list_users(active_only=True)

    if not active_users:
        logger.warning("No active users found. Please create a user first.")
        return

    logger.info(f"Found {len(active_users)} active user(s) to sync")

    # Track overall stats
    total_users_synced = 0
    total_users_failed = 0

    for user in active_users:
        try:
            logger.info("-" * 60)
            logger.info(f"Syncing user: {user.username} (ID: {user.id})")
            logger.info("-" * 60)

            # Get user settings
            user_settings = settings_manager.get_all(user.id)

            # Check if user has sync enabled
            twitter_to_bluesky_enabled = user_settings.get('twitter_to_bluesky_enabled', True)
            bluesky_to_twitter_enabled = user_settings.get('bluesky_to_twitter_enabled', True)

            # Get user credentials
            twitter_scraping_creds = cred_manager.get_credentials(user.id, 'twitter', 'scraping')
            twitter_api_creds = cred_manager.get_credentials(user.id, 'twitter', 'api')
            bluesky_creds = cred_manager.get_credentials(user.id, 'bluesky', 'api')

            # Check if user has minimum required credentials
            if not bluesky_creds:
                logger.warning(f"[User {user.username}] No Bluesky credentials. Skipping.")
                continue

            # Sync Twitter → Bluesky (if enabled and credentials available)
            if twitter_to_bluesky_enabled and twitter_scraping_creds:
                try:
                    sync_user_twitter_to_bluesky(user, twitter_scraping_creds, bluesky_creds)
                except Exception as e:
                    logger.error(f"[User {user.username}] Twitter → Bluesky sync failed: {e}")
                    log_audit(
                        user.id, 'sync_error', success=False,
                        details={'direction': 'twitter_to_bluesky', 'error': str(e)},
                        db_path=DB_PATH
                    )
            else:
                if not twitter_to_bluesky_enabled:
                    logger.info(f"[User {user.username}] Twitter → Bluesky sync disabled by user")
                else:
                    logger.info(f"[User {user.username}] No Twitter scraping credentials. Skipping Twitter → Bluesky")

            # Sync Bluesky → Twitter (if enabled and API credentials available)
            if bluesky_to_twitter_enabled and twitter_api_creds:
                try:
                    sync_user_bluesky_to_twitter(user, twitter_api_creds, bluesky_creds)
                except Exception as e:
                    logger.error(f"[User {user.username}] Bluesky → Twitter sync failed: {e}")
                    log_audit(
                        user.id, 'sync_error', success=False,
                        details={'direction': 'bluesky_to_twitter', 'error': str(e)},
                        db_path=DB_PATH
                    )
            else:
                if not bluesky_to_twitter_enabled:
                    logger.info(f"[User {user.username}] Bluesky → Twitter sync disabled by user")
                else:
                    logger.info(f"[User {user.username}] No Twitter API credentials. Skipping Bluesky → Twitter")

            total_users_synced += 1
            logger.info(f"[User {user.username}] Sync complete")

        except Exception as e:
            total_users_failed += 1
            logger.error(f"Error syncing user {user.username}: {e}")
            log_audit(
                user.id, 'sync_error', success=False,
                details={'error': str(e), 'error_type': type(e).__name__},
                db_path=DB_PATH
            )
            # Continue with next user

    logger.info("=" * 60)
    logger.info(f"MULTI-USER SYNC COMPLETE: {total_users_synced} users synced, {total_users_failed} failed")
    logger.info("=" * 60)


def main():
    """
    Main loop with bidirectional sync orchestration.

    Supports both single-user (legacy) and multi-user modes:

    SINGLE-USER MODE (MULTI_USER_ENABLED=false):
    1. Validate credentials from .env
    2. Migrate database schema
    3. Login to Bluesky
    4. Run sync loop with credentials from .env

    MULTI-USER MODE (MULTI_USER_ENABLED=true):
    1. Initialize multi-user system (tables, encryption)
    2. Ensure admin user exists (create from .env if first run)
    3. Migrate database schema
    4. Run sync loop for ALL active users
       - Each user uses their own credentials from CredentialManager
       - Errors in one user don't affect others
    """
    logger.info("=" * 80)
    logger.info("ChirpSyncer - Twitter ↔ Bluesky Sync")
    logger.info("=" * 80)

    # Check if multi-user mode is enabled
    if MULTI_USER_ENABLED:
        logger.info("MULTI-USER MODE ENABLED")
        logger.info("=" * 80)

        try:
            # Migrate database schema
            migrate_database(db_path=DB_PATH)

            # Initialize multi-user system
            init_multi_user_system()

            # Ensure admin user exists (create from .env on first run)
            ensure_admin_user()

            logger.info("Multi-user system ready")
            logger.info("=" * 80)

            # Main sync loop - multi-user mode
            while True:
                try:
                    # Sync all active users
                    sync_all_users()

                    logger.info(f"Sync cycle complete. Sleeping {POLL_INTERVAL/3600:.1f} hours...")
                    time.sleep(POLL_INTERVAL)

                except KeyboardInterrupt:
                    logger.info("Shutting down gracefully...")
                    break
                except Exception as e:
                    logger.error(f"Error in multi-user sync cycle: {e}")
                    logger.info("Waiting 1 minute before retry...")
                    time.sleep(60)

        except Exception as e:
            logger.error(f"Failed to initialize multi-user system: {e}")
            logger.error("Please check your configuration and try again.")
            raise

    else:
        # SINGLE-USER MODE (backward compatible)
        logger.info("SINGLE-USER MODE (Legacy)")
        logger.info("Set MULTI_USER_ENABLED=true in .env to enable multi-user support")
        logger.info("=" * 80)

        # Validate credentials from .env
        validate_credentials()

        # Migrate database schema
        migrate_database(db_path=DB_PATH)

        # Login to Bluesky
        login_to_bluesky()

        logger.info("Starting bidirectional sync...")

        # Check if bidirectional or unidirectional
        if TWITTER_API_KEY:
            logger.info("Bidirectional sync enabled (Twitter ↔ Bluesky)")
        else:
            logger.info("Unidirectional sync only (Twitter → Bluesky)")
            logger.info("To enable Bluesky→Twitter sync, configure Twitter API credentials in .env")

        # Main sync loop - single-user mode
        while True:
            try:
                # Sync Twitter → Bluesky
                try:
                    sync_twitter_to_bluesky()
                except Exception as e:
                    logger.error(f"Error in Twitter→Bluesky sync: {e}")
                    # Continue to next sync direction

                # Sync Bluesky → Twitter (if credentials available)
                try:
                    sync_bluesky_to_twitter()
                except Exception as e:
                    logger.error(f"Error in Bluesky→Twitter sync: {e}")
                    # Continue to next cycle

                logger.info(f"Sync cycle complete. Sleeping {POLL_INTERVAL/3600:.1f} hours...")
                time.sleep(POLL_INTERVAL)

            except KeyboardInterrupt:
                logger.info("Shutting down gracefully...")
                break
            except Exception as e:
                logger.error(f"Error in sync cycle: {e}")
                logger.info("Waiting 1 minute before retry...")
                time.sleep(60)  # Wait 1 minute before retry


if __name__ == "__main__":
    main()
